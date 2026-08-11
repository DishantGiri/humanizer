"""
Forensic AI-Check Engine.
Grounded in published detection literature (Wu et al. 2025, Mitchell et al. 2023, Kujur 2025, AAAI 2025).
Evaluates text across 9 forensic signal categories (Signals A–I), scoring 0–3 per signal (0–27 total).
"""

import re
import statistics
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Tuple, Optional


@dataclass
class SignalScore:
    name: str
    code: str  # A through I
    score: int  # 0 to 3
    weight_label: str  # No signal, Weak, Moderate, Strong
    evidence: List[str]
    notes: str


@dataclass
class AICheckReport:
    verdict: str  # "Human", "Mixed / Uncertain", "AI"
    confidence: str  # "Low", "Medium", "High"
    overall_score: int  # 0 to 27
    max_score: int = 27
    ai_edited_fraction: str = "Pure human"  # "Pure human", "Lightly AI-edited", "Heavily AI-edited", "Pure AI"
    signals: Dict[str, SignalScore] = field(default_factory=dict)
    sentence_lengths: List[int] = field(default_factory=list)
    what_gave_it_away: List[str] = field(default_factory=list)
    recommended_fixes: List[str] = field(default_factory=list)
    raw_text_stats: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["signals"] = {k: asdict(v) for k, v in self.signals.items()}
        return d


# ── Canonical Knowledge Bases ────────────────────────────────────────────────

BANNED_VOCAB_MAP = {
    "delve": "Signal A (Canonical AI verb)",
    "leverage": "Signal A (Canonical AI verb)",
    "utilize": "Signal A (Canonical AI verb)",
    "robust": "Signal A (Canonical AI adjective)",
    "comprehensive": "Signal A (Canonical AI adjective)",
    "streamline": "Signal A (Canonical AI verb)",
    "foster": "Signal A (Canonical AI verb)",
    "facilitate": "Signal A (Canonical AI verb)",
    "pivotal": "Signal A (Canonical AI adjective)",
    "nuanced": "Signal A (Canonical AI adjective)",
    "multifaceted": "Signal A (Canonical AI adjective)",
    "enduring": "Signal A (Canonical AI adjective)",
    "garner": "Signal A (Canonical AI verb)",
    "vibrant": "Signal A (Promotional/AI adjective)",
    "tapestry": "Signal A (Figurative cliché)",
    "testament": "Signal A (Figurative cliché)",
    "interplay": "Signal A (Canonical AI noun)",
    "intricate": "Signal A (Canonical AI adjective)",
    "intricacies": "Signal A (Canonical AI noun)",
    "landscape": "Signal A (Abstract noun cliché)",
    "showcase": "Signal A (Canonical AI verb)",
    "showcasing": "Signal A (Canonical AI verb)",
    "underscore": "Signal A (Canonical AI verb)",
    "underscores": "Signal A (Canonical AI verb)",
    "align with": "Signal A (Corporate buzzword)",
    "groundbreaking": "Signal A (Promotional cliché)",
    "paradigm": "Signal A (Corporate buzzword)",
    "cutting-edge": "Signal A (Promotional cliché)",
    "revolutionize": "Signal A (Promotional cliché)",
    "in today's fast-paced world": "Signal A (Stock intro cliché)",
    "in today's world": "Signal A (Stock intro cliché)",
    "in today's": "Signal A (Stock intro cliché)",
    "in the realm of": "Signal A (Quantifier inflation)",
    "a myriad of": "Signal A (Quantifier inflation)",
    "a plethora of": "Signal A (Quantifier inflation)",
    "nestled in the heart of": "Signal A (Promotional copy)",
    "boasts a rich": "Signal A (Promotional copy)",
}

STRONG_TRANSITIONS = [
    r"\bfurthermore\b",
    r"\bmoreover\b",
    r"\badditionally\b",
    r"\bit is clear that\b",
    r"\bthis highlights\b",
    r"\bthis underscores\b",
    r"\bthis demonstrates the importance of\b",
    r"\bas previously mentioned\b",
    r"\bin addition to the above\b",
    r"\bit goes without saying\b",
    r"\bneedless to say\b",
    r"\bit turns out that\b",
    r"\bturns out\b",
]

HEDGES_LIST = [
    r"\bit is important to note\b",
    r"\bit is worth noting\b",
    r"\bit is worth mentioning\b",
    r"\bgene\w*\s+speaking\b",
    r"\bin many cases\b",
    r"\bit can be argued\b",
    r"\boften\b",
    r"\btypically\b",
    r"\bone might consider\b",
    r"\bcan often lead to\b",
    r"\bmay result in\b",
    r"\btends to\b",
]

NEGATION_PIVOT_PATTERNS = [
    r"\bnot just\b",
    r"\bnot\s+[^,;]+,\s+it['’]?s\b",
    r"\bit['’]?s not about\s+[^,;]+,\s+it['’]?s about\b",
    r"\bmore\s+[^,;]+\s+than\b",
    r"\bfeels like\s+[^,;]+\s+not\b",
]

RLHF_PATTERNS = [
    r"\bhere['’]?s how (?:i['’]?d|we) think about it\b",
    r"\blet me walk you through\b",
    r"\blet['’]?s break this down\b",
    r"\blet['’]?s dive in\b",
    r"\blet['’]?s explore\b",
    r"\bwithout further ado\b",
    r"\bhere['’]?s what you need to know\b",
    r"\bas of my training cutoff\b",
    r"\bbased on what i know up to\b",
    r"\bgreat question!?\b",
    r"\byou['’]?re absolutely right\b",
    r"\bthat['’]?s an excellent point\b",
    r"\bi hope this helps\b",
    r"\bfeel free to reach out\b",
    r"\bhappy to jump on a call\b",
]


class AICheckEngine:
    """Forensic AI detection and signal analyzer."""

    @staticmethod
    def _split_sentences(text: str) -> List[str]:
        raw = re.split(r'(?<=[.!?])\s+', text.strip())
        return [s.strip() for s in raw if s.strip()]

    @classmethod
    def analyze(cls, text: str) -> AICheckReport:
        if not text or not text.strip():
            return AICheckReport(
                verdict="Human",
                confidence="High",
                overall_score=0,
                ai_edited_fraction="Pure human",
                signals={},
                sentence_lengths=[],
                what_gave_it_away=[],
                recommended_fixes=[],
                raw_text_stats={},
            )

        clean_text = text.strip()
        words = re.findall(r"[a-zA-Z0-9'’]+", clean_text.lower())
        total_words = len(words)
        sentences = cls._split_sentences(clean_text)
        total_sentences = len(sentences)
        sent_lens = [len(re.findall(r"[a-zA-Z0-9'’]+", s)) for s in sentences]

        signals: Dict[str, SignalScore] = {}
        what_gave_it_away: List[str] = []
        recommended_fixes: List[str] = []

        # ── Signal A: Perplexity (Word Predictability & Banned Vocab) ───────────
        sig_a_evidence = []
        for word_phrase, reason in BANNED_VOCAB_MAP.items():
            pattern = r'\b' + re.escape(word_phrase) + r'\b'
            matches = list(re.finditer(pattern, clean_text, re.IGNORECASE))
            for m in matches:
                matched_str = m.group(0)
                sig_a_evidence.append(f'"{matched_str}" ({reason})')

        if len(sig_a_evidence) >= 4:
            sig_a_score = 3
        elif len(sig_a_evidence) >= 2:
            sig_a_score = 2
        elif len(sig_a_evidence) == 1:
            sig_a_score = 1
        else:
            sig_a_score = 0

        signals["perplexity"] = SignalScore(
            name="Perplexity (Word Predictability)",
            code="A",
            score=sig_a_score,
            weight_label=["No signal", "Weak", "Moderate", "Strong"][sig_a_score],
            evidence=sig_a_evidence[:8],
            notes=f"Found {len(sig_a_evidence)} predictable/banned AI vocabulary occurrences." if sig_a_evidence else "Natural human lexical choices.",
        )
        if sig_a_score >= 2:
            what_gave_it_away.append(f"High-frequency AI tell words: {', '.join(sig_a_evidence[:4])}")
            recommended_fixes.append("Replace canonical AI vocabulary (delve, leverage, utilize, robust, streamline) with direct domain-specific verbs.")

        # ── Signal B: Burstiness Deficit (Sentence Uniformity) ──────────────────
        sig_b_evidence = []
        stdev = statistics.stdev(sent_lens) if len(sent_lens) > 1 else 0.0
        
        # Check consecutive sentences within 5 words
        consecutive_uniform = 0
        max_consecutive_uniform = 0
        for i in range(len(sent_lens) - 1):
            if abs(sent_lens[i] - sent_lens[i + 1]) <= 5:
                consecutive_uniform += 1
                max_consecutive_uniform = max(max_consecutive_uniform, consecutive_uniform)
            else:
                consecutive_uniform = 0

        # Check range floor (max - min)
        spread = (max(sent_lens) - min(sent_lens)) if sent_lens else 0
        
        # Check mid-band cap (10 to 20 words)
        mid_band_count = sum(1 for l in sent_lens if 10 <= l <= 20)
        mid_band_ratio = (mid_band_count / total_sentences) if total_sentences else 0.0

        # Check micro-sentences (<= 7 words)
        micro_sentences = sum(1 for l in sent_lens if l <= 7)

        if total_sentences >= 3:
            if max_consecutive_uniform >= 4 or (spread < 12 and total_words > 60):
                sig_b_evidence.append(f"Metronomic rhythm: {max_consecutive_uniform + 1} consecutive sentences within 5 words of each other (spread: {spread}w, stdev: {stdev:.1f})")
                sig_b_score = 3
            elif max_consecutive_uniform >= 2 or spread < 18 or (mid_band_ratio > 0.65 and micro_sentences == 0):
                sig_b_evidence.append(f"Low burstiness variance: {int(mid_band_ratio*100)}% of sentences in 10-20 word band (stdev: {stdev:.1f})")
                sig_b_score = 2
            elif micro_sentences == 0 and total_words > 80:
                sig_b_evidence.append(f"No micro-sentences (<=7 words) detected in {total_words} words.")
                sig_b_score = 1
            else:
                sig_b_score = 0
        else:
            sig_b_score = 0

        signals["burstiness"] = SignalScore(
            name="Burstiness Deficit (Sentence Uniformity)",
            code="B",
            score=sig_b_score,
            weight_label=["No signal", "Weak", "Moderate", "Strong"][sig_b_score],
            evidence=sig_b_evidence,
            notes=f"Sentence lengths: {sent_lens}. Stdev: {stdev:.1f} words.",
        )
        if sig_b_score >= 2:
            what_gave_it_away.append(f"Uniform sentence cadence (sentence lengths: {sent_lens[:6]})")
            recommended_fixes.append("Vary sentence lengths aggressively: combine short punchy lines (3-7 words) with complex compound sentences (25+ words).")

        # ── Signal C: Hedge Density ─────────────────────────────────────────────
        sig_c_evidence = []
        for pat in HEDGES_LIST:
            for m in re.finditer(pat, clean_text, re.IGNORECASE):
                sig_c_evidence.append(f'"{m.group(0)}"')

        if len(sig_c_evidence) >= 4:
            sig_c_score = 3
        elif len(sig_c_evidence) >= 2:
            sig_c_score = 2
        elif len(sig_c_evidence) == 1:
            sig_c_score = 1
        else:
            sig_c_score = 0

        signals["hedge_density"] = SignalScore(
            name="Hedge Density",
            code="C",
            score=sig_c_score,
            weight_label=["No signal", "Weak", "Moderate", "Strong"][sig_c_score],
            evidence=sig_c_evidence[:6],
            notes=f"{len(sig_c_evidence)} institutional hedges detected." if sig_c_evidence else "Direct, unpadded assertions.",
        )
        if sig_c_score >= 2:
            what_gave_it_away.append(f"Excessive hedging words: {', '.join(sig_c_evidence[:3])}")
            recommended_fixes.append("Perform hedge surgery: remove 'it is important to note', 'often', 'typically' and state claims directly.")

        # ── Signal D: Structural Tells (Tricolons & Scaffolding) ─────────────────
        sig_d_evidence = []
        
        # Tricolon pattern (A, B, and C with balanced clauses)
        tricolon_matches = re.findall(r'\b[a-zA-Z\'-]+\s+[a-zA-Z\'-]+,\s+[a-zA-Z\'-]+\s+[a-zA-Z\'-]+,\s+and\s+[a-zA-Z\'-]+\s+[a-zA-Z\'-]+\b', clean_text)
        if tricolon_matches:
            sig_d_evidence.append(f"Tricolon parallel structure: '{tricolon_matches[0]}'")

        # Topic sentence + restatement / conclusion recap
        if re.search(r'\b(?:in conclusion|to sum up|in summary|to summarize)\b', clean_text, re.IGNORECASE):
            sig_d_evidence.append("Formulaic conclusion opener ('In conclusion' / 'In summary')")

        # Bullet list check
        if re.search(r'^\s*[-*•\d+.]\s+', clean_text, re.MULTILINE) and total_words < 120:
            sig_d_evidence.append("Imposed bulleted/numbered structure on short text")

        if len(sig_d_evidence) >= 2:
            sig_d_score = 3
        elif len(sig_d_evidence) == 1:
            sig_d_score = 2
        else:
            sig_d_score = 0

        signals["structural_tells"] = SignalScore(
            name="Structural Tells",
            code="D",
            score=sig_d_score,
            weight_label=["No signal", "Weak", "Moderate", "Strong"][sig_d_score],
            evidence=sig_d_evidence,
            notes="Evaluates imposed lists of three, formulaic endings, and rigid structural templates.",
        )
        if sig_d_score >= 2:
            what_gave_it_away.append(f"Imposed structure: {', '.join(sig_d_evidence)}")
            recommended_fixes.append("Break neat three-part lists into prose and eliminate conclusion restatements.")

        # ── Signal E: Specificity Deficit ───────────────────────────────────────
        sig_e_evidence = []
        # Check for anchors: numbers, dates, capitalized named entities (excluding sentence starters)
        has_numbers = bool(re.search(r'\b\d+(?:\.\d+)?%?\b', clean_text))
        
        # Check for universalist ungrounded framing
        universal_matches = re.findall(r'\b(?:organizations often find|teams frequently encounter|companies leveraging|many individuals)\b', clean_text, re.IGNORECASE)
        for u in universal_matches:
            sig_e_evidence.append(f"Universalist unanchored claim: '{u}'")

        if total_words > 80 and not has_numbers and len(sig_e_evidence) >= 2:
            sig_e_score = 3
        elif total_words > 60 and not has_numbers:
            sig_e_score = 2
            sig_e_evidence.append("Zero concrete numerical anchors or temporal references in paragraph")
        elif len(sig_e_evidence) >= 1:
            sig_e_score = 1
        else:
            sig_e_score = 0

        signals["specificity"] = SignalScore(
            name="Specificity Deficit",
            code="E",
            score=sig_e_score,
            weight_label=["No signal", "Weak", "Moderate", "Strong"][sig_e_score],
            evidence=sig_e_evidence[:4],
            notes="Measures whether claims are grounded in concrete details, numbers, and dates.",
        )

        # ── Signal F: Transition Word Fingerprint ────────────────────────────────
        sig_f_evidence = []
        for pat in STRONG_TRANSITIONS:
            for m in re.finditer(pat, clean_text, re.IGNORECASE):
                sig_f_evidence.append(f'"{m.group(0)}"')

        if len(sig_f_evidence) >= 3:
            sig_f_score = 3
        elif len(sig_f_evidence) >= 2:
            sig_f_score = 2
        elif len(sig_f_evidence) == 1:
            sig_f_score = 1
        else:
            sig_f_score = 0

        signals["transitions"] = SignalScore(
            name="Transition Word Fingerprint",
            code="F",
            score=sig_f_score,
            weight_label=["No signal", "Weak", "Moderate", "Strong"][sig_f_score],
            evidence=sig_f_evidence[:6],
            notes=f"{len(sig_f_evidence)} high-signal AI transition markers detected." if sig_f_evidence else "Natural discourse bridging.",
        )
        if sig_f_score >= 2:
            what_gave_it_away.append(f"Robotic transition connectors: {', '.join(sig_f_evidence[:3])}")
            recommended_fixes.append("Delete robotic signposts ('Furthermore', 'Moreover', 'Additionally') and let narrative flow directly.")

        # ── Signal G: Punctuation Fingerprint ───────────────────────────────────
        sig_g_evidence = []
        # Em dash count
        em_dash_count = clean_text.count("—") + clean_text.count("–") + len(re.findall(r'\s+--\s+', clean_text))
        semicolon_count = clean_text.count(";")
        curly_quotes_count = len(re.findall(r'[“”‘’]', clean_text))

        allowed_em_dashes = max(0, int(total_words / 300))
        if em_dash_count > allowed_em_dashes:
            sig_g_evidence.append(f"Em dashes: {em_dash_count} (allowed under {total_words}w: {allowed_em_dashes})")
        if semicolon_count > 0:
            sig_g_evidence.append(f"Semicolons: {semicolon_count}")
        if curly_quotes_count > 0:
            sig_g_evidence.append(f"Curly quotes/apostrophes: {curly_quotes_count}")

        if em_dash_count >= 2 or semicolon_count >= 2:
            sig_g_score = 3
        elif em_dash_count == 1 or semicolon_count == 1 or curly_quotes_count > 0:
            sig_g_score = 2
        else:
            sig_g_score = 0

        signals["punctuation"] = SignalScore(
            name="Punctuation Fingerprint",
            code="G",
            score=sig_g_score,
            weight_label=["No signal", "Weak", "Moderate", "Strong"][sig_g_score],
            evidence=sig_g_evidence,
            notes="Evaluates em-dash density (>1/300w), semicolons, and curly quote artifacts.",
        )
        if sig_g_score >= 2:
            what_gave_it_away.append(f"Punctuation anomalies: {', '.join(sig_g_evidence)}")
            recommended_fixes.append("Replace em dashes and semicolons with simple periods or commas.")

        # ── Signal H: Rhetorical Scaffolding & Negation Pivots ───────────────────
        sig_h_evidence = []
        for pat in NEGATION_PIVOT_PATTERNS:
            for m in re.finditer(pat, clean_text, re.IGNORECASE):
                sig_h_evidence.append(f'Negation framing: "{m.group(0)}"')

        # Mini-aphorism closer check
        if total_sentences >= 2 and len(sentences[-1].split()) <= 6:
            last_sent = sentences[-1].lower()
            if any(w in last_sent for w in ["that's", "this is", "simple", "matters", "crucial", "clear", "stuck"]):
                sig_h_evidence.append(f"Mini-aphorism closer: '{sentences[-1]}'")

        if len(sig_h_evidence) >= 3:
            sig_h_score = 3
        elif len(sig_h_evidence) >= 1:
            sig_h_score = 2
        else:
            sig_h_score = 0

        signals["rhetorical_scaffolding"] = SignalScore(
            name="Rhetorical Scaffolding",
            code="H",
            score=sig_h_score,
            weight_label=["No signal", "Weak", "Moderate", "Strong"][sig_h_score],
            evidence=sig_h_evidence[:4],
            notes="Detects negation pivots ('not just X, it's Y') and mini-aphorism punchlines.",
        )
        if sig_h_score >= 2:
            what_gave_it_away.append(f"Rhetorical scaffolding: {', '.join(sig_h_evidence[:2])}")
            recommended_fixes.append("Avoid negation framing ('not just X, it's Y') - state what the thing IS directly.")

        # ── Signal I: RLHF & Instruction-Tuning Voice ───────────────────────────
        sig_i_evidence = []
        for pat in RLHF_PATTERNS:
            for m in re.finditer(pat, clean_text, re.IGNORECASE):
                sig_i_evidence.append(f'"{m.group(0)}"')

        if len(sig_i_evidence) >= 2:
            sig_i_score = 3
        elif len(sig_i_evidence) == 1:
            sig_i_score = 2
        else:
            sig_i_score = 0

        signals["rlhf_voice"] = SignalScore(
            name="RLHF & Instruction-Tuning Voice",
            code="I",
            score=sig_i_score,
            weight_label=["No signal", "Weak", "Moderate", "Strong"][sig_i_score],
            evidence=sig_i_evidence[:4],
            notes="Flags 'helpful assistant' conversational tropes, sycophancy, and tutorial scaffolding.",
        )
        if sig_i_score >= 2:
            what_gave_it_away.append(f"RLHF assistant register: {', '.join(sig_i_evidence)}")
            recommended_fixes.append("Strip conversational assistant preambles and tutorial explanations.")

        # ── Register Collapse Check (Counter-Signals for Slack/Casual) ─────────
        # Real Slack/casual messages have abbreviations, lowercase, fragments which reduce AI score
        casual_markers = len(re.findall(r'\b(?:fwiw|btw|lmk|tmrw|ooming|grpc|pprof|ram|fk|idk|tbh)\b|~[0-9]+', clean_text.lower()))
        is_predominantly_lowercase = sum(1 for c in clean_text if c.islower()) / max(1, len(clean_text)) > 0.85 and not any(c.isupper() for c in clean_text[:5])

        # Calculate Total Score (0 to 27)
        total_score = sum(s.score for s in signals.values())

        if casual_markers >= 3 and is_predominantly_lowercase:
            # Register collapse counter-signal: genuine informal message
            total_score = max(0, total_score - 10)

        # Determine Verdict & Confidence
        if total_score >= 14:
            verdict = "AI"
            confidence = "High" if total_score >= 18 else "Medium"
            ai_edited_fraction = "Pure AI" if total_score >= 20 else "Heavily AI-edited"
        elif total_score >= 8:
            verdict = "Mixed / Uncertain"
            confidence = "Medium"
            ai_edited_fraction = "Lightly AI-edited"
        else:
            verdict = "Human"
            confidence = "High" if total_score <= 4 else "Medium"
            ai_edited_fraction = "Pure human"

        return AICheckReport(
            verdict=verdict,
            confidence=confidence,
            overall_score=total_score,
            max_score=27,
            ai_edited_fraction=ai_edited_fraction,
            signals=signals,
            sentence_lengths=sent_lens,
            what_gave_it_away=what_gave_it_away[:4],
            recommended_fixes=recommended_fixes[:4],
            raw_text_stats={
                "word_count": total_words,
                "sentence_count": total_sentences,
                "sentence_length_stdev": round(stdev, 1),
                "em_dash_count": em_dash_count,
                "semicolon_count": semicolon_count,
            }
        )
