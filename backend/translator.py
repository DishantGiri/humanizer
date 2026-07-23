"""
Translation Bounce module.

Implements the "Standard Pipeline" technique from Lynote-ai/humanize-text:
    LLM Rewrite -> Multi-language Translation -> Final LLM Refinement

Translating text to an intermediate language and back introduces natural
linguistic drift that breaks AI detection patterns:
- Different sentence structures emerge from the target language's grammar
- Word choices shift due to imperfect translation equivalences
- The "too perfect" AI writing patterns get disrupted naturally

This module handles the translation bounce step.
"""

import logging
import random
import re
from groq import Groq, RateLimitError, APITimeoutError

from config import GROQ_API_KEY, GROQ_MODEL, GROQ_FALLBACK_MODEL, MAX_RETRIES, API_TIMEOUT

logger = logging.getLogger(__name__)


# Intermediate languages for the bounce. Each introduces different
# structural changes when translating back to English.
BOUNCE_LANGUAGES = [
    ("French", "fr"),     # SOV tendencies, different adjective placement
    ("German", "de"),     # Verb-final in subclauses, compound nouns
    ("Spanish", "es"),    # Pro-drop, flexible word order
]


class TranslationBouncer:
    """Handles the multi-language translation bounce for text humanization."""

    def __init__(self):
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not set. Check your .env file.")
        self.client = Groq(api_key=GROQ_API_KEY)
        self.model = GROQ_MODEL
        self.fallback_model = GROQ_FALLBACK_MODEL

    def _call_llm(self, system_prompt: str, user_prompt: str, model: str | None = None) -> str:
        """Make a single LLM call with failover. Uses fallback model directly to avoid rate limits."""
        # Use fallback model by default for translation to avoid competing
        # with the primary model's rate limits during the rewrite step
        target_model = model or self.fallback_model
        models_to_try = [target_model]
        if target_model != self.fallback_model:
            models_to_try.append(self.fallback_model)

        last_error = None
        for m in models_to_try:
            # Only 1 retry for translation (fail fast, it's optional)
            for attempt in range(2):
                try:
                    response = self.client.chat.completions.create(
                        model=m,
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        temperature=0.7,
                        max_tokens=4096,
                        top_p=0.9,
                        timeout=60,  # Shorter timeout for each translation call
                    )
                    content = response.choices[0].message.content
                    if not content:
                        raise RuntimeError("Empty response from Groq API")
                    # Strip thinking tags if present
                    content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL | re.IGNORECASE)
                    return content.strip()
                except (RateLimitError, APITimeoutError) as e:
                    last_error = e
                    logger.warning(
                        "Translation call attempt %d with model %s failed: %s",
                        attempt + 1, m, e
                    )
                except Exception as e:
                    last_error = e
                    logger.warning(
                        "Translation call attempt %d with model %s failed: %s",
                        attempt + 1, m, e
                    )

        raise RuntimeError(f"Translation bounce failed after all retries: {last_error}")

    def _translate_to(self, text: str, target_lang: str) -> str:
        """Translate text from English to the target language."""
        system_prompt = f"""You are a professional translator. Translate the following English text to {target_lang}.

Rules:
- Produce ONLY the translated text, no explanations or notes.
- Preserve the exact paragraph structure. If the input has multiple paragraphs separated by blank lines, keep the same number of paragraphs with blank lines between them.
- Preserve all facts, numbers, dates, names, and technical terms.
- Translate naturally, not word-for-word."""

        user_prompt = text
        return self._call_llm(system_prompt, user_prompt)

    def _translate_back(self, text: str, source_lang: str) -> str:
        """Translate text from the intermediate language back to English."""
        system_prompt = f"""You are a professional translator. Translate the following {source_lang} text back to English.

Rules:
- Produce ONLY the translated text, no explanations or notes.
- Preserve the exact paragraph structure. If the input has multiple paragraphs separated by blank lines, keep the same number of paragraphs with blank lines between them.
- Preserve all facts, numbers, dates, names, and technical terms.
- Translate naturally and fluently, not word-for-word."""

        user_prompt = text
        return self._call_llm(system_prompt, user_prompt)

    def bounce(self, text: str) -> str:
        """
        Perform the full translation bounce in exactly 2 API calls:
        1. Translate entire text to an intermediate language
        2. Translate it back to English

        The translation prompts explicitly preserve paragraph structure.

        Returns:
            The bounced text with natural linguistic drift.
        """
        lang_name, lang_code = random.choice(BOUNCE_LANGUAGES)
        logger.info("Translation bounce: English -> %s -> English", lang_name)

        # 2 API calls total (not per-paragraph)
        translated = self._translate_to(text, lang_name)
        logger.info("Translated to %s (%d chars)", lang_name, len(translated))

        bounced_back = self._translate_back(translated, lang_name)
        logger.info("Translated back to English (%d chars)", len(bounced_back))

        return bounced_back
