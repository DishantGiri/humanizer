"""
Utility functions.
Diff counting, reading time, input sanitization.
"""

import re
import math


def count_changes(original: str, rewritten: str) -> dict:
    """
    Count word-level changes between original and rewritten text.
    Uses a simple longest-common-subsequence approach for efficiency.

    Returns:
        {
            "total_changes": int,
            "words_added": int,
            "words_removed": int,
            "change_percentage": float
        }
    """
    orig_words = original.split()
    new_words = rewritten.split()

    # Build LCS length table
    m, n = len(orig_words), len(new_words)

    # Use space-efficient LCS (only need two rows)
    prev = [0] * (n + 1)
    curr = [0] * (n + 1)

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if orig_words[i - 1].lower() == new_words[j - 1].lower():
                curr[j] = prev[j - 1] + 1
            else:
                curr[j] = max(prev[j], curr[j - 1])
        prev, curr = curr, [0] * (n + 1)

    lcs_length = prev[n] if m > 0 else 0
    words_removed = m - lcs_length
    words_added = n - lcs_length
    total_changes = words_added + words_removed

    change_percentage = round(
        (total_changes / max(m, 1)) * 100, 1
    )

    return {
        "total_changes": total_changes,
        "words_added": words_added,
        "words_removed": words_removed,
        "change_percentage": change_percentage,
    }


def compute_reading_time(text: str, wpm: int = 200) -> dict:
    """
    Estimate reading time based on word count.

    Returns:
        {
            "minutes": int,
            "seconds": int,
            "label": str  (e.g., "2 min read")
        }
    """
    word_count = len(text.split())
    total_seconds = max(1, math.ceil(word_count / wpm * 60))
    minutes = total_seconds // 60
    seconds = total_seconds % 60

    if minutes == 0:
        label = f"{seconds} sec read"
    elif minutes == 1:
        label = "1 min read"
    else:
        label = f"{minutes} min read"

    return {
        "minutes": minutes,
        "seconds": seconds,
        "label": label,
    }


def sanitize_input(text: str) -> str:
    """
    Clean up user input text.
    - Strip leading/trailing whitespace
    - Collapse excessive blank lines (3+ → 2)
    - Collapse excessive spaces (3+ → 1)
    """
    if not text:
        return ""

    text = text.strip()

    # Collapse 3+ consecutive blank lines to 2
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Collapse 3+ spaces to single space
    text = re.sub(r" {3,}", " ", text)

    return text


def compute_word_diff(original: str, rewritten: str) -> list[dict]:
    """
    Compute a word-level diff for the frontend diff view.

    Returns a list of diff operations:
        [
            {"type": "equal", "value": "word"},
            {"type": "insert", "value": "word"},
            {"type": "delete", "value": "word"},
        ]
    """
    orig_words = original.split()
    new_words = rewritten.split()

    m, n = len(orig_words), len(new_words)

    # Build full LCS table for backtracking
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if orig_words[i - 1].lower() == new_words[j - 1].lower():
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

    # Backtrack to get diff
    diff: list[dict] = []
    i, j = m, n
    while i > 0 or j > 0:
        if i > 0 and j > 0 and orig_words[i - 1].lower() == new_words[j - 1].lower():
            diff.append({"type": "equal", "value": new_words[j - 1]})
            i -= 1
            j -= 1
        elif j > 0 and (i == 0 or dp[i][j - 1] >= dp[i - 1][j]):
            diff.append({"type": "insert", "value": new_words[j - 1]})
            j -= 1
        else:
            diff.append({"type": "delete", "value": orig_words[i - 1]})
            i -= 1

    diff.reverse()
    return diff
