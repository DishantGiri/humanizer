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
    readability_score: float = 0.0
    readability_grade: str = ""
    vocabulary_diversity: float = 0.0
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


def analyze(text: str) -> TextStats:
    """
    Run full analysis on the provided text and return a TextStats object.
    """
    if not text or not text.strip():
        return TextStats()

    words = _get_words(text)
    sentences = _split_sentences(text)
    paragraphs = [p for p in text.split("\n") if p.strip()]

    word_count = len(words)
    sentence_count = max(len(sentences), 1)
    avg_sentence_length = round(word_count / sentence_count, 1)

    # Readability via textstat
    readability = textstat.flesch_reading_ease(text)
    readability = max(0.0, min(100.0, readability))

    # Vocabulary diversity
    unique_words = set(words)
    diversity = round(len(unique_words) / max(word_count, 1), 3)

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
        readability_score=round(readability, 1),
        readability_grade=_readability_label(readability),
        vocabulary_diversity=diversity,
        repeated_words=_find_repeated_words(words),
        repeated_phrases=_find_repeated_phrases(text),
        passive_voice_count=len(passive_matches),
        reading_time_seconds=reading_time_seconds,
    )
