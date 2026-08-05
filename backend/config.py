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
GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_FALLBACK_MODEL: str = os.getenv("GROQ_FALLBACK_MODEL", "qwen/qwen3.6-27b")

GROQ_API_KEYS: list[str] = [
    k.strip() for k in [
        os.getenv("GROQ_API_KEY"),
        os.getenv("GROQ_API_KEY2"),
        os.getenv("GROQ_API_KEY3"),
        os.getenv("GROQ_API_KEY4"),
        os.getenv("GROQ_API_KEY5"),
        os.getenv("GROQ_API_KEY6"),
    ] if k and k.strip()
]

# ── Gemini API & Key Pool Configuration ─────────────────────────────────────

GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

GEMINI_API_KEYS: list[str] = [
    k.strip() for k in [
        os.getenv("GEMINI_API_KEY"),
        os.getenv("GEMINI_API_KEY2"),
        os.getenv("GEMINI_API_KEY3"),
        os.getenv("GEMINI_API_KEY4"),
        os.getenv("GEMINI_API_KEY5"),
    ] if k and k.strip()
]

# ── Limits ──────────────────────────────────────────────────────────────────

MAX_INPUT_LENGTH: int = 10_000  # characters
MAX_RETRIES: int = 2
API_TIMEOUT: int = 120  # seconds (increased for translation bounce pipeline)

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
