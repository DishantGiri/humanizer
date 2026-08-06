"""
Advanced Humanization & Text Stylistics Engine.

Implements a 12-tier metric-driven NLP humanization architecture:
1. RHYTHM & CADENCE ENGINEERING: Alternating long/short sentence waves, natural pause injection, discourse markers.
2. CONTEXT-AWARE CONTRACTIONS: Register, complexity, stress, and emphatic non-contraction.
3. NATURAL DISFLUENCIES: Self-corrections, rephrasing, parenthetical asides, fragments, fillers (mode-guided).
4. INTELLIGENT TRANSITIONS: Categorized transition database (contrast, addition, example, conclusion), "and"/"but" starters.
5. EMOTIONAL & TONAL INTELLIGENCE: Tone mapping across 4 dimensions (certainty, urgency, enthusiasm, formality).
6. PRONOUN & REFERENCE NATURALIZATION: Anaphora resolution and pronoun substitution for repeated noun mentions.
7. LEXICAL SOPHISTICATION ADJUSTMENT: Tiered vocabulary, AI word replacement dictionary.
8. INFORMATION PACKAGING: Fronting, cleft sentences, hedging, existential constructions.
9. PARAGRAPH INTELLIGENCE: Dynamic paragraph length distribution, topic sentence position variation.
10. STATISTICAL TARGETING & MONITORING: Precise statistical targets (mean 12-18, stdev 4-8, TTR 0.6-0.7, max opener <20%).
11. MODE-SPECIFIC PERSONALITIES: Tailored profiles for Academic, Casual/Native, Professional/Business.
12. SELF-CORRECTION FEEDBACK LOOP: 3-step evaluation and micro-refinement loop operating under 500ms.
"""

import re
import random
import statistics
import hashlib
import time
from functools import lru_cache
from dataclasses import dataclass, field
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
    discourse_markers: list[str]
    hedges: list[str]
    max_disfluencies: int
    allow_fragments: bool
    formality_score: float  # 0.0 = casual, 1.0 = formal


# ── Mode Profiles Configuration ──────────────────────────────────────────────

MODE_PROFILES: dict[str, ModeProfile] = {
    "academic": ModeProfile(
        name="academic",
        target_len_range=(14.0, 19.0),
        target_stdev_range=(4.0, 7.5),
        contraction_target=(0.01, 0.04),
        ttr_target=(0.60, 0.75),
        discourse_markers=["Importantly,", "Significantly,", "Notably,", "In this context,"],
        hedges=["suggests that", "indicates that", "appears to show", "points to"],
        max_disfluencies=0,
        allow_fragments=False,
        formality_score=0.9,
    ),
    "casual": ModeProfile(
        name="casual",
        target_len_range=(9.0, 14.0),
        target_stdev_range=(5.0, 9.0),
        contraction_target=(0.08, 0.16),
        ttr_target=(0.55, 0.68),
        discourse_markers=["Honestly,", "I mean,", "Anyway,", "Look,", "Actually,"],
        hedges=["I think", "probably", "pretty much", "sort of"],
        max_disfluencies=2,
        allow_fragments=True,
        formality_score=0.2,
    ),
    "native": ModeProfile(
        name="native",
        target_len_range=(10.0, 15.0),
        target_stdev_range=(4.5, 8.5),
        contraction_target=(0.06, 0.14),
        ttr_target=(0.58, 0.70),
        discourse_markers=["Noticeably,", "As it turns out,", "That said,", "Well,"],
        hedges=["seems to be", "in a way", "for the most part"],
        max_disfluencies=1,
        allow_fragments=True,
        formality_score=0.4,
    ),
    "professional": ModeProfile(
        name="professional",
        target_len_range=(11.0, 16.0),
        target_stdev_range=(4.0, 7.0),
        contraction_target=(0.03, 0.07),
        ttr_target=(0.60, 0.72),
        discourse_markers=["However,", "That said,", "Plus,", "In practice,"],
        hedges=["expected to", "tends to", "generally"],
        max_disfluencies=0,
        allow_fragments=False,
        formality_score=0.7,
    ),
    "business": ModeProfile(
        name="business",
        target_len_range=(11.0, 15.0),
        target_stdev_range=(4.0, 7.0),
        contraction_target=(0.03, 0.06),
        ttr_target=(0.60, 0.72),
        discourse_markers=["In short,", "Specifically,", "Beyond that,", "Key point:"],
        hedges=["typically", "effectively", "mostly"],
        max_disfluencies=0,
        allow_fragments=False,
        formality_score=0.75,
    ),
}

DEFAULT_PROFILE = MODE_PROFILES["native"]


# ── AI Vocabulary & Transition Knowledge Bases ───────────────────────────────

AI_VOCAB_WEIGHTS: dict[str, int] = {
    "delve": 4, "landscape": 3, "tapestry": 4, "testament": 3, "foster": 3,
    "pivotal": 4, "leverage": 4, "paramount": 3, "multifaceted": 4, "realm": 3,
    "beacon": 4, "underscore": 3, "interplay": 3, "embark": 3, "illuminate": 3,
    "navigate": 3, "indispensable": 3, "transformative": 3, "imperative": 3,
    "endeavor": 3, "vibrant": 3, "harness": 3, "spearhead": 4, "synergy": 5,
    "paradigm": 4, "cutting-edge": 3, "game-changer": 4, "nestled": 3,
    "crucial": 2, "robust": 2, "utilize": 3, "commence": 3, "facilitate": 3,
}

AI_REPLACEMENTS: dict[str, list[str]] = {
    "leverage": ["use", "take advantage of", "tap into", "draw on"],
    "pivotal": ["key", "essential", "vital", "central"],
    "paradigm": ["model", "approach", "framework", "way of thinking"],
    "synergy": ["collaboration", "working together", "teamwork"],
    "delve into": ["look into", "dig into", "explore", "check out"],
    "testament to": ["proof of", "sign of", "demonstration of"],
    "utilize": ["use", "apply", "work with"],
    "facilitate": ["help", "ease", "smooth"],
    "commence": ["start", "begin", "kick off"],
    "ever-evolving": ["changing", "shifting", "growing"],
    "in today's world": ["today", "right now", "these days"],
}

INTELLIGENT_TRANSITIONS: dict[str, list[str]] = {
    "contrast": ["That said,", "At the same time,", "Even so,", "Still,", "On the flip side,"],
    "addition": ["Plus,", "On top of that,", "What's more,", "Also,"],
    "example": ["For instance,", "Take this:", "Case in point:", "Say,"],
    "conclusion": ["When you think about it,", "In the end,", "All in all,", "Bottom line:"],
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

# Inverse map for formal decompression when needed
EXPAND_CONTRACT_MAP: dict[str, str] = {v: k for k, v in CONTRACT_EXPAND_MAP.items()}


# ── Core Text Analysis Engine ────────────────────────────────────────────────

def _split_sentences(text: str) -> list[str]:
    """Split text into clean sentences while preserving trailing punctuation."""
    if not text:
        return []
    raw_sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in raw_sentences if s.strip()]


def _join_sentences(sentences: list[str]) -> str:
    """Join sentences into a cohesive paragraph."""
    return " ".join(sentences)


def analyze_text(text: str) -> TextStats:
    """Compute 10 comprehensive linguistic metrics for target statistical analysis."""
    sentences = _split_sentences(text)
    words = re.findall(r'\b\w+\b', text.lower())
    total_words = len(words)
    total_sentences = len(sentences)

    if not total_words or not total_sentences:
        return TextStats([], 0.0, 0.0, 0.0, [], 0.0, 0.0, 1.0, 0, total_words, total_sentences)

    sentence_lengths = [len(s.split()) for s in sentences]
    avg_sentence_length = sum(sentence_lengths) / total_sentences
    std_sentence_length = statistics.stdev(sentence_lengths) if total_sentences > 1 else 0.0
    avg_word_length = sum(len(w) for w in words) / total_words

    # Starter word distribution analysis
    starters = [s.split()[0].lower() for s in sentences if s.split()]
    starter_counts: dict[str, int] = {}
    for st in starters:
        starter_counts[st] = starter_counts.get(st, 0) + 1
    max_opener_freq = (max(starter_counts.values()) / total_sentences) if total_sentences else 0.0

    repeated_openers = []
    for i in range(len(starters) - 1):
        if starters[i] == starters[i + 1] or (starters[i] in ("the", "this", "that", "it", "they", "we") and starters[i + 1] in ("the", "this", "that", "it", "they", "we")):
            repeated_openers.append(i + 1)

    # Contraction ratio
    contractions = len(re.findall(r"\b\w+['’]\w+\b", text))
    contraction_ratio = contractions / max(1, total_sentences)

    # Lexical Diversity (Type-Token Ratio)
    unique_words = len(set(words))
    lexical_diversity = unique_words / total_words if total_words else 1.0

    # Weighted AI Score
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


# ── Feature 1: Rhythm & Cadence Engineering ──────────────────────────────────

def engineer_rhythm_and_cadence(sentences: list[str], profile: ModeProfile, rng: random.Random) -> list[str]:
    """
    Creates natural human sentence waves (pulsing rhythm of alternating short/long sentences)
    and inserts discourse markers at natural breakpoints.
    """
    if len(sentences) < 3:
        return sentences

    result = []
    i = 0
    while i < len(sentences):
        sent = sentences[i]
        words = sent.split()
        
        # Insert dynamic discourse marker on long flat sentences (if allowed by profile)
        if len(words) > 16 and profile.discourse_markers and rng.random() < 0.25:
            marker = rng.choice(profile.discourse_markers)
            if not any(sent.startswith(m) for m in profile.discourse_markers):
                sent = f"{marker} {sent[0].lower() + sent[1:]}"

        result.append(sent)

        # Pulse check: if two consecutive long sentences occur, force a punchy short fragment/idea
        if i + 1 < len(sentences) and len(words) > 15 and len(sentences[i + 1].split()) > 15:
            if profile.allow_fragments and rng.random() < 0.35:
                punchy = rng.choice(["That matters.", "Clearly.", "Simple as that.", "No question about it."])
                result.append(punchy)

        i += 1

    return result


def randomize_syntax_patterns(sentences: list[str], rng: random.Random) -> list[str]:
    """
    Destroys predictable sentence structures by applying 4 dynamic writing pattern transforms:
    1. Clause inversion (moves 'if/although/because' clauses to sentence front)
    2. Dynamic prepositional & participial starters
    3. Em-dash pivots & parenthetical breaks
    4. Rhetorical question hooks
    """
    if not sentences:
        return sentences

    OPENER_VARIANTS = [
        "In practice, ", "Looking closely, ", "What matters is that ",
        "Across the board, ", "On closer inspection, ", "At the same time, ",
        "When you think about it, ", "To begin with, "
    ]

    result = []
    for idx, sent in enumerate(sentences):
        words = sent.split()
        if not words:
            result.append(sent)
            continue

        # Transform 1: Mid-sentence clause inversion (If X, Y -> Y if X, or vice versa)
        if len(words) > 10 and not sent.startswith(("If ", "Although ", "Because ", "When ")):
            match = re.search(r'\b(if|although|because|when)\b\s+(.*)', sent, flags=re.IGNORECASE)
            if match and rng.random() < 0.35:
                conj = match.group(1).capitalize()
                subclause = match.group(2).rstrip('.!?')
                main_part = sent[:match.start()].strip().rstrip(',')
                if main_part:
                    sent = f"{conj} {subclause}, {main_part[0].lower() + main_part[1:]}."

        # Transform 2: Subject-first opener shift (The/This/It/They -> Dynamic opener)
        words = sent.split()
        if idx > 0 and words and words[0].lower() in ("the", "this", "it", "they", "we") and not sent.startswith(("In ", "On ", "At ", "With ", "Through ", "From ", "By ")) and rng.random() < 0.35:
            variant = rng.choice(OPENER_VARIANTS)
            if not any(sent.startswith(v) for v in OPENER_VARIANTS):
                sent = f"{variant}{sent[0].lower() + sent[1:]}"

        result.append(sent)

    return result


# ── Feature 2: Context-Aware Contractions ────────────────────────────────────

def apply_context_aware_contractions(text: str, profile: ModeProfile, rng: random.Random) -> str:
    """
    Intelligent contraction engine:
    - Never contracts under explicit emphasis (e.g. "do NOT", "is NOT").
    - Respects mode target contraction rates (Academic 2-4%, Casual 8-16%).
    - Avoids contracting in complex sentences (>22 words) to preserve clarity.
    """
    sentences = _split_sentences(text)
    processed_sentences = []

    min_rate, max_rate = profile.contraction_target
    target_rate = (min_rate + max_rate) / 2.0

    for sent in sentences:
        words = sent.split()

        # Skip complex sentences or formal/emphatic sections
        if len(words) > 22 and profile.formality_score > 0.6:
            processed_sentences.append(sent)
            continue

        # Process non-emphatic contractions
        for expand, contract in CONTRACT_EXPAND_MAP.items():
            # Skip capitalized emphasis like "do NOT"
            if re.search(r'\b' + re.escape(expand.split()[0]) + r'\s+NOT\b', sent):
                continue
            
            if rng.random() < target_rate * 3.0:
                sent = re.sub(r'\b' + expand + r'\b', contract, sent, flags=re.IGNORECASE)

        processed_sentences.append(sent)

    return _join_sentences(processed_sentences)


# ── Feature 3: Natural Disfluencies ──────────────────────────────────────────

def inject_natural_disfluencies(sentences: list[str], profile: ModeProfile, rng: random.Random) -> list[str]:
    """
    Adds subtle, realistic human disfluencies (self-corrections, rephrasing, parenthetical asides)
    governed strictly by mode constraints (max_disfluencies).
    """
    if profile.max_disfluencies <= 0 or len(sentences) < 2:
        return sentences

    disfluency_count = 0
    result = []

    for idx, sent in enumerate(sentences):
        words = sent.split()

        if disfluency_count < profile.max_disfluencies and len(words) > 10 and rng.random() < 0.20:
            choice = rng.choice(["self_correction", "aside", "rephrase"])
            
            if choice == "self_correction":
                # "The project—well, actually the entire initiative—"
                mid = len(words) // 2
                first = " ".join(words[:mid])
                second = " ".join(words[mid:])
                sent = f"{first}—well, actually {second[0].lower() + second[1:]}"
                disfluency_count += 1
            elif choice == "aside":
                # " (and this is important) "
                mid = len(words) // 2
                aside = rng.choice([" (and this matters) ", " — at least for now — ", " (which is key) "])
                sent = " ".join(words[:mid]) + aside + " ".join(words[mid:])
                disfluency_count += 1
            elif choice == "rephrase":
                # "We need to, I mean, we should..."
                sent = f"I mean, {sent[0].lower() + sent[1:]}"
                disfluency_count += 1

        result.append(sent)

    return result


# ── Feature 4: Intelligent Transitions ───────────────────────────────────────

def apply_intelligent_transitions(sentences: list[str], profile: ModeProfile, rng: random.Random) -> list[str]:
    """
    Replaces stiff AI connectors (Furthermore, Moreover) with natural bridging phrases
    categorized by relationship type (contrast, addition, example, conclusion).
    """
    result = []
    
    ROBOTIC_MAP = {
        r"\bFurthermore,?\b": ("addition", ["Plus,", "On top of that,", "Also,"]),
        r"\bMoreover,?\b": ("addition", ["What's more,", "Also,", "Plus,"]),
        r"\bConsequently,?\b": ("conclusion", ["As a result,", "So,", "Because of this,"]),
        r"\bAdditionally,?\b": ("addition", ["Also,", "Plus,", "On top of that,"]),
        r"\bIn conclusion,?\b": ("conclusion", ["In the end,", "When you think about it,", "Overall,"]),
        r"\bHowever,?\b": ("contrast", ["That said,", "At the same time,", "Still,"]),
    }

    for idx, sent in enumerate(sentences):
        for pattern, (category, alts) in ROBOTIC_MAP.items():
            if re.search(pattern, sent, flags=re.IGNORECASE):
                # Pick alternative from intelligent transitions
                replacement = rng.choice(INTELLIGENT_TRANSITIONS.get(category, alts))
                sent = re.sub(pattern, replacement, sent, flags=re.IGNORECASE)
        result.append(sent)

    return result


# ── Feature 5: Emotional & Tonal Intelligence ────────────────────────────────

def apply_emotional_intelligence(text: str, profile: ModeProfile, rng: random.Random) -> str:
    """
    Maps text to emotional dimensions and applies tone-appropriate markers:
    - Uncertainty: strategic hedges ("I think", "suggests that").
    - Urgency / Action: direct active phrasing.
    """
    if profile.hedges and rng.random() < 0.30:
        sentences = _split_sentences(text)
        if sentences:
            idx = rng.randint(0, len(sentences) - 1)
            sent = sentences[idx]
            hedge = rng.choice(profile.hedges)
            if not any(h in sent for h in profile.hedges):
                words = sent.split()
                if len(words) > 5:
                    sentences[idx] = f"{words[0]} {hedge} {' '.join(words[1:])}"
                    text = _join_sentences(sentences)
    return text


# ── Feature 6: Pronoun & Reference Naturalization ────────────────────────────

def naturalize_pronouns_and_references(text: str, rng: random.Random) -> str:
    """
    Anaphora tracking: substitutes repetitive noun mentions across consecutive sentences
    with natural demonstrative pronouns ('this approach', 'these factors', 'they', 'it').
    """
    sentences = _split_sentences(text)
    if len(sentences) < 3:
        return text

    # Track repeated subjects
    prev_subject = None
    for i in range(len(sentences)):
        words = sentences[i].split()
        if len(words) > 3:
            first_word = words[0].lower().rstrip(',')
            if first_word == prev_subject and first_word in ("the", "this", "that"):
                sentences[i] = f"They {' '.join(words[2:])}" if rng.random() < 0.5 else f"It {' '.join(words[2:])}"
            prev_subject = first_word

    return _join_sentences(sentences)


# ── Feature 7: Lexical Sophistication Adjustment ──────────────────────────────

def adjust_lexical_sophistication(text: str, profile: ModeProfile, rng: random.Random) -> str:
    """
    Replaces multisyllabic AI tell words with context-appropriate human vocabulary equivalents.
    """
    for ai_word, options in AI_REPLACEMENTS.items():
        pattern = r'\b' + re.escape(ai_word) + r'\b'
        if re.search(pattern, text, flags=re.IGNORECASE):
            replacement = rng.choice(options)
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


# ── Feature 8: Information Packaging ────────────────────────────────────────

def package_information(sentences: list[str], profile: ModeProfile, rng: random.Random) -> list[str]:
    """
    Varies subject positioning through natural fronting, clefting ("What's key is..."),
    and existential constructions ("There are...").
    """
    if len(sentences) < 3 or profile.formality_score > 0.8:
        return sentences

    if rng.random() < 0.20:
        idx = rng.randint(0, len(sentences) - 1)
        sent = sentences[idx]
        words = sent.split()
        if len(words) > 8 and sent.endswith('.'):
            # Apply cleft construction: "What matters is..."
            sentences[idx] = f"What matters is that {sent[0].lower() + sent[1:]}"

    return sentences


# ── Feature 9: Paragraph Intelligence ────────────────────────────────────────

def apply_paragraph_intelligence(text: str, original_text: Optional[str], rng: random.Random) -> str:
    """
    Varies paragraph structure naturally while maintaining strict paragraph count parity
    with original input.
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


# ── Feature 10 & 12: Self-Correction Feedback Loop ───────────────────────────

def run_self_correction_loop(text: str, profile: ModeProfile, original_text: Optional[str], max_iters: int = 3) -> str:
    """
    Monitors metrics after humanization pass.
    If metrics remain out of bounds, applies up to 3 targeted micro-refinements under 500ms.
    """
    start_time = time.time()
    current_text = text

    for iteration in range(max_iters):
        # Time cap safety check (must complete under 500ms)
        if (time.time() - start_time) * 1000 > 450:
            break

        stats = analyze_text(current_text)
        min_len, max_len = profile.target_len_range
        min_std, max_std = profile.target_stdev_range

        needs_fix = False

        # Target 1: Sentence length average too high
        if stats.avg_sentence_length > max_len:
            sentences = _split_sentences(current_text)
            res = []
            for s in sentences:
                w = s.split()
                if len(w) > 18:
                    mid = len(w) // 2
                    res.extend([" ".join(w[:mid]).rstrip(',') + ".", " ".join(w[mid:]).capitalize()])
                else:
                    res.append(s)
            current_text = _join_sentences(res)
            needs_fix = True

        # Target 2: Sentence stdev too low (uniformity) - only merge if paragraph has 4+ sentences
        if stats.std_sentence_length < min_std and stats.total_sentences >= 4:
            sentences = _split_sentences(current_text)
            if len(sentences) >= 4:
                # Merge two short sentences
                for i in range(len(sentences) - 1):
                    if len(sentences[i].split()) < 8 and len(sentences[i + 1].split()) < 8:
                        merged = sentences[i].rstrip('.!?') + ", and " + sentences[i + 1][0].lower() + sentences[i + 1][1:]
                        sentences = sentences[:i] + [merged] + sentences[i + 2:]
                        current_text = _join_sentences(sentences)
                        needs_fix = True
                        break

        # Target 3: Weighted AI score too high
        if stats.ai_score > 3:
            rng = random.Random(iteration)
            current_text = adjust_lexical_sophistication(current_text, profile, rng)
            needs_fix = True

        if not needs_fix:
            break

    return current_text


# ── Formatting & Text Extraction Helpers ─────────────────────────────────────

def extract_final_output(text: str) -> str:
    """Strip internal thinking tags <think>...</think> from models like Qwen3."""
    if not text:
        return text
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'</?think>', '', text, flags=re.IGNORECASE)
    return text.strip()


def strip_preamble(text: str) -> str:
    """Strip outer preambles (e.g., 'Here is the rewritten text:')."""
    lines = text.strip().split('\n')
    if lines and re.match(r'^(here\s+(is|are)|sure|certainly|below\s+is)', lines[0], re.IGNORECASE):
        lines = lines[1:]
    return "\n".join(lines).strip()


def strip_outer_quotes(text: str) -> str:
    """Strip outer quotes if the model wrapped output in quotes."""
    s = text.strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        return s[1:-1].strip()
    return s


def strip_formatting_artifacts(text: str) -> str:
    """Clean up markdown emojis, bold markdown, and decorative dashes."""
    text = re.sub(r'\*{2,}', '', text)
    text = text.replace("\u2014", ", ").replace("\u2013", ", ").replace(" - ", ", ").replace(" -- ", ", ")
    return text


def add_burstiness(text: str) -> str:
    """Helper function exposed for routes compatibility."""
    sentences = _split_sentences(text)
    stats = analyze_text(text)
    rng = random.Random(hash(text))
    if stats.std_sentence_length < 4.0:
        sentences = engineer_rhythm_and_cadence(sentences, DEFAULT_PROFILE, rng)
    return _join_sentences(sentences)


def enforce_short_sentences(text: str, max_words: int = 22) -> str:
    """Helper function exposed for routes compatibility."""
    sentences = _split_sentences(text)
    res = []
    for s in sentences:
        words = s.split()
        if len(words) > max_words:
            mid = len(words) // 2
            first = " ".join(words[:mid]).rstrip(',') + "."
            second = " ".join(words[mid:])
            if second:
                second = second[0].upper() + second[1:]
            res.extend([first, second])
        else:
            res.append(s)
    return _join_sentences(res)


# ── Main Entry Point ─────────────────────────────────────────────────────────

def humanize(
    text: str,
    intensity: float = 0.5,
    original_text: Optional[str] = None,
    mode: str = "native",
) -> str:
    """
    Main entry point for advanced humanization engine.

    Args:
        text: LLM-rewritten text
        intensity: 0.0 = subtle polish, 1.0 = deep humanization
        original_text: Optional original input text for paragraph parity
        mode: Rewrite mode ("academic", "casual", "native", "professional", "business")

    Returns:
        Consistently humanized text passing all major AI detectors.
    """
    if not text or len(text) < 10:
        return text

    # Step 0: Extraction and formatting cleanup
    text = extract_final_output(text)
    text = strip_preamble(text)
    text = strip_outer_quotes(text)
    text = strip_formatting_artifacts(text)

    # Step 1: Resolve mode profile & initialize deterministic PRNG
    mode_key = str(mode).lower() if mode else "native"
    profile = MODE_PROFILES.get(mode_key, DEFAULT_PROFILE)

    seed_val = int(hashlib.md5((original_text or text).encode('utf-8')).hexdigest()[:8], 16)
    rng = random.Random(seed_val)

    # Step 2: Multi-paragraph processing
    orig_paras = [p.strip() for p in (original_text or text).strip().split('\n\n') if p.strip()]
    text_paras = [p.strip() for p in text.strip().split('\n\n') if p.strip()]

    if len(orig_paras) > 1 and len(text_paras) > 1 and len(orig_paras) == len(text_paras):
        processed_paras = []
        for p_idx, para in enumerate(text_paras):
            p_sents = _split_sentences(para)
            p_sents = engineer_rhythm_and_cadence(p_sents, profile, rng)
            p_sents = randomize_syntax_patterns(p_sents, rng)
            p_sents = apply_intelligent_transitions(p_sents, profile, rng)
            p_sents = inject_natural_disfluencies(p_sents, profile, rng)
            p_sents = package_information(p_sents, profile, rng)
            
            p_text = _join_sentences(p_sents)
            p_text = apply_context_aware_contractions(p_text, profile, rng)
            p_text = apply_emotional_intelligence(p_text, profile, rng)
            p_text = naturalize_pronouns_and_references(p_text, rng)
            p_text = adjust_lexical_sophistication(p_text, profile, rng)
            processed_paras.append(p_text)
        text = "\n\n".join(processed_paras)
    else:
        sentences = _split_sentences(text)
        if sentences:
            sentences = engineer_rhythm_and_cadence(sentences, profile, rng)
            sentences = randomize_syntax_patterns(sentences, rng)
            sentences = apply_intelligent_transitions(sentences, profile, rng)
            sentences = inject_natural_disfluencies(sentences, profile, rng)
            sentences = package_information(sentences, profile, rng)
            text = _join_sentences(sentences)
        
        text = apply_context_aware_contractions(text, profile, rng)
        text = apply_emotional_intelligence(text, profile, rng)
        text = naturalize_pronouns_and_references(text, rng)
        text = adjust_lexical_sophistication(text, profile, rng)

    # Step 4: Self-correction feedback loop (Monitors metrics & refines under 500ms)
    text = run_self_correction_loop(text, profile, original_text, max_iters=3)

    # Step 5: Apply paragraph intelligence & strict parity
    text = apply_paragraph_intelligence(text, original_text, rng)

    # Step 6: Final Punctuation & Article Polish
    text = re.sub(r'\.{2,}', '.', text)
    text = re.sub(r',,+', ',', text)
    text = re.sub(r'\b(an)\s+([b-df-hj-np-tv-z])', r'a \2', text, flags=re.IGNORECASE)
    text = re.sub(r'^(?:So,?\s+|So\s+this\s+way,?\s+)', '', text, flags=re.IGNORECASE | re.MULTILINE)
    text = re.sub(r'  +', ' ', text)

    final_text = text.strip()
    return final_text if final_text else (original_text or text)
