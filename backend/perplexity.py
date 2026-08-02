"""
Perplexity Optimization module.
Implements Step 2.5 of the pipeline:
1. Paraphrase targeting increased perplexity (using temperature 1.3 to maximize sentence variety)
2. Persona-specific rewrite (e.g. college student or subject matter expert)
"""

import logging
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL, GROQ_FALLBACK_MODEL, RewriteMode

logger = logging.getLogger(__name__)


class PerplexityOptimizer:
    """Maximizes linguistic variety and applies target personas to bypass AI detectors."""

    def __init__(self):
        if not GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not set. Check your .env file.")
        self.client = Groq(api_key=GROQ_API_KEY)
        self.model = GROQ_MODEL
        self.fallback_model = GROQ_FALLBACK_MODEL

    def _call_groq(self, system_prompt: str, user_prompt: str, temp: float = 1.3) -> str:
        """Call Groq using the fast fallback model to prevent primary model rate limit exhaustion."""
        target_model = self.fallback_model
        try:
            response = self.client.chat.completions.create(
                model=target_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temp,
                max_tokens=4096,
                top_p=0.95,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error("Groq call failed in PerplexityOptimizer with model %s: %s", target_model, e)
            return user_prompt


    def optimize(self, text: str, mode: str) -> str:
        """
        Runs the perplexity and persona pass combined into a single fast call
        using a temperature of 1.3 to maximize sentence variety.
        """
        mode_val = mode.value if hasattr(mode, 'value') else str(mode)
        if mode_val in (RewriteMode.CASUAL, RewriteMode.FRIENDLY, RewriteMode.SIMPLE):
            persona = "college student writing an organic, personal essay"
        elif mode_val in (RewriteMode.ACADEMIC, RewriteMode.FORMAL):
            persona = "scholarly subject matter expert writing a peer-reviewed paper"
        elif mode_val in (RewriteMode.PROFESSIONAL, RewriteMode.BUSINESS, RewriteMode.CONCISE):
            persona = "seasoned industry executive and expert"
        else:
            persona = "highly educated native English speaker"

        # Combined instruction: paraphrase to increase perplexity, vary sentence rhythm, and apply persona
        system_prompt = (
            f"You are a {persona}. "
            "Paraphrase the following text to maximize linguistic perplexity and sentence variety. "
            "STRICT RULES FOR ANTI-AI DETECTION:\n"
            "1. KEEP SENTENCES SHORT (AVG 14-18 WORDS, MAX 22 WORDS). Never write long, multi-clause compound sentences.\n"
            "2. USE PRONOUN-FIRST SUBJECT FRAMING ('you', 'we', 'it', 'they') instead of abstract noun phrases ('Software development...', 'Modern practices...').\n"
            "3. BANNED OPENERS: Never start sentences with 'As...', 'Modern...', '[Noun] is a...'. Use natural conversational openers.\n"
            "4. SIMPLE VOCABULARY: Use short, punchy everyday words instead of heavy multi-syllable jargon.\n"
            "5. PRESERVE FACTUAL ACCURACY: Strictly maintain all original facts, meaning, and paragraph structure.\n"
            "6. NO SELF-TALK OR WORD COUNTS: Do NOT write down thinking, word counts like (10), draft attempts, or commentary.\n"
            "Output ONLY the final paraphrased text. No preamble, no explanation, no notes."
        )

        logger.info("Running Combined Perplexity & Persona Optimization Pass (Step 2.5: %s)", persona)
        optimized = self._call_groq(system_prompt, text, temp=1.3)
        optimized = optimized.strip()
        if not optimized:
            return text

        return optimized

