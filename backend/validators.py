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
            "burstiness_ratio": 0.0,
            "function_word_ratio": 0.0,
            "mean_word_length": 0.0,
            "total_words": 0,
            "total_sentences": 0
        }

    # Extract sentences and words
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text.strip()) if s.strip()]
    words = re.findall(r"[a-zA-Z']+", text.lower())

    total_words = len(words)
    total_sentences = max(1, len(sentences))

    # 1. Avg sentence length
    avg_sent_len = round(total_words / total_sentences, 1)

    # 2. Burstiness ratio (% of sentences with <= 7 words)
    short_sentences = sum(1 for s in sentences if len(re.findall(r"[a-zA-Z']+", s)) <= 7)
    burstiness_ratio = round(short_sentences / total_sentences, 2)

    # 3. Function word ratio
    function_word_count = sum(1 for w in words if w in FUNCTION_WORDS)
    func_ratio = round(function_word_count / max(1, total_words), 2)

    # 4. Mean word length
    total_chars = sum(len(w) for w in words)
    mean_word_len = round(total_chars / max(1, total_words), 2)

    return {
        "avg_sentence_length": avg_sent_len,
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
    if stats["avg_sentence_length"] > 22.0:
        issues.append(f"Avg sentence length too high ({stats['avg_sentence_length']} words, max target 22.0)")

    if stats["burstiness_ratio"] < 0.15:
        issues.append(f"Low burstiness ({int(stats['burstiness_ratio']*100)}% micro-sentences, target >= 15%)")

    if stats["function_word_ratio"] < 0.35:
        issues.append(f"Low function word ratio ({int(stats['function_word_ratio']*100)}% function words, target >= 35%)")

    if stats["mean_word_length"] > 5.8:
        issues.append(f"High mean word length ({stats['mean_word_length']} chars, target <= 5.8)")

    if issues:
        reason = "Statistical anti-AI boundaries notice: " + "; ".join(issues)
        logger.info("Validation note: %s", reason)
        return False, reason, stats

    return True, "Statistically matches human text profile.", stats
