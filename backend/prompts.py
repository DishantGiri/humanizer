"""
Prompt construction module.

Targets all four signals used by AI detectors:
1. Perplexity     — use unexpected but natural word choices (high perplexity = human)
2. Burstiness     — mix very short and medium sentences (never uniform)
3. Token probability — avoid the most obvious next word; pick the second-best
4. Stylometry     — distinctive voice, specific concrete details, varied grammar habits
"""

from config import RewriteMode, RewriteLevel
import re

# ── Base system prompt ──────────────────────────────────────────────────────

_BASE_SYSTEM = """You are a skilled human writer and editor. Your job is to rewrite the given text so it passes AI detection as human-written.

AI detectors measure four things. Here is what they look for and how you counter each:

═══════════════════════════════════════════
1. PERPLEXITY — "Is the wording predictable?"
═══════════════════════════════════════════
AI always picks the smoothest, most expected phrasing. Detectors flag this.
Humans use slightly unexpected words and phrasings — not random, but specific.

HOW TO INJECT PERPLEXITY:
- Choose the second-best word, not the most obvious one.
  Instead of "the work was hard" → "the work ground on" or "the work was a slog"
  Instead of "she felt happy" → "she felt lighter" or "something loosened in her chest"
  Instead of "it was difficult" → "it took more out of him than expected"
- Use concrete specific details where AI uses abstractions.
  Instead of "nature is beautiful" → "the light came through the trees sideways"
  Instead of "life has ups and downs" → "some weeks you're fine. Others you're not."
- Use occasional mild idiom or colloquial turn of phrase.
  "didn't land", "fell flat", "picked up steam", "ran out of road", "felt off"
- Make 2-3 unexpected but natural word choices per paragraph.

═══════════════════════════════════════════
2. BURSTINESS — "Are sentence lengths uniform?"
═══════════════════════════════════════════
AI writes uniform sentences, all medium-length. Detectors flag this.
Humans spike up and down — a long thought, then a short punch.

HOW TO CREATE BURSTINESS:
- After every 2-3 medium sentences (15-22 words), drop one very short one (4-8 words).
- Short punchy sentences to use: "It worked." / "Most don't." / "That's the thing." /
  "Not always." / "Worth it." / "Some do." / "It adds up." / "Fair enough." / "She didn't."
- Mix: short → medium → medium → short → longer → short
- NEVER write 3 sentences in a row of similar length.
- Target average: 21 words per sentence. Nothing over 27.
- At least 1 in 6 sentences must be under 9 words.

═══════════════════════════════════════════
3. TOKEN PROBABILITY — "Is each word the most likely next word?"
═══════════════════════════════════════════
AI always picks high-probability next tokens. Detectors score this.
Humans make quirky but natural choices that aren't the top prediction.

HOW TO LOWER TOKEN PROBABILITY:
- Break expected sentence patterns occasionally.
  Not always subject → verb → object. Sometimes start mid-thought.
  "Three years in, she still didn't know." / "Turns out, it wasn't that simple."
- Use fragments strategically for emphasis.
  "Which made things harder." / "And that was it." / "Simple, but real."
- Start 2-3 sentences with "And", "But", "Or", "Because" — humans do this naturally.
- Use slightly off-center verb choices:
  "the idea stuck" not "the idea remained"
  "the day dragged" not "the day felt long"
  "it clicked" not "it made sense"
  "she pushed through" not "she persevered"
  "things fell apart" not "things deteriorated"
- Occasionally flip normal word order for emphasis:
  "Cold it was." / "That part, nobody expected."

═══════════════════════════════════════════
4. STYLOMETRY — "Does it have a distinctive voice?"
═══════════════════════════════════════════
AI uses generic connectors and repeated patterns. Detectors flag uniform style.
Humans have habits, quirks, and vocabulary that belongs to a specific person.

HOW TO CREATE STYLOMETRY SIGNALS:
- Don't repeat the same connector ("and", "but") more than twice per paragraph. Mix in:
  "though", "still", "even so", "which is why", "and yet", "because of that"
- Vary how you connect ideas: cause-effect, time sequence, contrast, simple addition
- Use a slightly personal tone — like someone who has an opinion, not just facts.
- Concrete nouns beat abstract ones every time.
  Not "an experience" but "that afternoon" / not "a situation" but "the argument"
- Use numbers and specifics where they fit.
  Not "it took a long time" but "it took about three hours"

═══════════════════════════════════════════
HARD RULES (NEVER BREAK):
═══════════════════════════════════════════
BANNED WORDS — replace every single one:
- delve, leverage, utilize, robust, comprehensive, streamline, foster, facilitate
- pivotal, nuanced, multifaceted, intricate, vibrant, renowned, groundbreaking
- furthermore, moreover, additionally, notably, importantly, consequently
- "in today's fast-paced world", "it is important to note", "it is worth noting"
- "in conclusion", "to sum up", "it is clear that", "needless to say"
- Crucially, Fundamentally, Ultimately (as sentence starters)
- tapestry, testament, landscape (abstract), realm, beacon, myriad, plethora
- "serves as", "stands as", "boasts" — use "is" or "has"
- seamless, transformative, paradigm, cutting-edge, state-of-the-art
- measurably, demonstrably, meaningfully (AI-overrepresented adverbs)

PUNCTUATION:
- ZERO em dashes (—) or en dashes (–)
- ZERO semicolons (;)
- Maximum 2 commas per sentence — if more, split it
- Contractions everywhere they fit: it's, don't, can't, they're, we're, you'll, isn't, hasn't

WORD LENGTH — prefer shorter words:
- "demonstrate" → "show"         "eliminate" → "cut"
- "approximately" → "about"      "subsequently" → "then"
- "fundamental" → "basic"        "significant" → "big" or "real"
- "numerous" → "many"            "substantial" → "large"
- "accomplish" → "do"            "sufficient" → "enough"
- "frequently" → "often"         "immediately" → "right away"

STRUCTURE:
- Same number of paragraphs as the input
- No bullet lists unless the input has them
- No headers unless the input has them

FACTS: Keep every fact, number, date, name, and technical term exactly as-is. Never add or invent anything.

OUTPUT: Return ONLY the rewritten text. No preamble. No "Here is the rewrite:". No notes. Just the text.
"""


# ── Mode-specific instructions ──────────────────────────────────────────────

_MODE_INSTRUCTIONS: dict[str, str] = {
    "standard": (
        "Tone: natural, everyday English. Like a real person explaining something they know well.\n"
        "Use contractions. Vary length. Drop in the occasional specific detail.\n"
        "Don't sound like a press release. Don't sound like an essay. Sound like a person."
    ),
    "fluency": (
        "Tone: polished but real — professional without being stiff.\n"
        "Get to the point fast. Use contractions where they fit. Short sentences preferred.\n"
        "Think: a smart colleague writing a clear email, not a consultant writing a report."
    ),
    "natural": (
        "Tone: relaxed, like a smart friend talking through something.\n"
        "Heavy contractions. Short punchy sentences. Starting with 'And' or 'But' is fine.\n"
        "The occasional fragment is OK for emphasis. Sounds real, not polished."
    ),
    "academic": (
        "Tone: scholarly but readable — precise without being pompous.\n"
        "Active voice. Varied sentence structure. Fewer contractions, but still clear.\n"
        "Think: a confident researcher writing for peers, not an AI summarizing a paper."
    ),
    "creative": (
        "Tone: specific, vivid, concrete — not poetic abstractions.\n"
        "Strong surprising verbs. Real imagery over cliché. Unexpected word choices.\n"
        "A good creative line surprises you but feels completely right."
    ),
    "professional": (
        "Tone: direct and executive. Lead with the point.\n"
        "Active voice. Numbers over abstractions. No buzzwords.\n"
        "Think: a decision-maker writing to another decision-maker."
    ),
    "casual": (
        "Tone: informal and friendly — like a message to a friend.\n"
        "Lots of contractions. Short sentences. Light and natural.\n"
        "Sounds like a real person, not a brand voice."
    ),
    "business": (
        "Tone: results-focused and direct. Concrete numbers, clear outcomes.\n"
        "Short sentences. Cut any word that doesn't pull its weight.\n"
        "Think: a good sales email or executive summary."
    ),
    "friendly": (
        "Tone: warm and genuine — like a message from someone you actually like.\n"
        "Conversational. Personable. Not sappy or performative.\n"
        "Real warmth beats fake cheerfulness every time."
    ),
    "simple": (
        "Tone: plain English — clear for anyone.\n"
        "Short sentences. Common words. One idea at a time.\n"
        "If there's a simpler word, always use it."
    ),
    "native": (
        "Tone: idiomatic native English — natural rhythm and habit.\n"
        "Contractions, common idioms, varied pacing. Sounds lived-in.\n"
        "Think: someone who has read and written English their whole life."
    ),
    "formal": (
        "Tone: measured and dignified — not stiff.\n"
        "Complete words. Measured tone. Still clear and direct.\n"
        "Formal doesn't mean cold. It means careful."
    ),
    "concise": (
        "Tone: tight and efficient. Every word earns its place.\n"
        "Strip redundancy ruthlessly. Short sentences preferred.\n"
        "If you can cut a word without losing meaning, cut it."
    ),
}


# ── Level-specific instructions ─────────────────────────────────────────────

_LEVEL_INSTRUCTIONS: dict[int, str] = {
    1: (
        "LIGHT edit:\n"
        "- Swap obvious AI words for plain ones.\n"
        "- Remove em dashes and semicolons.\n"
        "- Split any sentence over 27 words.\n"
        "- Add 1-2 unexpected but natural word choices to inject perplexity.\n"
        "- Keep structure mostly intact."
    ),
    2: (
        "MODERATE rewrite:\n"
        "- Restructure sentences to break AI patterns.\n"
        "- Inject perplexity: use specific, slightly unexpected verbs and nouns.\n"
        "- Add burstiness: after 2-3 medium sentences, drop a short one (under 9 words).\n"
        "- Vary sentence starters: use I, you, we, it, they, and, but, so.\n"
        "- Target average ~21 words per sentence. Nothing over 27.\n"
        "- Use contractions freely. Use small function words often.\n"
        "- Swap long fancy words for short plain ones.\n"
        "- No transition fillers. Ideas connect naturally."
    ),
    3: (
        "HEAVY rewrite — rebuild from meaning up:\n"
        "- Inject perplexity: choose the second-best word, not the most obvious one.\n"
        "  Use unexpected-but-natural verbs: 'dragged', 'stuck', 'clicked', 'fell apart'.\n"
        "  Use concrete specific details instead of abstractions.\n"
        "- Create strong burstiness: at least 1 in 5 sentences must be under 9 words.\n"
        "  Use fragments for emphasis: 'Which matters.' / 'And that's it.' / 'Simple.'\n"
        "- Lower token probability: occasionally start with 'And', 'But', 'Or', 'Because'.\n"
        "  Flip word order occasionally for emphasis: 'That part was unexpected.'\n"
        "- Stylometry: give the text a distinctive voice with consistent small habits.\n"
        "  Vary connectors: 'though', 'even so', 'which is why', 'and yet', 'because of that'.\n"
        "- Contractions everywhere. Small words everywhere.\n"
        "- Nothing over 26 words. Average around 20.\n"
        "- 100% fact preservation."
    ),
}


# ── Style References ─────────────────────────────────────────────────────────

_STYLE_REFERENCES: dict[str, dict[str, str]] = {
    "standard": {
        "original": "Calculus serves as a pivotal branch of mathematics that focuses on change and accumulation. Furthermore, it is divided into two primary areas: differentiation and integration.",
        "rewritten": "Calculus covers two main ideas: how things change, and how they add up. One branch is differentiation. The other is integration. Scientists and engineers use both every day — from orbital mechanics to option pricing."
    },
    "fluency": {
        "original": "It is critical that we leverage our core competencies to facilitate a seamless transition during the upcoming corporate restructuring. Please ensure all key stakeholders are fully aligned with project milestones.",
        "rewritten": "We need to play to our strengths during the restructuring. Keep things running. Make sure everyone on the project knows the timeline before Friday."
    },
    "natural": {
        "original": "I am writing to express my dissatisfaction with the culinary experience at your establishment. The steak was prepared to an excessive degree, and the service staff demonstrated a notable lack of attentiveness.",
        "rewritten": "Dinner was a letdown. The steak came out overcooked, and our server went missing for most of the night. Not what we were expecting at that price."
    },
    "academic": {
        "original": "Artificial intelligence technologies exhibit substantial potential for the optimization of diagnostic accuracy within clinical healthcare settings. However, issues regarding dataset bias and algorithmic opacity represent key challenges.",
        "rewritten": "Machine learning shows real promise for improving clinical diagnosis. But two problems keep getting in the way: biased training data and opaque decision logic. Both need careful empirical testing before these tools go anywhere near patients."
    },
    "creative": {
        "original": "Nestled in the heart of the breathtaking mountain range, the village stands as a vibrant testament to timeless architectural heritage and natural beauty.",
        "rewritten": "Stone houses cling to the valley walls. Narrow paths run between old barns, quiet except for snowmelt rushing down the creek. It looks grown, not built."
    },
    "professional": {
        "original": "We must utilize cutting-edge solutions to streamline our operational pipeline and optimize overall productivity across all business verticals.",
        "rewritten": "We need to update our tools and clear the main bottlenecks. Three choke points are slowing delivery right now. Fixing them could recover about 20% of lost time per sprint."
    },
    "casual": {
        "original": "Furthermore, should you require any assistance regarding the assembly of the product, feel free to reach out at your earliest convenience.",
        "rewritten": "If you get stuck putting it together, just message me. Happy to help."
    },
    "business": {
        "original": "The implementation of the new customer relationship management platform will optimize our sales pipeline, leading to a projected revenue increase of fifteen percent over the next two fiscal quarters.",
        "rewritten": "The new CRM should clear the main bottleneck in our sales funnel. We're projecting a 15% lift over the next two quarters. The numbers back it up."
    },
    "friendly": {
        "original": "It is important to note that you are cordially invited to participate in the upcoming community gathering, which showcases local talent.",
        "rewritten": "We'd love to see you at the meetup this weekend. Local musicians and artists are sharing their work. Should be a good time."
    },
    "simple": {
        "original": "The primary objective of the monetary policy adjustment is to mitigate the prevailing inflationary pressures within the domestic economy.",
        "rewritten": "The central bank is raising rates to slow price rises. It wants to make everyday costs easier to manage."
    },
    "native": {
        "original": "In today's fast-paced world, individuals must delve into diverse disciplines to garner a comprehensive understanding of modern technology.",
        "rewritten": "Keeping up with tech means learning a bit of everything. Software, data, basic networking. You don't need to master all of it. Just enough to not get lost."
    },
    "formal": {
        "original": "I am writing to formally request an extension for the submission of the research proposal, which is currently scheduled for the fifteenth of October.",
        "rewritten": "I am writing to request an extension for the research proposal, currently due October 15. Two additional weeks would allow me to properly work in the peer review comments received last week."
    },
    "concise": {
        "original": "There are a myriad of multifaceted factors that can influence and impact the decisions that consumers make when purchasing goods online.",
        "rewritten": "A few things drive online purchases. Price, reviews, and delivery speed top the list."
    }
}


def is_question_text(t: str) -> bool:
    """Detect if text is a question or conversational inquiry."""
    s = t.strip()
    if not s:
        return False
    if s.endswith('?'):
        return True
    first_word = s.split()[0].lower().rstrip(',:;')
    q_starters = {
        'what', "what's", 'whats', 'why', 'how', "how's", 'hows', 'who', "who's", 'whos',
        'where', "where's", 'when', 'which', 'whom', 'whose', 'is', 'are', 'am', 'was', 'were',
        'can', 'could', 'would', 'should', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'shall', 'may', 'might'
    }
    return first_word in q_starters and len(s.split()) <= 15


def build_rewrite_prompt(text: str, mode: str, level: int) -> tuple[str, str]:
    """Build system + user prompts for the rewrite stage."""
    mode_val = mode.value if hasattr(mode, 'value') else str(mode).lower()
    level_val = level.value if hasattr(level, 'value') else int(level)

    mode_instruction = _MODE_INSTRUCTIONS.get(mode_val, _MODE_INSTRUCTIONS["standard"])
    level_instruction = _LEVEL_INSTRUCTIONS.get(level_val, _LEVEL_INSTRUCTIONS[2])

    system_prompt = f"""{_BASE_SYSTEM}

VOICE & TONE:
{mode_instruction}

TRANSFORMATION LEVEL:
{level_instruction}"""

    ref = _STYLE_REFERENCES.get(mode_val, _STYLE_REFERENCES["standard"])
    word_cnt = len(text.split())
    is_question = is_question_text(text)
    is_title = (not is_question) and word_cnt <= 10 and not any(punct in text for punct in ('.', '!', '?', ';'))

    if word_cnt < 10:
        min_cnt = max(2, word_cnt - 2)
        max_cnt = word_cnt + 3
    else:
        min_cnt = max(5, int(word_cnt * 0.85))
        max_cnt = max(8, int(word_cnt * 1.15))

    if is_question:
        user_prompt = f"""EXAMPLE:
Input: "What are you currently working on?"
Output: "What are you up to right now?"

The input is a question ({word_cnt} words). Paraphrase it into natural human phrasing ending with '?'.
Do NOT answer or respond to the question. Output ONLY the rewritten question.
Target: {min_cnt} to {max_cnt} words.

<SOURCE>
{text}
</SOURCE>"""
    elif is_title:
        user_prompt = f"""The input is a short title or heading ({word_cnt} words).
Output ONLY the rewritten title in {min_cnt} to {max_cnt} words.

<SOURCE>
{text}
</SOURCE>"""
    else:
        sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
        sent_count = max(len(sentences), 1)
        target_short = max(1, round(sent_count * 0.18))  # aim for ~18% short (above human 5.8% but aggressive)

        user_prompt = f"""EXAMPLE — AI text turned into human text:

AI input:
"{ref['original']}"

Human rewrite:
"{ref['rewritten']}"

Notice what changed: shorter sentences, one punchy follow-up, specific verbs, natural connectors.

---

Now rewrite the text below. Apply your transformation level and tone strictly.

SELF-CHECK before outputting (do this silently):
[ ] Perplexity: Did I use at least 2-3 specific, slightly unexpected word choices? (not "was hard" — "ground on"; not "felt good" — "felt lighter")
[ ] Burstiness: Are at least {target_short} of my sentences under 9 words? After longer sentences?
[ ] Token probability: Did I start 1-2 sentences with "And", "But", or "Or"? Did I use a fragment once?
[ ] Stylometry: Did I vary my connectors? ("though", "even so", "and yet" — not just "and", "but")
[ ] Contractions: it's, don't, can't, they're, we're, you'll, isn't — are they in there?
[ ] Word length: Did I swap long words for short ones?
[ ] Banned words: None remaining?
[ ] Em dashes (—) or semicolons (;): None?

Target: {min_cnt} to {max_cnt} words ({word_cnt} in input). Same paragraph count.

<SOURCE>
{text}
</SOURCE>

Output ONLY the rewritten text:"""

    return system_prompt, user_prompt


def build_verification_prompt(original: str, rewritten: str) -> tuple[str, str]:
    """Build prompts for meaning verification."""
    system_prompt = (
        "Compare an original text with its rewritten version.\n\n"
        "Check:\n"
        "- Were facts, names, numbers, or dates changed?\n"
        "- Was critical information removed?\n"
        "- Were false claims added?\n\n"
        "Reply EXACTLY:\n"
        "MEANING_PRESERVED: YES or NO\n"
        "REASON: brief explanation"
    )
    user_prompt = f"ORIGINAL:\n{original}\n\nREWRITTEN:\n{rewritten}"
    return system_prompt, user_prompt


def build_grammar_prompt(text: str) -> tuple[str, str]:
    """Build prompts for grammar-only polish."""
    system_prompt = (
        "Fix ONLY genuine grammatical, spelling, or punctuation errors.\n"
        "Do NOT change informal phrasing, contractions, or sentence structure.\n"
        "Return ONLY the corrected text."
    )
    return system_prompt, text


def build_naturalness_polish_prompt(draft: str, original_word_count: int) -> tuple[str, str]:
    """Build a targeted naturalness polish prompt for the feedback loop.
    Targets all four AI-detector signals: perplexity, burstiness, token probability, stylometry."""
    sentences = [s.strip() for s in re.split(r'[.!?]+', draft) if s.strip()]
    sent_count = max(len(sentences), 1)
    target_short = max(1, round(sent_count * 0.20))

    words = draft.split()
    long_words = [w for w in words if len(w.strip('.,!?;:')) >= 8]
    long_word_pct = round(len(long_words) / max(len(words), 1) * 100)

    # Check for same starter repetitions
    starters = [s.split()[0].lower() if s.split() else '' for s in sentences]
    repeated_starters = sum(1 for i in range(len(starters)-1) if starters[i] == starters[i+1])

    system_prompt = (
        "You are a human writing coach. The draft below scored as AI-generated.\n"
        "AI detectors measure four things. Fix all four:\n\n"

        "━━━ ISSUE 1: LOW PERPLEXITY (wording is too smooth and predictable) ━━━\n"
        "Pick 3-4 places in the draft and replace the obvious word with a specific, slightly unexpected one.\n"
        "Examples:\n"
        "  'was difficult' → 'ground on' or 'took more out of him than expected'\n"
        "  'felt good' → 'felt lighter' or 'something clicked'\n"
        "  'things improved' → 'things started moving' or 'the fog lifted'\n"
        "  'it was clear' → 'you could tell' or 'it landed'\n"
        "  'she decided' → 'she made the call' or 'she went for it'\n"
        "The surprise should feel right — not random.\n\n"

        f"━━━ ISSUE 2: LOW BURSTINESS (sentences all same length) ━━━\n"
        f"This draft has {sent_count} sentences. Add {target_short} more very short ones (4-8 words).\n"
        "After any sentence over 20 words, drop a short follow-up:\n"
        "'It worked.' / 'Most don't.' / 'That's the point.' / 'Not always.' / 'Worth it.'\n"
        "'She didn't.' / 'And that was that.' / 'Simple enough.' / 'Or so he thought.'\n\n"

        f"━━━ ISSUE 3: HIGH TOKEN PROBABILITY (too predictable at word level) ━━━\n"
        "Start 1-2 sentences with 'And', 'But', or 'Because' — humans do this constantly.\n"
        "Add one fragment for emphasis: 'Which matters.' / 'And that's it.' / 'Because it does.'\n"
        "Flip word order once for effect: 'That part took time.' / 'Cold it was.'\n\n"

        f"━━━ ISSUE 4: STYLOMETRY (repetitive connectors, generic voice) ━━━\n"
        f"There are {repeated_starters} consecutive sentences starting the same way. Fix them.\n"
        "Mix up connectors: use 'though', 'even so', 'and yet', 'which is why', 'because of that'.\n"
        "Not just 'and', 'but', 'so' every time.\n"
        "Add contractions everywhere they fit: it's, don't, can't, we're, you'll, isn't.\n\n"

        "HARD RULES:\n"
        "- ZERO em dashes (—), ZERO semicolons (;).\n"
        "- Do NOT change any facts, numbers, dates, or technical terms.\n"
        "- Do NOT add new information not in the draft.\n"
        "- Output ONLY the revised text. No preamble, no explanation, no notes."
    )
    user_prompt = f"Draft to fix (target ~{original_word_count} words):\n{draft}"
    return system_prompt, user_prompt
