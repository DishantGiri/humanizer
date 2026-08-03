"""
Text Rewriter module.
Handles communication with the Groq API to rewrite text.
"""

import logging
from groq import Groq, APIError, APITimeoutError, RateLimitError, AuthenticationError

from config import GROQ_API_KEY, GROQ_MODEL, GROQ_FALLBACK_MODEL, MAX_RETRIES, API_TIMEOUT
from config import RewriteMode, RewriteLevel
from prompts import build_rewrite_prompt, build_grammar_prompt

logger = logging.getLogger(__name__)


class RewriteError(Exception):
    """Raised when rewriting fails after all retries."""
    pass


class TextRewriter:
    """Sends text to the Groq API for rewriting and optional grammar polishing."""

    def __init__(self):
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not set. Check your .env file.")
        self.client = Groq(api_key=GROQ_API_KEY)
        self.model = GROQ_MODEL
        self.fallback_model = GROQ_FALLBACK_MODEL

    def _call_groq(self, system_prompt: str, user_prompt: str, model: str | None = None) -> str:
        """
        Make a single call to the Groq API.
        Raises specific exceptions for different error types.
        """
        target_model = model or self.model
        tm_lower = target_model.lower()

        # Normalize model aliases
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
            response = self.client.chat.completions.create(
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
            raise RewriteError(
                "Invalid Groq API key. Please check your GROQ_API_KEY in the .env file."
            )
        except RateLimitError:
            raise RewriteError(
                "Groq API rate limit reached. Please wait a moment and try again."
            )
        except APITimeoutError:
            raise RewriteError(
                "Groq API request timed out. The text may be too long, or the service is busy."
            )

    def rewrite(self, text: str, mode: RewriteMode, level: RewriteLevel) -> str:
        """
        Rewrite the text using the specified mode and level.
        Retries with fallback model on transient failures.

        Returns:
            The rewritten text.
        """
        system_prompt, user_prompt = build_rewrite_prompt(text, mode, level)

        last_error = None
        models_to_try = [self.model, self.fallback_model]

        for model in models_to_try:
            for attempt in range(MAX_RETRIES + 1):
                try:
                    result = self._call_groq(system_prompt, user_prompt, model=model)
                    logger.info(
                        "Rewrite succeeded with model=%s on attempt=%d",
                        model, attempt + 1
                    )
                    return result
                except RewriteError as e:
                    last_error = e
                    # Don't retry on auth errors
                    if "API key" in str(e):
                        raise
                    logger.warning(
                        "Rewrite attempt %d with model %s failed: %s",
                        attempt + 1, model, e
                    )

        raise RewriteError(
            f"Rewriting failed after all retries. Last error: {last_error}"
        )

    def grammar_polish(self, text: str) -> str:
        """
        Run a grammar-only polish pass on the text.

        Returns:
            The grammar-corrected text.
        """
        system_prompt, user_prompt = build_grammar_prompt(text)

        try:
            return self._call_groq(system_prompt, user_prompt)
        except RewriteError:
            # Grammar polish is optional — return original if it fails
            logger.warning("Grammar polish failed, returning text as-is.")
            return text
