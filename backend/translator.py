"""
Translation & Multi-Engine Module.

Supports:
1. Google Translate & MyMemory open-source translation with sentence chunking.
2. Niutrans NMT API integration with automatic fallback.
3. Cross-engine linguistic distance chain (Japanese -> Finnish -> Target Language).
4. Lightweight multi-language translation bounce and chains.
"""

import re
import logging
import random
from typing import Optional
import httpx

try:
    from deep_translator import GoogleTranslator, MyMemoryTranslator
except ImportError:
    GoogleTranslator = None
    MyMemoryTranslator = None

from config import NIUTRANS_API_KEY

logger = logging.getLogger(__name__)

# Essential lightweight bounce languages
BOUNCE_LANGUAGES = [
    ("French", "fr"),
    ("German", "de"),
    ("Spanish", "es"),
]


def _split_text(text: str, max_len: int = 4000) -> list[str]:
    """Split text into chunks at sentence boundaries to avoid API length limits."""
    if len(text) <= max_len:
        return [text]
    sentences = re.split(r'(?<=[.!?。！？\n])\s+', text)
    chunks = []
    current = ""

    for sentence in sentences:
        if not sentence.strip():
            continue
        if len(current) + len(sentence) + 1 > max_len:
            if current:
                chunks.append(current.strip())
            current = sentence
        else:
            current = f"{current} {sentence}".strip()

    if current:
        chunks.append(current.strip())

    return chunks if chunks else [text]


MYMEMORY_LANG_MAP: dict[str, str] = {
    "fi": "fi-FI", "en": "en-US", "ja": "ja-JP", "zh": "zh-CN",
    "de": "de-DE", "fr": "fr-FR", "es": "es-ES", "ko": "ko-KR",
    "ru": "ru-RU", "it": "it-IT", "pt": "pt-PT",
}


def google_translate(text: str, source: str, target: str) -> str:
    """
    Translate text using Google Translate with sentence chunking and retry resilience.
    """
    if not text or not text.strip():
        return text

    if GoogleTranslator is None:
        logger.warning("GoogleTranslator not installed, returning text as-is.")
        return text

    chunks = _split_text(text, max_len=4000)
    translated_chunks = []

    for chunk in chunks:
        success = False
        # Try GoogleTranslator with 2 retries
        for attempt in range(2):
            try:
                translator = GoogleTranslator(source=source, target=target)
                res = translator.translate(chunk)
                if res and res.strip():
                    translated_chunks.append(res.strip())
                    success = True
                    break
            except Exception as e:
                logger.warning("GoogleTranslator (%s -> %s, attempt %d) error: %s", source, target, attempt + 1, e)

        if success:
            continue

        # Try MyMemory as secondary fallback with mapped language codes
        if MyMemoryTranslator is not None:
            try:
                mm_src = MYMEMORY_LANG_MAP.get(source, source)
                mm_tgt = MYMEMORY_LANG_MAP.get(target, target)
                mem = MyMemoryTranslator(source=mm_src, target=mm_tgt)
                res = mem.translate(chunk[:500])
                if res and res.strip():
                    translated_chunks.append(res.strip())
                    success = True
            except Exception as mem_err:
                logger.warning("MyMemory fallback (%s -> %s) failed: %s", source, target, mem_err)

        if not success:
            translated_chunks.append(chunk)

    return " ".join(translated_chunks)


def niutrans_translate(text: str, source: str, target: str, api_key: Optional[str] = None) -> str:
    """
    Translate text using Niutrans API.
    Falls back gracefully to Google Translate if key is missing or request fails.
    """
    if not text or not text.strip():
        return text

    key = api_key or NIUTRANS_API_KEY
    if not key:
        logger.info("No Niutrans API key found. Using Google Translate for %s -> %s hop.", source, target)
        return google_translate(text, source=source, target=target)

    chunks = _split_text(text, max_len=4000)
    translated_chunks = []

    for chunk in chunks:
        try:
            resp = httpx.post(
                "https://api.niutrans.com/NiuTransServer/translation",
                json={
                    "from": source,
                    "to": target,
                    "apikey": key,
                    "src_text": chunk,
                },
                timeout=45,
            )
            resp.raise_for_status()
            data = resp.json()
            if "tgt_text" in data and data["tgt_text"]:
                translated_chunks.append(data["tgt_text"])
            else:
                err_msg = data.get("error_msg", "Unknown Niutrans error")
                logger.warning("Niutrans API notice (%s -> %s): %s. Falling back to Google.", source, target, err_msg)
                translated_chunks.append(google_translate(chunk, source=source, target=target))
        except Exception as err:
            logger.warning("Niutrans request failed (%s -> %s): %s. Falling back to Google.", source, target, err)
            translated_chunks.append(google_translate(chunk, source=source, target=target))

    return " ".join(translated_chunks)


class TranslationBouncer:
    """Handles multi-language translation bounce & cross-engine chains."""

    def __init__(self):
        pass

    def _translate(self, text: str, source_lang: str, target_lang: str) -> str:
        """Translate text using open-source translator with fallback."""
        return google_translate(text, source=source_lang, target=target_lang)

    def cross_engine_chain(
        self,
        ja_text: str,
        intermediate_lang: str = "fi",
        target_lang: str = "en",
        niutrans_key: Optional[str] = None
    ) -> tuple[str, str]:
        """
        Executes Step 3 and Step 4 of the Standard Pipeline:
        Step 3: Japanese (JA) -> Intermediate (Finnish 'fi') via Google Translate.
        Step 4: Intermediate ('fi') -> Target ('en') via Niutrans (or Google fallback).

        Returns:
            (intermediate_step_output, final_step_output)
        """
        # Step 3: JA -> Intermediate (e.g. Finnish)
        logger.info("Translation Hop 1: Japanese -> %s (Google Translate)", intermediate_lang.upper())
        hop1 = google_translate(ja_text, source="ja", target=intermediate_lang)

        # Step 4: Intermediate -> Target Language
        logger.info("Translation Hop 2: %s -> %s (Niutrans / Cross-Engine)", intermediate_lang.upper(), target_lang.upper())
        hop2 = niutrans_translate(hop1, source=intermediate_lang, target=target_lang, api_key=niutrans_key)

        return hop1, hop2

    def bounce(self, text: str) -> str:
        """
        Perform translation bounce: English -> Target Lang -> English.
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
        Perform lightweight multi-step bounce: English -> Spanish -> German -> English.
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
