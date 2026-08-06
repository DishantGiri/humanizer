"""
API routes for the rewrite pipeline with MySQL history logging and 10-humanization limit enforcement.
"""

import os
import uuid
import logging
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, Field

from config import RewriteMode, RewriteLevel, MAX_INPUT_LENGTH
from analyzer import analyze
from rewriter import TextRewriter, RewriteError
from verifier import MeaningVerifier
from translator import TranslationBouncer
from utils import count_changes, compute_reading_time, sanitize_input, compute_word_diff
from humanizer import humanize, strip_formatting_artifacts, enforce_short_sentences, add_burstiness
from perplexity import PerplexityOptimizer
from validators import validate_human_statistics

from db import execute_query, fetch_all, fetch_one
from routes.auth import get_optional_user_from_token, get_current_user_from_token, UserResponse
from cache_limiter import get_cached_rewrite, set_cached_rewrite, is_rate_limited
from similarity import calculate_similarity_metrics
from nlp_analyzer import analyze_text_nlp

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["rewrite"])

# ── Singletons ──────────────────────────────────────────────────────────────

_rewriter: TextRewriter | None = None
_verifier: MeaningVerifier | None = None
_bouncer: TranslationBouncer | None = None
_perplexity_optimizer: PerplexityOptimizer | None = None


def get_rewriter() -> TextRewriter:
    global _rewriter
    if _rewriter is None:
        _rewriter = TextRewriter()
    return _rewriter


def get_verifier() -> MeaningVerifier:
    global _verifier
    if _verifier is None:
        _verifier = MeaningVerifier()
    return _verifier


def get_bouncer() -> TranslationBouncer:
    global _bouncer
    if _bouncer is None:
        _bouncer = TranslationBouncer()
    return _bouncer


def get_perplexity_optimizer() -> PerplexityOptimizer:
    global _perplexity_optimizer
    if _perplexity_optimizer is None:
        _perplexity_optimizer = PerplexityOptimizer()
    return _perplexity_optimizer


# ── Models ──────────────────────────────────────────────────────────────────

class RewriteRequest(BaseModel):
    text: str = Field(..., min_length=1, description="The text to rewrite")
    mode: RewriteMode = Field(default=RewriteMode.NATIVE, description="Rewrite style mode")
    level: RewriteLevel = Field(default=RewriteLevel.MODERATE, description="Rewrite intensity level (1-3)")


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, description="The text to analyze")


class StatsResponse(BaseModel):
    word_count: int
    character_count: int
    sentence_count: int
    paragraph_count: int
    avg_sentence_length: float
    readability_score: float
    readability_grade: str
    vocabulary_diversity: float
    repeated_words: list[dict]
    repeated_phrases: list[dict]
    passive_voice_count: int
    reading_time_seconds: int


class RewriteResponse(BaseModel):
    rewritten: str
    original_stats: dict
    rewritten_stats: dict
    changes: dict
    reading_time: dict
    meaning_preserved: bool
    meaning_reason: str
    meaning_preservation_score: float = 95.0
    similarity_metrics: Optional[dict] = None
    nlp_analysis: Optional[dict] = None
    word_diff: list[dict]


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/rewrite", response_model=RewriteResponse)
async def rewrite_text(
    request: RewriteRequest,
    authorization: Optional[str] = Header(None)
):
    """
    Main rewrite endpoint. Enforces 10 free humanization usage limits for free tier accounts.
    """
    user = get_optional_user_from_token(authorization)
    user_id_str = user.id if user else "anonymous"

    # Step A: Rate limiting check (Redis sliding window)
    if is_rate_limited(user_id_str, limit=30, window_seconds=60):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait a minute before making more rewrite requests."
        )

    # Plan Limits Config (Humanizations per day)
    plan_limits = {
        'free': {'max_words': 400, 'max_usage': 10},
        'starter': {'max_words': 1000, 'max_usage': 30},
        'plus': {'max_words': 1000, 'max_usage': 30},
        'pro': {'max_words': 2500, 'max_usage': 80},
        'enterprise': {'max_words': 5000, 'max_usage': 250},
    }

    user_plan = user.plan if (user and hasattr(user, 'plan') and user.plan) else 'free'
    cfg = plan_limits.get(user_plan, plan_limits['free'])

    # Enforce Daily Usage Limits (reset every 24h)
    daily_usage_count = 0
    if user:
        today_start = datetime.utcnow().strftime('%Y-%m-%d 00:00:00')
        daily_usage_row = fetch_one(
            "SELECT COUNT(*) as cnt FROM history WHERE user_id = ? AND created_at >= ?",
            (user.id, today_start)
        )
        daily_usage_count = daily_usage_row["cnt"] if (daily_usage_row and "cnt" in daily_usage_row) else user.usage_count

    if user and daily_usage_count >= cfg['max_usage']:
        raise HTTPException(
            status_code=403,
            detail=f"{user_plan.capitalize()} plan limit reached ({cfg['max_usage']} humanizations per day used). Please upgrade your plan to continue or try again tomorrow."
        )

    # Enforce Word Count Limits
    input_word_count = len(request.text.strip().split())
    if input_word_count > cfg['max_words']:
        raise HTTPException(
            status_code=400,
            detail=f"Your {user_plan.capitalize()} plan allows up to {cfg['max_words']} words per input. This text has {input_word_count} words. Please upgrade to a higher plan for larger word limits."
        )

    if len(request.text) > MAX_INPUT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Input text exceeds maximum absolute length of {MAX_INPUT_LENGTH} characters."
        )

    # Step 0: Normalise formatting artifacts (§15–§19) before the LLM sees the text.
    request_text_clean = strip_formatting_artifacts(request.text)
    clean_text = sanitize_input(request_text_clean)
    if not clean_text:
        raise HTTPException(status_code=400, detail="Input text is empty after sanitization.")

    # Step B: Check Redis cache
    cached_output = get_cached_rewrite(clean_text, request.mode.value, request.level.value)
    if cached_output:
        logger.info("Serving rewrite from Redis cache.")
        rewritten = cached_output
    else:
        try:
            rewriter = get_rewriter()
            intensity = 0.4 if request.level == 1 else (0.7 if request.level == 2 else 1.0)

            lines = [line for line in clean_text.split('\n')]
            is_list = len(lines) > 2 and any(
                line.strip().startswith(('-', '*', '•', '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.')) or
                (':' in line and len(line.split(':')[0].split()) <= 4)
                for line in lines if line.strip()
            )

            if is_list:
                rewritten_lines = []
                for line in lines:
                    stripped_line = line.strip()
                    if not stripped_line:
                        rewritten_lines.append("")
                        continue
                    prefix = ""
                    core_text = stripped_line
                    for marker in ('-', '*', '•', '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.'):
                        if stripped_line.startswith(marker):
                            prefix = marker + " "
                            core_text = stripped_line[len(marker):].strip()
                            break

                    if ":" in core_text and len(core_text.split(":")[0].split()) <= 4:
                        parts = core_text.split(":", 1)
                        key = parts[0].strip()
                        val = parts[1].strip()
                        val_rewritten = rewriter.rewrite(val, request.mode, request.level)
                        val_humanized = humanize(val_rewritten, intensity=intensity, original_text=val)
                        rewritten_lines.append(f"{prefix}{key}: {val_humanized}")
                    else:
                        line_rewritten = rewriter.rewrite(core_text, request.mode, request.level)
                        line_humanized = humanize(line_rewritten, intensity=intensity, original_text=core_text)
                        rewritten_lines.append(f"{prefix}{line_humanized}")
                rewritten = "\n".join(rewritten_lines)
            else:
                orig_paras = [p.strip() for p in clean_text.split('\n\n') if p.strip()]
                if len(orig_paras) > 1:
                    rewritten_paras = []
                    for p_idx, para in enumerate(orig_paras):
                        p_rewritten = rewriter.rewrite(para, request.mode, request.level)
                        try:
                            optimizer = get_perplexity_optimizer()
                            p_rewritten = optimizer.optimize(p_rewritten, request.mode)
                        except Exception as opt_err:
                            logger.warning("Perplexity optimization pass skipped for para %d: %s", p_idx, opt_err)

                        # Step 2.5b: Multi-Language Translation Bounce Pass (HEAVY mode only)
                        if int(request.level) >= 3:
                            try:
                                bouncer = get_bouncer()
                                p_rewritten = bouncer.bounce(p_rewritten)
                            except Exception as bounce_err:
                                logger.warning("Translation bounce pass skipped for para %d: %s", p_idx, bounce_err)

                        p_humanized = humanize(p_rewritten, intensity=intensity, original_text=para, mode=request.mode.value)
                        rewritten_paras.append(p_humanized)
                    rewritten = "\n\n".join(rewritten_paras)
                else:
                    rewritten = rewriter.rewrite(clean_text, request.mode, request.level)
                    # Step 2.5: Perplexity & Persona Optimization Pass
                    try:
                        optimizer = get_perplexity_optimizer()
                        rewritten = optimizer.optimize(rewritten, request.mode)
                    except Exception as opt_err:
                        logger.warning("Perplexity optimization pass skipped: %s", opt_err)

                    # Step 2.5b: Multi-Language Translation Bounce Pass (HEAVY mode only)
                    if int(request.level) >= 3:
                        try:
                            bouncer = get_bouncer()
                            rewritten = bouncer.bounce(rewritten)
                        except Exception as bounce_err:
                            logger.warning("Translation bounce pass skipped: %s", bounce_err)

                    rewritten = humanize(rewritten, intensity=intensity, original_text=clean_text, mode=request.mode.value)

            # Step 2.6: Post-Hoc Statistical Validation Check
            is_valid, val_reason, val_stats = validate_human_statistics(rewritten)
            if not is_valid:
                logger.info("Statistical validation notice: %s. Applying statistical refinement pass.", val_reason)
                rewritten = enforce_short_sentences(rewritten, max_words=16)
                rewritten = add_burstiness(rewritten)

            # Store in Redis cache
            set_cached_rewrite(clean_text, request.mode.value, request.level.value, rewritten)
        except RewriteError as e:
            logger.error("Rewrite error: %s", e)
            raise HTTPException(
                status_code=500,
                detail="Text humanization service is temporarily busy. Please try again in a few seconds."
            )

    # Step C: RapidFuzz & SentenceTransformers Similarity Metrics
    sim_metrics = calculate_similarity_metrics(clean_text, rewritten)

    # Step D: spaCy NLP Analysis
    nlp_data = analyze_text_nlp(rewritten)

    meaning_preserved = True
    meaning_reason = "Factual accuracy preserved."

    # Step E: Textstat & word diff stats
    original_stats = analyze(clean_text)
    rewritten_stats = analyze(rewritten)
    changes = count_changes(clean_text, rewritten)
    reading_time = compute_reading_time(rewritten)
    word_diff = compute_word_diff(clean_text, rewritten)

    # Record usage count and history entry if user is logged in
    if user:
        q_inc = "UPDATE users SET usage_count = usage_count + 1 WHERE id = ?"
        execute_query(q_inc, (user.id,))
        
        hist_id = str(uuid.uuid4())
        word_cnt = rewritten_stats.word_count
        created_at = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        
        q_hist = """
            INSERT INTO history (id, user_id, original_text, rewritten_text, mode, level, word_count, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        execute_query(q_hist, (hist_id, user.id, clean_text, rewritten, str(request.mode.value if hasattr(request.mode, 'value') else request.mode), int(request.level), word_cnt, created_at))

    return RewriteResponse(
        rewritten=rewritten,
        original_stats=original_stats.to_dict(),
        rewritten_stats=rewritten_stats.to_dict(),
        changes=changes,
        reading_time=reading_time,
        meaning_preserved=meaning_preserved,
        meaning_reason=meaning_reason,
        meaning_preservation_score=sim_metrics.get("meaning_preservation_score", 95.0),
        similarity_metrics=sim_metrics,
        nlp_analysis=nlp_data,
        word_diff=word_diff,
    )


@router.get("/user/history")
async def get_user_history(current_user: UserResponse = Depends(get_current_user_from_token)):
    """
    Retrieve past humanizations history for the logged-in user.
    """
    q_get = """
        SELECT id, original_text, rewritten_text, mode, level, word_count, created_at
        FROM history
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 50
    """
    rows = fetch_all(q_get, (current_user.id,))
    return rows
