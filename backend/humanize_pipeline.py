"""
Standard Humanize Pipeline Module.

Groq-only 2-pass direct humanization strategy:

Pass 1: Full structural rewrite — breaks AI sentence patterns, varies starters,
         targets human sentence-length statistics (~18-23 word average).

Pass 2: Naturalness polish — targeted cleanup of any remaining AI signals,
         sentence variety enforcement, contraction injection.

Step 3: Detection-guided feedback loop (forensic AI checker + stat validator).
"""

import time
import logging
import random
from typing import Optional, Dict, List, Any

_rng = random.Random()

from config import RewriteMode, RewriteLevel
from rewriter import TextRewriter, RewriteError
from humanizer import (
    humanize,
    clean_erroneous_punctuation,
    enforce_short_sentences,
    enforce_short_sentences_aggressive,
    disrupt_sentence_rhythm,
    strip_formatting_artifacts,
    signal_targeted_cleanup,
    normalize_word_complexity,
    inject_pronoun_subjects,
    inject_micro_sentences,
    extract_final_output,
)
from ai_checker import AICheckEngine
from validators import validate_human_statistics
from prompts import build_naturalness_polish_prompt

logger = logging.getLogger(__name__)


class StandardHumanizePipeline:
    """
    Production-grade Groq-only 2-pass humanization pipeline with
    detection-guided feedback loop.
    """

    def __init__(
        self,
        rewriter: Optional[TextRewriter] = None,
    ):
        self.rewriter = rewriter or TextRewriter()

    def run_standard_chain(
        self,
        text: str,
        target_lang: str = "en",
        mode: RewriteMode = RewriteMode.STANDARD,
        level: RewriteLevel = RewriteLevel.MODERATE,
        apply_detection_feedback: bool = True,
    ) -> Dict[str, Any]:
        """
        Executes the 2-pass + feedback Groq-only humanization chain.

        Returns:
            dict containing:
                - 'result': final humanized text
                - 'steps': list of intermediate steps
                - 'processing_time_ms': total processing duration in ms
                - 'ai_report': forensic AI check verdict and score
        """
        if not text or not text.strip():
            return {
                "result": text,
                "steps": [],
                "processing_time_ms": 0,
                "ai_report": None,
            }

        start_time = time.time()
        steps = []
        mode_val = mode.value if hasattr(mode, "value") else str(mode)
        intensity = 0.4 if level == 1 else (0.7 if level == 2 else 1.0)
        original_word_count = len(text.split())

        # ── Pass 1: Full structural rewrite (Groq primary) ─────────────────────
        logger.info("Pipeline Pass 1: Full structural humanization rewrite (Groq)")
        try:
            pass1_out = self.rewriter.rewrite(text, mode, level)
        except Exception as e1:
            logger.warning("Pass 1 LLM rewrite failed: %s. Falling back to rule-based humanizer.", e1)
            pass1_out = humanize(text, intensity=intensity, original_text=text, mode=mode_val)

        # Post-process Pass 1 to strip any LLM artifacts
        pass1_out = strip_formatting_artifacts(pass1_out)
        pass1_out = signal_targeted_cleanup(pass1_out, mode=mode_val)
        pass1_out = clean_erroneous_punctuation(pass1_out)

        steps.append({
            "step": 1,
            "engine": "Groq LLM",
            "direction": "Structural humanization rewrite",
            "output": pass1_out,
            "length": len(pass1_out),
        })

        # ── Pass 2: Naturalness polish (Groq second pass) ──────────────────────
        logger.info("Pipeline Pass 2: Groq naturalness polish pass")
        step2_out = pass1_out
        try:
            polish_system, polish_user = build_naturalness_polish_prompt(
                pass1_out, original_word_count
            )
            polish_result = self.rewriter._call_llm(polish_system, polish_user)
            if polish_result and len(polish_result.split()) >= int(original_word_count * 0.75):
                step2_out = extract_final_output(polish_result)
                if not step2_out:
                    step2_out = polish_result.strip()
            else:
                logger.warning("Pass 2 polish output too short or empty; using Pass 1 output.")
        except Exception as e2:
            logger.warning("Pass 2 naturalness polish failed: %s. Using Pass 1 output.", e2)

        # Post-process Pass 2
        step2_out = strip_formatting_artifacts(step2_out)
        step2_out = signal_targeted_cleanup(step2_out, mode=mode_val)
        step2_out = disrupt_sentence_rhythm(step2_out, short_threshold=8)
        step2_out = clean_erroneous_punctuation(step2_out)

        steps.append({
            "step": 2,
            "engine": "Groq LLM",
            "direction": "Naturalness polish pass",
            "output": step2_out,
            "length": len(step2_out),
        })

        # ── Step 3: Detection-Guided Iterative Feedback Loop ──────────────────
        final_result = step2_out
        ai_report = None

        if apply_detection_feedback:
            logger.info("Pipeline Step 3: Detection-Guided Feedback Verification")

            max_feedback_passes = 3
            for pass_num in range(max_feedback_passes):
                report = AICheckEngine.analyze(final_result)
                ai_report = report.to_dict()

                is_stat_valid, stat_reason, _ = validate_human_statistics(final_result)

                # Target: score <= 5 (solidly Human verdict)
                if report.overall_score <= 5 and is_stat_valid:
                    logger.info(
                        "Detection feedback PASS %d: Score %d/27 (Human). Done.",
                        pass_num + 1, report.overall_score,
                    )
                    break

                logger.info(
                    "Detection feedback PASS %d trigger (Score: %d/27, Valid: %s, Reason: %s).",
                    pass_num + 1, report.overall_score, is_stat_valid, stat_reason,
                )

                # Pass A: Signal-targeted regex surgery (cheap, always runs first)
                final_result = signal_targeted_cleanup(final_result, mode=mode_val)
                final_result = normalize_word_complexity(final_result)
                final_result = enforce_short_sentences_aggressive(final_result, max_words=20)
                final_result = disrupt_sentence_rhythm(final_result, short_threshold=8)
                final_result = inject_pronoun_subjects(final_result, _rng)
                final_result = clean_erroneous_punctuation(final_result)

                # Re-check after regex surgery
                report_after_regex = AICheckEngine.analyze(final_result)
                if report_after_regex.overall_score <= 5:
                    ai_report = report_after_regex.to_dict()
                    logger.info("Signal cleanup brought score to %d/27. Done.", report_after_regex.overall_score)
                    break

                # Pass B: LLM naturalness repass (only on first pass, expensive)
                if pass_num == 0 and report_after_regex.overall_score >= 8:
                    try:
                        word_count = len(final_result.split())
                        burst_system = (
                            "You are a senior copyeditor fixing AI-detectable writing patterns.\n\n"
                            "The draft below scores as AI-generated. Fix these specific issues:\n\n"
                            "1. SENTENCE LENGTH: Break any sentence over 24 words into two shorter sentences.\n"
                            "   Target average: 18-21 words per sentence (human average).\n\n"
                            "2. SENTENCE STARTERS: If two or more consecutive sentences start with the same word,\n"
                            "   rephrase one to start differently. Vary pronouns, nouns, and verb phrases.\n\n"
                            "3. BANNED WORDS — replace every remaining one:\n"
                            "   furthermore, moreover, additionally, notably, importantly, consequently,\n"
                            "   ultimately, fundamentally, crucially, seamless, robust, nuanced, pivotal,\n"
                            "   paradigm, multifaceted, transformative, vibrant, intricate.\n\n"
                            "4. WORD COMPLEXITY: Swap any 3+ syllable word for a simpler equivalent where meaning is preserved.\n"
                            "   'demonstrate' -> 'show'. 'eliminate' -> 'remove'. 'utilize' -> 'use'.\n\n"
                            "5. CONTRACTIONS: Add natural contractions where they fit the register.\n"
                            "   it's, don't, can't, they're, we're, you'll, isn't, hasn't.\n\n"
                            "HARD RULES:\n"
                            "- ZERO em dashes (—), ZERO semicolons (;).\n"
                            "- Do NOT change any facts, numbers, dates, or technical terms.\n"
                            "- Do NOT add information not in the draft.\n"
                            "- Output ONLY the revised text. No preamble, no notes."
                        )
                        burst_user = f"Draft to fix (target ~{word_count} words):\n{final_result}"
                        burst_res = self.rewriter._call_llm(burst_system, burst_user)
                        if burst_res and len(burst_res.split()) >= int(word_count * 0.75):
                            burst_res = extract_final_output(burst_res) or burst_res.strip()
                            burst_res = humanize(burst_res, intensity=intensity, original_text=text, mode=mode_val)
                            burst_res = signal_targeted_cleanup(burst_res, mode=mode_val)
                            burst_res = clean_erroneous_punctuation(burst_res)
                            final_result = burst_res
                            logger.info("Detection-guided naturalness repass completed.")
                    except Exception as burst_err:
                        logger.warning("Detection feedback repass failed: %s", burst_err)

                # Update ai_report with latest score
                report_final = AICheckEngine.analyze(final_result)
                ai_report = report_final.to_dict()

        elapsed_ms = int((time.time() - start_time) * 1000)

        return {
            "result": final_result,
            "steps": steps,
            "processing_time_ms": elapsed_ms,
            "ai_report": ai_report,
        }

    def process(
        self,
        text: str,
        mode: RewriteMode = RewriteMode.STANDARD,
        level: RewriteLevel = RewriteLevel.MODERATE,
        target_lang: str = "en",
    ) -> str:
        """
        Main entry point for processing text while preserving list and paragraph structure.
        """
        if not text or not text.strip():
            return text

        lines = text.split('\n')
        is_list = len(lines) >= 2 and any(
            line.strip().startswith(('-', '*', '•', '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.')) or
            (':' in line and len(line.split(':')[0].split()) <= 4)
            for line in lines if line.strip()
        )

        mode_val = mode.value if hasattr(mode, "value") else str(mode)

        if is_list:
            rewritten_lines = []
            for line in lines:
                stripped = line.strip()
                if not stripped:
                    rewritten_lines.append("")
                    continue

                prefix = ""
                core = stripped
                for marker in ('-', '*', '•', '1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.'):
                    if stripped.startswith(marker):
                        prefix = marker + " "
                        core = stripped[len(marker):].strip()
                        break

                if ":" in core and len(core.split(":")[0].split()) <= 4:
                    parts = core.split(":", 1)
                    key, val = parts[0].strip(), parts[1].strip()
                    val_res = self.run_standard_chain(val, target_lang=target_lang, mode=mode, level=level)
                    rewritten_lines.append(f"{prefix}{key}: {val_res['result']}")
                else:
                    line_res = self.run_standard_chain(core, target_lang=target_lang, mode=mode, level=level)
                    rewritten_lines.append(f"{prefix}{line_res['result']}")
            return "\n".join(rewritten_lines)

        orig_paras = [p.strip() for p in text.split('\n\n') if p.strip()]

        # Long documents: process paragraph by paragraph to avoid truncation
        if len(orig_paras) > 1 and len(text.split()) > 400:
            rewritten_paras = []
            for para in orig_paras:
                res = self.run_standard_chain(para, target_lang=target_lang, mode=mode, level=level)
                rewritten_paras.append(res["result"])
            return "\n\n".join(rewritten_paras)

        # Single paragraph or medium document: run cohesive pipeline
        res = self.run_standard_chain(text, target_lang=target_lang, mode=mode, level=level)
        return res["result"]


_pipeline_instance: Optional[StandardHumanizePipeline] = None


def get_standard_pipeline() -> StandardHumanizePipeline:
    """Singleton getter for StandardHumanizePipeline."""
    global _pipeline_instance
    if _pipeline_instance is None:
        _pipeline_instance = StandardHumanizePipeline()
    return _pipeline_instance
