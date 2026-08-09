"""
Translation Bounce module using open-source, non-AI lightweight translation.

Translates text through essential intermediate languages (French, German, Spanish)
and back to introduce natural linguistic diversity without using heavy neural models or AI tokens.
"""

import logging
import random
from typing import Optional

try:
    from deep_translator import GoogleTranslator, MyMemoryTranslator
except ImportError:
    GoogleTranslator = None
    MyMemoryTranslator = None

logger = logging.getLogger(__name__)

# Essential lightweight bounce languages
BOUNCE_LANGUAGES = [
    ("French", "fr"),
    ("German", "de"),
    ("Spanish", "es"),
]


class TranslationBouncer:
    """Handles multi-language translation bounce using open-source library."""

    def __init__(self):
        pass

    def _translate(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate text using open-source translator with fallback."""
        if not text or not text.strip():
            return text

        if GoogleTranslator is not None:
            try:
                translator = GoogleTranslator(source=source_lang, target=target_lang)
                res = translator.translate(text)
                if res and res.strip():
                    return res
            except Exception as e:
                logger.warning("GoogleTranslator (%s -> %s) error: %s", source_lang, target_lang, e)

        if MyMemoryTranslator is not None:
            try:
                mem_trans = MyMemoryTranslator(source=source_lang, target=target_lang)
                res = mem_trans.translate(text)
                if res and res.strip():
                    return res
            except Exception as e:
                logger.warning("MyMemoryTranslator (%s -> %s) error: %s", source_lang, target_lang, e)

        return text

    def bounce(self, text: str) -> str:
        """
        Perform translation bounce: English -> Target Lang -> English
        Preserves multi-paragraph structure.
        """
        if not text or not text.strip():
            return text

        lang_name, lang_code = random.choice(BOUNCE_LANGUAGES)
        try:
            paragraphs = text.split("\n\n")
            bounced_paras = []
            for p in paragraphs:
                if not p.strip():
                    bounced_paras.append(p)
                    continue
                # Forward
                mid = self._translate(p, "en", lang_code)
                # Back
                back = self._translate(mid, lang_code, "en")
                bounced_paras.append(back if back and back.strip() else p)

            return "\n\n".join(bounced_paras)
        except Exception as err:
            logger.warning("Translation bounce fallback to original: %s", err)
            return text

    def chain(self, text: str) -> str:
        """
        Perform lightweight multi-step bounce: English -> Spanish -> German -> English
        """
        if not text or not text.strip():
            return text

        try:
            # Step 1: English -> Spanish
            es = self._translate(text, "en", "es")
            # Step 2: Spanish -> German
            de = self._translate(es, "es", "de")
            # Step 3: German -> English
            en = self._translate(de, "de", "en")
            return en if en and en.strip() else text
        except Exception as err:
            logger.warning("Translation chain fallback to original: %s", err)
            return text


_bouncer_instance: Optional[TranslationBouncer] = None


def get_bouncer() -> TranslationBouncer:
    """Singleton getter for TranslationBouncer."""
    global _bouncer_instance
    if _bouncer_instance is None:
        _bouncer_instance = TranslationBouncer()
    return _bouncer_instance
