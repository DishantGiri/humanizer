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

# §33: Removed theatrical fake-candid hooks ("Honestly, ", "Look, ", "Here's the deal").
# Those are AI tells when used as standalone openers. Keep only natural connectors.
CASUAL_STARTERS = [
    "Point being, ", "That said, ",
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
            words = sent.split()
            first_word = words[0].strip(',.!?').lower() if words else ""
            if first_word in ("and", "but", "so", "look", "thing", "honestly", "still", "now", "point", "that", "that's"):
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



def strip_formatting_artifacts(text: str) -> str:
    """
    §15 Boldface, §16 inline-header lists, §17 title-case headings,
    §18 Emojis, §19 Curly quotes.

    Normalises formatting before or after the LLM rewrite so downstream
    regex patterns match cleanly.
    """
    # §19: Curly/smart quotes -> straight quotes
    text = text.replace('\u201c', '"').replace('\u201d', '"')
    text = text.replace('\u2018', "'").replace('\u2019', "'")
    text = text.replace('\u00ab', '"').replace('\u00bb', '"')

    # §18: Strip emoji characters
    _EMOJI_RANGES = [
        (0x1F600, 0x1F64F), (0x1F300, 0x1F5FF), (0x1F680, 0x1F6FF),
        (0x1F700, 0x1F77F), (0x1F780, 0x1F7FF), (0x1F800, 0x1F8FF),
        (0x1F900, 0x1F9FF), (0x1FA00, 0x1FA6F), (0x1FA70, 0x1FAFF),
        (0x2600, 0x26FF), (0x2700, 0x27BF), (0xFE00, 0xFE0F),
        (0x1F1E0, 0x1F1FF),
    ]
    cleaned = []
    for ch in text:
        cp = ord(ch)
        if any(lo <= cp <= hi for lo, hi in _EMOJI_RANGES):
            continue
        cleaned.append(ch)
    text = ''.join(cleaned)

    # §15: Strip markdown bold/italic emphasis
    text = re.sub(r'\*{3}([^*]+)\*{3}', r'\1', text)  # ***bold italic***
    text = re.sub(r'\*{2}([^*]+)\*{2}', r'\1', text)  # **bold**
    text = re.sub(r'_{2}([^_]+)_{2}', r'\1', text)    # __bold__
    text = re.sub(r'\*([^*\n]+)\*', r'\1', text)        # *italic*
    text = re.sub(r'_([^_\n]+)_', r'\1', text)          # _italic_

    # §16: Inline-header lists at start of line — strip the bold key + colon
    # "**User Experience:** The UX improved..." -> "The UX improved..."
    text = re.sub(r'^\*{1,2}[^*:\n]{1,40}\*{1,2}:\s*', '', text, flags=re.MULTILINE)

    # §17: Title Case markdown headings -> sentence case
    def _sentence_case_heading(m: re.Match) -> str:
        hashes = m.group(1)
        title = m.group(2)
        words = title.split()
        if not words:
            return m.group(0)
        result = [words[0]]
        for w in words[1:]:
            result.append(w.lower())
        return hashes + ' ' + ' '.join(result)
    text = re.sub(r'^(#{1,6})\s+(.+)$', _sentence_case_heading, text, flags=re.MULTILINE)

    text = re.sub(r'  +', ' ', text)
    return text.strip()


def remove_staccato_drama(text: str) -> str:
    """
    §31: Detect runs of 4+ consecutive very short sentences (<=4 words)
    and merge the interior ones to break manufactured staccato drama.
    """
    def _fix_paragraph(paragraph: str) -> str:
        sentences = _split_sentences(paragraph)
        if len(sentences) < 5:
            return paragraph

        result = []
        i = 0
        while i < len(sentences):
            run = []
            j = i
            while j < len(sentences) and len(sentences[j].split()) <= 4:
                run.append(sentences[j])
                j += 1

            if len(run) >= 4:
                first = run[0]
                last = run[-1]
                middle = run[1:-1]
                merged_parts = []
                for k, s in enumerate(middle):
                    stripped = s.rstrip('.!?')
                    if k == 0:
                        merged_parts.append(stripped)
                    else:
                        merged_parts.append(stripped[0].lower() + stripped[1:])
                if merged_parts:
                    merged = ', '.join(merged_parts) + '.'
                    result.append(first)
                    result.append(merged)
                    result.append(last)
                else:
                    result.extend(run)
                i = j
            else:
                result.append(sentences[i])
                i += 1

        return _join_sentences(result)

    return _process_per_paragraph(text, _fix_paragraph)


def remove_ai_cliches(text: str) -> str:
    """
    Strip out any remaining AI-sounding phrases that slipped through the prompt.
    Covers patterns from §1-§9, §19-§25, §27-§28, §32 of skill.md.
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
        # Textbook & Heavy AI patterns
        (r'\bsoftware\s+development\s+is\s+a\s+dynamic\s+discipline\s+that\b', 'building software requires mixing'),
        (r'\bmodern\s+development\s+practices\s+emphasize\b', 'today\'s development teams focus on'),
        (r'\bversion\s+control\s+systems\b', 'git and version control tools'),
        (r'\bcloud\s+infrastructure\b', 'cloud setups and server systems'),
        (r'\bagile\s+methodologies\b', 'agile methods and workflows'),
        (r'\bincremental\s+improvements\b', 'small step-by-step updates'),
        (r'\btechnical\s+expertise\b', 'tech skills and know-how'),
        (r'\buser-focused\s+design\b', 'design focused on real users'),
        (r'\bcommitment\s+to\s+continuous\s+learning\b', 'dedication to constant learning'),
        (r'\blogical\s+problem-solving\b', 'solving complex problems'),
        (r'\breal-world\s+challenges\b', 'real everyday problems'),
        (r'\bclean\s+architecture,\s+maintainable\s+code,\s+automated\s+testing,\s+and\s+continuous\s+integration\b', 'clean architecture, code that is easy to maintain, automated tests, and steady builds'),
        # Additional AI Bigrams & Signal Words
        (r'\bgenuine\s+collaboration\b', 'real teamwork and collaboration'),
        (r'\buser\s+needs\s+front\s+and\s+center\b', 'what users need first and foremost'),
        (r'\bnever\s+stopping\s+the\s+learning\s+process\b', 'always learning and growing'),
        (r'\bkeep\s+the\s+chaos\s+at\b', 'keep things well organized'),
        (r'\bmanageable\s+chunks\b', 'small manageable steps'),
        (r'\bturn\s+into\s+major\s+headaches\b', 'cause big unexpected problems'),
        (r'\bshifting\s+the\s+end\s+goal\b', 'changing our main goal'),
        (r'\bone\s+step\s+at\s+a\s+time\b', 'step by step'),
        # Top AI Detector High-Ratio Bigrams/Trigrams (Purged)
        (r'\bcatch\s+bugs\s+(?:early|right\s+away),?\b', 'spot bugs before release'),
        (r'\b(?:tasks|jobs|work)\s+into\s+tiny\b', 'work into small'),
        (r'\bhandle\s+sudden\s+(?:changes|shifts)\b', 'deal with quick shifts'),
        (r'\bwhat\s+keeps\s+us\s+on\b', 'how we stay on'),
        (r'\brunning\s+smoothly\.\s+That\b', 'working fine. This'),
        (r'\bthat\.\s+Staying\s+focused\b', 'that. Keeping our focus'),
        (r'\bthat\s+moves\s+too\b', 'moving too'),
        (r'\bpatches\s+to\s+keep\b', 'fixes that keep'),
        (r'\byou\s+tackle\s+each\b', 'when facing each'),
        (r'\bstays\s+exactly\s+the\s+same,?\b', 'remains unchanged,'),
        # Flagged AI Bigrams & Formal Cadence Purges
        (r'\bdrive\s+long-term\s+business\s+growth\s+without\s+relying\s+solely?\s+on\s+paid\s+advertising\b', 'grow our business steadily without paying for ads'),
        (r'\bcontinuous\s+testing\s+to\s+stay\s+up\s+to\s+date\b', 'testing things regularly to stay ahead'),
        (r'\brefine\s+our\s+optimization\s+strategies\s+over\s+time\b', 'tweak our plan over time'),
        (r'\bsince\s+search\s+engine\s+algorithms\s+(?:are\s+constantly\s+evolving|continue\s+to\s+evolve)\b', 'as search algorithms change all the time'),
        (r'\bthe\s+quality\s+of\s+our\s+content,\s+and\s+how\s+easy\s+it\'s\s+for\s+users\s+to\s+navigate\b', 'good content and an easy-to-use site'),
        (r'\bmeasurably\b', 'clearly'),
        (r'\bdemonstrably\b', 'really'),
        (r'\bmeaningfully\b', 'actually'),
        (r'\balgorithmic\s+bias\b', 'system bias'),
        (r'\bstructured\s+data\s+markup\b', 'site data tags'),
        (r'\boptimization\s+strategies\b', 'plans and tweaks'),
        (r'\bgenuinely\b', 'really'),
        (r'\bfoundational\b', 'basic'),
        (r'\bconsequential\b', 'important'),
        (r'\bcalibrated\b', 'tuned'),
        (r'\btrajectory\b', 'path'),
        (r'\bin\s+practice\b', 'practically'),
        (r'\bwhich\s+helps\b', 'so it helps'),
        (r'\bspeed\s+up\s+the\s+process\s+of\b', 'speed up'),
        (r'\bsafe\s+from\s+cyber\s+threats\b', 'safe from hacks'),

        # ── §1: Undue significance / legacy puffery ──────────────────────────
        (r'\bmarks?\s+a\s+(?:pivotal|key|significant|crucial|critical|vital)\s+(?:moment|step|milestone|shift|turning point)\b', 'is'),
        (r'\bsett?ing\s+the\s+stage\s+for\b', 'leading to'),
        (r'\bshaping\s+(?:the|its|their)\b', 'affecting'),
        (r'\bindel?ible\s+mark\b', 'lasting impression'),
        (r'\bdeeply\s+rooted\b', 'established'),
        (r'\bevolv(?:ing|ed)\s+landscape\b', 'changing field'),
        (r'\bfocal\s+point\b', 'center'),
        (r'\bkey\s+turning\s+point\b', 'turning point'),
        (r'\bbroader\s+(?:trend|movement|context|shift|pattern)\b', 'wider trend'),
        (r'\bongoing\s+(?:journey|evolution|transformation|commitment)\b', 'continued'),
        (r'\benduring\s+(?:legacy|impact|influence|testament|symbol)\b', 'lasting'),
        (r'\benduring\b', 'lasting'),
        (r'\breflects?\s+broader\b', 'shows'),
        (r'\bsymboliz(?:ing|es|ed)\s+(?:its|their|the)\b', 'representing'),

        # ── §3: Superficial -ing analyses (tacked-on trailing clauses) ───────
        (r',\s+highlight(?:ing)\s+(?:its|their|the|how|that|a|an)\b', ''),
        (r',\s+underscor(?:ing)\s+(?:its|their|the|how|that)\b', ''),
        (r',\s+emphasiz(?:ing)\s+(?:its|their|the|how|that)\b', ''),
        (r',\s+showcas(?:ing)\s+(?:its|their|the|how|that)\b', ''),
        (r',\s+reflect(?:ing)\s+(?:its|their|the)\b', ''),
        (r',\s+symboliz(?:ing)\s+(?:its|their|the)\b', ''),
        (r',\s+cultivat(?:ing)\s+(?:a|an|the)\b', ''),
        (r',\s+foster(?:ing)\s+(?:a|an|the)\b', ''),
        (r',\s+encompass(?:ing)\s+(?:a|an|the)\b', ''),
        (r',\s+ensur(?:ing)\s+(?:a|an|the|that)\b', ''),

        # ── §4: Promotional / advertisement language ──────────────────────────
        (r'\bnestled\b', 'located'),
        (r'\bbreathtak(?:ing|ingly)\b', 'striking'),
        (r'\bmust[-\s]visit\b', 'worth visiting'),
        (r'\brenowned\b', 'well known'),
        (r'\bstunning\b', 'striking'),
        (r'\bvibrant\b', 'lively'),
        (r'\brich\s+(?:cultural\s+heritage|history|tradition)\b', 'strong cultural history'),
        (r'\bnatural\s+beauty\b', 'landscape'),
        (r'\bin\s+the\s+heart\s+of\b', 'in'),
        (r'\bgroundbreak(?:ing)\b', 'new'),
        (r'\bprofound\b', 'deep'),

        # ── §5: Vague attributions / weasel words ────────────────────────────
        (r'\bexperts?\s+(?:argue|believe|suggest|say|claim|note)\b', 'researchers say'),
        (r'\bobservers?\s+(?:have\s+)?(?:cited|noted|argued|suggested)\b', 'some have noted'),
        (r'\bindustry\s+reports?\s+(?:suggest|show|indicate|note)\b', 'data suggests'),
        (r'\bsome\s+critics?\s+(?:argue|suggest|claim|note)\b', 'critics say'),
        (r'\bmany\s+experts?\b', 'researchers'),
        (r'\bwidely\s+(?:considered|regarded|seen)\s+as\b', 'seen as'),

        # ── §6: Formulaic challenges sections ────────────────────────────────
        (r'\bdespite\s+(?:its|these|those|this)\s+(?:challenges|issues|obstacles|hurdles),?\s*', ''),
        (r'\bfaces?\s+(?:several|many|numerous|various)\s+challenges\b', 'has challenges'),
        (r'\bchallenges?\s+and\s+(?:future\s+)?(?:prospects?|opportunities?)\b', 'challenges'),
        (r'\bfuture\s+(?:outlook|prospects?|opportunities?)\b', 'next steps'),
        (r'\bcontinues?\s+to\s+thrive\b', 'continues to grow'),
        (r'\bintegral\s+part\s+of\b', 'part of'),

        # ── §7: AI vocabulary gaps ────────────────────────────────────────────
        (r'\btapestry\b', 'mix'),
        (r'\binterplay\b', 'relationship'),
        (r'\bgarner(?:s|ed)?\b', 'get'),
        (r'\bintricate(?:ly)?\b', 'complex'),
        (r'\bintricacies\b', 'details'),
        (r'\bvalu(?:able|ed)\b', 'useful'),
        (r'\bpioneering\b', 'early'),
        (r'\bseminal\b', 'influential'),
        (r'\bdynamic(?:ally)?\b', 'active'),

        # ── §8: Copula avoidance — replace elaborate copulas with plain "is/has"
        (r'\bserves?\s+as\s+(?:a|an|the)\b', 'is'),
        (r'\bserves?\s+as\b', 'is'),
        (r'\bstands?\s+as\s+(?:a|an|the)\b', 'is'),
        (r'\bstands?\s+as\b', 'is'),
        (r'\brepresents?\s+(?:a|an|the)\b', 'is'),
        (r'\bboasts?\s+(?:a|an|the)\b', 'has'),
        (r'\bfeatures?\s+(?:a|an|the)\b', 'has'),

        # ── §9: Negative parallelisms ─────────────────────────────────────────
        (r"\bit'?s\s+not\s+(?:just|merely|only)\s+about\s+[^;.]+;\s*it'?s\b", 'it is'),
        (r'\bnot\s+only\s+([^,]+),\s+but\s+(?:also\s+)?\b', r'\1 and '),
        (r'\bnot\s+merely\s+([^,]+),\s+(?:but|it\'?s)\s+\b', r'\1, and '),

        # ── §20: Collaborative chatbot artifacts ──────────────────────────────
        (r'\bI\s+hope\s+this\s+helps?[.!]?\b', ''),
        (r'\blet\s+me\s+know\s+if\s+(?:you(?:\'d)?\s+(?:like|want)|there(?:\'s)?\s+anything)\b[^.]*[.!]?', ''),
        (r'\bwould\s+you\s+like\s+me\s+to\b[^?]*\??', ''),
        (r'\bshould\s+I\s+continue\b[^?]*\??', ''),
        (r'\bfeel\s+free\s+to\s+(?:ask|reach\s+out|let\s+me\s+know)\b[^.]*[.!]?', ''),
        (r'\bwant\s+me\s+to\s+(?:expand|elaborate|continue|provide)\b[^?]*\??', ''),
        (r'\bof\s+course[!,]?\s*', ''),
        (r'\bcertainly[!,]?\s*', ''),

        # ── §21: Knowledge-cutoff disclaimers ────────────────────────────────
        (r'\bas\s+of\s+my\s+(?:last\s+)?(?:training|knowledge)\b[^.]*\.?', ''),
        (r'\bup\s+to\s+my\s+(?:last\s+)?(?:training|knowledge)\s+(?:update|cutoff)\b[^.]*\.?', ''),
        (r'\bmaintains?\s+a\s+low\s+profile\b', 'is not widely covered'),
        (r'\bkeeps?\s+(?:personal\s+)?details?\s+private\b', 'has limited public information'),
        (r'\bbased\s+on\s+available\s+information\b', ''),
        (r'\bit\s+is\s+believed\s+that\b', ''),
        (r'\bprefers?\s+to\s+stay\s+out\s+of\s+the\s+spotlight\b', 'is not widely covered'),

        # ── §22: Sycophantic / servile tone ──────────────────────────────────
        (r'\bgreat\s+question[!.]?\s*', ''),
        (r"you'?re\s+absolutely\s+right[!.]?\s*", ''),
        (r'\bthat\'?s\s+(?:an?\s+)?(?:excellent|great|wonderful|fantastic|brilliant)\s+(?:point|question|observation)[!.]?\s*', ''),
        (r'\babsolutely[!,]?\s*(?:you\'?re\s+right[!.]?\s*)?', ''),

        # ── §24: Excessive hedging ────────────────────────────────────────────
        (r'\bcould\s+potentially\s+possibly\b', 'could'),
        (r'\bmight\s+potentially\b', 'might'),
        (r'\bmay\s+arguably\b', 'may'),
        (r'\bcould\s+potentially\b', 'could'),
        (r'\bit\s+could\s+be\s+argued\s+that\b', ''),
        (r'\bit\s+(?:may|might)\s+be\s+said\s+that\b', ''),

        # ── §25: Generic positive conclusions ────────────────────────────────
        (r'\bthe\s+future\s+(?:looks?|seems?)\s+bright\b[^.]*\.?', ''),
        (r'\bexciting\s+times?\s+lie\s+ahead\b[^.]*\.?', ''),
        (r'\ba\s+(?:major\s+)?step\s+in\s+the\s+right\s+direction\b[^.]*\.?', ''),
        (r'\btheir\s+journey\s+toward\s+(?:excellence|success|growth)\b[^.]*\.?', ''),
        (r'\bcontinues?\s+(?:their|its)\s+journey\b[^.]*\.?', ''),

        # ── §27: Persuasive authority tropes ─────────────────────────────────
        (r'\bthe\s+real\s+question\s+is\b', 'the question is'),
        (r'\bat\s+its\s+core[,.]?\s*', ''),
        (r'\bwhat\s+really\s+matters?(?:\s+is)?\b', ''),
        (r'\bfundamentally[,.]?\s*', ''),
        (r'\bthe\s+deeper\s+(?:issue|truth|question|problem)(?:\s+is)?\b', 'the issue'),
        (r'\bthe\s+heart\s+of\s+the\s+matter\b', 'the core issue'),
        (r'\bin\s+reality[,.]?\s*', ''),
        (r'\bthe\s+truth\s+is[,.]?\s*', ''),

        # ── §28: Signposting / announcements ─────────────────────────────────
        (r"(?i)let'?s\s+dive\s+(?:in|into)\b[^.]*\.?\s*", ''),
        (r"(?i)let'?s\s+explore\b[^.]*\.?\s*", ''),
        (r"(?i)let'?s\s+break\s+this\s+down\b[^.]*\.?\s*", ''),
        (r'(?i)without\s+further\s+ado[,.]?\s*', ''),
        (r"(?i)here'?s\s+what\s+you\s+need\s+to\s+know[.:]?\s*", ''),
        (r"(?i)now\s+let'?s\s+(?:look\s+at|turn\s+to|discuss|explore)\b[^.]*\.?\s*", ''),

        # ── §32: Aphorism & Emotional Uplift formulas ────────────────────────
        (r'\bis\s+the\s+(?:language|currency|architecture|foundation)\s+of\b', 'matters for'),
        (r'\bbecomes?\s+a\s+trap\b', 'can be a problem'),
        (r'\bis\s+not\s+(?:a\s+)?tool\s+but\s+(?:a\s+)?mirror\b', 'reflects more than it acts'),
        (r'\bthe\s+(?:language|currency|architecture)\s+of\b', 'the basis of'),
        (r'\bfinding\s+joy\s+in\s+the\s+(?:little|small)\s+things\b', 'enjoying simple moments'),
        (r'\bmakes?\s+life\s+so\s+(?:special|meaningful)\b', 'feels good'),
        (r'\breminds?\s+us\s+that\s+happiness\s+is\s+often\s+found\b', 'shows that happiness comes'),
        (r'\bpatience,\s*kindness,\s*and\s*resilience\b', 'patience and grit'),
        (r'\borderly\s+things,\s*not\s+just\s+big\s+achievements\b', 'small moments'),

        # ── Atmospheric AI Cadence Purges ─────────────────────────────────────
        (r'\ba\s+sense\s+of\s+purpose\b', 'a real reason'),
        (r'\ba\s+legacy\s+that\s+keeps\s+going\b', 'something that lasts'),
        (r'\bamong\s+the\s+stillness\b', 'in the quiet'),
        (r'\bas\s+([a-zA-Z0-9]+(?:\s+o\'?clock)?)\s+hits,?\s*', r'when \1 comes, '),
        (r'\bgentle\s+glow\b', 'soft light'),
        (r'\bseals?\s+the\s+room,?\s+and\s+quiet\s+takes\s+over\b', 'closes the room'),
        (r'\ba\s+quiet\s+space\s+where\b', 'a quiet spot where'),
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
    r'Hmm[,.!]|'
    r"Actually,?\s*(?:the\s+(?:prompt|rule|constraint)|I|this|let's)|"
    r'Avg\s+is\s+around|'
    r'Average\s+is\s+|'
    r"Thing\s+is,?\s*i\s+need|"
    r"Now,?\s*i'll\s+deliberately|"
    r"I'll\s+rewrite\s+to|"
    r"I'm\s+overcomplicating|"
    # Numbered planning steps (e.g. "1. Analyze Input:", "2. Deconstruct Input & Map Ideas:")
    r'\d+\.\s+(?:Analyze|Deconstruct|Map|Plan|Draft|Review|Identify|Check|Verify|Rewrite|Assess|Step|Phase|Understand|Extract|Output)[^\n]*:|'
    r'\d+\.\s+(?:Read|Think|Consider|Note|Look)[^\n]*:|'
    # Word-count reasoning (e.g. "Total: 93 words", "I'm 9-12 words short")
    r'Total:\s+\d|'
    r"I'?m\s+\d+(?:[\u2013-]\d+)?\s+words?\s+(?:short|long|over|under)|'"
    r'I\s+need\s+(?:to\s+)?(?:add|expand|include|cut|remove|reduce|\d+)\s+[~\d]|'
    r'I\s+need\s+(?:to\s+)?(?:add|expand|include|cut|\d+)|'
    r'Need\s+\d+(?:[\u2013-]\d+)?|'
    # Arrow-expression lines ("-> cut to 12:", "-> adds 8")
    r'->\s+(?:cut|adds?|gives?|removes?|that|I\'ll|let\'s|we|this)|'
    # Word-count planning openers
    r'Starting\s+with\s+(?:personal\s+)?pronouns|'
    r'These\s+sentences\s+without\s+breaking|'
    # "Let's" planning phrases
    r"Let'?s (?:check|verify|refine|adjust|review|look|re-read|reconsider|craft|try|push|think|go back|now look|now check|now try|see if|draft|rewrite|aim)|"
    # "I ..." self-referential phrases
    r"I'?m (?:overthinking|stuck|still too close|still getting|going in circles|looping)|"
    r'I need to (?:actually|really|go back|re-read|re-check|rewrite|push)|'
    r"Let me (?:re-?)?(?:check|verify|refine|adjust|review|look|reconsider|craft|try|think|go|fix|re-read|actually|draft)|"
    r"I'?ll (?:adjust|try|push|craft|refine|rephrase|change|deliberately|now|go with|keep trying|rewrite|just write|combine|make)|"
    # Named section markers
    r'New version[: (]|'
    r'Final (?:answer|output|version|draft|rewrite|text|Polish|Attempt)(?:\s+Text)?[: ]|'
    r'Heavy Rewrite[: ]|'
    r'Another (?:attempt|version|draft|try)[: ]|'
    r'Original: |'
    r'[\*_ ]*(?:Heavy Rewrite|Final Polish(?: Text)?|Another Attempt|Version \d|Refined Version|Polish Text)[\*_ ]*[: ]|'
    r'One more (?:try|attempt|version|pass)|'
    r'->\s*(?:I\'ll|Let\'s|We|This)|'
    # Sentence labeling (e.g. "S1: ", "S2: ")
    r'S\d+:\s*|'
    # Word-count arithmetic (e.g. "Total so far: 12 + 16...", "Total: 12+10+11...", "Too short, need 96-105")
    r'Total(?:\s+so\s+far)?:\s*[\d\s\+\=]+|'
    r'(?:Too\s+(?:short|low|long|high)|Perfect)[.,\s]+(?:need|range|target)|'
    # Delta tags / pronoun tags (e.g. "[-1]", "[+1]", "(We)", "(They)", "(It)")
    r'\[[+-]\d+\]|'
    r'\((?:We|They|You|It|This|She|He|I)\)|'
    # Rule reference / thinking comments (e.g. "-> changes question to statement. Rule 9 says...")
    r'->\s*(?:changes?|rule|modifies?|swaps?|rewrites?|adjusts?)[^\n]*|'
    # Explicit check lists
    r'(?:Let me|Now|I need to) check (?:the )?(?:constraints|facts|rhythm|structure|flow|paragraph|word)|'
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
    Preserves ALL paragraphs of the output text.
    """
    stripped = text.strip()

    # If no inline thinking indicators exist at all, return full text
    if not _INLINE_THINKING_RE.search(stripped):
        return stripped

    # Strategy 0: Split on draft markers like "Let's try:", "Let's rewrite carefully:", "I'll change to:"
    custom_chunks = re.split(r'(?i)(?:Let\'s try|Let\'s rewrite carefully|Let\'s draft|I\'ll change to|Here is the rewrite|Full draft)[:\s\n]+', stripped)
    if len(custom_chunks) > 1:
        last_block = custom_chunks[-1].strip()
        if len(last_block) > 20 and not _INLINE_THINKING_RE.match(last_block):
            return last_block

    # Strategy 1: last "Let's try:" / "*Final Polish:*" style marker
    all_markers = list(_FINAL_MARKER_RE.finditer(stripped))
    if all_markers:
        last_marker = all_markers[-1]
        candidate = stripped[last_marker.end():].strip()
        if candidate and len(candidate) > 30 and not _INLINE_THINKING_RE.match(candidate):
            return candidate

    # Strategy 2: take all clean paragraphs before any thinking block starts
    paragraphs = re.split(r'\n\s*\n', stripped)
    clean_paras = []
    for para in paragraphs:
        first_line = para.strip().split('\n')[0]
        if _INLINE_THINKING_RE.match(para.strip()) or _INLINE_THINKING_RE.match(first_line):
            break
        clean_paras.append(para.strip())

    if clean_paras:
        return '\n\n'.join(clean_paras).strip()

    # Strategy 3: The entire output is thinking content (e.g. numbered step analysis).
    # Strip numbered step headers and planning labels line-by-line, keep prose sentences.
    # Pattern: "N. Step Title: , content" or "N. Step Title:\ncontent"
    _STEP_HEADER_RE = re.compile(
        r'^\d+\.\s+[A-Z][^\n]*?:\s*,?\s*',  # "2. Deconstruct Input & Map Ideas: ,"
        re.MULTILINE
    )
    prose = _STEP_HEADER_RE.sub('', stripped)
    # Also strip any remaining lines that are pure thinking signals
    lines = prose.split('\n')
    clean_lines = [
        ln for ln in lines
        if ln.strip() and not _INLINE_THINKING_RE.match(ln.strip())
    ]
    candidate = '\n'.join(clean_lines).strip()
    if candidate and len(candidate) > 20:
        return candidate

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


def _enforce_short_sentences_paragraph(paragraph: str, max_words: int = 16) -> str:
    """
    Sentence length cap: splits sentences over 16 words at natural clause boundaries (commas, semicolons, major conjunctions)
    to maintain human-like sentence length (12-16 words) without creating broken fragments.
    """
    sentences = _split_sentences(paragraph)
    result = []

    def _split_one(sent: str):
        words = sent.split()
        if len(words) <= max_words:
            result.append(sent)
            return

        mid = len(words) // 2
        split_index = -1

        # Look for comma or semicolon boundary first
        for i in range(min(mid + 4, len(words) - 3), max(mid - 4, 3), -1):
            if words[i].endswith(',') or words[i].endswith(';'):
                split_index = i + 1
                break

        # Fallback 1 to major subordinating conjunctions if no comma
        if split_index == -1:
            for i in range(min(mid + 4, len(words) - 3), max(mid - 4, 3), -1):
                w = words[i].lower().rstrip(',;')
                if w in ('while', 'because', 'although', 'whereas', 'since', 'so', 'that', 'which', 'and', 'but'):
                    split_index = i
                    break

        # Fallback 2 to prepositions if still no boundary found
        if split_index == -1:
            for i in range(min(mid + 4, len(words) - 3), max(mid - 4, 3), -1):
                w = words[i].lower().rstrip(',;')
                if w in ('within', 'for', 'to', 'in', 'of', 'at', 'with', 'on', 'about', 'by', 'through', 'prior', 'before', 'after'):
                    split_index = i
                    break

        if split_index > 2 and split_index < len(words) - 2:
            part1 = " ".join(words[:split_index]).rstrip(',;') + "."
            remainder_words = list(words[split_index:])
            if remainder_words:
                remainder_words[0] = remainder_words[0].capitalize()
            part2 = " ".join(remainder_words)
            _split_one(part1)
            _split_one(part2)
        else:
            result.append(sent)

    for sent in sentences:
        _split_one(sent)

    return _join_sentences(result)


def enforce_short_sentences(text: str, max_words: int = 16) -> str:
    """Apply strict sentence length capping across paragraphs."""
    return _process_per_paragraph(text, lambda p: _enforce_short_sentences_paragraph(p, max_words))


def break_textbook_starters(text: str) -> str:
    """
    Transforms formal textbook sentence openers that trigger AI detectors:
    'As technologies continue...', 'Modern practices emphasize...', '[Noun] is a dynamic discipline that...'
    """
    patterns = [
        (r'\bAs\s+([a-z0-9\s]+?)\s+continue(?:s)?\s+to\s+([a-z]+),?\s*', r'When \1 \2, '),
        (r'\bModern\s+([a-z0-9\s]+?)\s+practices\s+emphasize\b', r'Today, \1 teams focus on'),
        (r'\bModern\s+([a-z0-9\s]+?)\s+emphasize\b', r'Today, \1 focuses on'),
        (r'\b([A-Z][a-z]+(?:\s+[a-z]+)?)\s+is\s+a\s+(?:dynamic|complex|vital|important)\s+(?:discipline|field|area)\s+that\b', r'\1'),
    ]
    for pattern, replacement in patterns:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


def clean_parenthetical_word_counts(text: str) -> str:
    """
    Strips inline parenthetical word count annotations like '(10)', '(7)', '(6)', '(12)', '(Too definitely short)'
    and self-talk line fragments that models emit when reasoning out loud.
    """
    # Strip parenthetical counts e.g. "teamwork. (10)" -> "teamwork."
    text = re.sub(r'\s*\(\d{1,3}\)', '', text)
    # Strip paren commentary e.g. "(Too definitely short)", "(Too long)"
    text = re.sub(r'\s*\((?:Too\s+[a-z]+|~?\d+\s*words?|[a-z\s]+short|[a-z\s]+long)\)', '', text, flags=re.IGNORECASE)
    # Strip any comment starting with ---
    text = re.sub(r'\s*---\s*.*$', '', text, flags=re.MULTILINE)
    # Strip parentheses containing word/char counts or matching notes
    text = re.sub(r'\s*\([^)]*(?:word|char|count|match|preserve|exact)[^)]*\)', '', text, flags=re.IGNORECASE)
    # Strip stray arrows: "-> cut to 12:", "-> adds 8", standalone "->"
    text = re.sub(r'^\s*->.*$', '', text, flags=re.MULTILINE)
    # Strip inline trailing "-> adds N" / "-> gives N" annotations after quotes
    text = re.sub(r'\"?\s*->\s*(?:adds?|gives?|removes?|cuts?|saves?)\s+\d+\.?', '', text)
    # Strip whole lines that are pure word-count reasoning:
    # "Total: 93 words, and need 96-105."
    text = re.sub(r'^Total:\s+\d+.*$', '', text, flags=re.MULTILINE | re.IGNORECASE)
    # "I'm 9-12 words short."
    text = re.sub(r"^I'?m\s+\d+(?:[–-]\d+)?\s+words?\s+(?:short|long|over|under)[^\n]*$", '', text, flags=re.MULTILINE | re.IGNORECASE)
    # "I need to add ~15 words across."
    text = re.sub(r'^I\s+need\s+to\s+(?:add|expand|include|cut|remove|reduce)\s+[~\d][^\n]*$', '', text, flags=re.MULTILINE | re.IGNORECASE)
    text = re.sub(r'^I\s+need\s+to\s+(?:add|expand|include|cut)\s+(?:slightly|more|about|around|~)[^\n]*$', '', text, flags=re.MULTILINE | re.IGNORECASE)
    # "Starting with pronouns.", "Starting with personal pronouns."
    text = re.sub(r'^Starting\s+with\s+(?:personal\s+)?pronouns[^\n]*$', '', text, flags=re.MULTILINE | re.IGNORECASE)
    # Strip self-talk sentences that slip into paragraph text
    text = re.sub(r'(?:I\'ll|Let\'s|Actually,\s+the\s+(?:prompt|rule)|I\'m overcomplicating|Avg is around|Thing is, i need|Now, i\'ll|I\'ll change to|Let\'s aim for|Let\'s try)[^\n\.]*[\.\:\n]?', '', text, flags=re.IGNORECASE)
    # Strip quoted example sentences used for word-count illustration:
    # '"They want us to trust the new tools." -> adds 8.'
    # '"We just need to see what happens next." -> adds 9.'
    # Pattern: any line that is a quoted string followed by -> annotation
    text = re.sub(r'^"[^"\n]+"\s*->.*$', '', text, flags=re.MULTILINE)
    # Strip orphaned bare-quote lines (a lone " left after the above)
    text = re.sub(r'^\s*"\s*$', '', text, flags=re.MULTILINE)
    # Strip sentence markers: "S1: ", "S2: ", "S3: ", "S4: "
    text = re.sub(r'\bS\d+:\s*', '', text)
    # Strip delta tags e.g. "[-1]", "[+1]", "[+2]", "(+2)"
    text = re.sub(r'\[[+-]\d+\]|\(\+[0-9]+\)', '', text)
    # Strip standalone pronoun tag parentheticals e.g. "(We)", "(They)", "(You)", "(It)"
    text = re.sub(r'\s*\((?:We|They|You|It|This|She|He|I)\)', '', text, flags=re.IGNORECASE)
    # Strip rule reference arrows and mentions e.g. "-> changes question to statement.", "Rule 9 says state plainly."
    text = re.sub(r'->\s*(?:added|changes?|rule|modifies?|swaps?|rewrites?|adjusts?)[^\n.]*[\.\n]?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\bRule\s+\d+\s+says\b[^\n.]*[\.\n]?', '', text, flags=re.IGNORECASE)
    # Strip math summation expressions inline e.g. "Total so far: 12 + 16 + 15 + 21 = 64.", "Total: 12+10+11..."
    text = re.sub(r'Total(?:\s+so\s+far)?:\s*[\d\s\+\=]+[^\n.]*[\.\n]?', '', text, flags=re.IGNORECASE)
    # Strip word count status sentences inline e.g. "Too short, need 96-105.", "Too low. Need 96-105.", "Perfect. (96-105 range)"
    text = re.sub(r'\b(?:Too\s+(?:short|low|high|long)|Perfect)[,.]?\s*(?:need|range|target|too low)?[^\n.]*[\.\n]?', '', text, flags=re.IGNORECASE)
    # Strip "I need to expand slightly..." / "I need 96-105" / "I'm N-M words short" reasoning sentences inline
    text = re.sub(r'\bI\s+need\s+(?:to\s+)?(?:expand|add|cut|reduce|\d+)[^\n.]*[\.\n]?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\bNeed\s+\d+(?:[\u2013-]\d+)?[^\n.]*[\.\n]?', '', text, flags=re.IGNORECASE)
    text = re.sub(r"\bI'?m\s+\d+(?:[\u2013-]\d+)?\s+words?\s+(?:short|long|over|under)[^\n.]*[\.\n]?", '', text, flags=re.IGNORECASE)
    # Strip "Actually, the rule says..." variants
    text = re.sub(r'Actually,?\s+the\s+rule\s+says[^\n\.]*[\.\n]?', '', text, flags=re.IGNORECASE)
    # Strip numbered step headers: "2. Deconstruct & Plan Sentence by Sentence: "
    text = re.sub(r'^\d+\.\s+[A-Z][^\n]*?:\s*,?\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\b\d+\.\s+Deconstruct[^\n]*?:\s*', '', text, flags=re.IGNORECASE)
    # Clean up blank lines created by removals
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Clean up double spaces from removals
    text = re.sub(r'  +', ' ', text)
    return text.strip()


def humanize(text: str, intensity: float = 0.5, original_text: str = "") -> str:
    """
    Main humanization function. Applies all post-processing steps.

    Args:
        text: The LLM-rewritten text
        intensity: 0.0 = minimal changes, 1.0 = aggressive humanization
        original_text: Optional original input text to enforce paragraph parity

    Returns:
        Text with human-like imperfections introduced
    """
    if not text or len(text) < 10:
        return text

    # Step 0a: Extract final prose from models that dump inline thinking (e.g. Qwen3)
    text = extract_final_output(text)
    text = clean_parenthetical_word_counts(text)

    # Step 0b: Strip any conversational preambles and outer quotes
    text = strip_preamble(text)
    text = strip_outer_quotes(text)

    # Step 0c: Strip formatting artifacts — §15/§17/§18/§19
    # (emojis, curly quotes, bold markdown, title-case headings)
    text = strip_formatting_artifacts(text)

    # Step 1: Remove any AI cliches, textbook starters, Rule-of-Three lists, and sentimental wrap-ups
    text = remove_ai_cliches(text)
    text = break_textbook_starters(text)
    text = remove_rule_of_three(text)
    text = remove_sentimental_closures(text)
    text = naturalize_idioms(text)

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
    text = vary_punctuation(text, rate=0.04 * intensity)

    # Step 6b: Introduce vocabulary diversity (synonym swapping) to break generic language
    text = introduce_vocabulary_diversity(text, rate=0.55 * intensity)

    # Step 6c: Inject subtle stance/opinion markers to break neutral tone
    if intensity > 0.2:
        text = inject_opinion_markers(text, rate=0.09 * intensity)

    # Step 6d: Randomize sentence syntax patterns (pivots, fragments, questions) to break overly polished writing
    if intensity > 0.3:
        text = randomize_syntax_patterns(text, intensity=0.30)

    # Step 6d2: Inject human rhetorical questions to break AI-skewed 100% expository cadence
    text = inject_rhetorical_questions(text, rate=0.35 * intensity)

    # Step 6e: §31 Remove manufactured staccato drama
    if intensity > 0.3:
        text = remove_staccato_drama(text)

    # Step 6f: Smart Word-Level Entropy Injection & Number Formatting Variance
    if intensity > 0.4:
        text = inject_entropy_words(text, intensity=intensity)
        text = vary_number_formatting(text, rate=0.25 * intensity)

    # Step 7: Absolute check: eliminate all em-dashes, en-dashes, and spaced hyphens/dashes
    text = text.replace("\u2014", ", ")
    text = text.replace("\u2013", ", ")
    text = text.replace(" - ", ", ")
    text = text.replace(" -- ", ", ")

    # Step 8: Cap long sentences over 12 words to maintain high burstiness and low avg sentence length (10-14 words)
    text = enforce_short_sentences(text, max_words=12)

    # Step 9: Enforce exact paragraph structure matching original input
    if original_text:
        orig_paras = [p.strip() for p in original_text.strip().split('\n\n') if p.strip()]
        if len(orig_paras) <= 1 and '\n' not in original_text.strip():
            clean_single = re.sub(r'\s*\n+\s*', ' ', text.strip())
            text = re.sub(r'  +', ' ', clean_single)

    # Final cleanup: fix double conjunctions, strip robotic "So," openers, and title-case after starters
    text = re.sub(r'\.{2,}', '.', text)
    text = re.sub(r'^(?:So,?\s+|So\s+this\s+way,?\s+)', '', text, flags=re.IGNORECASE | re.MULTILINE)
    text = re.sub(r'([.!?]\s+)(?:So,?\s+|So\s+this\s+way,?\s+)', r'\1', text, flags=re.IGNORECASE)
    text = re.sub(r'\b(and|but|so)\s+(and|but|so)\b', r'\1', text, flags=re.IGNORECASE)
    text = re.sub(r'\b(and|but|so|still)\s+([A-Z][a-z]+)\b', lambda m: m.group(1) + ' ' + m.group(2).lower(), text, flags=re.IGNORECASE)

    final_text = text.strip()
    return final_text if final_text else (original_text or text)


def inject_opinion_markers(text: str, rate: float = 0.08) -> str:
    """
    Inject subtle stance/opinion markers ('actually', 'really', 'honestly', 'pretty')
    into sentences to break the neutral, flat tone characteristic of AI detectors.
    """
    opinion_words = ['actually', 'really', 'honestly', 'pretty much', 'definitely', 'personally', 'turns out', 'frankly']
    
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
    r'\binfrastructure\b': ['cloud setup', 'systems', 'tools'],
    r'\bmethodologies\b': ['methods', 'ways', 'processes'],
    r'\bcollaboration\b': ['teamwork', 'working together'],
    r'\bincremental\b': ['step-by-step', 'small', 'gradual'],
    r'\bexpertise\b': ['skills', 'know-how'],
    r'\bcommitment\b': ['focus', 'dedication'],
    r'\badaptation\b': ['adjusting', 'flexibility'],
    r'\bemphasize(?:s|d)?\b': ['focus on', 'prioritize'],
    r'\bdiscipline\b': ['field', 'craft'],
    r'\btechnical\b': ['tech'],
    r'\bcontinuous\b': ['regular', 'steady'],
    r'\bautomated\b': ['auto'],
    r'\bmaintainable\b': ['clean', 'easy-to-read'],
    r'\bchallenges\b': ['problems', 'hurdles', 'hard steps'],
    r'\badvocates point to\b': ['supporters highlight', 'proponents focus on', 'advocates bring up'],
    r'\bcritics warn about\b': ['doubters flag', 'others worry about', 'critics bring up'],
    r'\bsparking (?:intense|heated|widespread)?\s*debate\b': ['stirring up arguments', 'provoking debate', 'causing big debate'],
    r'\bleaving society with a (?:critical|big)?\s*question:?\b': ['raising a big question for all of us:'],
    # Anti-AI multisyllabic word replacements (reduce mean word length < 5.0 chars)
    r'\bcommunicating\b': ['talking', 'chatting', 'sharing'],
    r'\bcommunicate\b': ['talk', 'chat', 'connect'],
    r'\bopportunities\b': ['chances', 'wins'],
    r'\bopportunity\b': ['chance', 'shot'],
    r'\bcreativity\b': ['fresh ideas', 'sparks'],
    r'\borganized\b': ['set', 'ready'],
    r'\bredefining\b': ['changing', 'shaping'],
    r'\bsociety\b': ['us', 'people', 'everyone'],
    # Environmental & Formal term simplification
    r'\bbiodiversity\b': ['nature', 'wildlife'],
    r'\bpreservation\b': ['saving', 'protecting'],
    r'\bpreserving\b': ['saving', 'keeping'],
    r'\binitiatives?\b': ['plans', 'steps'],
    r'\bimplementation\b': ['work', 'action'],
    r'\bsustainability\b': ['green habits', 'clean living'],
    r'\benvironmental\b': ['eco'],
    r'\borganizations?\b': ['groups', 'teams'],
    r'\bpromotes?\b': ['push for', 'back'],
    r'\bpromoted\b': ['pushed for', 'backed'],
    r'\bcollective\b': ['team', 'shared'],
    # Detector feedback 1-syllable purges
    r'\bpeaceful\b': ['calm', 'quiet'],
    r'\bconnection\b': ['link', 'bond'],
    r'\bdistance\b': ['back', 'far end'],
    r'\bmachinery\b': ['gears', 'tools'],
    r'\btreasures\b': ['gems', 'finds'],
    r'\badjust\b': ['fix', 'tune'],
    r'\bstillness\b': ['quiet', 'calm'],
    r'\bnotice\b': ['see', 'spot'],
    r'\btweezers\b': ['tools', 'clips'],
}


_HUMAN_QUESTIONS = [
    "Makes sense, right?",
    "Why does that matter?",
    "Ever notice that?",
    "Sound familiar?",
    "Hard to argue with that, isn't it?",
]


def inject_rhetorical_questions(text: str, rate: float = 0.35) -> str:
    """
    AI detectors flag text with 0 question marks as AI-skewed expository prose.
    Injects occasional human question marks (e.g. 'Makes sense, right?') to break the 100% declarative cadence.
    """
    if '?' in text or len(text.split()) < 25:
        return text

    if random.random() < rate:
        sentences = _split_sentences(text)
        if len(sentences) >= 2:
            idx = random.randint(1, len(sentences) - 1)
            q = random.choice(_HUMAN_QUESTIONS)
            sentences.insert(idx, q)
            return _join_sentences(sentences)

    return text


def remove_rule_of_three(text: str) -> str:
    """
    §10: Ban AI Rule-of-Three enumerations ('X, Y, and Z').
    AI detectors strongly weight sets of three as AI flags.
    Replaces 3-item lists with natural 2-item pairs.
    """
    pattern = r'\b([A-Za-z0-9\'\-]+(?:\s+[A-Za-z0-9\'\-]+)?),\s+([A-Za-z0-9\'\-]+(?:\s+[A-Za-z0-9\'\-]+)?),?\s+and\s+([A-Za-z0-9\'\-]+(?:\s+[A-Za-z0-9\'\-]+)?)\b'
    def replace_triple(match):
        item1 = match.group(1).strip()
        item2 = match.group(2).strip()
        return f'{item1} and {item2}'
    return re.sub(pattern, replace_triple, text)


def remove_sentimental_closures(text: str) -> str:
    """
    §25: Remove formulaic AI finality wrap-ups:
    'It's all about finding that balance and being open to new things. We'll be just fine.'
    'And that's how we'll handle challenges, grab opportunities, and create a better future...'
    """
    text = re.sub(r'\bIt\'s all about [^.!?]+[.]\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\bWe\'ll be just fine[.]\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\bcreate a better future[^.!?]+[.]\s*', '', text, flags=re.IGNORECASE)
    return text


IDIOM_MAP = {
    r'\bfind solutions to\b': ['figure out', 'sort out', 'work through'],
    r'\bacquire knowledge\b': ['learn', 'pick up things'],
    r'\bin the final analysis\b': ['when all is said and done', 'in the end'],
    r'\btakes into consideration\b': ['factors in', 'keeps in mind'],
    r'\bat the present time\b': ['right now', 'as of today'],
    r'\bplays an important role\b': ['matters a lot', 'makes a big difference'],
    r'\bdelve into\b': ['look into', 'dig into'],
    r'\bnavigate the complexities of\b': ['deal with', 'handle'],
}

def naturalize_idioms(text: str) -> str:
    """Replace formal phrases with natural spoken English idioms."""
    for pattern, alts in IDIOM_MAP.items():
        if re.search(pattern, text, flags=re.IGNORECASE):
            text = re.sub(pattern, random.choice(alts), text, flags=re.IGNORECASE)
    return text


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
    ", which helps",
    ", when needed",
    ", in practice",
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


_NUMBER_WORDS = {
    '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
    '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten'
}


def vary_number_formatting(text: str, rate: float = 0.3) -> str:
    """
    Randomly convert small digits to word format (e.g., 5 -> five) or 'X%' -> 'X percent'
    to introduce stylistic variance in numerical representation.
    """
    if random.random() < rate:
        text = re.sub(r'(\d+)\s*%', r'\1 percent', text, count=1)

    for num_str, word_str in _NUMBER_WORDS.items():
        if random.random() < (rate * 0.5):
            text = re.sub(r'\b' + num_str + r'\b', word_str, text, count=1)

    return text


def inject_entropy_words(text: str, intensity: float = 0.5) -> str:
    """
    Inject subtle, human discourse markers ('well', 'honestly', 'in fact', 'I mean')
    at clause boundaries to break uniform LLM entropy profiles.
    """
    markers = ["Well, ", "Honestly, ", "In fact, ", "I mean, ", "Look, "]
    def _inject_para(paragraph: str) -> str:
        sentences = _split_sentences(paragraph)
        if len(sentences) < 3:
            return paragraph
        for i in range(1, len(sentences) - 1):
            if random.random() < (0.05 * intensity):
                s = sentences[i]
                if not any(s.startswith(m) for m in markers) and len(s.split()) >= 6:
                    chosen = random.choice(markers)
                    sentences[i] = chosen + s[0].lower() + s[1:]
        return _join_sentences(sentences)

    return _process_per_paragraph(text, _inject_para)
