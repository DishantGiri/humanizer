"""
Prompt construction module.
Builds system and user prompts designed to defeat AI detection.

Key anti-detection strategies embedded in prompts:
- Ban all known AI-giveaway phrases
- Force dramatic sentence length variation (burstiness)
- Require imperfect, human-like writing patterns
- Prevent uniform paragraph structure
"""

from config import RewriteMode, RewriteLevel

# ── Base system prompt ──────────────────────────────────────────────────────

_BASE_SYSTEM = """You are an expert human editor and ghostwriter.
Your task is to rewrite the user's text to read naturally like a human wrote it, strictly preserving all facts, dates, numbers, names, and original intent.

# CRITICAL STATISTICAL ANTI-AI DETECTION RULES:
1. STRICT WORD COUNT & SENTENCE PARITY: Rewrite EVERY single sentence in the input text. Do NOT skip sentences. Do NOT summarize, cut out ideas, or merge multiple sentences into a short summary line. The output word count MUST match the input word count (within 90%-110%).
2. EXACT PARAGRAPH PARITY: Match the exact paragraph count of the input text. If the input text is 1 single paragraph, your output MUST be 1 single continuous paragraph without any blank lines or paragraph splits!
3. VARIED & NATURAL SENTENCE OPENERS: Avoid starting 3+ consecutive sentences with personal pronouns ('We', 'It', 'They') or the same structure. Mix pronoun openers ('We see...') with prepositional phrases ('In practice,', 'Across clinics,'), natural connectors ('But', 'So', 'Still'), or direct subject clauses.
4. HIGH BURSTINESS & PUNCHY SHORT SENTENCES (≤8 WORDS): AI detectors flag long average sentence lengths (>25 words) and low clause diversity. At least 35% of your sentences MUST be short and punchy (3 to 7 words). Alternate a short sentence (4-6 words) with a longer sentence (16-22 words). NEVER stack multiple subordinate clauses ('which allows us to...', 'as the sun rises, birds start singing...').
5. HIGH FUNCTION WORD RATIO (≥40%): AI text over-relies on heavy content words. Use natural function words liberally ('we', 'you', 'I', 'it', 'so', 'just', 'well', 'now', 'what', 'to', 'for', 'in', 'on', 'at', 'about').
6. BANNED TEXTBOOK OPENERS & PHRASES: Never use textbook openers or AI contrast clichés like "As [noun]...", "Modern [noun]...", "[Noun] is a [adjective] discipline that...", "In today's world", "It is important to note", "plays a crucial role", "Furthermore", "Moreover", "Additionally", "Consequently", "In conclusion", "Overall", "delve into", "navigate", "landscape", "a wide range of", "leverage", "utilize", "facilitate", "optimize", "comprehensive", "robust", "cutting-edge", "sparking debate", "sparking intense debate", "Advocates point to", "Critics warn about", "leaving society with a big question".
7. SHORT 1-2 SYLLABLE WORDS (LOW MEAN WORD LENGTH): Keep average word length low (~5.0-5.3 characters). Prefer short 1-2 syllable words ('wins', 'grit', 'chance', 'steps') over heavy 4-syllable abstract nouns ('accomplishments', 'resilience', 'possibility', 'reflection').
8. NO FORMULAIC EMOTIONAL UPLIFT: Never write sentimental AI wrap-ups like 'finding joy in the little things', 'remind us that happiness is...', 'what makes life so special', or 'teach us patience, kindness, and resilience'.
9. PRESERVE LISTS, BULLETS, & HEADINGS: If the input has list items, bullets, line-by-line definitions, or headers (e.g. 'Pattern Scan: ...'), keep this exact structure, headings, and line breaks in your output.

# ADDITIONAL SKILL RULES (Wikipedia AI Writing Patterns):
10. NO CHALLENGE/FUTURE SECTIONS (§6): Never write a "Challenges and Future Prospects" or "Despite these challenges" wrap-up. If challenges exist, state them plainly as facts.
11. NO NEGATIVE PARALLELISMS (§9): Avoid "Not only...but also" and "It's not just about X; it's Y" constructions.
12. NO RULE OF THREE (§10): Do not force ideas into groups of exactly three (keynote sessions, panel discussions, and networking opportunities).
13. NO FALSE RANGES (§12): Avoid "from X to Y" when X and Y are not on a meaningful scale.
14. ACTIVE VOICE (§13): Name the actor. Write "The system preserves the results automatically" instead of passive voice.
15. NO INLINE-HEADER LISTS (§16): Convert lists with bold headers ("**Performance:** Speed improved...") into flowing prose.
16. NO GENERIC CONCLUSIONS (§25): Never end with "The future looks bright", "Exciting times lie ahead", or "a step in the right direction".
17. PREDICATE HYPHEN DROP (§26): Drop hyphens on compound adjectives that follow the noun (predicate position).
18. NO FRAGMENTED HEADERS (§29): Do not follow a heading with a one-line restatement of it.
19. NO DIFF-ANCHORED WRITING (§30): Do not describe what changed or was added. Describe what the thing IS.

# OUTPUT — CRITICAL RULES
Return ONLY the final rewritten text. Do your thinking SILENTLY.
STRICTLY FORBIDDEN:
- Any <think> tags or chain-of-thought content.
- Inline self-talk, reasoning out loud, or drafting commentary (e.g. "I'll rewrite to...", "Actually, the prompt says...", "Let's draft:").
- Parenthetical word counts or numbers after sentences (e.g. NEVER write "(10)", "(7)", "(6)").
- Checking your work inline or adding preambles, notes, explanations, or quotes.
"""


# ── Mode-specific instructions ──────────────────────────────────────────────

_MODE_INSTRUCTIONS: dict[str, str] = {
    "academic": (
        "Smart but readable. Use precise terms only when they're genuinely needed — "
        "don't reach for big words to sound clever. Mix analytical sentences with "
        "shorter direct ones. It's fine to say 'this suggests' instead of always "
        "hedging with 'it could potentially indicate'. Write like a confident researcher, "
        "not a thesaurus."
    ),
    "professional": (
        "Clear and confident, like a smart colleague's email. Use contractions sometimes. "
        "Get to the point. Don't pad with corporate filler. It's fine to start with "
        "'But' or 'And'. Avoid buzzwords — if you catch yourself typing 'synergy' or "
        "'action items', stop."
    ),
    "casual": (
        "Like texting a friend who's interested in the topic. Contractions everywhere. "
        "Short sentences mixed with longer rambling ones. Fragments are fine. "
        "Start with 'So' or 'Look' sometimes. "
        "This should sound like someone talking, not writing an essay."
    ),
    "business": (
        "Executive communication: lead with the point, support it briefly. "
        "Short paragraphs. Specific numbers over vague claims. Active voice: "
        "'we did X' beats 'X was accomplished'. Skip the corporate jargon. "
        "If a 5-word sentence works, don't use 15 words."
    ),
    "friendly": (
        "Warm and approachable, like explaining something over coffee. "
        "Use 'you' a lot. Rhetorical questions are good. Contractions are natural. "
        "Throw in 'honestly' or 'actually' occasionally. Sound like a person who "
        "genuinely wants to help, not a chatbot."
    ),
    "simple": (
        "Plain English for everyone. Short sentences. Common words. One idea per sentence. "
        "'Use' not 'utilize'. 'Help' not 'facilitate'. 'Start' not 'commence'. "
        "Break complex ideas into steps. It's fine to repeat key terms for clarity — "
        "that's what real humans do when explaining things simply."
    ),
    "native": (
        "Sound like an educated native English speaker in casual conversation. "
        "Natural idioms: 'figure out' not 'determine', 'come up with' not 'devise'. "
        "Contractions mandatory. Vary rhythm. Use parenthetical asides when natural. "
        "Start some sentences with 'And', 'But', 'So'. "
        "The output should pass as something a native speaker typed quickly."
    ),
    "formal": (
        "Polished but not robotic. Fewer contractions, but don't ban them entirely. "
        "Measured phrasing. No slang. But, critically, vary your sentences. "
        "Formal doesn't mean every sentence has to be long and complex. "
        "Mix in short declarative sentences. A formal letter can still have rhythm."
    ),
    "concise": (
        "Every word earns its place. Cut filler. Cut adverbs. Cut qualifiers. "
        "If 5 words work, don't use 10. But, and this matters, don't go so "
        "choppy that it sounds like a telegram. Natural brevity, not robotic brevity."
    ),
}

# ── Level-specific instructions ─────────────────────────────────────────────

_LEVEL_INSTRUCTIONS: dict[int, str] = {
    1: (
        "MINIMAL changes only:\n"
        "- Fix grammar/spelling errors\n"
        "- Replace the most obviously awkward phrases\n"
        "- Keep 90%+ of original wording\n"
        "- Preserve the author's voice completely"
    ),
    2: (
        "MODERATE rewrite:\n"
        "- Restructure clunky sentences\n"
        "- Kill repetition (same word 3+ times nearby)\n"
        "- Mix up sentence starters — never begin 3+ sentences the same way\n"
        "- Keep the general structure and key phrases"
    ),
    3: (
        "HEAVY rewrite — make it sound like a completely different person wrote it:\n"
        "- Rephrase almost everything\n"
        "- Reorganize for better flow\n"
        "- Replace generic language with specific alternatives\n"
        "- Vary paragraph lengths dramatically (1-sentence paragraph, then 4-sentence paragraph)\n"
        "- Mix very short punchy sentences (2-5 words) with longer flowing ones (15-25 words)\n"
        "- Make it sound like stream-of-thought human writing\n"
        "- But KEEP every fact, number, name, and specific claim"
    ),
}


# ── Retrieval-Augmented Style References (Few-Shot In-Context Learning) ──────

_STYLE_REFERENCES: dict[str, dict[str, str]] = {
    "academic": {
        "original": "Artificial intelligence technologies exhibit substantial potential for the optimization of diagnostic accuracy within clinical healthcare settings. However, issues regarding dataset bias and algorithmic opacity represent key challenges that necessitate comprehensive mitigation strategies prior to widespread implementation.",
        "rewritten": "AI has real promise for sharpening diagnosis in clinics. But we have to address data bias and opaque 'black box' algorithms before deploying these tools widely."
    },
    "professional": {
        "original": "It is critical that we leverage our core competencies to facilitate a seamless transition during the upcoming corporate restructuring. Please ensure all key stakeholders are fully aligned with the project milestones by the end of the business day.",
        "rewritten": "We need to use our main strengths to keep things smooth during the restructuring. Please check that everyone involved is aligned on the project timeline by the end of the day today."
    },
    "casual": {
        "original": "I am writing to express my dissatisfaction with the culinary experience at your establishment. The meat was prepared to an excessive degree, and the service staff demonstrated a notable lack of attentiveness.",
        "rewritten": "Honestly, the food was a letdown. The steak was way overcooked, and our server basically ignored us the entire night."
    },
    "business": {
        "original": "The implementation of the new customer relationship management platform will optimize our sales pipeline, leading to a projected revenue increase of fifteen percent over the next two fiscal quarters.",
        "rewritten": "Launching the new CRM will clear bottlenecks in our sales funnel. We expect this to boost revenue by 15% in the next six months."
    },
    "friendly": {
        "original": "Should you require assistance with the assembly of your new furniture, I would be pleased to offer my services at a time of your convenience.",
        "rewritten": "If you need any help putting together your new furniture, just let me know. I'd be happy to swing by whenever works for you!"
    },
    "simple": {
        "original": "The primary objective of the monetary policy adjustment is to mitigate the prevailing inflationary pressures within the domestic economy.",
        "rewritten": "The government is changing how it handles money. They want to stop prices from rising too fast."
    },
    "native": {
        "original": "We must determine a solution to resolve this issue immediately, as it is causing significant inconvenience to our customer base.",
        "rewritten": "We need to figure this out right away because it's really frustrating our customers."
    },
    "formal": {
        "original": "I am writing to formally request an extension for the submission of the research proposal, which is currently scheduled for the fifteenth of October.",
        "rewritten": "I am writing to request an extension for our research proposal deadline, which is currently set for October 15th."
    },
    "concise": {
        "original": "There are many different factors that can influence the decisions that consumers make when they are purchasing products online.",
        "rewritten": "Several factors shape how people buy products online."
    }
}


def build_rewrite_prompt(text: str, mode: str, level: int) -> tuple[str, str]:
    """Build system + user prompts for the rewrite stage."""
    mode_val = mode.value if hasattr(mode, 'value') else str(mode)
    level_val = level.value if hasattr(level, 'value') else int(level)

    mode_instruction = _MODE_INSTRUCTIONS.get(mode_val, _MODE_INSTRUCTIONS["native"])
    level_instruction = _LEVEL_INSTRUCTIONS.get(level_val, _LEVEL_INSTRUCTIONS[2])

    system_prompt = f"""{_BASE_SYSTEM}

VOICE & TONE:
{mode_instruction}

HOW MUCH TO CHANGE:
{level_instruction}"""

    # Retrieve and inject style reference example (Retrieval-Augmented Style)
    ref = _STYLE_REFERENCES.get(mode_val, _STYLE_REFERENCES["native"])
    
    word_cnt = len(text.split())
    if word_cnt < 10:
        min_cnt = max(3, word_cnt - 3)
        max_cnt = word_cnt + 6
    else:
        min_cnt = max(5, int(word_cnt * 0.95))
        max_cnt = int(word_cnt * 1.03)

    user_prompt = f"""STYLE REFERENCE EXAMPLE FOR '{mode_val.upper()}' STYLE:
Input: "{ref['original']}"
Rewritten (human style): "{ref['rewritten']}"

---

CRITICAL LENGTH REQUIREMENT:
The input text has exactly {word_cnt} words.
Your rewritten output MUST match {word_cnt} words as closely as possible (target exact range: {min_cnt} to {max_cnt} words).
Do NOT add extra filler or repetition. Do NOT summarize or drop details. Match the exact word count!

---

Now rewrite this input text using all rules:

"{text}" """

    return system_prompt, user_prompt


def build_verification_prompt(original: str, rewritten: str) -> tuple[str, str]:
    """Build prompts for meaning verification."""
    system_prompt = (
        "Compare an original text with its rewritten version.\n\n"
        "Check:\n"
        "- Were facts, names, numbers, or dates changed?\n"
        "- Was information removed?\n"
        "- Was information added?\n\n"
        "Reply EXACTLY:\n"
        "MEANING_PRESERVED: YES or NO\n"
        "REASON: brief explanation"
    )

    user_prompt = (
        f"ORIGINAL:\n{original}\n\n"
        f"REWRITTEN:\n{rewritten}"
    )

    return system_prompt, user_prompt


def build_grammar_prompt(text: str) -> tuple[str, str]:
    """Build prompts for grammar-only polish."""
    system_prompt = (
        "Fix ONLY genuine errors:\n"
        "- Misspellings\n"
        "- Wrong punctuation\n"
        "- Subject-verb agreement\n"
        "- Wrong word (their/there/they're)\n\n"
        "Do NOT change:\n"
        "- Contractions\n"
        "- Sentence fragments\n"
        "- Sentences starting with And, But, So\n"
        "- Informal phrasing\n"
        "- Short sentences or unusual structure\n\n"
        "Return ONLY the text. Minimal changes."
    )

    return system_prompt, text
