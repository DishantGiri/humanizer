"""
API routes for the rewrite pipeline.
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from config import RewriteMode, RewriteLevel, MAX_INPUT_LENGTH
from analyzer import analyze
from rewriter import TextRewriter, RewriteError
from verifier import MeaningVerifier
from utils import count_changes, compute_reading_time, sanitize_input, compute_word_diff
from humanizer import humanize

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["rewrite"])

# ── Singletons (initialized once) ──────────────────────────────────────────

_rewriter: TextRewriter | None = None
_verifier: MeaningVerifier | None = None


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


# ── Request / Response Models ───────────────────────────────────────────────


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
async def rewrite_text(request: RewriteRequest):
    """
    Main rewrite endpoint.
    Pipeline: sanitize → analyze → rewrite → verify meaning → grammar polish → humanize post-processing → analyze output.
    """
    # Validate input length
    if len(request.text) > MAX_INPUT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Input text exceeds maximum length of {MAX_INPUT_LENGTH} characters."
        )

    # Sanitize input
    clean_text = sanitize_input(request.text)
    if not clean_text:
        raise HTTPException(status_code=400, detail="Input text is empty after sanitization.")

    try:
        rewriter = get_rewriter()
        verifier = get_verifier()

        # Step 1: Analyze original text
        original_stats = analyze(clean_text)

        # Step 2: Rewrite (Groq Model - System/User prompts built by build_rewrite_prompt inside rewriter)
        rewritten = rewriter.rewrite(clean_text, request.mode, request.level)

        # Step 3: Grammar polish (Groq Model - skipped for level 3 or casual/native modes to avoid over-polishing)
        should_polish = request.level < 3 and request.mode not in (RewriteMode.CASUAL, RewriteMode.NATIVE)
        if should_polish:
            rewritten = rewriter.grammar_polish(rewritten)

        # Step 4: Apply post-processing humanization (Rule-Based Cleanup)
        intensity = 0.4 if request.level == 1 else (0.7 if request.level == 2 else 1.0)
        rewritten = humanize(rewritten, intensity=intensity)

        # Step 5: Verify meaning preservation (Verification check)
        verification = verifier.verify(clean_text, rewritten)

        # Step 6: If meaning not preserved, retry the pipeline once
        if not verification.meaning_preserved:
            logger.info("Meaning not preserved after cleanup, retrying rewrite and cleanup pipeline...")
            rewritten = rewriter.rewrite(clean_text, request.mode, request.level)
            if should_polish:
                rewritten = rewriter.grammar_polish(rewritten)
            rewritten = humanize(rewritten, intensity=intensity)
            verification = verifier.verify(clean_text, rewritten)

        # Step 7: Analyze rewritten text
        rewritten_stats = analyze(rewritten)

        # Step 7: Compute changes
        changes = count_changes(clean_text, rewritten)
        reading_time = compute_reading_time(rewritten)
        word_diff = compute_word_diff(clean_text, rewritten)

        return RewriteResponse(
            rewritten=rewritten,
            original_stats=original_stats.to_dict(),
            rewritten_stats=rewritten_stats.to_dict(),
            changes=changes,
            reading_time=reading_time,
            meaning_preserved=verification.meaning_preserved,
            meaning_reason=verification.reason,
            word_diff=word_diff,
        )

    except RewriteError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.exception("Unexpected error in rewrite pipeline")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.post("/analyze", response_model=StatsResponse)
async def analyze_text(request: AnalyzeRequest):
    """
    Analysis-only endpoint. Returns text metrics without rewriting.
    """
    if len(request.text) > MAX_INPUT_LENGTH:
        raise HTTPException(
            status_code=400,
            detail=f"Input text exceeds maximum length of {MAX_INPUT_LENGTH} characters."
        )

    clean_text = sanitize_input(request.text)
    if not clean_text:
        raise HTTPException(status_code=400, detail="Input text is empty after sanitization.")

    stats = analyze(clean_text)
    return StatsResponse(**stats.to_dict())
