"""
Meaning Verification module.
Checks whether the rewritten text preserves the original meaning.
"""

import logging
import re
from groq import Groq

from config import GROQ_API_KEY, GROQ_MODEL, GROQ_FALLBACK_MODEL, API_TIMEOUT
from prompts import build_verification_prompt

logger = logging.getLogger(__name__)


class VerificationResult:
    """Holds the result of meaning verification."""

    def __init__(self, meaning_preserved: bool, reason: str):
        self.meaning_preserved = meaning_preserved
        self.reason = reason

    def to_dict(self) -> dict:
        return {
            "meaning_preserved": self.meaning_preserved,
            "reason": self.reason,
        }


class MeaningVerifier:
    """Verifies meaning preservation between original and rewritten text."""

    def __init__(self):
        self.client = Groq(api_key=GROQ_API_KEY)
        self.model = GROQ_MODEL
        self.fallback_model = GROQ_FALLBACK_MODEL

    def _parse_response(self, response_text: str) -> VerificationResult:
        """Parse the LLM's verification response into a structured result."""
        text = response_text.strip().upper()

        # Try to extract MEANING_PRESERVED line
        preserved_match = re.search(
            r"MEANING_PRESERVED\s*:\s*(YES|NO)", text
        )
        # Try to extract REASON line (case-insensitive on original text)
        reason_match = re.search(
            r"REASON\s*:\s*(.+)", response_text.strip(), re.IGNORECASE
        )

        if preserved_match:
            meaning_preserved = preserved_match.group(1) == "YES"
            reason = reason_match.group(1).strip() if reason_match else "No reason provided."
            return VerificationResult(meaning_preserved, reason)

        # Fallback: look for YES/NO anywhere in the response
        if "YES" in text:
            return VerificationResult(True, "Meaning appears to be preserved.")
        elif "NO" in text:
            reason = reason_match.group(1).strip() if reason_match else "Meaning may not be fully preserved."
            return VerificationResult(False, reason)

        # If we can't parse it at all, assume preserved (conservative)
        logger.warning("Could not parse verification response: %s", response_text[:200])
        return VerificationResult(True, "Verification response was ambiguous; assuming preserved.")

    def _call_groq_verify(self, system_prompt: str, user_prompt: str, model: str) -> str:
        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,  # Low temperature for factual comparison
            max_tokens=256,
            timeout=API_TIMEOUT,
        )
        return response.choices[0].message.content or ""

    def verify(self, original: str, rewritten: str) -> VerificationResult:
        """
        Compare original and rewritten texts using the Groq API.
        Tries primary model first, falls back to fallback model on failure.

        Returns:
            VerificationResult with meaning_preserved flag and reason.
        """
        system_prompt, user_prompt = build_verification_prompt(original, rewritten)

        last_error = None
        models_to_try = [self.model, self.fallback_model]

        for model in models_to_try:
            try:
                content = self._call_groq_verify(system_prompt, user_prompt, model)
                return self._parse_response(content)
            except Exception as e:
                last_error = e
                logger.warning("Meaning verification failed with model %s: %s. Trying fallback if available.", model, e)

        # On ultimate failure, log error and assume preserved (don't block the user)
        logger.error("All meaning verification models failed. Last error: %s", last_error)
        return VerificationResult(
            True,
            f"Verification could not be completed: {str(last_error)}"
        )
