"""
Post-Hoc Statistical Validator module.
Validates rewritten text against empirical human writing statistical boundaries:
1. Average Sentence Length (8 - 16 words)
2. Burstiness Ratio (at least 25% short micro-sentences <= 7 words)
3. Function Word Ratio (at least 35% function words / pronouns)
4. Mean Word Length (average word length <= 5.8 characters)
"""

import re
import logging
from typing import Tuple, Dict, Any

logger = logging.getLogger(__name__)

FUNCTION_WORDS = {
    'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your', 'he', 'him', 'his',
    'she', 'her', 'it', 'its', 'they', 'them', 'their', 'this', 'that',
    'these', 'those', 'a', 'an', 'the', 'and', 'but', 'or', 'so', 'if',
    'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with',
    'about', 'against', 'between', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
    'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
    'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
    'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'well'
}


def evaluate_statistical_profile(text: str) -> Dict[str, Any]:
    """
    Computes anti-AI statistical metrics for a text block.
    """
    if not text or not text.strip():
        return {
            "avg_sentence_length": 0.0,
            "sentence_length_stdev": 0.0,
            "burstiness_ratio": 0.0,
            "function_word_ratio": 0.0,
            "mean_word_length": 0.0,
            "total_words": 0,
            "total_sentences": 0
        }

    import statistics

    # Extract sentences and words
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text.strip()) if s.strip()]
    words = re.findall(r"[a-zA-Z']+", text.lower())

    total_words = len(words)
    total_sentences = max(1, len(sentences))

    # 1. Avg sentence length & stdev
    avg_sent_len = round(total_words / total_sentences, 1)
    sent_lens = [len(re.findall(r"[a-zA-Z']+", s)) for s in sentences]
    sent_stdev = round(statistics.stdev(sent_lens), 1) if len(sent_lens) > 1 else 0.0

    # 2. Burstiness ratio (% of sentences with <= 7 words)
    short_sentences = sum(1 for l in sent_lens if l <= 7)
    burstiness_ratio = round(short_sentences / total_sentences, 2)

    # 3. Function word ratio
    function_word_count = sum(1 for w in words if w in FUNCTION_WORDS)
    func_ratio = round(function_word_count / max(1, total_words), 2)

    # 4. Mean word length
    total_chars = sum(len(w) for w in words)
    mean_word_len = round(total_chars / max(1, total_words), 2)

    return {
        "avg_sentence_length": avg_sent_len,
        "sentence_length_stdev": sent_stdev,
        "burstiness_ratio": burstiness_ratio,
        "function_word_ratio": func_ratio,
        "mean_word_length": mean_word_len,
        "total_words": total_words,
        "total_sentences": total_sentences
    }


def validate_human_statistics(text: str) -> Tuple[bool, str, Dict[str, Any]]:
    """
    Validates text against human statistical thresholds.
    Returns (is_valid, reason, stats_dict).
    """
    stats = evaluate_statistical_profile(text)
    if stats["total_words"] < 15:
        return True, "Short snippet, stats skipped.", stats

    issues = []
    if stats["avg_sentence_length"] > 18.0:
        issues.append(f"Avg sentence length too high ({stats['avg_sentence_length']} words, max target 18.0)")

    if stats["burstiness_ratio"] < 0.20 and stats["total_sentences"] >= 3:
        issues.append(f"Low burstiness ({int(stats['burstiness_ratio']*100)}% micro-sentences, target >= 20%)")

    if stats["total_sentences"] >= 4 and stats["sentence_length_stdev"] < 3.5:
        issues.append(f"Low sentence length variation (stdev {stats['sentence_length_stdev']}, target >= 3.5)")

    if stats["function_word_ratio"] < 0.35:
        issues.append(f"Low function word ratio ({int(stats['function_word_ratio']*100)}% function words, target >= 35%)")

    if stats["mean_word_length"] > 5.8:
        issues.append(f"High mean word length ({stats['mean_word_length']} chars, target <= 5.8)")

    # Check for robotic formulaic transition markers
    robotic_matches = re.findall(r'\b(?:furthermore|in conclusion|moreover|to sum up|in summary|notably|importantly|consequently)\b', text, re.IGNORECASE)
    if robotic_matches:
        issues.append(f"Contains formulaic transition markers: {', '.join(set(robotic_matches))}")

    # Check for high-density hedge words (Signal C tells)
    hedge_matches = re.findall(r'\b(?:often|typically|tends to|may result in|in many cases|it is believed|generally speaking)\b', text, re.IGNORECASE)
    if len(hedge_matches) >= 2:
        issues.append(f"High hedge word density: {len(hedge_matches)} hedges detected ({', '.join(set(hedge_matches))})")

    if issues:
        reason = "Statistical anti-AI boundaries notice: " + "; ".join(issues)
        logger.info("Validation note: %s", reason)
        return False, reason, stats

    return True, "Statistically matches human text profile.", stats

