"""
Standard Humanize Pipeline Module.

Synthesizes humanize-text's v1.5.1 Linguistic Distance Pipeline with CloakWriter's
advanced stylistic engine and AI forensic verification:

Step 1: Input (EN) -> Chinese (ZH) de-AI LLM rewrite (creative variation, temp 1.3)
Step 2: Chinese -> Japanese (JA) de-AI LLM rewrite (carries Step 1 conversation history)
Step 3: Japanese -> Finnish (FI) via Google Translate (Uralic agglutinative syntax disruption)
Step 4: Finnish -> Target (EN) via Niutrans / Google Translate (cross-engine reconstruction)
Step 5: CloakWriter Stylistic Engine (copula restoration, contraction calibration, AI vocab eradication)
Step 6: Detection-Guided Feedback Loop (forensic AI checker validation & burstiness enforcement)
"""

import time
import logging
from typing import Optional, Dict, List, Any

from config import RewriteMode, RewriteLevel, NIUTRANS_API_KEY
from rewriter import TextRewriter, RewriteError
from translator import TranslationBouncer, google_translate, niutrans_translate
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
)
from ai_checker import AICheckEngine
from validators import validate_human_statistics

logger = logging.getLogger(__name__)


class StandardHumanizePipeline:
    """
    Production-grade humanization pipeline combining linguistic distance cross-engine translation
    with deep stylistic refinement and detection-guided verification.
    """

    def __init__(
        self,
        rewriter: Optional[TextRewriter] = None,
        bouncer: Optional[TranslationBouncer] = None,
        intermediate_lang: str = "fi",
    ):
        self.rewriter = rewriter or TextRewriter()
        self.bouncer = bouncer or TranslationBouncer()
        self.intermediate_lang = intermediate_lang

    def run_standard_chain(
        self,
        text: str,
        target_lang: str = "en",
        mode: RewriteMode = RewriteMode.STANDARD,
        level: RewriteLevel = RewriteLevel.MODERATE,
        apply_detection_feedback: bool = True,
    ) -> Dict[str, Any]:
        """
        Executes the full 6-step humanization chain.

        Args:
            text: Input text to humanize.
            target_lang: Target language code for final output (default: "en").
            mode: Rewrite style mode (e.g. Standard, Academic, Casual).
            level: Rewrite level (Light, Moderate, Heavy).
            apply_detection_feedback: Whether to run detection-guided feedback loop.

        Returns:
            dict containing:
                - 'result': final humanized text
                - 'steps': list of intermediate steps with engine & output
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

        # ── Step 1: Input -> Chinese (LLM de-AI rewrite) ──────────────────────
        logger.info("Pipeline Step 1: Input -> Chinese (LLM de-AI rewrite)")
        try:
            step1_out = self.rewriter.cross_lingual_rewrite(
                text=text,
                target_language="中文",
                history=None,
                temperature=1.3,
            )
        except Exception as e1:
            logger.warning("Step 1 (LLM Input->ZH) failed: %s. Falling back to direct rewrite.", e1)
            step1_out = self.rewriter.rewrite(text, mode, level)

        steps.append({
            "step": 1,
            "engine": "LLM",
            "direction": "Input → Chinese (中文改写)",
            "output": step1_out,
            "length": len(step1_out),
        })

        # ── Step 2: Chinese -> Japanese (LLM with Step 1 conversation history) ──
        logger.info("Pipeline Step 2: Chinese -> Japanese (LLM rewrite with history)")
        try:
            step2_out = self.rewriter.cross_lingual_rewrite(
                text=step1_out,
                target_language="日语",
                history={"input": text, "output": step1_out},
                temperature=1.3,
            )
        except Exception as e2:
            logger.warning("Step 2 (LLM ZH->JA) failed: %s. Using Step 1 output for translation hop.", e2)
            step2_out = step1_out

        steps.append({
            "step": 2,
            "engine": "LLM",
            "direction": "Chinese → Japanese (日语改写)",
            "output": step2_out,
            "length": len(step2_out),
        })

        # ── Step 3: Japanese -> Finnish (First NMT hop via Google Translate) ──
        logger.info("Pipeline Step 3: Japanese -> Finnish (Google Translate)")
        try:
            step3_out = google_translate(step2_out, source="ja", target=self.intermediate_lang)
        except Exception as e3:
            logger.warning("Step 3 (NMT JA->%s) failed: %s. Using step2 output.", self.intermediate_lang, e3)
            step3_out = step2_out

        steps.append({
            "step": 3,
            "engine": "Google Translate",
            "direction": f"Japanese → {self.intermediate_lang.upper()} (一轮翻译)",
            "output": step3_out,
            "length": len(step3_out),
        })

        # ── Step 4: Finnish -> Target Language (Second NMT hop via Niutrans / Google) ──
        logger.info("Pipeline Step 4: Finnish -> %s (Niutrans / Cross-Engine)", target_lang.upper())
        try:
            step4_out = niutrans_translate(
                step3_out,
                source=self.intermediate_lang,
                target=target_lang,
                api_key=NIUTRANS_API_KEY,
            )
        except Exception as e4:
            logger.warning("Step 4 (NMT %s->%s) failed: %s. Falling back to Google.", self.intermediate_lang, target_lang, e4)
            step4_out = google_translate(step3_out, source=self.intermediate_lang, target=target_lang)

        steps.append({
            "step": 4,
            "engine": "Niutrans / NMT",
            "direction": f"{self.intermediate_lang.upper()} → {target_lang.upper()} (二轮翻译)",
            "output": step4_out,
            "length": len(step4_out),
        })

        # ── Step 5: CloakWriter Stylistic Engine Post-Processing ───────────────
        logger.info("Pipeline Step 5: CloakWriter Stylistic Engine Post-Processing")
        step5_out = humanize(step4_out, intensity=intensity, original_text=text, mode=mode_val)
        step5_out = disrupt_sentence_rhythm(step5_out, short_threshold=8)
        step5_out = signal_targeted_cleanup(step5_out, mode=mode_val)
        step5_out = clean_erroneous_punctuation(step5_out)

        steps.append({
            "step": 5,
            "engine": "CloakWriter Stylistics Engine",
            "direction": "Stylistic & Forensic Refinement",
            "output": step5_out,
            "length": len(step5_out),
        })

        # ── Step 6: Detection-Guided Iterative Feedback Loop ──────────────────
        final_result = step5_out
        ai_report = None

        if apply_detection_feedback:
            logger.info("Pipeline Step 6: Detection-Guided Feedback Verification")

            max_feedback_passes = 3
            for pass_num in range(max_feedback_passes):
                report = AICheckEngine.analyze(final_result)
                ai_report = report.to_dict()

                is_stat_valid, stat_reason, _ = validate_human_statistics(final_result)

                # Target: score <= 5 (solidly Human verdict)
                if report.overall_score <= 5 and is_stat_valid:
                    logger.info(
                        "Detection feedback PASS %d: Score %d/27 (Human). No further passes needed.",
                        pass_num + 1, report.overall_score,
                    )
                    break

                logger.info(
                    "Detection feedback PASS %d trigger (Score: %d/27, Valid: %s, Reason: %s). Applying targeted cleanup.",
                    pass_num + 1, report.overall_score, is_stat_valid, stat_reason,
                )

                # Pass A: Signal-targeted regex surgery (cheap, always runs)
                final_result = signal_targeted_cleanup(final_result, mode=mode_val)
                final_result = normalize_word_complexity(final_result)
                final_result = enforce_short_sentences_aggressive(final_result, max_words=16)
                final_result = disrupt_sentence_rhythm(final_result, short_threshold=8)
                final_result = clean_erroneous_punctuation(final_result)

                # Re-check after regex surgery
                report_after_regex = AICheckEngine.analyze(final_result)
                if report_after_regex.overall_score <= 5:
                    ai_report = report_after_regex.to_dict()
                    logger.info("Signal-targeted cleanup brought score to %d/27. Done.", report_after_regex.overall_score)
                    break

                # Pass B: LLM burstiness repass (only on first pass, expensive)
                if pass_num == 0 and report_after_regex.overall_score >= 8:
                    try:
                        word_count = len(final_result.split())
                        burst_system = (
                            "You are a senior copyeditor specializing in natural human prose rhythm.\n"
                            "The draft below has slight repetitive cadence: too many sentences of the same length.\n\n"
                            "YOUR ONLY JOB: Inject burstiness and sentence variety WITHOUT changing any facts, meaning, or content.\n"
                            "RULES:\n"
                            "1. Break 2-3 of the longer sentences (15+ words) into two shorter sentences.\n"
                            "2. Fuse 2-3 short choppy sentences into one natural compound sentence where it reads better.\n"
                            "3. Add 1-2 very short punchy sentences (4-7 words) as rhythm breaks where they fit naturally.\n"
                            "4. ZERO em dashes (\u2014), ZERO semicolons (;). Use commas and periods only.\n"
                            "5. ZERO AI vocabulary: no 'delve', 'leverage', 'utilize', 'robust', 'comprehensive', 'furthermore', 'moreover', 'additionally', 'pivotal', 'nuanced', 'multifaceted'.\n"
                            "6. Preserve ALL facts, numbers, dates, and meaning exactly.\n"
                            "7. Return ONLY the revised text. No preamble, no explanation."
                        )
                        burst_user = f"Draft to improve (target ~{word_count} words):\n{final_result}"
                        burst_res = self.rewriter._call_llm(burst_system, burst_user)
                        if burst_res and len(burst_res.split()) >= int(word_count * 0.75):
                            # Run full cleanup on LLM output to prevent re-introduction of AI tells
                            burst_res = humanize(burst_res, intensity=intensity, original_text=text, mode=mode_val)
                            burst_res = signal_targeted_cleanup(burst_res, mode=mode_val)
                            burst_res = clean_erroneous_punctuation(burst_res)
                            final_result = burst_res
                            logger.info("Detection-guided burstiness repass completed successfully.")
                    except Exception as burst_err:
                        logger.warning("Detection feedback burstiness repass failed: %s", burst_err)

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

        intensity = 0.4 if level == 1 else (0.7 if level == 2 else 1.0)
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

        # Long documents: process paragraph by paragraph to avoid translation hop truncation
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
