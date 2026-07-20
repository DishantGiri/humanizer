"""
Post-processing humanization module.

AI detectors flag two core statistical patterns:
1. LOW PERPLEXITY — too-predictable word choices
2. LOW BURSTINESS — uniform sentence complexity

This module introduces controlled, human-like imperfections AFTER the
LLM rewrite to break these patterns without damaging meaning.
"""

import re
import random
from typing import Optional


# ── Contraction maps ────────────────────────────────────────────────────────

EXPAND_MAP = {
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "won't": "will not",
    "wouldn't": "would not",
    "couldn't": "could not",
    "shouldn't": "should not",
    "can't": "cannot",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "hasn't": "has not",
    "haven't": "have not",
    "hadn't": "had not",
    "it's": "it is",
    "that's": "that is",
    "there's": "there is",
    "they're": "they are",
    "we're": "we are",
    "you're": "you are",
    "I'm": "I am",
    "he's": "he is",
    "she's": "she is",
    "who's": "who is",
    "what's": "what is",
    "let's": "let us",
    "I've": "I have",
    "you've": "you have",
    "we've": "we have",
    "they've": "they have",
    "I'll": "I will",
    "you'll": "you will",
    "we'll": "we will",
    "they'll": "they will",
    "he'll": "he will",
    "she'll": "she will",
    "it'll": "it will",
    "I'd": "I would",
    "you'd": "you would",
    "we'd": "we would",
    "they'd": "they would",
    "he'd": "he would",
    "she'd": "she would",
}

CONTRACT_MAP = {v: k for k, v in EXPAND_MAP.items()}

# ── Sentence starters that sound human ──────────────────────────────────────

CASUAL_STARTERS = [
    "Look, ", "Thing is, ", "Honestly, ", "The reality is, ",
    "Here's the deal: ", "Point being, ", "That said, ",
    "And ", "But ", "So ", "Still, ", "Now, ",
]

# ── Transition replacements (AI-sounding → human-sounding) ──────────────────

TRANSITION_SWAPS = {
    "Furthermore, ": random.choice(["Plus, ", "And ", "On top of that, ", ""]),
    "Moreover, ": random.choice(["Also, ", "And ", "What's more, ", ""]),
    "Additionally, ": random.choice(["Also, ", "And ", "Plus, ", ""]),
    "Consequently, ": random.choice(["So ", "Because of that, ", "As a result, "]),
    "Nevertheless, ": random.choice(["Still, ", "But ", "Even so, "]),
    "However, ": random.choice(["But ", "That said, ", "Still, "]),
    "Therefore, ": random.choice(["So ", "That's why ", "Which means "]),
    "In addition, ": random.choice(["Also, ", "Plus, ", "And "]),
    "Subsequently, ": random.choice(["Then ", "After that, ", "Next, "]),
    "Nonetheless, ": random.choice(["Still, ", "Even so, ", "But "]),
    "In conclusion, ": "",
    "To summarize, ": "",
    "In summary, ": "",
    "Overall, ": "",
}

# ── Filler/hedge phrases for natural imperfection ───────────────────────────

HEDGES = [
    "kind of ", "sort of ", "pretty much ", "basically ",
    "more or less ", "roughly ", "in a way ", "arguably ",
]


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences, preserving paragraph breaks."""
    # Split on sentence-ending punctuation followed by whitespace
    parts = re.split(r'(?<=[.!?])\s+', text)
    return [p for p in parts if p.strip()]


def _join_sentences(sentences: list[str]) -> str:
    """Rejoin sentences with single spaces."""
    return " ".join(sentences)


def vary_contractions(text: str, rate: float = 0.2) -> str:
    """
    Randomly expand some contractions or contract some expansions.
    Real humans are inconsistent with contractions — they'll use "don't"
    in one sentence and "do not" in another.
    """
    # Find all contractions and randomly expand some
    for contraction, expansion in EXPAND_MAP.items():
        if contraction in text and random.random() < rate:
            # Only replace the first occurrence to create inconsistency
            text = text.replace(contraction, expansion, 1)

    # Find some expanded forms and contract them
    for expansion, contraction in CONTRACT_MAP.items():
        if expansion in text and random.random() < rate:
            text = text.replace(expansion, contraction, 1)

    return text


def replace_ai_transitions(text: str) -> str:
    """
    Replace stiff AI-sounding transitions with casual human alternatives.
    """
    for ai_transition, human_alt in TRANSITION_SWAPS.items():
        if ai_transition in text:
            # Regenerate random choice each time
            options = {
                "Furthermore, ": ["Plus, ", "And ", "On top of that, ", ""],
                "Moreover, ": ["Also, ", "And ", "What's more, ", ""],
                "Additionally, ": ["Also, ", "And ", "Plus, ", ""],
                "Consequently, ": ["So ", "Because of that, ", "As a result, "],
                "Nevertheless, ": ["Still, ", "But ", "Even so, "],
                "However, ": ["But ", "That said, ", "Still, "],
                "Therefore, ": ["So ", "That's why ", "Which means "],
                "In addition, ": ["Also, ", "Plus, ", "And "],
                "Subsequently, ": ["Then ", "After that, ", "Next, "],
                "Nonetheless, ": ["Still, ", "Even so, ", "But "],
                "In conclusion, ": [""],
                "To summarize, ": [""],
                "In summary, ": [""],
                "Overall, ": [""],
            }
            replacement = random.choice(options.get(ai_transition, [""]))
            text = text.replace(ai_transition, replacement, 1)

    return text


def add_burstiness(text: str) -> str:
    """
    Increase sentence length variation (burstiness).
    AI text has uniform sentence lengths. Human text varies wildly.

    Strategy:
    - Occasionally split a long sentence with a dash or period
    - Occasionally merge two short sentences
    """
    sentences = _split_sentences(text)
    if len(sentences) < 3:
        return text

    result = []
    i = 0
    while i < len(sentences):
        sent = sentences[i]
        words = sent.split()
        word_count = len(words)

        # Long sentence (25+ words): sometimes split with a dash
        if word_count > 25 and random.random() < 0.3:
            # Find a conjunction or comma near the middle to split at
            mid = word_count // 2
            split_point = None
            for j in range(mid - 3, min(mid + 4, word_count)):
                if j < word_count and words[j].lower().rstrip(',') in ('and', 'but', 'which', 'because', 'since', 'while'):
                    split_point = j
                    break
                if j < word_count and words[j].endswith(','):
                    split_point = j + 1
                    break

            if split_point and 5 < split_point < word_count - 5:
                first_half = " ".join(words[:split_point]).rstrip(',')
                second_half = " ".join(words[split_point:])
                # Remove leading conjunction from second half
                second_half = re.sub(r'^(and|but|which)\s+', '', second_half, flags=re.IGNORECASE)
                if second_half:
                    second_half = second_half[0].upper() + second_half[1:]
                    result.append(first_half + ".")
                    result.append(second_half)
                    i += 1
                    continue

        # Two consecutive short sentences (< 8 words each): sometimes merge
        if (word_count < 8 and i + 1 < len(sentences)
                and len(sentences[i + 1].split()) < 8
                and random.random() < 0.25):
            next_sent = sentences[i + 1]
            # Join with comma or conjunction
            connector = random.choice([", ", ", and "])
            merged = sent.rstrip('.!?') + connector + next_sent[0].lower() + next_sent[1:]
            result.append(merged)
            i += 2
            continue

        result.append(sent)
        i += 1

    return _join_sentences(result)


def inject_casual_starters(text: str, rate: float = 0.08) -> str:
    """
    Occasionally prepend a casual starter to a sentence.
    Real humans throw in "Look," or "Thing is," naturally.
    Only applies to sentences that don't already start casually.
    """
    sentences = _split_sentences(text)
    if len(sentences) < 4:
        return text

    # Don't modify first or last sentence
    for i in range(1, len(sentences) - 1):
        if random.random() < rate:
            sent = sentences[i]
            # Don't add to already-casual sentences
            first_word = sent.split()[0] if sent.split() else ""
            if first_word in ("And", "But", "So", "Look,", "Thing", "Honestly,", "Still,", "Now,"):
                continue
            starter = random.choice(CASUAL_STARTERS)
            sentences[i] = starter + sent[0].lower() + sent[1:]

    return _join_sentences(sentences)


def vary_punctuation(text: str, rate: float = 0.1) -> str:
    """
    Swap some punctuation for variety.
    Replace occasional semicolons with commas, some periods with commas.
    """
    if random.random() < rate:
        text = text.replace("; ", ", ", 1)

    # Occasionally replace a comma-conjunction with a semicolon
    if random.random() < rate:
        text = re.sub(r', (and|but|so) ', r'; \1 ', text, count=1)

    return text


def remove_ai_cliches(text: str) -> str:
    """
    Strip out any remaining AI-sounding phrases that slipped through the prompt.
    """
    cliches = [
        (r'\bdelve(?:s|d)?\s+into\b', 'look at'),
        (r'\bplays?\s+a\s+crucial\s+role\b', 'matters a lot'),
        (r'\bit\s+is\s+(?:important|essential|crucial)\s+to\s+note\s+that\b', ''),
        (r'\bit\s+should\s+be\s+noted\s+that\b', ''),
        (r'\bin\s+today\'?s\s+(?:world|society|age|era)\b', 'these days'),
        (r'\ba\s+wide\s+range\s+of\b', 'lots of'),
        (r'\bin\s+order\s+to\b', 'to'),
        (r'\bleverage(?:s|d)?\b', 'use'),
        (r'\butilize(?:s|d)?\b', 'use'),
        (r'\bfacilitate(?:s|d)?\b', 'help'),
        (r'\boptimize(?:s|d)?\b', 'improve'),
        (r'\bstreamline(?:s|d)?\b', 'simplify'),
        (r'\bcomprehensive\b', 'thorough'),
        (r'\brobust\b', 'strong'),
        (r'\binnovative\b', 'new'),
        (r'\bcutting[\s-]edge\b', 'modern'),
        (r'\bgame[\s-]changer\b', 'big deal'),
        (r'\bparadigm\b', 'model'),
        (r'\bsynergy\b', 'teamwork'),
        (r'\bholistic\b', 'complete'),
        (r'\bmultifaceted\b', 'complex'),
        (r'\bseamless(?:ly)?\b', 'smooth'),
        # Growth and Innovation clichés
        (r'\bdrives?\s+innovation\b', 'sparks new ideas'),
        (r'\bopening\s+up\s+opportunities\s+for\s+growth\b', 'opening up ways to grow'),
        (r'\bopportunities\s+for\s+growth\b', 'ways to grow'),
        (r'\bopportunities\s+for\s+development\b', 'ways to build'),
        (r'\bboosts?\s+efficiency\b', 'makes things run faster'),
        (r'\bcutting\s+costs\b', 'saving money'),
        (r'\bmake\s+informed\s+decisions\b', 'make smart choices'),
        (r'\bmake\s+decisions\s+way\s+more\s+effective\b', 'make much better choices'),
    ]

    for pattern, replacement in cliches:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    # Clean up double spaces from removals
    text = re.sub(r'  +', ' ', text)
    # Fix sentences that now start with lowercase after removal
    text = re.sub(r'(?<=[.!?]\s)([a-z])', lambda m: m.group(1).upper(), text)

    return text


def strip_preamble(text: str) -> str:
    """
    Strips LLM conversational preambles/intros and reasoning tags from the text.
    """
    text_stripped = text.strip()
    
    # Strip Qwen reasoning/thinking tags if present
    text_stripped = re.sub(r'<think>.*?</think>', '', text_stripped, flags=re.DOTALL | re.IGNORECASE)
    
    preamble_patterns = [
        r"^(?:here's|here is|sure,|sure!|here is the|here's the|this is the)\s+(?:rewritten|revised|rephrased|humanized)?\s*(?:text|version|draft|paragraph|sentence)?\s*(?:in\s+[^:\n]+)?:?\s*\n+",
        r"^(?:here's|here is|sure,|sure!|here is the|here's the)\s+how\s+I\s+would\s+rewrite\s+this:?\s*\n+",
        r"^sure,\s*here's\s+the\s+rewritten\s+text:?\s*\n+",
        r"^here's\s+a\s+rewrite:?\s*\n+",
        r"^here is a rewrite:?\s*\n+",
    ]
    
    for pattern in preamble_patterns:
        text_stripped = re.sub(pattern, "", text_stripped, flags=re.IGNORECASE)
        
    return text_stripped.strip()


def strip_outer_quotes(text: str) -> str:
    """
    Strip wrapping double or single quotes if the entire text is wrapped in them.
    """
    text_stripped = text.strip()
    if (text_stripped.startswith('"') and text_stripped.endswith('"')) or \
       (text_stripped.startswith("'") and text_stripped.endswith("'")):
        return text_stripped[1:-1].strip()
    return text_stripped


def humanize(text: str, intensity: float = 0.5) -> str:
    """
    Main humanization function. Applies all post-processing steps.

    Args:
        text: The LLM-rewritten text
        intensity: 0.0 = minimal changes, 1.0 = aggressive humanization

    Returns:
        Text with human-like imperfections introduced
    """
    if not text or len(text) < 10:
        return text

    # Step 0: Strip any conversational preambles and outer quotes
    text = strip_preamble(text)
    text = strip_outer_quotes(text)

    # Step 1: Remove any AI cliches that slipped through
    text = remove_ai_cliches(text)

    # Step 2: Replace AI transitions
    text = replace_ai_transitions(text)

    # Step 3: Vary contractions for inconsistency
    text = vary_contractions(text, rate=0.15 * intensity)

    # Step 4: Add burstiness to sentence lengths
    if intensity > 0.3:
        text = add_burstiness(text)

    # Step 5: Inject occasional casual starters
    if intensity > 0.4:
        text = inject_casual_starters(text, rate=0.06 * intensity)

    # Step 6: Vary punctuation
    text = vary_punctuation(text, rate=0.1 * intensity)

    # Step 6b: Introduce vocabulary diversity (synonym swapping) to break generic language (conservative rate)
    text = introduce_vocabulary_diversity(text, rate=0.12 * intensity)

    # Step 7: Absolute check: eliminate all em-dashes, en-dashes, and spaced hyphens/dashes
    text = text.replace("—", ", ")
    text = text.replace("–", ", ")
    text = text.replace(" - ", ", ")
    text = text.replace(" -- ", ", ")

    # Final cleanup
    text = re.sub(r'  +', ' ', text)
    text = text.strip()

    return text


# ── Vocabulary Diversity Map ────────────────────────────────────────────────

SYNONYM_MAP = {
    r'\bvery\b': ['really', 'pretty', 'incredibly', 'highly'],
    r'\bimportant\b': ['key', 'huge', 'essential', 'big deal'],
    r'\bsignificant\b': ['major', 'sizeable', 'noticeable', 'real'],
    r'\bensure\b': ['make sure', 'check', 'guarantee'],
    r'\bassist\b': ['help', 'give a hand'],
    r'\bdetermine\b': ['figure out', 'find', 'work out'],
    r'\bachieve\b': ['reach', 'hit', 'get to'],
    r'\bprovide\b': ['give', 'offer', 'hand over'],
    r'\bdifficult\b': ['hard', 'tough', 'tricky'],
    r'\bsimple\b': ['easy', 'basic', 'straightforward'],
    r'\bfrequently\b': ['often', 'a lot', 'regularly'],
    r'\bentire\b': ['whole', 'complete'],
    r'\brequire\b': ['need', 'demand'],
    r'\brequest\b': ['ask for', 'seek'],
    r'\bpurchase\b': ['buy', 'get'],
    r'\bobtain\b': ['get', 'grab'],
    r'\battempt\b': ['try'],
    r'\badditional\b': ['more', 'extra'],
    r'\bcurrently\b': ['right now', 'at the moment'],
    r'\bprimarily\b': ['mostly', 'mainly'],
    r'\bapproximately\b': ['about', 'around', 'roughly'],
    r'\bextremely\b': ['super', 'highly', 'incredibly'],
    r'\bconduct\b': ['do', 'run', 'carry out'],
    r'\bselect\b': ['choose', 'pick'],
    r'\bsufficient\b': ['enough', 'plenty of'],
    r'\bpossess\b': ['have', 'own'],
}


def introduce_vocabulary_diversity(text: str, rate: float = 0.25) -> str:
    """
    Randomly replace common generic words with diverse synonyms.
    This increases perplexity and breaks the 'generic language' signature.
    """
    for pattern, options in SYNONYM_MAP.items():
        matches = list(re.finditer(pattern, text, flags=re.IGNORECASE))
        for match in reversed(matches):
            if random.random() < rate:
                word = match.group(0)
                replacement = random.choice(options)
                if word.istitle():
                    replacement = replacement.capitalize()
                elif word.isupper():
                    replacement = replacement.upper()
                text = text[:match.start()] + replacement + text[match.end():]
    return text
