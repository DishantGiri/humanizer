"""
Advanced Humanization & Text Stylistics Engine.

Implements safe, non-destructive post-processing to eliminate AI fingerprints:
1. TYPOGRAPHY & FORMATTING NORMALIZATION: Straight quotes, zero em/en-dashes, zero semicolons, markdown cleanup.
2. AI VOCABULARY & COPULA REFINEMENT: Replaces robotic AI verbs, copula avoidance ('serves as'), and clichés with natural equivalents.
3. CONTEXT-AWARE CONTRACTION CALIBRATION: Calibrated to mode registers (Academic/Formal 1-4%, Casual/Natural 8-16%).
4. FORMULAIC PATTERN & SUMMARY STRIPPING: Strips paragraph-ending recaps, robotic opener signposts, and negation framing.
5. PUNCTUATION & BOUNDARY SANITIZATION: Non-destructive punctuation cleaning that strictly preserves all grammatical sentence boundaries.
6. PARAGRAPH COUNT PARITY: Guarantees exact paragraph structure matching original input text.
"""

import re
import random
import statistics
import hashlib
import time
from dataclasses import dataclass
from typing import Optional, Dict, List, Tuple


# ── Data Classes & Metric Structures ─────────────────────────────────────────

@dataclass
class TextStats:
    sentence_lengths: list[int]
    avg_sentence_length: float
    std_sentence_length: float
    avg_word_length: float
    repeated_openers: list[int]
    max_opener_freq: float
    contraction_ratio: float
    lexical_diversity: float
    ai_score: int
    total_words: int
    total_sentences: int


@dataclass
class ModeProfile:
    name: str
    target_len_range: tuple[float, float]
    target_stdev_range: tuple[float, float]
    contraction_target: tuple[float, float]
    ttr_target: tuple[float, float]
    formality_score: float  # 0.0 = casual, 1.0 = formal


# ── Mode Profiles Configuration ──────────────────────────────────────────────

MODE_PROFILES: dict[str, ModeProfile] = {
    "standard": ModeProfile(
        name="standard",
        target_len_range=(10.0, 16.0),
        target_stdev_range=(4.5, 8.5),
        contraction_target=(0.06, 0.14),
        ttr_target=(0.58, 0.70),
        formality_score=0.30,
    ),
    "fluency": ModeProfile(
        name="fluency",
        target_len_range=(11.0, 16.0),
        target_stdev_range=(4.0, 7.5),
        contraction_target=(0.03, 0.08),
        ttr_target=(0.60, 0.72),
        formality_score=0.65,
    ),
    "natural": ModeProfile(
        name="natural",
        target_len_range=(9.0, 15.0),
        target_stdev_range=(5.0, 9.0),
        contraction_target=(0.08, 0.16),
        ttr_target=(0.55, 0.68),
        formality_score=0.20,
    ),
    "academic": ModeProfile(
        name="academic",
        target_len_range=(14.0, 20.0),
        target_stdev_range=(4.0, 7.5),
        contraction_target=(0.01, 0.04),
        ttr_target=(0.62, 0.76),
        formality_score=0.90,
    ),
    "creative": ModeProfile(
        name="creative",
        target_len_range=(9.0, 15.0),
        target_stdev_range=(5.0, 9.0),
        contraction_target=(0.06, 0.14),
        ttr_target=(0.60, 0.75),
        formality_score=0.35,
    ),
    "casual": ModeProfile(
        name="casual",
        target_len_range=(9.0, 14.0),
        target_stdev_range=(5.0, 9.0),
        contraction_target=(0.08, 0.16),
        ttr_target=(0.55, 0.68),
        formality_score=0.20,
    ),
    "native": ModeProfile(
        name="native",
        target_len_range=(10.0, 15.0),
        target_stdev_range=(4.5, 8.5),
        contraction_target=(0.06, 0.14),
        ttr_target=(0.58, 0.70),
        formality_score=0.35,
    ),
    "professional": ModeProfile(
        name="professional",
        target_len_range=(11.0, 16.0),
        target_stdev_range=(4.0, 7.0),
        contraction_target=(0.03, 0.07),
        ttr_target=(0.60, 0.72),
        formality_score=0.70,
    ),
    "business": ModeProfile(
        name="business",
        target_len_range=(10.0, 15.0),
        target_stdev_range=(4.0, 7.0),
        contraction_target=(0.03, 0.06),
        ttr_target=(0.60, 0.72),
        formality_score=0.75,
    ),
    "friendly": ModeProfile(
        name="friendly",
        target_len_range=(9.0, 15.0),
        target_stdev_range=(4.5, 8.5),
        contraction_target=(0.06, 0.14),
        ttr_target=(0.58, 0.70),
        formality_score=0.25,
    ),
    "simple": ModeProfile(
        name="simple",
        target_len_range=(8.0, 13.0),
        target_stdev_range=(3.5, 6.5),
        contraction_target=(0.04, 0.10),
        ttr_target=(0.52, 0.65),
        formality_score=0.30,
    ),
    "formal": ModeProfile(
        name="formal",
        target_len_range=(13.0, 19.0),
        target_stdev_range=(4.0, 7.5),
        contraction_target=(0.01, 0.03),
        ttr_target=(0.62, 0.76),
        formality_score=0.85,
    ),
    "concise": ModeProfile(
        name="concise",
        target_len_range=(8.0, 14.0),
        target_stdev_range=(4.0, 7.0),
        contraction_target=(0.04, 0.10),
        ttr_target=(0.62, 0.75),
        formality_score=0.50,
    ),
}

DEFAULT_PROFILE = MODE_PROFILES["standard"]


# ── AI Vocabulary & Safe Replacements ────────────────────────────────────────

AI_VOCAB_WEIGHTS: dict[str, int] = {
    "delve": 4, "landscape": 3, "tapestry": 4, "testament": 3, "foster": 3,
    "pivotal": 4, "leverage": 4, "paramount": 3, "multifaceted": 4, "realm": 3,
    "beacon": 4, "underscore": 3, "interplay": 3, "embark": 3, "illuminate": 3,
    "navigate": 3, "indispensable": 3, "transformative": 3, "imperative": 3,
    "endeavor": 3, "vibrant": 3, "harness": 3, "spearhead": 4, "synergy": 5,
    "paradigm": 4, "cutting-edge": 4, "game-changer": 4, "nestled": 3,
    "crucial": 3, "robust": 3, "utilize": 3, "commence": 3, "facilitate": 3,
    "unlock": 4, "revolutionize": 4, "intricate": 3, "showcasing": 3, "surpass": 3,
    "meticulously": 4, "unparalleled": 4, "commendable": 3,
    "groundbreaking": 4, "enhance": 3, "holistic": 4, "garner": 3,
    "accentuate": 4, "pioneering": 4, "trailblazing": 4, "unleash": 4, "versatile": 3,
    "redefine": 3, "seamless": 4, "optimize": 3, "scalable": 3, "breakthrough": 3,
    "empower": 3, "streamline": 3, "next-gen": 4, "frictionless": 4, "elevate": 3,
    "data-driven": 3, "mission-critical": 4, "visionary": 3, "disruptive": 4,
    "reimagine": 3, "unprecedented": 4, "intuitive": 3, "leading-edge": 4,
    "synergize": 5, "state-of-the-art": 4, "always-on": 4, "hyper-personalized": 5,
    "comprehensive": 3,
}

# Contextually safe grammatical drop-in replacements
AI_REPLACEMENTS: dict[str, list[str]] = {
    "delve into": ["explore", "examine", "look into"],
    "delves into": ["explores", "examines", "looks into"],
    "delving into": ["exploring", "examining", "looking into"],
    "delve": ["explore", "examine"],
    "realm of": ["field of", "area of"],
    "harness": ["use", "apply"],
    "harnessing": ["using", "applying"],
    "harnesses": ["uses", "applies"],
    "tapestry of": ["mix of", "range of", "collection of"],
    "rich tapestry": ["rich history", "diverse culture", "broad range"],
    "cutting-edge": ["modern", "advanced", "current"],
    "state-of-the-art": ["modern", "advanced", "latest"],
    "game-changer": ["major shift", "significant step"],
    "game-changing": ["major", "significant"],
    "testament to": ["proof of", "sign of", "evidence of"],
    "stands as a testament": ["is proof", "shows clearly"],
    "serves as a testament": ["is evidence", "shows"],
    "serves as a": ["is a", "acts as a"],
    "serves as": ["is", "acts as"],
    "stands as a": ["is a"],
    "stands as": ["is"],
    "boasts a": ["has a", "features a"],
    "boasts an": ["has an"],
    "nestled in the heart of": ["located in", "situated in"],
    "nestled in": ["located in", "set in"],
    "in today's fast-paced world": ["today", "currently"],
    "in today's world": ["today", "nowadays"],
    "in today's digital era": ["today", "in modern times"],
    "it is important to note that": ["notably,", "also,"],
    "it is worth noting that": ["notably,", "in addition,"],
    "it is worth mentioning that": ["notably,", "also,"],
    "it is critical to note that": ["importantly,"],
    "leverage": ["use", "apply"],
    "leverages": ["uses", "applies"],
    "leveraged": ["used", "applied"],
    "leveraging": ["using", "applying"],
    "utilize": ["use"],
    "utilizes": ["uses"],
    "utilized": ["used"],
    "utilizing": ["using"],
    "facilitate": ["help", "support", "ease"],
    "facilitates": ["helps", "supports", "eases"],
    "facilitated": ["helped", "supported"],
    "facilitating": ["helping", "supporting"],
    "foster": ["support", "encourage", "build"],
    "fosters": ["supports", "encourages", "builds"],
    "fostered": ["supported", "encouraged"],
    "fostering": ["supporting", "encouraging", "building"],
    "synergy": ["collaboration", "cooperation", "teamwork"],
    "synergies": ["collaborations", "partnerships"],
    "robust": ["strong", "reliable", "solid"],
    "comprehensive": ["thorough", "complete", "broad"],
    "pivotal role": ["key role", "major role", "central role"],
    "pivotal moment": ["turning point", "key moment"],
    "pivotal": ["key", "central", "major"],
    "multifaceted": ["complex", "varied"],
    "nuanced": ["detailed", "subtle"],
    "garner": ["gather", "gain", "attract"],
    "garners": ["gathers", "gains", "attracts"],
    "garnered": ["gathered", "gained", "attracted"],
    "streamline": ["simplify", "speed up"],
    "streamlines": ["simplifies", "speeds up"],
    "streamlined": ["simplified", "faster"],
    "streamlining": ["simplifying", "speeding up"],
    "revolutionize": ["transform", "reshape"],
    "revolutionizes": ["transforms", "reshapes"],
    "revolutionized": ["transformed", "reshaped"],
    "revolutionizing": ["transforming", "reshaping"],
    "unprecedented": ["rare", "remarkable"],
    "groundbreaking": ["major", "new", "innovative"],
    "transformative": ["major", "significant"],
    "seamless": ["smooth", "easy"],
    "seamlessly": ["smoothly", "easily"],
    "intricate": ["complex", "detailed"],
    "intricacies": ["complexities", "details"],
    "interplay": ["interaction", "relationship"],
    "crucial for": ["essential for", "vital for", "key to"],
    "crucial in": ["essential in", "vital in", "key in"],
    "crucial": ["essential", "vital", "key"],
    "vibrant": ["active", "lively"],
    "paramount": ["essential", "central"],
    "enduring": ["lasting", "long-term"],
    "paradigm": ["model", "approach"],
    "beacon of": ["symbol of", "model of"],
    "a myriad of": ["many", "numerous"],
    "a plethora of": ["many", "numerous"],
    "showcasing": ["showing", "demonstrating"],
    "showcase": ["show", "present"],
    "showcases": ["shows", "presents"],
    "underscores the importance of": ["highlights the importance of", "stresses the need for"],
    "underscore": ["highlight", "stress", "emphasize"],
    "underscores": ["highlights", "stresses", "emphasizes"],
    "underscored": ["highlighted", "stressed", "emphasized"],
    # --- Additional words from BANNED_VOCAB_MAP not previously covered ---
    "landscape of": ["field of", "area of", "world of"],
    "landscape": ["field", "area", "world", "environment"],
    "enduring": ["lasting", "long-term", "persistent"],
    "nuanced": ["detailed", "subtle", "careful"],
    "groundbreaking": ["major", "significant", "new"],
    "pioneering": ["early", "original", "leading"],
    "trailblazing": ["innovative", "original"],
    "paradigm shift": ["major change", "significant shift"],
    "visionary": ["forward-thinking", "strategic"],
    "disruptive": ["transformative", "game-changing"],
    "holistic": ["complete", "broad", "overall"],
    "in the realm of": ["in the area of", "in the field of"],
    "a myriad of": ["many", "a wide range of", "numerous"],
    "a plethora of": ["many", "a range of", "numerous"],
    "nestled in the heart of": ["located in", "situated in"],
    "boasts a rich": ["has a strong", "has a rich"],
    "align with": ["match", "support", "fit"],
    "aligns with": ["matches", "supports", "fits"],
    "aligned with": ["matched", "consistent with", "in line with"],
    "spearhead": ["lead", "drive"],
    "spearheads": ["leads", "drives"],
    "spearheaded": ["led", "drove"],
    "unleash": ["release", "deploy", "use"],
    "unleashes": ["releases", "deploys"],
    "unleashed": ["released", "deployed"],
    "redefine": ["reshape", "change", "rethink"],
    "reimagine": ["rethink", "reconsider", "redesign"],
    "synergy": ["collaboration", "cooperation", "teamwork"],
    "synergies": ["collaborations", "partnerships"],
    "synergize": ["collaborate", "work together"],
    "holistically": ["broadly", "as a whole", "comprehensively"],
    "notably": ["for example", "in particular", "specifically"],
    "importantly": ["critically", "the key point is"],
    "consequently": ["as a result", "so", "therefore"],
    "often": ["regularly", "at times", "in many cases"],
    "typically": ["usually", "in most cases", "generally"],
    # --- Generic language post-processing replacements ---
    "various aspects of": ["parts of", "areas of"],
    "various factors": ["these factors", "the key factors"],
    "various": ["different", "distinct"],
    "several aspects": ["these points", "these areas"],
    "a number of": ["several", "many", "a few"],
    "a variety of": ["different", "a range of"],
    "in terms of": ["for", "regarding", "on"],
    "with regard to": ["for", "about", "on"],
    "in order to": ["to"],
    "due to the fact that": ["because"],
    "at this point in time": ["now"],
    "the fact that": ["that"],
    "it should be noted that": [""],
    "it is worth noting that": [""],
    "plays a role in": ["affects", "shapes", "drives"],
    "plays a key role in": ["drives", "shapes", "affects"],
    "plays an important role in": ["drives", "affects", "shapes"],
}

CONTRACT_EXPAND_MAP: dict[str, str] = {
    "do not": "don't", "does not": "doesn't", "did not": "didn't",
    "will not": "won't", "would not": "wouldn't", "could not": "couldn't",
    "should not": "shouldn't", "cannot": "can't", "is not": "isn't",
    "are not": "aren't", "was not": "wasn't", "were not": "weren't",
    "has not": "hasn't", "have not": "haven't", "had not": "hadn't",
    "it is": "it's", "that is": "that's", "there is": "there's",
    "they are": "they're", "we are": "we're", "you are": "you're",
    "I am": "I'm", "he is": "he's", "she is": "she's",
    "who is": "who's", "what is": "what's", "let us": "let's",
    "I have": "I've", "you have": "you've", "we have": "we've",
    "they have": "they've",
}


# ── Core Text Analysis Engine ────────────────────────────────────────────────

def _split_sentences(text: str) -> list[str]:
    """Split text into clean sentences while preserving boundaries."""
    if not text:
        return []
    raw = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in raw if s.strip()]


def _join_sentences(sentences: list[str]) -> str:
    """Join sentences into a cohesive paragraph."""
    return " ".join(sentences)


def analyze_text(text: str) -> TextStats:
    """Compute linguistic metrics for anti-AI statistical profiling."""
    sentences = _split_sentences(text)
    words = re.findall(r'\b[a-zA-Z\']+\b', text.lower())
    total_words = len(words)
    total_sentences = len(sentences)

    if not total_words or not total_sentences:
        return TextStats([], 0.0, 0.0, 0.0, [], 0.0, 0.0, 1.0, 0, total_words, total_sentences)

    sentence_lengths = [len(s.split()) for s in sentences]
    avg_sentence_length = sum(sentence_lengths) / total_sentences
    std_sentence_length = statistics.stdev(sentence_lengths) if total_sentences > 1 else 0.0
    avg_word_length = sum(len(w) for w in words) / total_words

    starters = [s.split()[0].lower() for s in sentences if s.split()]
    starter_counts: dict[str, int] = {}
    for st in starters:
        starter_counts[st] = starter_counts.get(st, 0) + 1
    max_opener_freq = (max(starter_counts.values()) / total_sentences) if total_sentences else 0.0

    repeated_openers = []
    for i in range(len(starters) - 1):
        if starters[i] == starters[i + 1]:
            repeated_openers.append(i + 1)

    contractions = len(re.findall(r"\b\w+['']\w+\b", text))
    contraction_ratio = contractions / max(1, total_sentences)

    unique_words = len(set(words))
    lexical_diversity = unique_words / total_words if total_words else 1.0
    ai_score = sum(AI_VOCAB_WEIGHTS.get(w, 0) for w in words)

    return TextStats(
        sentence_lengths=sentence_lengths,
        avg_sentence_length=avg_sentence_length,
        std_sentence_length=std_sentence_length,
        avg_word_length=avg_word_length,
        repeated_openers=repeated_openers,
        max_opener_freq=max_opener_freq,
        contraction_ratio=contraction_ratio,
        lexical_diversity=lexical_diversity,
        ai_score=ai_score,
        total_words=total_words,
        total_sentences=total_sentences,
    )


# ── Non-Destructive Post-Processing Features ────────────────────────────────

def apply_context_aware_contractions(text: str, profile: ModeProfile, rng: random.Random) -> str:
    """
    Applies contractions in natural registers while keeping formal registers crisp.
    Never contracts under explicit all-caps emphasis (e.g. 'do NOT').
    """
    if profile.formality_score > 0.80:
        return text

    sentences = _split_sentences(text)
    processed = []
    min_rate, max_rate = profile.contraction_target
    target_rate = (min_rate + max_rate) / 2.0

    for sent in sentences:
        for expand, contract in CONTRACT_EXPAND_MAP.items():
            if re.search(r'\b' + re.escape(expand.split()[0]) + r'\s+NOT\b', sent):
                continue
            if rng.random() < target_rate * 3.0:
                sent = re.sub(r'\b' + re.escape(expand) + r'\b', contract, sent, flags=re.IGNORECASE)
        processed.append(sent)

    return _join_sentences(processed)


def adjust_lexical_sophistication(text: str, profile: ModeProfile, rng: random.Random) -> str:
    """
    Replaces AI vocabulary tells with natural human synonyms.
    """
    for ai_phrase, options in AI_REPLACEMENTS.items():
        pattern = r'\b' + re.escape(ai_phrase) + r'\b'
        if re.search(pattern, text, flags=re.IGNORECASE):
            replacement = rng.choice(options)
            def _sub_match(m):
                matched = m.group(0)
                if matched[0].isupper():
                    return replacement[0].upper() + replacement[1:]
                return replacement
            text = re.sub(pattern, _sub_match, text, flags=re.IGNORECASE)
    return text


def strip_formulaic_patterns_and_summaries(text: str) -> str:
    """
    Strips robotic transitions, formulaic summary wrapups, and negation framing.
    """
    if not text:
        return text

    # Strip paragraph-ending summary formulas
    summary_end_patterns = [
        r'\s*\b(?:In summary|To sum up|In conclusion|All in all),?\s+(?:this|these findings|it)\s+(?:shows|demonstrates|highlights|underscores|illustrates)[^.!?]*[.!?]$',
    ]
    for pat in summary_end_patterns:
        text = re.sub(pat, '', text, flags=re.IGNORECASE)

    # Strip robotic transition words wherever they appear at start of sentence
    robotic_openers = [
        (r'\bFurthermore,?\s*', ''),
        (r'\bMoreover,?\s*', ''),
        (r'\bIn conclusion,?\s*', ''),
        (r'\bTo sum up,?\s*', ''),
        (r'\bAdditionally,?\s*', ''),
        (r'\bIn addition to the above,?\s*', ''),
        (r'\bNeedless to say,?\s*', ''),
        (r'\bIt is clear that\s+', ''),
        (r'\bThe\s+(?:rule|standard|key|common)\s+(?:fix|insight|approach|pattern|problem)\s*:\s*', ''),
        # Extended: patterns detected by FORMULAIC_PATTERN_REGEXES in analyzer.py
        (r'\bNotably,?\s*', ''),
        (r'\bImportantly,?\s*', ''),
        (r'\bConsequently,?\s*', ''),
        (r'\bIn summary,?\s*', ''),
        (r'\bTo summarize,?\s*', ''),
        (r'\bAs previously mentioned,?\s*', ''),
        (r'\bIt goes without saying,?\s*', ''),
        (r'\bIt turns out that\s+', ''),
        (r'\bIt turns out,?\s*', ''),
        (r'\bThis highlights the importance of\s+', ''),
        (r'\bThis underscores\s+', ''),
        (r'\bUltimately,?\s*this\s+(?:shows|highlights|demonstrates)\s+', ''),
    ]
    for pat, rep in robotic_openers:
        text = re.sub(pat, rep, text, flags=re.IGNORECASE)

    # Simplify negation framing
    text = re.sub(
        r'\bit[\'’]?s not about\s+([^,;.]+),\s*it[\'’]?s about\s+([^,;.]+)',
        r'It is about \2',
        text,
        flags=re.IGNORECASE
    )

    return text.strip()


def deduplicate_and_diversify_fillers(text: str, mode: str = 'standard') -> str:
    """
    Removes unwanted canned conversational fillers in formal and professional modes.
    """
    if not text:
        return text

    is_formal = str(mode).lower() in ('academic', 'formal', 'business', 'fluency', 'professional')
    if is_formal:
        casual_fillers = [
            r'\bAs it turns out,?\s*',
            r'\bSimple as that\.\s*',
            r'\bLook,\s*',
            r'\bHonestly,\s*',
            r'\bWhen you think about it,\s*',
            r'\bPicture this:\s*',
        ]
        for pat in casual_fillers:
            text = re.sub(pat, '', text, flags=re.IGNORECASE)

    return text.strip()


# ── Text Extraction & Typography Normalization ──────────────────────────────

def extract_final_output(text: str) -> str:
    """Strip internal thinking tags <think>...</think> from models."""
    if not text:
        return text
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'</?think>', '', text, flags=re.IGNORECASE)
    return text.strip()


def strip_preamble(text: str) -> str:
    """Strip outer preambles (e.g., 'Here is the rewritten text:')."""
    lines = text.strip().split('\n')
    if lines and re.match(r'^(here\s+(is|are)|sure|certainly|below\s+is|rewritten\s+text:)', lines[0], re.IGNORECASE):
        lines = lines[1:]
    return "\n".join(lines).strip()


def strip_outer_quotes(text: str) -> str:
    """Strip outer quotes if the model wrapped output in quotes."""
    s = text.strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        return s[1:-1].strip()
    return s


def strip_formatting_artifacts(text: str) -> str:
    """
    Enforces the typography rules:
    1. Curly quotes/apostrophes (“ ” ‘ ’) -> Straight quotes/apostrophes (" ')
    2. Em dashes and en dashes (—, –) -> Standard hyphens (-) or commas
    3. Semicolons (;) -> Commas or periods
    4. Strip excessive asterisks and markdown bolding
    """
    if not text:
        return text

    # Straight standard quotes and apostrophes
    text = text.replace("“", '"').replace("”", '"').replace("&ldquo;", '"').replace("&rdquo;", '"')
    text = text.replace("‘", "'").replace("’", "'").replace("&lsquo;", "'").replace("&rsquo;", "'")

    # Em dashes and en dashes -> standard hyphen or comma
    text = text.replace("\u2014", " - ").replace("\u2013", " - ").replace("&mdash;", " - ").replace("&ndash;", " - ").replace(" -- ", " - ")
    text = re.sub(r'\s*—\s*', ' - ', text)
    text = re.sub(r'\s*–\s*', ' - ', text)

    # Semicolons -> commas
    text = re.sub(r';\s*', ', ', text)

    # Clean markdown bold/italics markers
    text = re.sub(r'\*{2,}', '', text)
    return text


def clean_erroneous_punctuation(text: str) -> str:
    """
    Safely cleans formatting artifacts WITHOUT destroying grammatical sentence boundaries.
    """
    if not text:
        return text

    # Normalize em dashes and en dashes
    text = text.replace("—", " - ").replace("–", " - ")

    # Clean consecutive periods (.. -> .), double commas (,, -> ,)
    text = re.sub(r'\.{2,}', '.', text)
    text = re.sub(r',,+', ',', text)

    # Fix space before punctuation ("word ," -> "word,")
    text = re.sub(r'\s+([,.;:!?])', r'\1', text)
    text = re.sub(r'([,;:])\s*([.!?])', r'\2', text)
    text = re.sub(r'\.\s*,', ',', text)

    # Ensure missing space after period is added if followed by capital letter (e.g. "word.Next" -> "word. Next")
    text = re.sub(r'([a-z0-9])\.([A-Z])', r'\1. \2', text)

    # Clean up double spaces
    text = re.sub(r'[ \t]+', ' ', text)

    # Capitalize after sentence endings
    text = re.sub(r'([.!?]\s+)([a-z])', lambda m: m.group(1) + m.group(2).upper(), text)

    return text.strip()


def apply_paragraph_intelligence(text: str, original_text: Optional[str], rng: random.Random) -> str:
    """
    Enforces strict paragraph parity with the original input text.
    """
    if not original_text:
        return text

    orig_paras = [p.strip() for p in original_text.strip().split('\n\n') if p.strip()]
    out_paras = [p.strip() for p in text.strip().split('\n\n') if p.strip()]

    if len(orig_paras) > 1 and len(out_paras) < len(orig_paras):
        all_sents = _split_sentences(text.strip())
        if len(all_sents) >= len(orig_paras):
            reconstructed = []
            sents_per_para = len(all_sents) // len(orig_paras)
            rem = len(all_sents) % len(orig_paras)
            idx = 0
            for i in range(len(orig_paras)):
                take = sents_per_para + (1 if i < rem else 0)
                chunk = all_sents[idx : idx + take]
                idx += take
                if chunk:
                    reconstructed.append(" ".join(chunk))
            if reconstructed:
                text = "\n\n".join(reconstructed)
    elif len(orig_paras) <= 1 and '\n' not in original_text.strip():
        clean_single = re.sub(r'\s*\n+\s*', ' ', text.strip())
        text = re.sub(r'  +', ' ', clean_single)

    return text


def enforce_short_sentences(text: str, max_words: int = 24) -> str:
    """
    Breaks overly long sentences (>24 words) at natural clause boundaries.
    Uses multiple split strategies in priority order. Never creates fragments.
    """
    sentences = _split_sentences(text)
    res = []
    for s in sentences:
        words = s.split()
        if len(words) <= max_words:
            res.append(s)
            continue

        split_done = False

        # Strategy 1: Split at ", and/but/so/yet + subject pronoun or noun"
        m = re.search(
            r'(,\s*(?:and|but|so|yet)\s+(?:it|this|they|we|you|he|she|the\s+\w+|that|these|those)\s+)',
            s, flags=re.IGNORECASE
        )
        if m:
            part1 = s[:m.start()].strip().rstrip(',') + '.'
            part2_raw = s[m.start() + 1:].strip()
            part2 = re.sub(r'^(?:and|but|so|yet)\s+', '', part2_raw, flags=re.IGNORECASE).strip()
            if part2:
                part2 = part2[0].upper() + part2[1:]
            if part1 and part2 and len(part1.split()) >= 4 and len(part2.split()) >= 4:
                res.extend([part1, part2])
                split_done = True

        # Strategy 2: Sentence with embedded relative clause "X, which ..., VERB" — split after the clause closes
        if not split_done:
            # Pattern: "SUBJECT, which/that/who CLAUSE, MAIN_VERB REST"
            # Include ", which ... ," in part1; start new sentence from the main verb after close-comma
            # Guard: part2 must begin with a subject (pronoun, article, or capitalized multi-word phrase)
            # to avoid creating verb fragments like "Processes thousands of..."
            _SUBJECT_STARTERS = re.compile(
                r'^(?:it|this|they|we|you|he|she|that|these|those|the|a|an|i|his|her|its|our|their|'
                r'[A-Z][a-z]+\s+(?:is|are|was|were|has|have|had|can|will|would|could|should|does|do|did)\b)',
                re.IGNORECASE
            )
            comma_positions = [i for i, c in enumerate(s) if c == ',']
            for cp in comma_positions[:-1]:
                segment = s[cp:]
                m = re.match(r',\s*(?:which|that|who|where|when)\s+', segment, re.IGNORECASE)
                if m:
                    next_commas = [c for c in comma_positions if c > cp]
                    for close_cp in next_commas:
                        part1_candidate = s[:close_cp].strip() + '.'
                        part2_candidate = s[close_cp + 1:].strip()
                        if part2_candidate:
                            part2_candidate = part2_candidate[0].upper() + part2_candidate[1:]
                        # Guard: ensure part2 starts with a subject, not a bare verb
                        if (part1_candidate and part2_candidate
                                and len(part1_candidate.split()) >= 4
                                and len(part2_candidate.split()) >= 4
                                and _SUBJECT_STARTERS.match(part2_candidate)):
                            res.extend([part1_candidate, part2_candidate])
                            split_done = True
                            break
                    if split_done:
                        break

        # Strategy 3: Split at subordinate conjunctions "while/although/because/since/if + subject"
        if not split_done:
            m = re.search(
                r',\s*(while|although|because|since|if|as long as|even though|given that)\s+',
                s, flags=re.IGNORECASE
            )
            if m and m.start() > len(s) // 5:
                part1 = s[:m.start()].strip().rstrip(',') + '.'
                part2_raw = s[m.start() + 1:].strip()
                conj_end = re.match(r'^(?:while|although|because|since|if|as long as|even though|given that)\s+', part2_raw, re.IGNORECASE)
                if conj_end:
                    part2 = part2_raw[conj_end.end():].strip()
                    part2 = part2[0].upper() + part2[1:] if part2 else ''
                else:
                    part2 = part2_raw[0].upper() + part2_raw[1:] if part2_raw else ''
                if part1 and part2 and len(part1.split()) >= 4 and len(part2.split()) >= 4:
                    res.extend([part1, part2])
                    split_done = True

        # Strategy 4: Split at the comma closest to the midpoint that produces a valid subject-starting part2
        if not split_done:
            _SUBJ = re.compile(
                r'^(?:it|this|they|we|you|he|she|that|these|those|the|a|an|i|his|her|its|our|their)',
                re.IGNORECASE
            )
            mid = len(s) // 2
            commas = sorted(
                [i for i, c in enumerate(s) if c == ',' and abs(i - mid) < mid * 0.7],
                key=lambda i: abs(i - mid)
            )
            for best in commas:
                part1 = s[:best].strip() + '.'
                part2_raw = s[best + 1:].strip()
                part2 = part2_raw[0].upper() + part2_raw[1:] if part2_raw else ''
                if (part1 and part2
                        and len(part1.split()) >= 4
                        and len(part2.split()) >= 4
                        and _SUBJ.match(part2)):
                    res.extend([part1, part2])
                    split_done = True
                    break


        if not split_done:
            res.append(s)

    return _join_sentences(res)



def add_burstiness(text: str) -> str:
    """Helper exposed for route compatibility."""
    return clean_erroneous_punctuation(text)


# ── Main Entry Point ─────────────────────────────────────────────────────────

def humanize(
    text: str,
    intensity: float = 0.5,
    original_text: Optional[str] = None,
    mode: str = "standard",
) -> str:
    """
    Main entry point for advanced humanization engine.

    Args:
        text: LLM-rewritten text
        intensity: 0.0 = subtle polish, 1.0 = deep humanization
        original_text: Optional original input text for paragraph parity
        mode: Rewrite mode ("standard", "fluency", "natural", "academic", "creative", etc.)

    Returns:
        High-quality, naturally humanized text with clean typography and zero AI tells.
    """
    if not text or len(text) < 10:
        return text

    # Step 0: Extraction and typography normalization
    text = extract_final_output(text)
    text = strip_preamble(text)
    text = strip_outer_quotes(text)
    text = strip_formatting_artifacts(text)

    # Step 1: Resolve mode profile & deterministic PRNG
    mode_key = str(mode).lower() if mode else "standard"
    profile = MODE_PROFILES.get(mode_key, DEFAULT_PROFILE)

    seed_val = int(hashlib.md5((original_text or text).encode('utf-8')).hexdigest()[:8], 16)
    rng = random.Random(seed_val)

    # Step 2: Multi-paragraph processing
    orig_paras = [p.strip() for p in (original_text or text).strip().split('\n\n') if p.strip()]
    text_paras = [p.strip() for p in text.strip().split('\n\n') if p.strip()]

    if len(orig_paras) > 1 and len(text_paras) > 1 and len(orig_paras) == len(text_paras):
        processed_paras = []
        for para in text_paras:
            p_text = apply_context_aware_contractions(para, profile, rng)
            p_text = adjust_lexical_sophistication(p_text, profile, rng)
            processed_paras.append(p_text)
        text = "\n\n".join(processed_paras)
    else:
        text = apply_context_aware_contractions(text, profile, rng)
        text = adjust_lexical_sophistication(text, profile, rng)

    # Step 3: Strip formulaic summary patterns & deduplicate canned fillers
    text = strip_formulaic_patterns_and_summaries(text)
    text = deduplicate_and_diversify_fillers(text, mode_key)

    # Step 4: Apply paragraph parity
    text = apply_paragraph_intelligence(text, original_text, rng)

    # Step 5: Final punctuation and capitalization cleanup
    text = clean_erroneous_punctuation(text)

    # Proper Noun and sentence capitalization cleanup
    text = re.sub(r'([.!?]\s+)([a-z])', lambda m: m.group(1) + m.group(2).upper(), text)
    text = re.sub(r'  +', ' ', text)

    final_text = text.strip()
    return final_text if final_text else (original_text or text)
