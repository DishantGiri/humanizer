"""
Perplexity Optimization module.

Runs a targeted LLM pass to inject high perplexity (unexpected-but-natural wording),
human burstiness (sentence length variation), and persona-calibrated voice — the
four signals measured by AI detectors.
"""

import logging
from typing import Optional
from groq import Groq
from config import GROQ_API_KEY, GROQ_API_KEYS, GROQ_MODEL, GROQ_FALLBACK_MODEL, RewriteMode
from rewriter import get_next_groq_key

logger = logging.getLogger(__name__)

# ── Tunable constants (change here, not in logic) ───────────────────────────

_TEMP: float = 1.10           # Higher temp → more surprising token choices → higher perplexity
_TOP_P: float = 0.95
_FREQ_PENALTY: float = 0.35   # Reduces token repetition; both primary AND fallback use this
_PRES_PENALTY: float = 0.20   # Encourages topic variety; both primary AND fallback use this
_MAX_TOKENS_PRIMARY: int = 3000
_MAX_TOKENS_FALLBACK: int = 2048
_WORD_FLOOR_RATIO: float = 0.70   # Rewrite must be ≥70% of original word count
_WORD_CEIL_RATIO: float = 1.15    # Rewrite must be ≤115% of original word count
_MIN_WORDS_FLOOR: int = 5

# Fail fast on individual calls — we have a fallback model and key rotation
# to handle transient failures, so retrying inside a single call just adds latency.
_MAX_RETRIES: int = 0

# ── Persona map (dict lookup; safe when RewriteMode gains new members) ───────

_PERSONA_MAP: dict[str, str] = {
    RewriteMode.NATURAL.value:       "thoughtful human writer crafting an authentic, engaging piece",
    RewriteMode.CREATIVE.value:      "thoughtful human writer crafting an authentic, engaging piece",
    RewriteMode.CASUAL.value:        "thoughtful human writer crafting an authentic, engaging piece",
    RewriteMode.FRIENDLY.value:      "thoughtful human writer crafting an authentic, engaging piece",
    RewriteMode.SIMPLE.value:        "thoughtful human writer crafting an authentic, engaging piece",
    RewriteMode.NATIVE.value:        "native English speaker with a natural, idiomatic writing style",
    RewriteMode.STANDARD.value:      "clear, highly articulate native English speaker",
    RewriteMode.ACADEMIC.value:      "scholarly researcher writing a clear, confident academic paper",
    RewriteMode.FORMAL.value:        "scholarly researcher writing a clear, confident academic paper",
    RewriteMode.FLUENCY.value:       "seasoned professional writing clear, direct executive communication",
    RewriteMode.PROFESSIONAL.value:  "seasoned professional writing clear, direct executive communication",
    RewriteMode.BUSINESS.value:      "seasoned professional writing clear, direct executive communication",
    RewriteMode.CONCISE.value:       "seasoned professional writing clear, direct executive communication",
}
_DEFAULT_PERSONA = "clear, highly articulate native English speaker"


class PerplexityOptimizer:
    """
    Runs a single targeted LLM pass to inject human-writing signals:
    - High perplexity (unexpected but natural word choices)
    - Strong burstiness (varied sentence lengths)
    - Lower token probability (non-obvious phrasing patterns)
    - Distinctive stylometry (varied connectors, concrete voice)
    """

    def __init__(self) -> None:
        self.model: str = GROQ_MODEL
        self.fallback_model: str = GROQ_FALLBACK_MODEL

    def _call_groq(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        """
        Call Groq with key rotation and model fallback.

        Returns:
            The model's output string on success, or None on total failure.
            Never returns user_prompt silently — callers decide the fallback.

        Notes:
            - max_retries=0 on both primary and fallback: fail-fast is intentional
              since key rotation and model fallback already provide redundancy.
            - frequency_penalty and presence_penalty are applied on BOTH primary
              and fallback paths so de-AI style behaviour isn't silently lost.
        """
        if not GROQ_API_KEYS and not GROQ_API_KEY:
            logger.warning(
                "PerplexityOptimizer: no Groq API keys configured — skipping optimization pass."
            )
            return None

        # ── Resolve API key (key selection failure is caught separately) ────
        try:
            if GROQ_API_KEYS:
                key_num, api_key = get_next_groq_key()
            else:
                key_num, api_key = 1, GROQ_API_KEY
        except Exception as key_err:
            logger.warning("PerplexityOptimizer: key selection failed: %s", key_err)
            return None

        # ── Build client after key is resolved ───────────────────────────────
        client = Groq(api_key=api_key, max_retries=_MAX_RETRIES)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        shared_sampling = dict(
            temperature=_TEMP,
            top_p=_TOP_P,
            frequency_penalty=_FREQ_PENALTY,
            presence_penalty=_PRES_PENALTY,
        )

        # ── Primary model attempt ─────────────────────────────────────────────
        try:
            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=_MAX_TOKENS_PRIMARY,
                **shared_sampling,
            )
            content = response.choices[0].message.content
            if content and content.strip():
                return content.strip()
            logger.warning(
                "PerplexityOptimizer: Key #%d, model %s returned empty content.",
                key_num, self.model,
            )
        except Exception as primary_err:
            logger.warning(
                "PerplexityOptimizer: Key #%d, model %s failed: %s — trying fallback model.",
                key_num, self.model, primary_err,
            )

        # ── Fallback model attempt (same key, same sampling params) ──────────
        try:
            response = client.chat.completions.create(
                model=self.fallback_model,
                messages=messages,
                max_tokens=_MAX_TOKENS_FALLBACK,
                **shared_sampling,  # frequency/presence_penalty preserved intentionally
            )
            content = response.choices[0].message.content
            if content and content.strip():
                return content.strip()
            logger.warning(
                "PerplexityOptimizer: fallback model %s also returned empty content.",
                self.fallback_model,
            )
        except Exception as fallback_err:
            logger.warning(
                "PerplexityOptimizer: fallback model %s also failed: %s",
                self.fallback_model, fallback_err,
            )

        return None

    def optimize(self, text: str, mode: str) -> str:
        """
        Run the perplexity and persona optimisation pass.

        Args:
            text: The text to optimise (post-rewrite, pre-detection-feedback).
            mode: RewriteMode value string or enum.

        Returns:
            Optimised text if the LLM call succeeded and output is plausible;
            original text otherwise (caller is always given something usable).
        """
        mode_val = (mode.value if hasattr(mode, "value") else str(mode)).lower()
        persona = _PERSONA_MAP.get(mode_val, _DEFAULT_PERSONA)

        orig_words = len(text.split())
        min_words = max(_MIN_WORDS_FLOOR, int(orig_words * _WORD_FLOOR_RATIO))
        max_words = max(8, int(orig_words * _WORD_CEIL_RATIO))

        system_prompt = (
            f"You are a {persona}.\n"
            "Rewrite the text to read like authentic human writing. Preserve 100% of the factual content.\n\n"
            "TARGET — hit all four signals AI detectors measure:\n\n"
            "1. PERPLEXITY (use unexpected-but-natural words):\n"
            "   Replace obvious verbs with specific ones: 'was hard' → 'ground on', "
            "'improved' → 'started moving', 'she decided' → 'she made the call'.\n"
            "   Make 2-3 surprising but completely natural word choices per paragraph.\n\n"
            "2. BURSTINESS (varied sentence lengths):\n"
            f"   Mix: some short (5-9 words), most medium (14-22 words).\n"
            "   After every 2-3 medium sentences, drop a short punchy one:\n"
            "   'It worked.' / 'Most don't.' / 'That's it.' / 'Worth it.' / 'Not always.'\n"
            "   Never write 3 sentences in a row of similar length.\n\n"
            "3. TOKEN PROBABILITY (avoid the most predictable next word):\n"
            "   Start 1-2 sentences with 'And', 'But', or 'Because' — humans do this naturally.\n"
            "   Use a fragment once for emphasis: 'Which matters.' / 'And that was it.'\n\n"
            "4. STYLOMETRY (distinctive, varied voice):\n"
            "   Mix connectors: 'though', 'even so', 'and yet', 'which is why', 'because of that'.\n"
            "   Contractions everywhere: it's, don't, can't, they're, we're, you'll, isn't.\n"
            "   Concrete nouns over abstractions. Personal pronouns (you, we, it) as subjects.\n\n"
            "HARD RULES:\n"
            f"- Output length: {min_words} to {max_words} words (input is {orig_words} words).\n"
            "- ZERO em dashes (—) or en dashes (–). ZERO semicolons (;).\n"
            "- No sentence over 26 words. More than 2 commas in a sentence → split it.\n"
            "- BANNED: delve, leverage, utilize, robust, comprehensive, pivotal, nuanced, "
            "multifaceted, furthermore, moreover, additionally, notably, importantly, "
            "seamless, transformative, paradigm, measurably, demonstrably, meaningfully.\n"
            "- Same paragraph count as input.\n"
            "- Output ONLY the rewritten text. No preamble, no notes."
        )

        logger.info(
            "PerplexityOptimizer: running optimisation pass (persona: %s, mode: %s)",
            persona, mode_val,
        )
        result = self._call_groq(system_prompt, text)

        if result is None:
            logger.warning(
                "PerplexityOptimizer: all LLM attempts failed — returning original text unchanged."
            )
            return text

        result_words = len(result.split())

        # Quality gate: check both floor and ceiling, and that it's not just repeated content
        if result_words < min_words:
            logger.warning(
                "PerplexityOptimizer: output too short (%d words, floor %d) — discarding.",
                result_words, min_words,
            )
            return text

        if result_words > max_words * 1.3:
            logger.warning(
                "PerplexityOptimizer: output too long (%d words, ceiling %d) — discarding.",
                result_words, max_words,
            )
            return text

        # Detect low-effort outputs: if >60% of output bigrams match input, it's near-identical
        def _bigrams(s: str) -> set:
            words = s.lower().split()
            return set(zip(words, words[1:])) if len(words) > 1 else set()

        orig_bg = _bigrams(text)
        result_bg = _bigrams(result)
        if orig_bg and len(result_bg & orig_bg) / len(orig_bg) > 0.85:
            logger.warning(
                "PerplexityOptimizer: output is >85%% identical to input (bigram overlap) — discarding."
            )
            return text

        return result
