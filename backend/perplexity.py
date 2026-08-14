"""
Perplexity Optimization module.
Implements Step 2.5 of the pipeline:
1. Paraphrase targeting increased perplexity and human stylistic variation
2. Persona-specific voice calibration (e.g. college student, domain specialist, executive)
"""

import logging
import random
from groq import Groq
from config import GROQ_API_KEY, GROQ_API_KEYS, GROQ_MODEL, GROQ_FALLBACK_MODEL, RewriteMode
from rewriter import get_next_groq_key

logger = logging.getLogger(__name__)


class PerplexityOptimizer:
    """Maximizes linguistic variety and applies target personas to eliminate AI fingerprints."""

    def __init__(self):
        self.model = GROQ_MODEL
        self.fallback_model = GROQ_FALLBACK_MODEL

    def _call_groq(self, system_prompt: str, user_prompt: str, temp: float = 0.90) -> str:
        """Call Groq using key rotation with balanced entropy sampling."""
        target_model = self.model or "llama-3.3-70b-versatile"

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
                max_tokens=3000,
                top_p=0.95,
                frequency_penalty=0.35,
                presence_penalty=0.20,
            )
            content = response.choices[0].message.content
            return content.strip() if content else user_prompt
        except Exception as e:
            logger.warning("Groq call in PerplexityOptimizer with model %s failed (%s), falling back to instant model", target_model, e)
            try:
                fallback = "llama-3.1-8b-instant"
                response = client.chat.completions.create(
                    model=fallback,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=temp,
                    max_tokens=2048,
                    top_p=0.95,
                )
                content = response.choices[0].message.content
                return content.strip() if content else user_prompt
            except Exception as f_err:
                logger.warning("Fallback in PerplexityOptimizer failed: %s", f_err)
                return user_prompt

    def optimize(self, text: str, mode: str) -> str:
        """
        Runs the perplexity and persona pass combined into a single call.
        """
        mode_val = (mode.value if hasattr(mode, 'value') else str(mode)).lower()
        if mode_val in (RewriteMode.NATURAL.value, RewriteMode.CREATIVE.value, RewriteMode.CASUAL.value, RewriteMode.FRIENDLY.value, RewriteMode.SIMPLE.value):
            persona = "thoughtful human writer writing an authentic, engaging piece"
        elif mode_val in (RewriteMode.ACADEMIC.value, RewriteMode.FORMAL.value):
            persona = "scholarly researcher writing a clear academic paper"
        elif mode_val in (RewriteMode.FLUENCY.value, RewriteMode.PROFESSIONAL.value, RewriteMode.BUSINESS.value, RewriteMode.CONCISE.value):
            persona = "seasoned professional writing clear executive communication"
        else:
            persona = "clear, highly articulate native English speaker"

        orig_words = len(text.split())
        min_words = max(5, int(orig_words * 0.85))
        max_words = max(8, int(orig_words * 1.15))

        system_prompt = (
            f"You are a {persona}.\n"
            "Paraphrase the following text so it flows naturally with authentic human voice, preserves 100% core factual fidelity, and eliminates all AI patterns.\n\n"
            "CORE PRINCIPLES:\n"
            f"1. LENGTH: The source is {orig_words} words. Your rewrite should be between {min_words} and {max_words} words.\n"
            "2. RHYTHMIC DIVERSITY: Mix short punchy sentences (5-10 words) with natural medium sentences (12-20 words). At least 20% of sentences must be 7 words or fewer. Never chain 3+ sentences of the same length.\n"
            "3. STRIP AI VOCABULARY & CLICHES: Eliminate 'delve', 'testament', 'vibrant', 'landscape', 'pivotal', 'leverage', 'robust', 'comprehensive', 'nuanced', 'paradigm', copula avoidance ('serves as' -> 'is'), -ing participle chains, and formulaic transitions ('Furthermore', 'In conclusion', 'Notably', 'Importantly').\n"
            "4. ZERO EM DASHES (--) OR EN DASHES: Replace with commas, periods, or standard hyphens (-).\n"
            "5. STRICT FACTUAL FIDELITY: Preserve all actual facts, names, dates, numbers, formulas, and domain terminology from the source text. NEVER invent new details or inject unrelated topics.\n"
            "6. PARAGRAPH PARITY: Output the exact same number of paragraphs as the input.\n"
            "7. RAW OUTPUT ONLY: Return ONLY the rewritten text with no preamble, markdown code blocks, or commentary.\n\n"
            "SENTENCE COMPLEXITY CONTROL (critical):\n"
            "- HARD CAP: No sentence may exceed 25 words. If a sentence would exceed 25 words, split it into two.\n"
            "- BANNED STRUCTURES: Do not stack relative clauses (', which ... , which ...'). Do not stack subordinate clauses ('because ... since ... while ...'). Do not use more than one comma-joined conjunction per sentence.\n"
            "- FORBIDDEN RUN-ONS: Sentences with 4+ commas are run-ons. Break them.\n"
            "- DIRECT SUBJECT-VERB-OBJECT: Prefer SVO order. 'The team built the tool' beats 'The tool, which was developed by the team after several months of iteration, ...'.\n\n"
            "SPECIFICITY & CONCRETENESS (critical):\n"
            "- BANNED GENERIC NOUNS: 'things', 'aspects', 'factors', 'elements', 'components', 'areas', 'issues', 'challenges', 'opportunities', 'solutions', 'approach', 'various', 'several', 'certain', 'multiple'. Replace with the exact specific noun from the context.\n"
            "- BANNED WEAK VERBS: 'utilize', 'perform', 'conduct', 'implement', 'execute', 'leverage', 'facilitate', 'ensure', 'provide'. Use concrete action verbs: 'build', 'run', 'write', 'send', 'track', 'measure', 'cut', 'increase', 'reduce'.\n"
            "- BANNED VAGUE QUANTIFIERS: 'various', 'several', 'many', 'numerous', 'a number of', 'a variety of'. Use the actual count or specific example from the source, or write 'two', 'three', 'five' if known.\n"
            "- BE SPECIFIC: If the source says 'the system is fast', write what makes it fast. If it says 'costs were reduced', say by how much if the number is in the source."
        )

        logger.info("Running Combined Perplexity & Persona Optimization Pass (Step 2.5: %s)", persona)
        optimized = self._call_groq(system_prompt, text, temp=0.90)
        optimized = optimized.strip()
        if not optimized or len(optimized.split()) < int(orig_words * 0.6):
            return text

        return optimized

