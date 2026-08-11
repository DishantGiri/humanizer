"""
Text Analyzer module.
Computes metrics on input text: word count, readability, vocabulary diversity, etc.
"""

import re
import math
from collections import Counter
from dataclasses import dataclass, asdict

import textstat


@dataclass
class TextStats:
    """Container for all text analysis metrics."""
    word_count: int = 0
    character_count: int = 0
    sentence_count: int = 0
    paragraph_count: int = 0
    avg_sentence_length: float = 0.0
    sentence_len_stdev: float = 0.0
    burstiness_score: float = 0.0
    readability_score: float = 0.0
    readability_grade: str = ""
    grammar_score: float = 100.0
    grammar_issues_count: int = 0
    vocabulary_diversity: float = 0.0
    hedging_count: int = 0
    predictable_patterns_count: int = 0
    repeated_words: list[dict] = None
    repeated_phrases: list[dict] = None
    passive_voice_count: int = 0
    reading_time_seconds: int = 0

    def __post_init__(self):
        if self.repeated_words is None:
            self.repeated_words = []
        if self.repeated_phrases is None:
            self.repeated_phrases = []

    def to_dict(self) -> dict:
        return asdict(self)


# ── Stop words to exclude from repeated-word analysis ───────────────────────

STOP_WORDS = {
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "it", "was", "are", "were", "be",
    "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "shall", "can", "this",
    "that", "these", "those", "i", "you", "he", "she", "we", "they",
    "me", "him", "her", "us", "them", "my", "your", "his", "its", "our",
    "their", "not", "no", "as", "if", "so", "than", "then", "just",
    "also", "very", "too", "more", "most", "all", "each", "every",
    "any", "some", "such", "into", "about", "up", "out", "when",
}

# ── Passive voice detection patterns ───────────────────────────────────────

PASSIVE_PATTERN = re.compile(
    r'\b(?:is|are|was|were|be|been|being)\s+'
    r'(?:\w+\s+)*?'
    r'(?:\w+ed|(?:writ|driv|giv|tak|spok|chos|brok|stolen|known|shown|grown|thrown|worn|torn|sworn|born|borne|drawn|withdrawn|flown|blown|frozen|chosen|hidden|ridden|written|bitten|eaten|beaten|forgotten|gotten|proven|shaken|mistaken|undertaken|awoken)en?)\b',
    re.IGNORECASE,
)


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences using a simple regex."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s for s in sentences if s.strip()]


def _get_words(text: str) -> list[str]:
    """Extract lowercase words from text."""
    return re.findall(r"[a-z']+", text.lower())


def _find_repeated_words(words: list[str], min_count: int = 3) -> list[dict]:
    """Find content words that appear frequently."""
    content_words = [w for w in words if w not in STOP_WORDS and len(w) > 2]
    counts = Counter(content_words)
    return [
        {"word": word, "count": count}
        for word, count in counts.most_common(10)
        if count >= min_count
    ]


def _find_repeated_phrases(text: str, min_count: int = 2) -> list[dict]:
    """Find 2-3 word phrases that repeat."""
    words = _get_words(text)
    phrases: list[str] = []
    for n in (2, 3):
        for i in range(len(words) - n + 1):
            phrase = " ".join(words[i : i + n])
            # skip if entirely stop words
            if not all(w in STOP_WORDS for w in words[i : i + n]):
                phrases.append(phrase)

    counts = Counter(phrases)
    return [
        {"phrase": phrase, "count": count}
        for phrase, count in counts.most_common(10)
        if count >= min_count
    ]


def _readability_label(score: float) -> str:
    """Convert Flesch Reading Ease score to a human label."""
    if score >= 90:
        return "Very Easy"
    elif score >= 80:
        return "Easy"
    elif score >= 70:
        return "Fairly Easy"
    elif score >= 60:
        return "Standard"
    elif score >= 50:
        return "Fairly Difficult"
    elif score >= 30:
        return "Difficult"
    else:
        return "Very Difficult"


def calculate_grammar_score(text: str) -> tuple[float, int]:
    """
    Evaluates real grammatical correctness, sentence completeness, and boundary integrity.
    Detects:
    1. Erroneous mid-sentence periods and fragments (e.g., 'into. Individual', 'adds. Up', 'tasks. Freeing').
    2. Missing main clause / relative pronoun fragments ('That expanded exponentially').
    3. Trailing prepositions or particles with periods.
    4. Consecutive or duplicate punctuation marks.
    Returns (grammar_score_percent, issues_count).
    """
    if not text or not text.strip():
        return 100.0, 0

    issues = 0
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]

    fragment_patterns = [
        # Preposition/verb before period followed by word: 'into. Individual', 'adds. Up'
        r'\b(into|with|from|about|through|under|over|upon|at|by|to|for|of|as|how|even|between|among|than|adds|takes|sets|turns|points)\.\s+[A-Za-z]',
        # Mid-sentence period before non-proper lowercase word
        r'(\b\w{2,})\.\s+([a-z])',
        # Dangling participial: 'tasks. Freeing'
        r'\b\w{2,}\.\s+(?:Freeing|Providing|Highlighting|Leading|Making|Resulting|Creating|Allowing|Pinpointing|Offering|Helping)\b',
        # Relative pronoun fragment: 'number. That expanded'
        r'\b\w{2,}\.\s+(?:That|Which|Who|Whom|Whose|Where)\s+(?:expanded|was|were|had|is|are|could|would|should|resulted|showed|made)\b',
        # Duplicate or misplaced punctuation
        r'\.{2,}|,,+|\s+[,.;:!?]|\.\s*,',
    ]

    for pat in fragment_patterns:
        matches = re.findall(pat, text)
        issues += len(matches)

    for s in sentences:
        words = s.split()
        if len(words) <= 3 and not any(w.lower() in ('yes', 'no', 'indeed', 'exactly', 'thanks', 'sure') for w in words):
            if words and words[0].lower() in ('that', 'which', 'who', 'where', 'because', 'although', 'freeing', 'providing'):
                issues += 1

    if len(sentences) > 0:
        penalty = min(75.0, (issues * 6.0))
        score = max(25.0, 100.0 - penalty)
    else:
        score = 100.0

    return round(score, 1), issues


# ── Hedging & Predictable Pattern Detection ─────────────────────────────────

HEDGING_PATTERN = re.compile(
    r'\b(?:suggests?|appears?|seems?|tends? to|it is believed|arguably|points? to|indicates?|perhaps|might)\b',
    re.IGNORECASE,
)

FORMULAIC_PATTERN_REGEXES = [
    re.compile(r'\b(?:furthermore|in conclusion|moreover|additionally|to sum up|in summary|importantly|notably|consequently)\b', re.IGNORECASE),
    re.compile(r'\b(?:ultimately,\s+this\s+(?:shows|highlights|demonstrates)|in\s+the\s+final\s+analysis|all\s+in\s+all,\s+it\s+is\s+clear)\b', re.IGNORECASE),
    re.compile(r'\b[a-zA-Z\'-]+,\s+[a-zA-Z\'-]+,\s+and\s+[a-zA-Z\'-]+\b', re.IGNORECASE),
]


def analyze(text: str) -> TextStats:
    """
    Run full analysis on the provided text and return a TextStats object.
    """
    if not text or not text.strip():
        return TextStats()

    import statistics

    words = _get_words(text)
    sentences = _split_sentences(text)
    paragraphs = [p for p in text.split("\n") if p.strip()]

    word_count = len(words)
    sentence_count = max(len(sentences), 1)
    avg_sentence_length = round(word_count / sentence_count, 1)

    # Sentence length standard deviation & burstiness ratio
    sentence_lens = [len(s.split()) for s in sentences]
    sentence_len_stdev = round(statistics.stdev(sentence_lens), 1) if len(sentence_lens) > 1 else 0.0
    short_sentences = sum(1 for l in sentence_lens if l <= 7)
    burstiness_score = round(short_sentences / sentence_count, 2)

    # Readability via textstat
    readability = textstat.flesch_reading_ease(text)
    readability = max(0.0, min(100.0, readability))

    # Grammar score calculation
    grammar_score, grammar_issues = calculate_grammar_score(text)

    # Vocabulary diversity
    unique_words = set(words)
    diversity = round(len(unique_words) / max(word_count, 1), 3)

    # Hedging count (epistemic modesty vs overconfidence)
    hedging_count = len(HEDGING_PATTERN.findall(text))

    # Predictable pattern count (robotic transitions, tricolons, ending summaries)
    predictable_count = sum(len(pat.findall(text)) for pat in FORMULAIC_PATTERN_REGEXES)

    # Passive voice
    passive_matches = PASSIVE_PATTERN.findall(text)

    # Reading time (avg 200 wpm)
    reading_time_seconds = max(1, math.ceil(word_count / 200 * 60))

    return TextStats(
        word_count=word_count,
        character_count=len(text),
        sentence_count=sentence_count,
        paragraph_count=len(paragraphs),
        avg_sentence_length=avg_sentence_length,
        sentence_len_stdev=sentence_len_stdev,
        burstiness_score=burstiness_score,
        readability_score=round(readability, 1),
        readability_grade=_readability_label(readability),
        grammar_score=grammar_score,
        grammar_issues_count=grammar_issues,
        vocabulary_diversity=diversity,
        hedging_count=hedging_count,
        predictable_patterns_count=predictable_count,
        repeated_words=_find_repeated_words(words),
        repeated_phrases=_find_repeated_phrases(text),
        passive_voice_count=len(passive_matches),
        reading_time_seconds=reading_time_seconds,
    )
