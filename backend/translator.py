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
        # Always use the fast fallback model for translation to prevent
        # latency spikes from the primary model.
        target_model = self.fallback_model
        
        try:
            response = self.client.chat.completions.create(
                model=target_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=4096,
                top_p=0.9,
                timeout=10,  # Fast 10-second timeout
            )
            content = response.choices[0].message.content
            if not content:
                raise RuntimeError("Empty response from Groq API")
            # Strip thinking tags if present
            content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL | re.IGNORECASE)
            return content.strip()
        except Exception as e:
            logger.warning("Translation call with model %s failed: %s", target_model, e)
            raise RuntimeError(f"Translation bounce failed: {e}")


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

    def chain(self, text: str) -> str:
        """
        Perform the full translation chain (Step 3.5):
        English -> Chinese (LLM rewrite) -> Japanese (LLM rewrite with history) -> Finnish -> English.
        This introduces complex structural and lexical shifts.
        """
        # Step 3.5a: English -> Chinese
        logger.info("Translation chain Step 3.5a: English -> Chinese")
        sys_zh = (
            "You are an expert translator and editor. Translate the English text to Chinese. "
            "Focus on standard native phrasing while keeping the meaning. "
            "Output ONLY the translated Chinese text. No preamble, no notes."
        )
        chinese = self._call_llm(sys_zh, text)
        if not chinese:
            logger.warning("English to Chinese translation failed, returning original text")
            return text

        # Step 3.5b: Chinese -> Japanese (with context/history)
        logger.info("Translation chain Step 3.5b: Chinese -> Japanese (with original history context)")
        sys_ja = (
            "You are an expert translator. Translate the Chinese text to Japanese. "
            "Use the original English text (provided for context/history) to maintain precise "
            "semantic equivalence, tone, and facts. "
            "Output ONLY the translated Japanese text. No explanations, no preamble."
        )
        user_ja = f"ORIGINAL ENGLISH CONTEXT:\n{text}\n\nCHINESE TEXT TO TRANSLATE:\n{chinese}"
        japanese = self._call_llm(sys_ja, user_ja)
        if not japanese:
            logger.warning("Chinese to Japanese translation failed, continuing with original text")
            return text

        # Step 3.5c: Japanese -> Finnish
        logger.info("Translation chain Step 3.5c: Japanese -> Finnish")
        sys_fi = (
            "Translate the Japanese text to Finnish. Be precise and natural. "
            "Preserve all formatting and structural lines. "
            "Output ONLY the Finnish text, no other text."
        )
        finnish = self._call_llm(sys_fi, japanese)
        if not finnish:
            logger.warning("Japanese to Finnish translation failed, continuing with original text")
            return text

        # Step 3.5d: Finnish -> English
        logger.info("Translation chain Step 3.5d: Finnish -> English")
        sys_en = (
            "Translate the Finnish text back to fluent English. "
            "Ensure the translation is natural and idiomatic. "
            "Preserve the original paragraph structure and all facts. "
            "Output ONLY the English text, no explanations."
        )
        english = self._call_llm(sys_en, finnish)
        if not english:
            logger.warning("Finnish to English translation failed, returning original text")
            return text

        return english

