"""
Perplexity Optimization module.
Implements Step 2.5 of the pipeline:
1. Paraphrase targeting increased perplexity (using temperature 1.3 to maximize sentence variety)
2. Persona-specific rewrite (e.g. college student or subject matter expert)
"""

import logging
from groq import Groq
from config import GROQ_API_KEY, GROQ_API_KEYS, GROQ_MODEL, GROQ_FALLBACK_MODEL, RewriteMode
from rewriter import get_next_groq_key

logger = logging.getLogger(__name__)


class PerplexityOptimizer:
    """Maximizes linguistic variety and applies target personas to bypass AI detectors."""

    def __init__(self):
        self.model = GROQ_MODEL
        self.fallback_model = GROQ_FALLBACK_MODEL

    def _call_groq(self, system_prompt: str, user_prompt: str, temp: float = 1.2) -> str:
        """Call Groq using key rotation and fast model for maximum response speed."""
        target_model = "llama-3.1-8b-instant" if self.fallback_model != "llama-3.1-8b-instant" else self.fallback_model
        
        if GROQ_API_KEYS:
            key_num, api_key = get_next_groq_key()
            client = Groq(api_key=api_key, max_retries=0)
        elif GROQ_API_KEY:
            client = Groq(api_key=GROQ_API_KEY, max_retries=0)
        else:
            return user_prompt

        try:
            response = client.chat.completions.create(
                model=target_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temp,
                max_tokens=2048,
                top_p=0.92,
            )
            content = response.choices[0].message.content
            return content.strip() if content else user_prompt
        except Exception as e:
            logger.warning("Groq call in PerplexityOptimizer with model %s failed: %s", target_model, e)
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
            "Paraphrase the following text so it reads naturally, preserves core meaning, intent, and emphasis, and sounds like it was written by a skilled human author.\n"
            "CORE PRINCIPLES:\n"
            "1. NATURAL SENTENCE VARIATION: Mix short, punchy lines with medium and occasional longer sentences naturally. Avoid repetitive rhythm.\n"
            "2. STRUCTURAL PARAPHRASING: Rephrase sentence structure and wording naturally where possible. Preserve any phrases that must remain unchanged (names, quotes, technical terms, code).\n"
            "3. PRONOUN-FIRST FRAMING: Prefer starting sentences with pronouns ('we', 'you', 'it', 'they', 'I') over heavy abstract noun phrases.\n"
            "4. AVOID CLICHÉ AI VOCABULARY: Avoid cliché AI phrases ('delve into', 'tapestry of', 'testament to', 'ever-evolving landscape'). Use simple, clear vocabulary.\n"
            "5. PRESERVE FACTUAL ACCURACY & TONE: Strictly preserve all facts, numbers, names, author's intent, emphasis, and paragraph structure.\n"
            "6. NO SELF-TALK OR WORD COUNTS: Output ONLY the final paraphrased text. No preamble, no notes."
        )

        logger.info("Running Combined Perplexity & Persona Optimization Pass (Step 2.5: %s)", persona)
        optimized = self._call_groq(system_prompt, text, temp=1.3)
        optimized = optimized.strip()
        if not optimized:
            return text

        return optimized

