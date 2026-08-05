"""
Text Rewriter module supporting Gemini LLM inference with automatic 5-request API key rotation
and Groq fallback redundancy.
"""

import threading
import logging
import random
from typing import Optional
from groq import Groq, APIError, APITimeoutError, RateLimitError, AuthenticationError

from config import (
    GROQ_API_KEY,
    GROQ_API_KEYS,
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

_gemini_request_counter = 0
_groq_request_counter = 0
_counter_lock = threading.Lock()


def get_next_gemini_key() -> tuple[int, str]:
    """
    Increments global request counter and rotates Gemini API key every 5 requests.
    Returns (key_index_1_based, api_key_string).
    """
    global _gemini_request_counter
    if not GEMINI_API_KEYS:
        raise ValueError("No Gemini API keys configured.")

    with _counter_lock:
        _gemini_request_counter += 1
        current_count = _gemini_request_counter

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


def get_next_groq_key() -> tuple[int, str]:
    """
    Increments global request counter and rotates Groq API key every 5 requests.
    Returns (key_index_1_based, api_key_string).
    """
    global _groq_request_counter
    if not GROQ_API_KEYS:
        raise ValueError("No Groq API keys configured.")

    with _counter_lock:
        _groq_request_counter += 1
        current_count = _groq_request_counter

    key_idx = ((current_count - 1) // 5) % len(GROQ_API_KEYS)
    selected_key = GROQ_API_KEYS[key_idx]

    logger.info(
        "Request #%d │ Groq Key Pool Rotation: Using Key #%d of %d (5-request rotation cycle)",
        current_count,
        key_idx + 1,
        len(GROQ_API_KEYS)
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
        Make a single call to Gemini API using key rotation (or override key) with randomized temperature.
        """
        if key_override:
            api_key = key_override
            key_num = 1
        else:
            key_num, api_key = get_next_gemini_key()

        full_prompt = f"{system_prompt}\n\nTask Instructions & User Text:\n{user_prompt}"
        temp = round(random.uniform(0.85, 1.05), 2)

        # Attempt call via official google.genai or fallback REST API
        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=api_key)
            try:
                config = types.GenerateContentConfig(temperature=temp, top_p=0.92)
                response = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=full_prompt,
                    config=config,
                )
            except Exception:
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

    def _call_groq(self, system_prompt: str, user_prompt: str, model: Optional[str] = None, key_idx_override: Optional[int] = None) -> str:
        """
        Make a call to Groq API using key pool rotation across configured Groq keys.
        """
        if not GROQ_API_KEYS:
            raise RewriteError("Groq API keys not configured.")

        if key_idx_override is not None:
            key_num = (key_idx_override % len(GROQ_API_KEYS)) + 1
            api_key = GROQ_API_KEYS[key_idx_override % len(GROQ_API_KEYS)]
            logger.info("Groq Key Pool Rotation: Using Key #%d of %d", key_num, len(GROQ_API_KEYS))
        else:
            key_num, api_key = get_next_groq_key()

        # Set max_retries=0 so rate-limited (429/413) calls fail immediately and rotate to the next key without waiting 30s
        groq_client = Groq(api_key=api_key, max_retries=0)

        target_model = model or self.groq_model
        tm_lower = target_model.lower()

        if 'qwen' in tm_lower:
            if '3.6' in tm_lower or '27b' in tm_lower:
                target_model = 'qwen/qwen3.6-27b'
            elif 'coder' in tm_lower:
                target_model = 'qwen-2.5-coder-32b'
            else:
                target_model = 'qwen-2.5-32b'
        elif any(term in tm_lower for term in ['3.3', 'llama-3.3', 'llama 3.3']):
            target_model = 'llama-3.3-70b-versatile'

        effective_system = system_prompt
        extra_kwargs = {}
        # Set max_tokens to 3000 for Qwen to strictly stay within Groq's 8,000 TPM limit
        max_tok = 3000 if 'qwen' in target_model.lower() else 4096

        if 'qwen' in target_model.lower():
            effective_system = '/no_think\n\n' + system_prompt
            extra_kwargs['extra_body'] = {'reasoning_format': 'hidden'}

        temp = round(random.uniform(0.88, 1.02), 2)

        try:
            response = groq_client.chat.completions.create(
                model=target_model,
                messages=[
                    {"role": "system", "content": effective_system},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temp,
                max_tokens=max_tok,
                top_p=0.92,
                frequency_penalty=0.6,
                presence_penalty=0.4,
                timeout=API_TIMEOUT,
                **extra_kwargs
            )
            content = response.choices[0].message.content
            if not content:
                raise RewriteError(f"Groq API (Key #{key_num}, model {target_model}) returned an empty response.")
            return content.strip()

        except AuthenticationError:
            raise RewriteError(f"Invalid Groq API key #{key_num}.")
        except RateLimitError:
            raise RewriteError(f"Groq API Key #{key_num} rate limit reached for {target_model}.")
        except APITimeoutError:
            raise RewriteError(f"Groq API Key #{key_num} request timed out.")
        except Exception as ex:
            raise RewriteError(f"Groq API Error (Key #{key_num}, model {target_model}): {ex}")

    def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """
        Main LLM dispatcher:
        1. Tries Groq API (Qwen 3.6 -> Llama 3.3 70B) across all Groq keys.
        2. Fallback to Gemini API key pool rotation if all Groq models/keys fail.
        """
        # Step 1: Primary - Try Groq API with instant key rotation and model fallback
        if GROQ_API_KEYS:
            with _counter_lock:
                start_k_idx = (_groq_request_counter // 5) % len(GROQ_API_KEYS)

            groq_models = [self.groq_model, self.groq_fallback]
            for offset in range(len(GROQ_API_KEYS)):
                current_k_idx = (start_k_idx + offset) % len(GROQ_API_KEYS)
                for g_model in groq_models:
                    try:
                        res = self._call_groq(system_prompt, user_prompt, model=g_model, key_idx_override=current_k_idx)
                        return res
                    except RewriteError as groq_err:
                        logger.warning("Groq Key #%d (%s) attempt failed: %s", current_k_idx + 1, g_model, groq_err)

        # Step 2: Fallback - Gemini API with instant rotation across distinct Gemini keys
        logger.info("Falling back to Gemini LLM inference (%s)", GEMINI_MODEL)
        if GEMINI_API_KEYS:
            with _counter_lock:
                start_g_idx = (_gemini_request_counter // 5) % len(GEMINI_API_KEYS)

            for offset in range(len(GEMINI_API_KEYS)):
                current_g_idx = (start_g_idx + offset) % len(GEMINI_API_KEYS)
                try:
                    res = self._call_gemini(system_prompt, user_prompt, key_override=GEMINI_API_KEYS[current_g_idx])
                    return res
                except RewriteError as gemini_err:
                    logger.warning("Gemini Key #%d attempt failed: %s", current_g_idx + 1, gemini_err)

        raise RewriteError("Rewriting failed after trying all Groq and Gemini key pools.")

    def rewrite(self, text: str, mode: RewriteMode, level: RewriteLevel) -> str:
        """
        Rewrite the text using the specified mode and level.
        Applies a multi-pass ("double cook") strategy for Heavy level rewrites.
        """
        system_prompt, user_prompt = build_rewrite_prompt(text, mode, level)
        pass1_result = self._call_llm(system_prompt, user_prompt)

        level_val = level.value if hasattr(level, 'value') else int(level)
        if level_val >= 3:
            logger.info("Running Pass 2 (Double Cook) naturalization pass for Level %d rewrite", level_val)
            pass2_system = (
                "You are an expert human copyeditor. Take the provided text draft and make it sound "
                "even more like a real person typed it quickly in one take. "
                "Break any smooth, robotic sentence transitions. Use short sentences (8-14 words). "
                "Start 40%+ of sentences with personal pronouns (I, We, You, They, It). "
                "Keep all facts, numbers, dates, and paragraph counts identical. "
                "Return ONLY the rewritten text without preambles or notes."
            )
            pass2_user = f'Draft text to naturalize:\n"{pass1_result}"'
            try:
                pass2_result = self._call_llm(pass2_system, pass2_user)
                if pass2_result and len(pass2_result.split()) >= int(len(text.split()) * 0.7):
                    return pass2_result
            except Exception as ex:
                logger.warning("Pass 2 naturalization pass failed, using Pass 1 output: %s", ex)

        return pass1_result

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
