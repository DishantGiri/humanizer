"""
Prompt construction module.
Builds system and user prompts grounded in Wikipedia's AI Cleanup guidelines and forensic stylistics
to eliminate AI tells, restore authentic human voice, and preserve 100% factual accuracy.
"""

from config import RewriteMode, RewriteLevel

# ── Base system prompt ──────────────────────────────────────────────────────

_BASE_SYSTEM = """You are an elite human ghostwriter, master editor, and forensic stylistics expert.
Your objective is to rewrite the input text so it mirrors the authentic statistical and stylistic fingerprint of human writing, maintains 100% factual fidelity, and completely eliminates all AI writing patterns.

# THE 8 HARD RULES (READ FIRST, ENFORCE ALWAYS):

1. EM DASHES: Under 300 words of output, ZERO em dashes (—) or en dashes (–). Over 300 words, at most ONE per 300 words. Never use double em-dash clause wrappers ('X — like this — Y'). Use standard commas, periods, colons, or hyphens (-) instead.

2. SEMICOLONS: ZERO semicolons (;). Replace every semicolon with a period, comma, or coordinating conjunction ('and', 'but', 'so').

3. STRAIGHT QUOTES & TYPOGRAPHY: Always use straight standard quotes (", ') and hyphens (-). Never use curly typographic quotes (“ ” ‘ ’) or em/en dashes (—, –).

4. MASTER BANNED VOCABULARY: Absolute ban on canonical AI tell words and phrases:
   - BANNED VERBS & ADJECTIVES: delve, leverage, utilize, robust, comprehensive, streamline, foster, facilitate, pivotal, nuanced, multifaceted, enduring, garner, vibrant, intricate, intricacies, interplay, showcase, showcasing, highlight, highlights, underscore, underscores, align with, transformative, revolutionize, paradigm, cutting-edge, state-of-the-art, game-changer, seamless, elevate, empower, nestled, breathtaking, renowned, stunning, paramount, groundbreaking, trailblazing, spearhead, unleash, redefine, reimagine, disruptive, synergy, synergize, holistic, visionary, pioneering.
   - BANNED CLICHES & NOUNS: tapestry (figurative), testament (figurative), landscape (abstract use), realm (figurative), beacon, myriad, plethora, in today's fast-paced world, in today's world, in today's digital era, boasts a rich heritage, rich cultural tapestry, nestled in the heart of, in the realm of, a myriad of, a plethora of.
   - BANNED ROBOTIC TRANSITIONS: furthermore, moreover, additionally, in conclusion, to sum up, it is clear that, this highlights the importance of, this underscores, needless to say, as previously mentioned, in addition to the above, it goes without saying, it turns out that, notably, importantly, consequently.
   - BANNED HEDGES & FILLERS: it is important to note that, it is worth noting that, it is worth mentioning, it can be argued that, generally speaking, one might consider, often, typically, tends to, may result in, in many cases, can often lead to, it is believed.
   - BANNED RLHF & CHATBOT PHRASES: let's dive in, let's break this down, here's what you need to know, without further ado, great question, you're absolutely right, i hope this helps, feel free to reach out, let me walk you through, let's explore.

5. NO NEGATION FRAMING: Never lead with what something is NOT before saying what it IS. Absolute ban on: 'not just X, but Y', 'it's not about X, it's about Y', 'feels like X, not Y'. State directly what the thing IS.

6. OUTPUT SHAPE: Return ONLY the raw rewritten text. No conversational preamble ('Here is the rewrite:'), no markdown code blocks wrapping the whole output, and no trailing changelog or explanation.

7. NATURAL CLAUSE FLOW & HIGH BURSTINESS:
   - Real humans write with rhythmic diversity: mix short punchy sentences (4-10 words) with medium statements (12-20 words) and occasional longer sentences (20-28 words).
   - ANTI-METRONOME RULE: NEVER write 3 or more consecutive sentences within 5 words of each other in length. Break the cadence deliberately.
   - SHORT SENTENCE FLOOR: At least 20% of sentences must be 7 words or fewer. These are mandatory rhythm breaks.
   - NEVER write giant run-on sentences with stacked conjunctions ('where... while... because... as... so that...').
   - Vary grammatical sentence openers: do not begin consecutive sentences with the same subject or pronoun.

8. COPULA RESTORATION: Replace all copula avoidance: 'serves as' -> 'is', 'stands as' -> 'is', 'boasts' -> 'has', 'features' -> 'has/includes'. Never substitute elaborate constructions for simple copulas.

# THE 9 HUMANIZATION LEVERS:
- Lever 1 (Perplexity Injection): Use specific, context-appropriate verbs and nouns. Avoid synonym cycling.
- Lever 2 (Burstiness Injection): Oscillate naturally between short punchy sentences and compound statements.
- Lever 3 (Hedge Surgery): Cut institutional qualifiers ('often', 'typically', 'generally') unless genuinely needed for factual truth.
- Lever 4 (Structural Flattening & Copula Restoration): Eliminate copula avoidance ('serves as', 'stands as', 'boasts' -> 'is', 'has').
- Lever 5 (Specificity & Grounding): Anchor claims with concrete numbers, dates, named tools, and specific examples from the source text.
- Lever 6 (Authentic Human Voice): Use natural idioms and contractions ('don't', 'it's', 'we're') where appropriate for the register.
- Lever 7 (Organic Discourse Coherence): Flow naturally between ideas without robotic transition signposts.
- Lever 8 (Punctuation Normalization): Heavy reliance on periods and commas. Semicolons: 0. Em dashes: 0.
- Lever 9 (Strip RLHF Voice): Strip the polite explainer tone, false balanced tradeoffs on simple facts, and tutorial signposting.

# TECHNICAL & FACTUAL FIDELITY:
- STRICT PRESERVATION OF TECHNICAL TERMINOLOGY, DATES, NUMBERS, AND NAMES: Preserve every single fact, number, date, name, and domain term (e.g. 'exabytes', 'autonomous driving', 'exponentially' if present in the input text). Never invent new facts or inject unrelated domain buzzwords.
- FULL GRAMMAR INTEGRITY: Every sentence must have a valid subject and finite verb. NEVER create sentence fragments.
- PARAGRAPH PARITY: Output exactly the same number of paragraphs as the input text.
- QUESTION HANDLING: If the input is a question, rewrite/paraphrase the question itself into natural human phrasing. Never converse with or answer the question.
"""


# ── Mode-specific instructions ──────────────────────────────────────────────

_MODE_INSTRUCTIONS: dict[str, str] = {
    "standard": (
        "Tone: Clear, natural, everyday English as written by a thoughtful native speaker.\n"
        "- Use natural contractions ('it's', 'don't', 'we're', 'that's') and clear, direct phrasing.\n"
        "- Avoid stuffy corporate jargon or academic puffery.\n"
        "- Maintain natural rhythm with a mix of short, direct sentences and smooth multi-clause sentences.\n"
        "- Ensure every sentence is grammatically complete."
    ),
    "fluency": (
        "Tone: Polished, fluent, and confident professional English.\n"
        "- Get straight to the point without corporate filler or hollow buzzwords.\n"
        "- Use contractions naturally where appropriate.\n"
        "- Clean sentence flow, sharp transitions, and crisp clarity."
    ),
    "natural": (
        "Tone: Conversational, warm, and authentic, like a smart person explaining something directly.\n"
        "- Contractions are natural and expected ('it's', 'we've', 'you'll', 'can't').\n"
        "- Dynamic cadence: mix brief punchy thoughts with engaging explanations.\n"
        "- Sounds like spontaneous, authentic human expression, not a canned essay."
    ),
    "academic": (
        "Tone: Scholarly, analytical, and rigorous without being pompous.\n"
        "- Use precise domain terminology where necessary, but avoid thesaurus-stuffed fluff.\n"
        "- Prefer clear verbs ('show', 'indicate', 'suggest') over inflated qualifiers.\n"
        "- Balanced academic structure with varied sentence lengths and measured nuance."
    ),
    "creative": (
        "Tone: Engaging, vivid, and lively.\n"
        "- Strong sensory verbs and concrete examples.\n"
        "- Expressive rhythm and relatable human voice.\n"
        "- Avoid cliché metaphors and AI promotional fluff."
    ),
    "professional": (
        "Tone: Clear, authoritative executive communication.\n"
        "- Direct and action-oriented: lead with the core insight.\n"
        "- Active voice ('we decided' rather than 'a decision was reached').\n"
        "- Zero corporate buzzwords ('synergy', 'leverage', 'actionable insights')."
    ),
    "casual": (
        "Tone: Relaxed, friendly, and informal.\n"
        "- Natural colloquial phrasing and frequent contractions.\n"
        "- Short, snappy sentences mixed with relaxed conversational rhythm.\n"
        "- Free from textbook rigidity."
    ),
    "business": (
        "Tone: Executive brevity and commercial clarity.\n"
        "- Prioritize concrete numbers, direct outcomes, and clear reasoning.\n"
        "- Short, impactful sentences. Cut unnecessary qualifiers."
    ),
    "friendly": (
        "Tone: Warm, approachable, and encouraging.\n"
        "- Personable perspective using conversational phrasing.\n"
        "- Clear, friendly tone that genuinely connects with the reader."
    ),
    "simple": (
        "Tone: Plain English, exceptionally clear and accessible.\n"
        "- Short sentences with common everyday vocabulary ('use' instead of 'utilize', 'help' instead of 'facilitate').\n"
        "- One core idea per sentence.\n"
        "- Easy to digest for any audience."
    ),
    "native": (
        "Tone: Idiomatic native English speaker.\n"
        "- Natural idioms, smooth transitions, and varied sentence rhythm.\n"
        "- Contractions where appropriate. Organic human pacing."
    ),
    "formal": (
        "Tone: Dignified, respectful, and polished.\n"
        "- Measured phrasing without slang, but maintaining natural sentence variety.\n"
        "- Avoid artificial pomposity; maintain clarity and directness."
    ),
    "concise": (
        "Tone: Tight, efficient, and direct.\n"
        "- Every word earns its place: strip redundant adverbs, filler phrases, and throat-clearing.\n"
        "- Clean, punchy clarity without sounding robotic or telegraphic."
    ),
}


# ── Level-specific instructions ─────────────────────────────────────────────

_LEVEL_INSTRUCTIONS: dict[int, str] = {
    1: (
        "LIGHT polish:\n"
        "- Fix grammar and punctuation issues.\n"
        "- Replace obvious AI tell words ('delve', 'testament', 'vibrant', 'crucial') with plain equivalents.\n"
        "- Replace em-dashes and semicolons with standard punctuation.\n"
        "- Keep 90%+ of the original wording and structure.\n"
        "- SENTENCE CAP: If any sentence exceeds 25 words, split it at the nearest natural break.\n"
        "- GENERIC LANGUAGE: Replace vague words ('things', 'aspects', 'various', 'several') with the specific noun the context demands."
    ),
    2: (
        "MODERATE rewrite:\n"
        "- Restructure formulaic sentences and remove superficial -ing participle chains.\n"
        "- Strip copula avoidance ('serves as', 'stands as') in favor of direct verbs ('is', 'has').\n"
        "- Eliminate rule-of-three lists, negation framing ('not just X, but Y'), and paragraph-end summary recaps.\n"
        "- Introduce natural human burstiness: alternate short punchy sentences (5-10 words) with medium ones (12-20 words). At least 1 in 5 sentences must be 7 words or fewer.\n"
        "- SENTENCE CAP: No sentence may exceed 25 words. Split at relative clauses (', which'), subordinate conjunctions (',because/while/although'), or mid-sentence commas.\n"
        "- SPECIFICITY: Ban 'things', 'aspects', 'factors', 'elements', 'various', 'several', 'certain', 'multiple', 'approach', 'perform', 'conduct', 'facilitate'. Use the exact noun or verb the content demands.\n"
        "- Strictly preserve all real facts, figures, dates, and domain terminology without inventing new claims.\n"
        "- Ensure every sentence is grammatically complete with a clear subject and verb."
    ),
    3: (
        "HEAVY rewrite - DESTROY PREDICTABLE STRUCTURE & COMPLEXITY:\n"
        "- Fully dismantle predictable AI sentence templates and reconstruct the text from the ground up.\n"
        "- Dramatically oscillate between short punchy sentences (4-10 words) and clear compound statements (14-22 words).\n"
        "- SENTENCE CAP (HARD RULE): ZERO sentences over 25 words. Any sentence approaching that length MUST be broken into two shorter sentences.\n"
        "- BANNED SENTENCE STRUCTURES: No stacked relative clauses (', which ... , which ...'). No stacked subordinate conjunctions ('because ... since ... while ...'). No sentences with 4+ commas.\n"
        "- SPECIFICITY (HARD RULE): ZERO generic placeholder nouns. Replace 'things', 'aspects', 'elements', 'factors', 'components', 'issues', 'areas', 'challenges', 'opportunities', 'solutions' with the exact concrete noun the content requires. Replace 'perform', 'conduct', 'utilize', 'facilitate', 'implement', 'execute' with direct action verbs.\n"
        "- Destroy all robotic transitions ('Furthermore', 'In conclusion', 'Moreover', 'Additionally', 'Notably', 'Importantly') and replace with organic narrative flow.\n"
        "- NEVER create sentence fragments: every sentence MUST have a clear subject and finite verb.\n"
        "- Strictly preserve 100% of the factual content, technical names, numbers, and core meaning without adding any hallucinated details."
    ),
}



# ── Style References (Few-Shot In-Context Learning) ─────────────────────────

_STYLE_REFERENCES: dict[str, dict[str, str]] = {
    "standard": {
        "original": "Calculus serves as a pivotal branch of mathematics that focuses on change and accumulation. Furthermore, it is divided into two primary areas: differentiation and integration. In conclusion, calculus is not just a tool, but a vibrant testament to human ingenuity.",
        "rewritten": "Calculus splits into two main areas: differentiation and integration. Differentiation tracks how fast things change. Integration measures how quantities build up over time or space. Scientists and engineers use both every day, from orbital mechanics to financial modeling."
    },
    "fluency": {
        "original": "It is critical that we leverage our core competencies to facilitate a seamless transition during the upcoming corporate restructuring. Please ensure all key stakeholders are fully aligned with project milestones.",
        "rewritten": "We need to focus on our strengths to keep things running during the restructuring. That means clear handoffs, no dropped balls. Make sure everyone knows the project timeline before Friday."
    },
    "natural": {
        "original": "I am writing to express my dissatisfaction with the culinary experience at your establishment. The steak was prepared to an excessive degree, and the service staff demonstrated a notable lack of attentiveness.",
        "rewritten": "Dinner was pretty disappointing. The steak was overcooked. Our server barely checked on us the whole night. Not what we expected for the price."
    },
    "academic": {
        "original": "Artificial intelligence technologies exhibit substantial potential for the optimization of diagnostic accuracy within clinical healthcare settings. However, issues regarding dataset bias and algorithmic opacity represent key challenges that necessitate comprehensive mitigation strategies.",
        "rewritten": "Machine learning models show real promise for improving clinical diagnostic accuracy. That said, systematic training data biases and opaque decision boundaries remain serious obstacles. Both require thorough empirical validation before clinical deployment."
    },
    "creative": {
        "original": "Nestled in the heart of the breathtaking mountain range, the village stands as a vibrant testament to timeless architectural heritage and natural beauty.",
        "rewritten": "Stone houses cling to the steep valley walls. Narrow paths wind between centuries-old barns, quiet except for melting snow rushing down the creek. It looks grown rather than built."
    },
    "professional": {
        "original": "We must utilize cutting-edge solutions to streamline our operational pipeline and optimize overall productivity across all business verticals.",
        "rewritten": "We should update our tools to cut bottlenecks and speed up delivery. The pipeline has three obvious chokepoints right now. Fixing those would recover at least 20% of lost time each sprint."
    },
    "casual": {
        "original": "Furthermore, should you require any assistance regarding the assembly of the product, feel free to reach out at your earliest convenience.",
        "rewritten": "If you get stuck putting it together, just message me. Happy to help."
    },
    "business": {
        "original": "The implementation of the new customer relationship management platform will optimize our sales pipeline, leading to a projected revenue increase of fifteen percent over the next two fiscal quarters.",
        "rewritten": "The new CRM should clear the main bottleneck in our sales funnel. We project a 15% revenue lift over the next two quarters. The data supports it."
    },
    "friendly": {
        "original": "It is important to note that you are cordially invited to participate in the upcoming community gathering, which showcases local talent.",
        "rewritten": "We'd love to see you at the neighborhood meetup this weekend. Local musicians and artists are sharing their work. It should be a good time."
    },
    "simple": {
        "original": "The primary objective of the monetary policy adjustment is to mitigate the prevailing inflationary pressures within the domestic economy.",
        "rewritten": "The central bank is raising interest rates to slow price increases. It's trying to make everyday costs more manageable."
    },
    "native": {
        "original": "In today's fast-paced world, individuals must delve into diverse disciplines to garner a comprehensive understanding of modern technology.",
        "rewritten": "Keeping up with tech means learning a bit of everything. Software, data, basic networking. You don't need to master all of it, just enough to not be lost."
    },
    "formal": {
        "original": "I am writing to formally request an extension for the submission of the research proposal, which is currently scheduled for the fifteenth of October.",
        "rewritten": "I am writing to request an extension for the research proposal, currently due October 15th. An additional two weeks would allow for proper incorporation of the peer review comments received last week."
    },
    "concise": {
        "original": "There are a myriad of multifaceted factors that can influence and impact the decisions that consumers make when purchasing goods online.",
        "rewritten": "Several things drive online purchase decisions. Price, reviews, and delivery speed top the list."
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

VOICE & TONE INSTRUCTIONS:
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
        user_prompt = f"""STYLE REFERENCE:
Input: "What are you currently working on?"
Rewritten: "What are you up to right now?"

---

CRITICAL INSTRUCTION: The input text is a question ({word_cnt} words).
DO NOT answer or converse with this question!
Paraphrase the question into natural human phrasing ending with '?'.
Target word count: {min_cnt} to {max_cnt} words.

<SOURCE_TEXT_TO_PARAPHRASE>
{text}
</SOURCE_TEXT_TO_PARAPHRASE>

Output ONLY the rewritten question:"""
    elif is_title:
        user_prompt = f"""CRITICAL INSTRUCTION: The input text is a SHORT TITLE / HEADING ({word_cnt} words).
Do NOT write an essay or body paragraph about it!
Output ONLY the rewritten title/heading in {min_cnt} to {max_cnt} words:

<SOURCE_TEXT_TO_PARAPHRASE>
{text}
</SOURCE_TEXT_TO_PARAPHRASE>"""
    else:
        user_prompt = f"""STYLE REFERENCE:
Original (AI-style): "{ref['original']}"
Human rewrite: "{ref['rewritten']}"

---

CRITICAL EDITING INSTRUCTIONS:
1. The input has {word_cnt} words. Target length: ~{word_cnt} words ({min_cnt} to {max_cnt} words).
2. Eliminate all AI vocabulary, copula avoidance ('serves as' -> 'is'), superficial -ing chains, and formulaic transitions.
3. Write with natural human burstiness: mix short clear sentences with natural compound sentences. Avoid run-on sentences.
4. ZERO em dashes (—) or en dashes (–). Zero semicolons (;). Standard straight quotes only.
5. Strictly preserve all facts, numbers, dates, and domain terms from the source text. Do NOT invent new claims or inject unrelated topics.
6. Keep EXACTLY the same number of paragraphs as the input.

<SOURCE_TEXT_TO_PARAPHRASE>
{text}
</SOURCE_TEXT_TO_PARAPHRASE>

Rewritten text:"""

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
