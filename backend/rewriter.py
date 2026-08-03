"""
Text Rewriter module supporting Gemini LLM inference with automatic 5-request API key rotation
and Groq fallback redundancy.
"""

import threading
import logging
from typing import Optional
from groq import Groq, APIError, APITimeoutError, RateLimitError, AuthenticationError

from config import (
    GROQ_API_KEY,
    GROQ_MODEL,
    GROQ_FALLBACK_MODEL,
    GEMINI_MODEL,
    GEMINI_API_KEYS,
    MAX_RETRIES,
    API_TIMEOUT,
    RewriteMode,
    RewriteLevel,
)
from prompts import build_rewrite_prompt, build_grammar_prompt

logger = logging.getLogger(__name__)


class RewriteError(Exception):
    """Raised when rewriting fails after all retries."""
    pass


# ── Global Request Counter & Lock for 5-Request Key Rotation ───────────────

_request_counter = 0
_counter_lock = threading.Lock()


def get_next_gemini_key() -> tuple[int, str]:
    """
    Increments global request counter and rotates Gemini API key every 5 requests.
    Returns (key_index_1_based, api_key_string).
    """
    global _request_counter
    if not GEMINI_API_KEYS:
        raise ValueError("No Gemini API keys configured.")

    with _counter_lock:
        _request_counter += 1
        current_count = _request_counter

    # Key index switches every 5 requests: (0..4 -> Key 0, 5..9 -> Key 1, etc.)
    key_idx = ((current_count - 1) // 5) % len(GEMINI_API_KEYS)
    selected_key = GEMINI_API_KEYS[key_idx]

    logger.info(
        "Request #%d │ Gemini Key Pool Rotation: Using Key #%d of %d (5-request rotation cycle)",
        current_count,
        key_idx + 1,
        len(GEMINI_API_KEYS)
    )
    return key_idx + 1, selected_key


class TextRewriter:
    """Sends text to Gemini API (with 5-request key rotation) or Groq fallback for humanization."""

    def __init__(self):
        if GROQ_API_KEY:
            self.groq_client = Groq(api_key=GROQ_API_KEY)
        else:
            self.groq_client = None

        self.groq_model = GROQ_MODEL
        self.groq_fallback = GROQ_FALLBACK_MODEL

    def _call_gemini(self, system_prompt: str, user_prompt: str, key_override: Optional[str] = None) -> str:
        """
        Make a single call to Gemini API using key rotation (or override key).
        """
        if key_override:
            api_key = key_override
            key_num = 1
        else:
            key_num, api_key = get_next_gemini_key()

        full_prompt = f"{system_prompt}\n\nTask Instructions & User Text:\n{user_prompt}"

        # Attempt call via official google.genai or fallback REST API
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=full_prompt,
            )
            content = response.text
            if content and content.strip():
                return content.strip()
            raise RewriteError("Gemini API returned an empty response.")
        except Exception as err:
            err_msg = str(err)
            logger.warning("Gemini Key #%d call error: %s", key_num, err_msg)
            raise RewriteError(f"Gemini API Error (Key #{key_num}): {err_msg}")

    def _call_groq(self, system_prompt: str, user_prompt: str, model: Optional[str] = None) -> str:
        """
        Make a fallback call to Groq API.
        """
        if not self.groq_client:
            raise RewriteError("Groq API client not configured.")

        target_model = model or self.groq_model
        tm_lower = target_model.lower()

        if 'qwen' in tm_lower:
            target_model = 'qwen/qwen3.6-27b'
        elif any(term in tm_lower for term in ['3.3', 'llama-3.3', 'llama 3.3']):
            target_model = 'llama-3.3-70b-versatile'

        effective_system = system_prompt
        extra_kwargs = {}
        if 'qwen' in target_model.lower():
            effective_system = '/no_think\n\n' + system_prompt
            extra_kwargs['extra_body'] = {'reasoning_format': 'hidden'}

        try:
            response = self.groq_client.chat.completions.create(
                model=target_model,
                messages=[
                    {"role": "system", "content": effective_system},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.9,
                max_tokens=4096,
                top_p=0.95,
                frequency_penalty=0.6,
                presence_penalty=0.4,
                timeout=API_TIMEOUT,
                **extra_kwargs
            )
            content = response.choices[0].message.content
            if not content:
                raise RewriteError("Groq API returned an empty response.")
            return content.strip()

        except AuthenticationError:
            raise RewriteError("Invalid Groq API key.")
        except RateLimitError:
            raise RewriteError("Groq API rate limit reached.")
        except APITimeoutError:
            raise RewriteError("Groq API request timed out.")
        except Exception as ex:
            raise RewriteError(f"Groq API Error: {ex}")

    def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """
        Main LLM dispatcher:
        1. Tries Gemini API with 5-request key rotation.
        2. If Gemini key fails or hits quota, attempts remaining Gemini keys in pool.
        3. If all Gemini keys fail, falls back to Groq API.
        """
        # Step 1: Try Gemini with key rotation
        if GEMINI_API_KEYS:
            for attempt in range(len(GEMINI_API_KEYS)):
                try:
                    res = self._call_gemini(system_prompt, user_prompt)
                    return res
                except RewriteError as gemini_err:
                    logger.warning("Gemini rotation attempt %d failed: %s", attempt + 1, gemini_err)

        # Step 2: Fallback to Groq API
        logger.info("Falling back to Groq LLM inference (%s)", self.groq_model)
        models_to_try = [self.groq_model, self.groq_fallback]

        last_error = None
        for model in models_to_try:
            for attempt in range(MAX_RETRIES + 1):
                try:
                    result = self._call_groq(system_prompt, user_prompt, model=model)
                    logger.info("Rewrite succeeded with Groq model=%s on attempt=%d", model, attempt + 1)
                    return result
                except RewriteError as e:
                    last_error = e
                    logger.warning("Groq attempt %d with model %s failed: %s", attempt + 1, model, e)

        raise RewriteError(f"Rewriting failed after trying Gemini and Groq models. Last error: {last_error}")

    def rewrite(self, text: str, mode: RewriteMode, level: RewriteLevel) -> str:
        """
        Rewrite the text using the specified mode and level.
        """
        system_prompt, user_prompt = build_rewrite_prompt(text, mode, level)
        return self._call_llm(system_prompt, user_prompt)

    def grammar_polish(self, text: str) -> str:
        """
        Run a grammar-only polish pass on the text.
        """
        system_prompt, user_prompt = build_grammar_prompt(text)
        try:
            return self._call_llm(system_prompt, user_prompt)
        except RewriteError:
            logger.warning("Grammar polish failed, returning text as-is.")
            return text
