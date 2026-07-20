"""
Configuration module for the AI Humanizer backend.
Loads environment variables, defines rewrite modes, levels, and constants.
"""

import os
from enum import Enum
from dotenv import load_dotenv

load_dotenv()

# ── Groq API ────────────────────────────────────────────────────────────────

GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL: str = os.getenv("GROQ_MODEL", "qwen/qwen3.6-27b")
GROQ_FALLBACK_MODEL: str = os.getenv("GROQ_FALLBACK_MODEL", "llama-3.1-8b-instant")

# ── Limits ──────────────────────────────────────────────────────────────────

MAX_INPUT_LENGTH: int = 10_000  # characters
MAX_RETRIES: int = 2
API_TIMEOUT: int = 60  # seconds

# ── Rewrite Modes ───────────────────────────────────────────────────────────


class RewriteMode(str, Enum):
    ACADEMIC = "academic"
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    BUSINESS = "business"
    FRIENDLY = "friendly"
    SIMPLE = "simple"
    NATIVE = "native"
    FORMAL = "formal"
    CONCISE = "concise"


# ── Rewrite Levels ──────────────────────────────────────────────────────────


class RewriteLevel(int, Enum):
    LIGHT = 1       # Grammar fixes, small wording improvements
    MODERATE = 2    # Sentence restructuring, better transitions, reduced repetition
    HEAVY = 3       # Significant restructuring, conversational flow, improved rhythm


# ── Mode Descriptions (used in UI and prompt building) ──────────────────────

MODE_DESCRIPTIONS: dict[str, str] = {
    RewriteMode.ACADEMIC: "Scholarly tone with precise vocabulary and formal structure",
    RewriteMode.PROFESSIONAL: "Clean, confident, workplace-appropriate language",
    RewriteMode.CASUAL: "Relaxed, conversational, everyday language",
    RewriteMode.BUSINESS: "Clear, action-oriented, executive communication style",
    RewriteMode.FRIENDLY: "Warm, approachable, and personable tone",
    RewriteMode.SIMPLE: "Plain English, short sentences, easy to understand",
    RewriteMode.NATIVE: "Natural, idiomatic English as a native speaker would write",
    RewriteMode.FORMAL: "Respectful, polished, ceremonial or official tone",
    RewriteMode.CONCISE: "Tight, minimal, every word earns its place",
}
