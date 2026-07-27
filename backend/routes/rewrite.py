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
from humanizer import humanize
from perplexity import PerplexityOptimizer

from db import execute_query, fetch_all, fetch_one
from routes.auth import get_optional_user_from_token, get_current_user_from_token, UserResponse

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
    
    # Check limit for free users
    if user and user.plan == 'free' and user.usage_count >= 10:
        raise HTTPException(
            status_code=403,
            detail="Free plan limit reached (10/10 humanizations used). Please upgrade to Pro for $1/month to continue."
        )

    if len(request.text) > MAX_INPUT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Input text exceeds maximum length of {MAX_INPUT_LENGTH} characters."
        )

    clean_text = sanitize_input(request.text)
    if not clean_text:
        raise HTTPException(status_code=400, detail="Input text is empty after sanitization.")

    try:
        rewriter = get_rewriter()
        verifier = get_verifier()
        bouncer = get_bouncer()

        # Step 1: Analyze original text
        original_stats = analyze(clean_text)

        # Step 2: Rewrite
        rewritten = rewriter.rewrite(clean_text, request.mode, request.level)

        # Step 2.5: Perplexity Optimization Pass
        perplexity_opt = get_perplexity_optimizer()
        rewritten = perplexity_opt.optimize(rewritten, request.mode)

        # Step 3.5: Translation Chain (only for Level 3)
        if request.level >= 3:
            try:
                rewritten = bouncer.chain(rewritten)
            except Exception as e:
                logger.warning("Translation chain Step 3.5 failed, continuing without it: %s", e)

        # Step 4: Grammar polish
        should_polish = request.level < 3 and request.mode not in (RewriteMode.CASUAL, RewriteMode.NATIVE)
        if should_polish:
            rewritten = rewriter.grammar_polish(rewritten)

        # Step 5: Post-processing humanization
        intensity = 0.4 if request.level == 1 else (0.7 if request.level == 2 else 1.0)
        rewritten = humanize(rewritten, intensity=intensity)

        # Step 6: Meaning verification
        meaning_preserved = True
        meaning_reason = "Semantic verification skipped for Light rewriting level."

        if request.level >= 2:
            verification = verifier.verify(clean_text, rewritten)
            meaning_preserved = verification.meaning_preserved
            meaning_reason = verification.reason

            if not meaning_preserved:
                rewritten = rewriter.rewrite(clean_text, request.mode, request.level)
                rewritten = perplexity_opt.optimize(rewritten, request.mode)
                if request.level >= 3:
                    try:
                        rewritten = bouncer.chain(rewritten)
                    except Exception as e:
                        logger.warning("Translation chain failed during retry: %s", e)
                if should_polish:
                    rewritten = rewriter.grammar_polish(rewritten)
                rewritten = humanize(rewritten, intensity=intensity)
                verification = verifier.verify(clean_text, rewritten)
                meaning_preserved = verification.meaning_preserved
                meaning_reason = verification.reason

        # Step 8: Analyze rewritten text
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
            created_at = datetime.utcnow().isoformat()
            
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
            word_diff=word_diff,
        )

    except RewriteError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in rewrite pipeline")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


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
