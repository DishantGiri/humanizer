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


def _split_paragraphs(text: str) -> list[str]:
    """Split text into paragraphs, preserving blank-line boundaries."""
    return re.split(r'(\n\s*\n)', text)


def _split_sentences(text: str) -> list[str]:
    """Split a single paragraph into sentences."""
    parts = re.split(r'(?<=[.!?])\s+', text)
    return [p for p in parts if p.strip()]


def _join_sentences(sentences: list[str]) -> str:
    """Rejoin sentences within a single paragraph."""
    return " ".join(sentences)


def _process_per_paragraph(text: str, fn) -> str:
    """
    Apply a sentence-level function to each paragraph independently,
    preserving the original paragraph separators (blank lines).
    """
    parts = _split_paragraphs(text)
    result = []
    for part in parts:
        # If part is a paragraph separator (blank lines), keep it as-is
        if not part.strip():
            result.append(part)
        else:
            result.append(fn(part))
    return "".join(result)


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


def _add_burstiness_paragraph(paragraph: str) -> str:
    """
    Increase sentence length variation (burstiness) within a single paragraph.
    AI text has uniform sentence lengths. Human text varies wildly.
    """
    sentences = _split_sentences(paragraph)
    if len(sentences) < 3:
        return paragraph

    result = []
    i = 0
    while i < len(sentences):
        sent = sentences[i]
        words = sent.split()
        word_count = len(words)

        # Long sentence (25+ words): sometimes split with a period
        if word_count > 25 and random.random() < 0.3:
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
            connector = random.choice([", ", ", and "])
            merged = sent.rstrip('.!?') + connector + next_sent[0].lower() + next_sent[1:]
            result.append(merged)
            i += 2
            continue

        result.append(sent)
        i += 1

    return _join_sentences(result)


def add_burstiness(text: str) -> str:
    """Apply burstiness per-paragraph, preserving paragraph structure."""
    return _process_per_paragraph(text, _add_burstiness_paragraph)


def _inject_casual_starters_paragraph(paragraph: str, rate: float = 0.08) -> str:
    """
    Occasionally prepend a casual starter to a sentence within a paragraph.
    """
    sentences = _split_sentences(paragraph)
    if len(sentences) < 4:
        return paragraph

    for i in range(1, len(sentences) - 1):
        if random.random() < rate:
            sent = sentences[i]
            first_word = sent.split()[0] if sent.split() else ""
            if first_word in ("And", "But", "So", "Look,", "Thing", "Honestly,", "Still,", "Now,"):
                continue
            starter = random.choice(CASUAL_STARTERS)
            sentences[i] = starter + sent[0].lower() + sent[1:]

    return _join_sentences(sentences)


def inject_casual_starters(text: str, rate: float = 0.08) -> str:
    """Apply casual starters per-paragraph, preserving paragraph structure."""
    return _process_per_paragraph(text, lambda p: _inject_casual_starters_paragraph(p, rate))


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
        (r'\bplays?\s+a\s+(?:crucial|key|vital|important)\s+role\b', 'matters a lot'),
        (r'\bit\s+is\s+(?:important|essential|crucial)\s+to\s+note\s+that\b', ''),
        (r'\bit\s+should\s+be\s+noted\s+that\b', ''),
        (r'\bit\s+is\s+(?:clear|evident|obvious)\s+that\b', ''),
        (r'\bit\s+goes\s+without\s+saying\s+that?\b', ''),
        (r'\bneedle(?:ss)\s+to\s+say,?\b', ''),
        (r'\bin\s+today\'?s\s+(?:world|society|age|era|digital age)\b', 'these days'),
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
        (r'\bpivotal\b', 'key'),
        (r'\bparamount\b', 'critical'),
        (r'\bindispensable\b', 'essential'),
        (r'\bquintessential\b', 'classic'),
        (r'\bpave\s+the\s+way\b', 'open the door'),
        (r'\bset\s+the\s+stage\b', 'set things up'),
        (r'\blay\s+the\s+groundwork\b', 'build the foundation'),
        (r'\bshed\s+light\s+on\b', 'explain'),
        (r'\bbring\s+to\s+light\b', 'reveal'),
        (r'\bat\s+the\s+end\s+of\s+the\s+day\b', 'ultimately'),
        (r'\bwhen\s+all\s+is\s+said\s+and\s+done\b', 'in the end'),
        (r'\bfirst\s+and\s+foremost\b', 'first'),
        (r'\blast\s+but\s+not\s+least\b', 'finally'),
        (r'\btake\s+into\s+(?:account|consideration)\b', 'consider'),
        (r'\bwith\s+regard\s+to\b', 'about'),
        (r'\bwith\s+respect\s+to\b', 'on'),
        (r'\bin\s+the\s+(?:realm|field|context|area)\s+of\b', 'in'),
        (r'\bin\s+light\s+of\b', 'given'),
        (r'\bin\s+terms\s+of\b', 'for'),
        (r'\bcan\s+be\s+seen\s+as\b', 'is'),
        (r'\bhas\s+been\s+shown\s+to\b', 'can'),
        (r'\bunderscore(?:s|d)?\b', 'highlight'),
        (r'\bfoster(?:s|ed)?\b', 'build'),
        (r'\bcultivate(?:s|d)?\b', 'grow'),
        (r'\bembark(?:s|ed)?\s+on\b', 'start'),
        (r'\btestament\s+to\b', 'proof of'),
        (r'\bserves?\s+as\b', 'acts as'),
        (r'\bstands?\s+as\b', 'is'),
        (r'\bbeacon\b', 'example'),
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


# ── Inline thinking extractor (Qwen3 / models without <think> tags) ─────────

# Matches a PARAGRAPH (not just a word mid-sentence) that is clearly internal
# model reasoning. All patterns must be anchored to the start of the stripped
# paragraph text so we don't accidentally match real prose that contains words
# like "Actually" or "Looking at" in the middle of a sentence.
_INLINE_THINKING_RE = re.compile(
    r'^(?:'
    # Self-assessment of the draft
    r'This is (?:better|correct|close|good|great|fine|near|basically|still)[,. ]|'
    r'This (?:version|draft|attempt|rewrite|output) |'
    # Hedging / uncertainty markers
    r'Wait[,.!]|'
    r"Hmm[,.!]|'"
    # "Let's" planning phrases
    r"Let'?s (?:check|verify|refine|adjust|review|look|re-read|reconsider|craft|try|push|think|go back|now look|now check|now try|see if)|'"
    # "I ..." self-referential phrases
    r"I'?m (?:overthinking|stuck|still too close|still getting|going in circles|looping)|'"
    r'I need to (?:actually|really|go back|re-read|re-check|rewrite)|'
    r"Let me (?:re-?)?(?:check|verify|refine|adjust|review|look|reconsider|craft|try|think|go|fix|re-read|actually)|'"
    r"I'?ll (?:adjust|try|push|craft|refine|rephrase|change|deliberately|now|go with|keep trying)|'"
    # Named section markers
    r'New version[: (]|'
    r'Final (?:answer|output|version|draft|rewrite|text|Polish|Attempt)(?:\s+Text)?[: ]|'
    r'Heavy Rewrite[: ]|'
    r'Another (?:attempt|version|draft|try)[: ]|'
    r'Original: |'
    r'[\*_ ]*(?:Heavy Rewrite|Final Polish(?: Text)?|Another Attempt|Version \d|Refined Version|Polish Text)[\*_ ]*[: ]|'
    r'One more (?:try|attempt|version|pass)|'
    # Explicit check lists
    r'(?:Let me|Now|I need to) check (?:the )?(?:constraints|facts|rhythm|structure|flow|paragraph)|'
    r"I'?m (?:overthinking|stuck in a loop|going to)"
    r')',
    re.IGNORECASE,
)

_FINAL_MARKER_RE = re.compile(
    r"(?m)^\s*(?:Let'?s try(?:[^:\n]*):\s*\n+|"
    r"Let'?s try a different \w+[^:\n]*:\s*\n+|"
    r"(?:Here'?s?|This is) (?:the )?(?:final|last|best|revised|improved|refined|polished|ultimate)[^:\n]*:\s*\n+|"
    r"[\*_ ]*(?:Heavy Rewrite|Final Polish(?: Text)?|Last Attempt|Final Version|Refined Version|Polish Text)[\*_ ]*[:\s]*\n+"
    r")",
    re.IGNORECASE,
)



def extract_final_output(text: str) -> str:
    """
    Handles models (like Qwen3) that output inline thinking without <think> tags.
    Pattern: clean prose -> 'This is better. Let's check...' -> prose -> 'Let's try:' -> final prose.

    Strategy:
    1. If no inline thinking detected, return as-is.
    2. If a 'Let's try:' / '*Heavy Rewrite:*' marker exists, take text after the LAST one.
    3. If thinking starts after the first paragraph, take only the leading clean paragraphs.
    4. Fallback: take the last long prose paragraph that doesn't look like thinking.
    """
    stripped = text.strip()

    if not _INLINE_THINKING_RE.search(stripped):
        return stripped

    # Strategy 1: last "Let's try:" / "*Final Polish:*" style marker
    all_markers = list(_FINAL_MARKER_RE.finditer(stripped))
    if all_markers:
        last_marker = all_markers[-1]
        candidate = stripped[last_marker.end():].strip()
        if candidate and len(candidate) > 30 and not _INLINE_THINKING_RE.match(candidate):
            return candidate

    # Strategy 2: take paragraphs until thinking commentary begins
    paragraphs = re.split(r'\n\s*\n', stripped)
    clean_paras = []
    for para in paragraphs:
        first_line = para.strip().split('\n')[0]
        if _INLINE_THINKING_RE.match(para.strip()) or _INLINE_THINKING_RE.match(first_line):
            break
        clean_paras.append(para)

    if clean_paras:
        result = '\n\n'.join(clean_paras).strip()
        if len(result) < len(stripped) - 20:
            return result

    # Strategy 3: last long prose paragraph that looks clean
    prose_candidates = [
        p.strip() for p in paragraphs
        if p.strip()
        and len(p.strip()) > 40
        and not _INLINE_THINKING_RE.match(p.strip())
        and not re.match(r'^[*_]', p.strip())
    ]
    if prose_candidates:
        return prose_candidates[-1]

    return stripped


def strip_preamble(text: str) -> str:
    """
    Strips LLM conversational preambles, reasoning tags, and internal monologue
    from the text. Handles:
    - Closed <think>...</think> blocks
    - Unclosed <think>... blocks
    - Internal "Let's try:" / "* Final Polish:" markers used by thinking models
    - Common conversational openers
    """
    text_stripped = text.strip()

    # 1. Strip closed <think>...</think> blocks (greedy from first open to last close)
    text_stripped = re.sub(
        r'<think>.*?</think>',
        '',
        text_stripped,
        flags=re.DOTALL | re.IGNORECASE
    )

    # 2. If an unclosed <think> tag remains, extract only text AFTER </think>
    #    or — if never closed — find where the final output begins.
    if '<think>' in text_stripped.lower():
        if '</think>' in text_stripped.lower():
            # Take everything after the last closing tag
            text_stripped = text_stripped.split('</think>')[-1]
        else:
            # The model started thinking but never closed the tag.
            # Look for explicit "final answer" separator markers the models use:
            FINAL_MARKERS = [
                # "* Final Polish:" style
                r'\*\s*Final\s+(?:Polish|Answer|Output|Version|Draft)\s*:?\s*\n',
                # "Let's try:\n\n<actual text>" — take everything after
                r"Let'?s\s+try\s*:\s*\n+",
                # "Final answer:\n"
                r'(?:Final|Here(?:\'s| is)(?: the| my)?)\s+(?:answer|output|version|rewrite)\s*:\s*\n+',
                # Section break "---" or "***"
                r'\n[-*]{3,}\n',
            ]
            remainder = None
            for marker in FINAL_MARKERS:
                m = re.search(marker, text_stripped, flags=re.IGNORECASE)
                if m:
                    candidate = text_stripped[m.end():].strip()
                    # Only accept if it looks like real prose (not more reasoning steps)
                    if candidate and not re.match(
                        r'^(?:Wait|Let|Now|OK|Hmm|So|Actually|Check|Step|Note)[,\s]',
                        candidate, re.IGNORECASE
                    ):
                        remainder = candidate
                        break

            if remainder:
                text_stripped = remainder
            else:
                # Fallback: split on blank lines, keep paragraphs that don't look
                # like internal monologue steps.
                THINKING_SIGNALS = re.compile(
                    r'\b(analyze|draft|check|constraint|rephrase|rewrite|step|thought'
                    r'|wait|let me|let\'s|hmm|ok so|verify|adjust|faithful|original'
                    r'|facts?|meaning|preserve|keep|change|replace|changed|removed'
                    r'|attempt|trying|version\s+\d|try\s+again|re-read)\b',
                    re.IGNORECASE
                )
                parts = re.split(r'\n\s*\n', text_stripped)
                # Remove the <think> opener line
                parts = [re.sub(r'<think>.*', '', p, flags=re.DOTALL | re.IGNORECASE).strip() for p in parts]
                non_thinking = [p for p in parts if p and not THINKING_SIGNALS.search(p)]
                if non_thinking:
                    text_stripped = '\n\n'.join(non_thinking)
                else:
                    # Last resort: strip everything from <think> onward
                    text_stripped = re.sub(
                        r'<think>.*',
                        '',
                        text_stripped,
                        flags=re.DOTALL | re.IGNORECASE
                    )

    # 3. Strip common preamble openers that sometimes appear outside <think> tags
    preamble_patterns = [
        r"^(?:here's|here is|sure,|sure!|here is the|here's the|this is the)"
        r"\s+(?:rewritten|revised|rephrased|humanized)?\s*"
        r"(?:text|version|draft|paragraph|sentence)?\s*(?:in\s+[^:\n]+)?:?\s*\n+",
        r"^(?:here's|here is|sure,|sure!|here is the|here's the)"
        r"\s+how\s+I\s+would\s+rewrite\s+this:?\s*\n+",
        r"^sure,\s*here's\s+the\s+rewritten\s+text:?\s*\n+",
        r"^here's\s+a\s+rewrite:?\s*\n+",
        r"^here is a rewrite:?\s*\n+",
        # Leading asterisk-wrapped labels: "* Final Polish:\n" at very start
        r"^[\*_ ]*(?:Final Polish(?: Text)?|Heavy Rewrite|Polish Version|Polish Text|Final Version|Final Answer)[\*_ ]*[:\s]*\n+",
    ]

    for pattern in preamble_patterns:
        text_stripped = re.sub(pattern, '', text_stripped, flags=re.IGNORECASE)

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


def vary_sentence_openers(text: str, intensity: float = 0.5) -> str:
    """
    Detect consecutive sentences that start the same grammatical way
    (e.g., "The X..." "The Y..." or "This X..." "This Y...") and
    rewrite the second opener to break the pattern.
    """
    OPENER_REWRITES = [
        # "The [noun]" → alternatives
        (r'^The\s+', ['That ', 'This ', 'It ', 'One thing ', 'What ', '']),
        # "This [noun]" → alternatives
        (r'^This\s+', ['That ', 'The ', 'It ', 'Here, ', '']),
        # "It [verb]" → alternatives
        (r'^It\s+(?:is|was|can|has|should)\s+', ['That ', 'This ', 'Which means ']),
    ]

    def _vary_paragraph(paragraph: str) -> str:
        sentences = _split_sentences(paragraph)
        if len(sentences) < 3:
            return paragraph
        prev_opener_pattern = None
        for i in range(1, len(sentences)):
            sent = sentences[i]
            for pattern, alts in OPENER_REWRITES:
                m = re.match(pattern, sent, flags=re.IGNORECASE)
                if m:
                    if pattern == prev_opener_pattern and random.random() < (0.5 + 0.3 * intensity):
                        alt = random.choice([a for a in alts if a])
                        sentences[i] = alt + sent[m.end():]
                        prev_opener_pattern = None
                    else:
                        prev_opener_pattern = pattern
                    break
            else:
                prev_opener_pattern = None
        return _join_sentences(sentences)

    return _process_per_paragraph(text, _vary_paragraph)


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

    # Step 0a: Extract final prose from models that dump inline thinking (e.g. Qwen3)
    text = extract_final_output(text)

    # Step 0b: Strip any conversational preambles and outer quotes

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

    # Step 4b: Break repeated sentence opener patterns
    if intensity > 0.2:
        text = vary_sentence_openers(text, intensity=intensity)

    # Step 5: Inject occasional casual starters
    if intensity > 0.4:
        text = inject_casual_starters(text, rate=0.06 * intensity)

    # Step 6: Vary punctuation
    text = vary_punctuation(text, rate=0.1 * intensity)

    # Step 6b: Introduce vocabulary diversity (synonym swapping) to break generic language
    text = introduce_vocabulary_diversity(text, rate=0.20 * intensity)

    # Step 6c: Inject subtle opinion/stance markers to break neutral tone
    if intensity > 0.3:
        text = inject_opinion_markers(text, rate=0.08 * intensity)

    # Step 6d: Randomize sentence syntax patterns (inversions, pivots, fragments, questions)
    if intensity > 0.25:
        text = randomize_syntax_patterns(text, intensity=intensity)

    # Step 7: Absolute check: eliminate all em-dashes, en-dashes, and spaced hyphens/dashes
    text = text.replace("\u2014", ", ")
    text = text.replace("\u2013", ", ")
    text = text.replace(" - ", ", ")
    text = text.replace(" -- ", ", ")

    # Final cleanup
    return text


def inject_opinion_markers(text: str, rate: float = 0.08) -> str:
    """
    Inject subtle stance/opinion markers ('actually', 'really', 'honestly', 'pretty')
    into sentences to break the neutral, flat tone characteristic of AI detectors.
    """
    opinion_words = ['actually', 'really', 'honestly', 'pretty much', 'definitely']
    
    # Process per paragraph to maintain paragraph integrity
    def _inject(paragraph: str) -> str:
        sentences = _split_sentences(paragraph)
        if len(sentences) < 2:
            return paragraph
        
        for i in range(len(sentences)):
            if random.random() < rate:
                sent = sentences[i]
                words = sent.split()
                # Don't modify short sentences or sentences that already have opinion markers
                if len(words) < 5 or any(w.lower().strip(',.') in opinion_words for w in words):
                    continue
                
                # Insert after verb or auxiliary verb if possible
                word_choice = random.choice(opinion_words)
                inserted = False
                for j in range(1, min(4, len(words))):
                    if words[j].lower() in ('is', 'are', 'was', 'were', 'has', 'have', 'had', 'can', 'could', 'will', 'would', 'should', 'does', 'did', 'do'):
                        words.insert(j + 1, word_choice)
                        inserted = True
                        break
                
                if not inserted and len(words) > 3:
                    words.insert(1, word_choice)
                
                sentences[i] = " ".join(words)
        
        return _join_sentences(sentences)

    return _process_per_paragraph(text, _inject)


# ── Vocabulary Diversity Map ────────────────────────────────────────────────

SYNONYM_MAP = {
    r'\bvery\b': ['really', 'pretty', 'incredibly', 'super'],
    r'\bimportant\b': ['key', 'huge', 'critical', 'big'],
    r'\bsignificant\b': ['major', 'sizeable', 'noticeable', 'real'],
    r'\bensure\b': ['make sure', 'check', 'guarantee'],
    r'\bassist\b': ['help', 'give a hand'],
    r'\bdetermine\b': ['figure out', 'find', 'work out'],
    r'\bachieve\b': ['reach', 'hit', 'pull off'],
    r'\bprovide\b': ['give', 'offer', 'bring'],
    r'\bdifficult\b': ['hard', 'tough', 'tricky'],
    r'\bsimple\b': ['easy', 'basic', 'straightforward'],
    r'\bfrequently\b': ['often', 'a lot', 'regularly'],
    r'\bentire\b': ['whole', 'complete', 'full'],
    r'\brequire\b': ['need', 'call for'],
    r'\brequest\b': ['ask for', 'seek'],
    r'\bpurchase\b': ['buy', 'get', 'pick up'],
    r'\bobtain\b': ['get', 'grab', 'land'],
    r'\battempt\b': ['try', 'take a shot at'],
    r'\badditional\b': ['more', 'extra'],
    r'\bcurrently\b': ['right now', 'at the moment', 'these days'],
    r'\bprimarily\b': ['mostly', 'mainly', 'for the most part'],
    r'\bapproximately\b': ['about', 'around', 'roughly'],
    r'\bextremely\b': ['super', 'really', 'incredibly'],
    r'\bconduct\b': ['do', 'run', 'carry out'],
    r'\bselect\b': ['choose', 'pick', 'go with'],
    r'\bsufficient\b': ['enough', 'plenty of'],
    r'\bpossess\b': ['have', 'own'],
    # Anti-generic language additions
    r'\bvarious\b': ['different', 'a few', 'several', 'a bunch of'],
    r'\bnumerous\b': ['tons of', 'a lot of', 'plenty of', 'loads of'],
    r'\beffective\b': ['solid', 'reliable', 'proven', 'practical'],
    r'\bimplement\b': ['set up', 'put in place', 'roll out', 'build'],
    r'\bdemonstrate\b': ['show', 'prove', 'highlight'],
    r'\bsubstantial\b': ['big', 'major', 'serious', 'considerable'],
    r'\bfundamental\b': ['core', 'basic', 'central'],
    r'\bconsequently\b': ['so', 'because of that', 'as a result'],
    r'\bnevertheless\b': ['still', 'even so', 'but'],
    r'\bfurthermore\b': ['plus', 'on top of that', 'also'],
    r'\bmoreover\b': ['also', 'and', 'plus'],
    r'\benhance\b': ['improve', 'boost', 'step up'],
    r'\binitiative\b': ['effort', 'move', 'push'],
    r'\bimpact\b': ['effect', 'influence', 'hit'],
    r'\bbeneficial\b': ['helpful', 'useful', 'good'],
    r'\bchallenging\b': ['tough', 'hard', 'tricky'],
    r'\bspecifically\b': ['in particular', 'especially'],
    r'\bgenerally\b': ['usually', 'typically', 'most of the time'],
    r'\bregarding\b': ['about', 'on', 'when it comes to'],
    r'\butilizing\b': ['using', 'working with'],
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


# ── Syntax pattern randomizer ─────────────────────────────────────────────────

# Trailing fragments that can be appended after a period to break rhythm
_TRAILING_FRAGMENTS = [
    "Not ideal, but that's where things stand.",
    "Which, honestly, matters more than most people think.",
    "Simple as that.",
    "Go figure.",
    "Worth keeping in mind.",
    "That's the short version, anyway.",
    "At least, that's been the pattern.",
    "Makes sense when you think about it.",
    "Hard to argue with that.",
    "Not always, but often enough.",
]

# Clarifying clauses that can be appended mid-sentence style
_CLARIFYING_APPENDS = [
    ", and that's not a small thing",
    ", which is more than most people realize",
    ", at least in most cases",
    ", whether people notice it or not",
    ", for better or worse",
    ", which is kind of the whole point",
    ", and that changes how you approach it",
    ", even if it doesn't feel that way",
]

# Pivots that can replace ". " between two short adjacent sentences
_MID_PIVOTS = [
    " — though ",
    " — but ",
    " — except ",
    ", except ",
    ", though ",
]

# Rhetorical question openers (replace start of a sentence)
_RHETORICAL_OPENERS = [
    ("It is ", "Is it really "),
    ("This is ", "But is this "),
    ("There is ", "And is there really "),
    ("They are ", "Are they actually "),
    ("It can ", "Can it really "),
    ("It will ", "Will it actually "),
    ("It works ", "Does it always work "),
    ("It helps ", "Does it help "),
]


def _apply_random_syntax_transforms(paragraph: str, intensity: float) -> str:
    """
    Apply a random mix of structural transforms to a single paragraph.
    Each transform fires independently at a low probability to create
    unpredictable structural variety across runs.
    """
    sentences = _split_sentences(paragraph)
    if len(sentences) < 2:
        return paragraph

    result = []
    i = 0
    while i < len(sentences):
        sent = sentences[i]
        words = sent.split()
        word_count = len(words)
        applied = False

        # Transform 1: Mid-sentence pivot — merge two medium sentences with a pivot phrase
        # e.g. "X. But Y." → "X — though Y."
        if (
            not applied
            and i + 1 < len(sentences)
            and 5 <= word_count <= 15
            and 5 <= len(sentences[i + 1].split()) <= 15
            and random.random() < 0.12 * intensity
        ):
            pivot = random.choice(_MID_PIVOTS)
            next_sent = sentences[i + 1]
            # Strip leading connectors from next sentence before attaching
            next_clean = re.sub(r'^(But|And|So|Still|However|Though|Yet)[,\s]+', '', next_sent, flags=re.IGNORECASE)
            if next_clean:
                next_clean = next_clean[0].lower() + next_clean[1:]
            merged = sent.rstrip('.!?') + pivot + next_clean
            result.append(merged)
            i += 2
            applied = True

        # Transform 2: Append a trailing fragment after a long sentence for punch
        if (
            not applied
            and word_count >= 16
            and random.random() < 0.08 * intensity
            and i == len(sentences) - 1  # only last sentence of paragraph
        ):
            fragment = random.choice(_TRAILING_FRAGMENTS)
            result.append(sent)
            result.append(fragment)
            i += 1
            applied = True

        # Transform 3: Append a clarifying clause to a medium sentence
        if (
            not applied
            and 8 <= word_count <= 20
            and sent.endswith('.')
            and random.random() < 0.10 * intensity
        ):
            clause = random.choice(_CLARIFYING_APPENDS)
            result.append(sent.rstrip('.') + clause + '.')
            i += 1
            applied = True

        # Transform 4: Convert a declarative into a rhetorical question (sparingly)
        if (
            not applied
            and word_count >= 6
            and sent.endswith('.')
            and random.random() < 0.06 * intensity
        ):
            for prefix, question_prefix in _RHETORICAL_OPENERS:
                if sent.startswith(prefix):
                    converted = question_prefix + sent[len(prefix):]
                    # Make it end with '?' instead of '.'
                    converted = converted.rstrip('.') + '?'
                    result.append(converted)
                    i += 1
                    applied = True
                    break

        # Transform 5: Split a very long sentence into two with a short punchy follow-up
        if (
            not applied
            and word_count >= 22
            and random.random() < 0.09 * intensity
        ):
            # Find a split point around a conjunction
            mid = word_count // 2
            split_at = None
            for j in range(mid - 4, min(mid + 5, word_count)):
                if j < word_count and words[j].lower().rstrip(',') in ('and', 'but', 'which', 'so', 'because', 'since', 'while', 'though'):
                    split_at = j
                    break
            if split_at and 5 < split_at < word_count - 4:
                first = ' '.join(words[:split_at]).rstrip(',') + '.'
                second_words = words[split_at:]
                # Remove the conjunction and capitalise
                second_words[0] = second_words[0].capitalize()
                second = ' '.join(second_words)
                result.append(first)
                result.append(second)
                i += 1
                applied = True

        if not applied:
            result.append(sent)
            i += 1

    return _join_sentences(result)


def randomize_syntax_patterns(text: str, intensity: float = 0.5) -> str:
    """
    Apply random structural transforms per paragraph to ensure no two rewrites
    have the same sentence structure pattern.
    """
    return _process_per_paragraph(
        text,
        lambda p: _apply_random_syntax_transforms(p, intensity)
    )
