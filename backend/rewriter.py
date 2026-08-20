"""
Text Rewriter module supporting:
1. Groq LLM inference with automatic 5-request API key pool rotation.
2. OpenRouter API integration (DeepSeek / Qwen / custom models).
3. Gemini LLM fallback redundancy with key pool rotation.
4. Multi-turn conversational rewriting for cross-lingual linguistic distance pipelines.
"""

import threading
import logging
import random
from typing import Optional, List, Dict, Any
import httpx
from groq import Groq, APIError, APITimeoutError, RateLimitError, AuthenticationError

from config import (
    GROQ_API_KEY,
    GROQ_API_KEYS,
    GROQ_MODEL,
    GROQ_FALLBACK_MODEL,
    GEMINI_MODEL,
    GEMINI_API_KEYS,
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL,
    OPENROUTER_BASE_URL,
    MAX_RETRIES,
    API_TIMEOUT,
    RewriteMode,
    RewriteLevel,
)
from prompts import build_rewrite_prompt, build_grammar_prompt, is_question_text
from humanizer import extract_final_output

logger = logging.getLogger(__name__)


class RewriteError(Exception):
    """Raised when rewriting fails after all retries."""
    pass


# ── Global Request Counter & Lock for 5-Request Key Rotation ───────────────

_gemini_request_counter = 0
_groq_request_counter = 0
_counter_lock = threading.Lock()

# ── Reasoning / Thinking Models ──────────────────────────────────────────────
# These models output internal chain-of-thought by default. We suppress it via
# reasoning_format='hidden' so only the final answer reaches users.
_REASONING_MODELS: set[str] = {
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.6-27b",
}


def get_next_gemini_key() -> tuple[int, str]:
    """
    Increments global request counter and rotates Gemini API key every 5 requests.
    Returns (key_index_1_based, api_key_string).
    """
    global _gemini_request_counter
    if not GEMINI_API_KEYS:
        raise ValueError("No Gemini API keys configured.")

    with _counter_lock:
        _gemini_request_counter += 1
        current_count = _gemini_request_counter

    # Key index switches every 5 requests: (0..4 -> Key 0, 5..9 -> Key 1, etc.)
    key_idx = ((current_count - 1) // 5) % len(GEMINI_API_KEYS)
    selected_key = GEMINI_API_KEYS[key_idx]

    logger.info(
        "Request #%d │ Gemini Key Pool Rotation: Using Key #%d of %d (5-request rotation cycle)",
        current_count,
        key_idx + 1,
        len(GEMINI_API_KEYS)
    )
    return key_idx + 1, selected_key


def get_next_groq_key() -> tuple[int, str]:
    """
    Increments global request counter and rotates Groq API key every 5 requests.
    Returns (key_index_1_based, api_key_string).
    """
    global _groq_request_counter
    if not GROQ_API_KEYS:
        raise ValueError("No Groq API keys configured.")

    with _counter_lock:
        _groq_request_counter += 1
        current_count = _groq_request_counter

    key_idx = ((current_count - 1) // 5) % len(GROQ_API_KEYS)
    selected_key = GROQ_API_KEYS[key_idx]

    logger.info(
        "Request #%d │ Groq Key Pool Rotation: Using Key #%d of %d (5-request rotation cycle)",
        current_count,
        key_idx + 1,
        len(GROQ_API_KEYS)
    )
    return key_idx + 1, selected_key


class TextRewriter:
    """Sends text to Groq, OpenRouter, or Gemini API with key rotation and fallback redundancy."""

    def __init__(self):
        if GROQ_API_KEY:
            self.groq_client = Groq(api_key=GROQ_API_KEY)
        else:
            self.groq_client = None

        self.groq_model = GROQ_MODEL
        self.groq_fallback = GROQ_FALLBACK_MODEL
        self.openrouter_api_key = OPENROUTER_API_KEY
        self.openrouter_model = OPENROUTER_MODEL
        self.openrouter_base_url = OPENROUTER_BASE_URL.rstrip("/")

    def _call_openrouter(self, messages: list[dict], model: Optional[str] = None, temperature: float = 1.3) -> str:
        """
        Call OpenRouter OpenAI-compatible chat completions API.
        """
        if not self.openrouter_api_key:
            raise RewriteError("OpenRouter API key not configured.")

        url = f"{self.openrouter_base_url}/chat/completions"
        target_model = model or self.openrouter_model
        headers = {
            "Authorization": f"Bearer {self.openrouter_api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://cloakwriter.app",
            "X-Title": "CloakWriter Humanizer",
        }
        payload = {
            "model": target_model,
            "messages": messages,
            "temperature": temperature,
        }

        try:
            resp = httpx.post(url, headers=headers, json=payload, timeout=API_TIMEOUT)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            if content and content.strip():
                clean_c = extract_final_output(content)
                return clean_c if clean_c else content.strip()
            raise RewriteError("OpenRouter returned empty response.")
        except Exception as ex:
            raise RewriteError(f"OpenRouter API Error ({target_model}): {ex}")

    def _call_gemini_messages(self, messages: list[dict], temperature: float = 1.0) -> str:
        """
        Format multi-turn messages and call Gemini API with key pool rotation.
        """
        if not GEMINI_API_KEYS:
            raise RewriteError("Gemini API keys not configured.")

        # Flatten multi-turn messages into conversation text for Gemini
        combined_parts = []
        for msg in messages:
            role = msg.get("role", "user").upper()
            content = msg.get("content", "")
            combined_parts.append(f"[{role}]:\n{content}")
        full_prompt = "\n\n".join(combined_parts)

        key_num, api_key = get_next_gemini_key()
        temp = min(max(temperature, 0.2), 1.0)

        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=api_key)
            try:
                config = types.GenerateContentConfig(temperature=temp, top_p=0.95)
                response = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=full_prompt,
                    config=config,
                )
            except Exception:
                response = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=full_prompt,
                )
            content = response.text
            if content and content.strip():
                clean_c = extract_final_output(content)
                return clean_c if clean_c else content.strip()
            raise RewriteError("Gemini API returned an empty response.")
        except Exception as err:
            err_msg = str(err)
            logger.warning("Gemini Key #%d call error: %s", key_num, err_msg)
            raise RewriteError(f"Gemini API Error (Key #{key_num}): {err_msg}")

    def _call_gemini(self, system_prompt: str, user_prompt: str, key_override: Optional[str] = None) -> str:
        """
        Make a single call to Gemini API using key rotation (or override key).
        """
        if key_override:
            api_key = key_override
            key_num = 1
        else:
            key_num, api_key = get_next_gemini_key()

        full_prompt = f"{system_prompt}\n\nTask Instructions & User Text:\n{user_prompt}"
        temp = round(random.uniform(0.85, 0.95), 2)

        try:
            from google import genai
            from google.genai import types
            client = genai.Client(api_key=api_key)
            try:
                config = types.GenerateContentConfig(temperature=temp, top_p=0.95)
                response = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=full_prompt,
                    config=config,
                )
            except Exception:
                response = client.models.generate_content(
                    model=GEMINI_MODEL,
                    contents=full_prompt,
                )
            content = response.text
            if content and content.strip():
                clean_c = extract_final_output(content)
                return clean_c if clean_c else content.strip()
            raise RewriteError("Gemini API returned an empty response.")
        except Exception as err:
            err_msg = str(err)
            logger.warning("Gemini Key #%d call error: %s", key_num, err_msg)
            raise RewriteError(f"Gemini API Error (Key #{key_num}): {err_msg}")

    def _call_groq_messages(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        key_idx_override: Optional[int] = None,
        temperature: float = 1.3,
    ) -> str:
        """
        Make a multi-turn chat completion call to Groq API using key rotation.
        """
        if not GROQ_API_KEYS:
            raise RewriteError("Groq API keys not configured.")

        if key_idx_override is not None:
            key_num = (key_idx_override % len(GROQ_API_KEYS)) + 1
            api_key = GROQ_API_KEYS[key_idx_override % len(GROQ_API_KEYS)]
            logger.info("Groq Key Pool Rotation: Using Key #%d of %d", key_num, len(GROQ_API_KEYS))
        else:
            key_num, api_key = get_next_groq_key()

        groq_client = Groq(api_key=api_key, max_retries=0)
        target_model = model or self.groq_model

        # Estimate input prompt tokens (approx 1 token per 3.5 chars) to prevent HTTP 413 TPM limit exceeded (8,000 TPM limit on Groq free/on-demand tier)
        total_prompt_chars = sum(len(m.get("content", "")) for m in messages)
        est_input_tokens = int(total_prompt_chars / 3.5)
        # Leave a safe buffer: total requested (input + completion) <= 7200
        safe_completion_budget = max(400, 7200 - est_input_tokens)

        if target_model in _REASONING_MODELS:
            max_tok = min(safe_completion_budget, 4500)
        else:
            max_tok = min(safe_completion_budget, 3000)

        temp = min(max(temperature, 0.2), 1.5)

        # For reasoning/thinking models, instruct Groq to hide chain-of-thought so
        # only the final answer reaches the user (reasoning_format='hidden').
        extra_body: dict = {}
        if target_model in _REASONING_MODELS:
            extra_body["reasoning_format"] = "hidden"
            logger.debug("Groq reasoning model '%s': setting reasoning_format=hidden, max_tok=%d (est_input=%d)", target_model, max_tok, est_input_tokens)

        try:
            response = groq_client.chat.completions.create(
                model=target_model,
                messages=messages,
                temperature=temp,
                max_tokens=max_tok,
                top_p=0.95,
                timeout=API_TIMEOUT,
                extra_body=extra_body if extra_body else None,
            )
            content = response.choices[0].message.content
            if not content:
                raise RewriteError(f"Groq API (Key #{key_num}, model {target_model}) returned an empty response.")

            # Strip <think>...</think> tags (safety net for 'raw' format responses).
            content_clean = extract_final_output(content)
            if not content_clean:
                # Raw content exists but extract_final_output consumed it all (pure reasoning).
                # Fall back to raw stripped content rather than raising.
                logger.warning(
                    "Groq API (Key #%d, model %s): extract_final_output returned empty "
                    "(likely pure <think> output) — using raw content.",
                    key_num, target_model,
                )
                content_clean = content.strip()
            return content_clean

        except AuthenticationError:
            raise RewriteError(f"Invalid Groq API key #{key_num}.")
        except RateLimitError:
            raise RewriteError(f"Groq API Key #{key_num} rate limit reached for {target_model}.")
        except APITimeoutError:
            raise RewriteError(f"Groq API Key #{key_num} request timed out.")
        except Exception as ex:
            raise RewriteError(f"Groq API Error (Key #{key_num}, model {target_model}): {ex}")

    def _call_groq(self, system_prompt: str, user_prompt: str, model: Optional[str] = None, key_idx_override: Optional[int] = None) -> str:
        """
        Make a call to Groq API using key pool rotation across configured Groq keys.
        """
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        return self._call_groq_messages(messages, model=model, key_idx_override=key_idx_override, temperature=1.1)

    def _call_llm(self, system_prompt: str, user_prompt: str) -> str:
        """
        Main LLM dispatcher for single-turn system/user queries:
        1. Tries Groq API (Llama 3.3 70B -> Qwen fallback) across all Groq keys.
        2. Tries OpenRouter if configured.
        3. Fallback to Gemini API key pool rotation if all Groq/OpenRouter attempts fail.
        """
        # Step 1: Primary - Try Groq API with instant key rotation and model fallback
        if GROQ_API_KEYS:
            with _counter_lock:
                start_k_idx = (_groq_request_counter // 5) % len(GROQ_API_KEYS)

            # Ordered by preference: primary configured model, fallback model
            groq_models = []
            for m in [self.groq_model, self.groq_fallback]:
                if m and m not in groq_models:
                    groq_models.append(m)
            for offset in range(len(GROQ_API_KEYS)):
                current_k_idx = (start_k_idx + offset) % len(GROQ_API_KEYS)
                for g_model in groq_models:
                    try:
                        res = self._call_groq(system_prompt, user_prompt, model=g_model, key_idx_override=current_k_idx)
                        return res
                    except RewriteError as groq_err:
                        logger.warning("Groq Key #%d (%s) attempt failed: %s", current_k_idx + 1, g_model, groq_err)

        # Step 2: Try OpenRouter
        if self.openrouter_api_key:
            try:
                logger.info("Calling OpenRouter LLM inference (%s)", self.openrouter_model)
                res = self._call_openrouter([
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ], temperature=0.9)
                return res
            except Exception as or_err:
                logger.warning("OpenRouter attempt failed: %s", or_err)

        # Step 3: Fallback - Gemini API with instant rotation across distinct Gemini keys
        logger.info("Falling back to Gemini LLM inference (%s)", GEMINI_MODEL)
        if GEMINI_API_KEYS:
            with _counter_lock:
                start_g_idx = (_gemini_request_counter // 5) % len(GEMINI_API_KEYS)

            for offset in range(len(GEMINI_API_KEYS)):
                current_g_idx = (start_g_idx + offset) % len(GEMINI_API_KEYS)
                try:
                    res = self._call_gemini(system_prompt, user_prompt, key_override=GEMINI_API_KEYS[current_g_idx])
                    return res
                except RewriteError as gemini_err:
                    logger.warning("Gemini Key #%d attempt failed: %s", current_g_idx + 1, gemini_err)

        raise RewriteError("Rewriting failed after trying all Groq, OpenRouter, and Gemini key pools.")

    def _call_llm_conversation(self, messages: list[dict], temperature: float = 1.3) -> str:
        """
        Multi-turn LLM conversation dispatcher supporting Groq, OpenRouter, and Gemini.
        """
        # Step 1: OpenRouter (DeepSeek / Qwen at temperature 1.3 works exceptionally well for de-AI rewriting)
        if self.openrouter_api_key:
            try:
                return self._call_openrouter(messages, temperature=temperature)
            except Exception as or_err:
                logger.warning("OpenRouter conversational call failed: %s. Trying Groq.", or_err)

        # Step 2: Groq key rotation pool
        if GROQ_API_KEYS:
            with _counter_lock:
                start_k_idx = (_groq_request_counter // 5) % len(GROQ_API_KEYS)

            groq_models = [self.groq_model, self.groq_fallback]
            for offset in range(len(GROQ_API_KEYS)):
                current_k_idx = (start_k_idx + offset) % len(GROQ_API_KEYS)
                for g_model in groq_models:
                    try:
                        return self._call_groq_messages(
                            messages,
                            model=g_model,
                            key_idx_override=current_k_idx,
                            temperature=temperature,
                        )
                    except Exception as groq_err:
                        logger.warning("Groq conversational call failed (Key #%d, %s): %s", current_k_idx + 1, g_model, groq_err)

        # Step 3: Gemini fallback
        if GEMINI_API_KEYS:
            try:
                return self._call_gemini_messages(messages, temperature=min(temperature, 1.0))
            except Exception as gemini_err:
                logger.warning("Gemini conversational call failed: %s", gemini_err)

        raise RewriteError("Conversational rewriting failed across all providers.")

    def cross_lingual_rewrite(
        self,
        text: str,
        target_language: str,
        history: Optional[dict] = None,
        temperature: float = 1.3,
    ) -> str:
        """
        Cross-lingual de-AI rewriter from humanize-text methodology.
        Translates while breaking AI statistical fingerprints and carrying multi-turn history.
        """
        system_prompt = "你是一个专业的文案改写专家,精通多语言本地化。"
        user_prompt = f"翻译为{target_language}，去掉 AI 味道，拟人化改写，只输出结果：\n{text}"

        messages = [{"role": "system", "content": system_prompt}]

        if history and "input" in history and "output" in history:
            messages.append({
                "role": "user",
                "content": f"翻译为中文，去掉 AI 味道，拟人化改写，只输出结果：\n{history['input']}",
            })
            messages.append({
                "role": "assistant",
                "content": history["output"],
            })

        messages.append({"role": "user", "content": user_prompt})

        return self._call_llm_conversation(messages, temperature=temperature)

    def rewrite(self, text: str, mode: RewriteMode, level: RewriteLevel) -> str:
        """
        Rewrite the text using the specified mode and level.
        Applies a high-fidelity rewrite pass, and for Heavy (Level 3) an optional polish pass.
        """
        system_prompt, user_prompt = build_rewrite_prompt(text, mode, level)
        pass1_result = self._call_llm(system_prompt, user_prompt)

        # Question guardrail: Ensure conversational questions are rewritten as questions, never answered
        if is_question_text(text):
            cleaned_res = pass1_result.strip().strip('"\'')
            ans_indicators = ["i'm ", "i am ", "as an ai", "currently,", "currently i", "i work", "i help", "sure,", "certainly,", "i do ", "i don't ", "my name "]
            is_answering = (not cleaned_res.endswith('?')) or any(cleaned_res.lower().startswith(ind) for ind in ans_indicators)
            if is_answering:
                logger.warning("Detected conversational answer to question '%s': '%s'. Retrying with strict question paraphrase prompt.", text, pass1_result)
                correction_system = (
                    "You are a professional text paraphrasing tool. "
                    "The user text is a question. You must REWRITE/PARAPHRASE the question into natural human phrasing ending with a question mark ('?'). "
                    "You must NEVER answer, reply to, or converse with the question."
                )
                correction_user = (
                    f"Original Question: \"{text}\"\n\n"
                    f"Task: Paraphrase the question above into natural human phrasing. "
                    f"Output ONLY the rewritten question ending with '?'."
                )
                try:
                    corrected_res = self._call_llm(correction_system, correction_user)
                    if corrected_res and corrected_res.strip():
                        pass1_result = corrected_res.strip().strip('"\'')
                except Exception as corr_err:
                    logger.warning("Question paraphrase correction call failed: %s", corr_err)

        level_val = level.value if hasattr(level, 'value') else int(level)
        # For Heavy (Level 3), run a copyediting naturalization polish if text is substantial
        if level_val == 3 and len(text.split()) >= 35:
            logger.info("Running Pass 2 naturalization polish for Level 3 Heavy rewrite")
            pass2_system = (
                "You are a master human author and senior copyeditor.\n"
                "Review the draft rewrite and polish it into crisp, authentic, beautifully paced human writing.\n"
                "POLISHING RULES:\n"
                "1. SENTENCE SIMPLICITY & BURSTINESS: Maximum 20 words per sentence. Never write convoluted run-ons. Mix short punchy sentences (4-9 words) with medium statements (10-18 words).\n"
                "2. STRIP ALL AI TELLS: Remove copula avoidance ('serves as', 'stands as' -> 'is'), superficial -ing participle chains, and formulaic transitions ('Furthermore', 'Moreover', 'In conclusion', 'Notably', 'Importantly').\n"
                "3. ZERO GENERIC LANGUAGE: Ban empty nouns ('aspects', 'factors', 'elements', 'components', 'solutions', 'things') and weak verbs ('utilize', 'facilitate', 'implement'). Use concrete words.\n"
                "4. ZERO POLITE / NARRATOR BOILERPLATE: Strip 'she thanked', 'he thanked', 'expressed gratitude', 'took the time to', 'proceeded to', 'was able to'. State actions directly.\n"
                "5. ZERO EM DASHES & ZERO SEMICOLONS: Use standard commas, periods, or hyphens (-).\n"
                "6. 100% FACTUAL FIDELITY: Strictly preserve all real facts, names, dates, numbers, and domain concepts. Never invent new claims or inject unrelated topics.\n"
                "7. OUTPUT: Return ONLY the final polished text without preambles or notes."
            )
            pass2_user = f'Draft text to polish:\n"{pass1_result}"'
            try:
                pass2_result = self._call_llm(pass2_system, pass2_user)
                if pass2_result and len(pass2_result.split()) >= int(len(text.split()) * 0.7):
                    return extract_final_output(pass2_result)
            except Exception as ex:
                logger.warning("Pass 2 naturalization pass failed, using Pass 1 output: %s", ex)

        return extract_final_output(pass1_result)

    def grammar_polish(self, text: str) -> str:
        """
        Run a grammar-only polish pass on the text.
        """
        system_prompt, user_prompt = build_grammar_prompt(text)
        try:
            return self._call_llm(system_prompt, user_prompt)
        except RewriteError:
            logger.warning("Grammar polish failed, returning text as-is.")
            return text
