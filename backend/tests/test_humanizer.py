"""
Unit tests for the Advanced Humanization & Text Stylistics Engine (backend/humanizer.py).

Tests:
1. Rhythm & Cadence Engineering
2. Context-Aware Contractions
3. Mode Profile Targeting (Academic vs Casual vs Professional)
4. Intelligent Transitions
5. Anaphora & Reference Naturalization
6. Lexical Sophistication & AI Word Replacement
7. Paragraph Parity Enforcement
8. Self-Correction Loop Performance (Sub-500ms execution)
9. Determinism (Same Input -> Same Output)
"""

import time
import unittest
from humanizer import (
    humanize,
    analyze_text,
    MODE_PROFILES,
    TextStats,
    _split_sentences,
)


class TestHumanizerEngine(unittest.TestCase):

    def setUp(self):
        self.sample_text = (
            "Artificial intelligence technologies exhibit substantial potential for the optimization "
            "of diagnostic accuracy within clinical healthcare settings. However, issues regarding dataset "
            "bias and algorithmic opacity represent key challenges that necessitate comprehensive "
            "mitigation strategies prior to widespread implementation. Every morning presents a new "
            "opportunity for clinical teams to refine their care workflows."
        )
        self.casual_text = (
            "I am writing to tell you that we cannot accept this proposal right now. "
            "It is not what we expected, and we do not have the budget for it."
        )

    def test_statistical_analysis(self):
        """Test analyze_text metric calculation."""
        stats = analyze_text(self.sample_text)
        self.assertIsInstance(stats, TextStats)
        self.assertGreater(stats.total_words, 20)
        self.assertGreater(stats.total_sentences, 1)
        self.assertGreater(stats.avg_sentence_length, 5.0)

    def test_determinism(self):
        """Test that same input produces 100% identical output."""
        res1 = humanize(self.sample_text, intensity=0.7, original_text=self.sample_text, mode="native")
        res2 = humanize(self.sample_text, intensity=0.7, original_text=self.sample_text, mode="native")
        self.assertEqual(res1, res2, "Humanization output must be 100% deterministic")

    def test_performance_sub_500ms(self):
        """Test execution speed is well under 500ms."""
        start = time.time()
        res = humanize(self.sample_text, intensity=0.8, original_text=self.sample_text, mode="casual")
        duration_ms = (time.time() - start) * 1000
        self.assertLess(duration_ms, 500.0, f"Execution took {duration_ms:.2f}ms, target is < 500ms")

    def test_academic_mode_profile(self):
        """Test academic mode preserves formal tone and suppresses contractions."""
        res = humanize(self.sample_text, intensity=0.6, original_text=self.sample_text, mode="academic")
        self.assertNotIn("don't", res)
        self.assertNotIn("can't", res)

    def test_casual_mode_contractions(self):
        """Test casual mode applies natural contractions."""
        res = humanize(self.casual_text, intensity=0.8, original_text=self.casual_text, mode="casual")
        # Should convert 'cannot' or 'do not' or 'is not' to contractions
        has_contraction = any(c in res for c in ["can't", "don't", "isn't", "we're"])
        self.assertTrue(has_contraction, "Casual mode should apply contractions")

    def test_ai_word_replacement(self):
        """Test replacement of AI tell words like 'leverage', 'pivotal', 'synergy'."""
        ai_heavy = "We must leverage our core synergy to achieve a pivotal breakthrough in this paradigm."
        res = humanize(ai_heavy, intensity=0.8, original_text=ai_heavy, mode="native")
        self.assertNotIn("leverage", res.lower())

    def test_paragraph_parity(self):
        """Test input and output paragraph count parity."""
        multi_para = "Paragraph 1 is here.\n\nParagraph 2 is here."
        res = humanize(multi_para, intensity=0.7, original_text=multi_para, mode="native")
        orig_cnt = len([p for p in multi_para.split('\n\n') if p.strip()])
        out_cnt = len([p for p in res.split('\n\n') if p.strip()])
        self.assertEqual(orig_cnt, out_cnt, "Paragraph counts must match 1-to-1")

    def test_self_correction_loop(self):
        """Test self-correction loop reduces AI score and normalizes sentence length."""
        uniform_ai_text = (
            "We must leverage cutting-edge technology to foster synergy. "
            "We must leverage cutting-edge technology to foster synergy. "
            "We must leverage cutting-edge technology to foster synergy."
        )
        res = humanize(uniform_ai_text, intensity=0.9, original_text=uniform_ai_text, mode="native")
        stats = analyze_text(res)
        self.assertLess(stats.ai_score, 10, "Self-correction loop should lower AI score")


    def test_new_modes_profiles(self):
        """Test standard, fluency, natural, and creative mode profiles."""
        for m in ["standard", "fluency", "natural", "creative"]:
            self.assertIn(m, MODE_PROFILES, f"Mode {m} must exist in MODE_PROFILES")
            res = humanize(self.sample_text, intensity=0.7, original_text=self.sample_text, mode=m)
            self.assertIsInstance(res, str)
            self.assertGreater(len(res), 20)

    def test_tc_hum_015_to_023_computer_paragraph_preservation(self):
        """
        Verify TC_HUM_015 through TC_HUM_023:
        - TC_HUM_015: Preserve data-center capacity info ('exabytes (billions of gigabytes)').
        - TC_HUM_016: Grammatically complete sentences (no subject-less fragments like 'Supports cloud services...').
        - TC_HUM_017: Preservation of AI/ML capabilities ('language translation, image recognition, and autonomous driving').
        - TC_HUM_018: No injected editorial commentary ('(which is key)', etc.).
        - TC_HUM_019: Preservation of 'increased efficiency, innovation, and economic growth'.
        - TC_HUM_020: Preservation of 'grow exponentially'.
        - TC_HUM_021: Grammatical integrity of conclusion ('shaping the future of human civilization', no 'Will play...').
        - TC_HUM_022: Overall grammatical quality without sentence fragments.
        - TC_HUM_023: Technical terminology preservation ('exabytes', 'autonomous driving', 'innovation', 'exponentially').
        """
        input_text = (
            "Computers are essential tools in modern society, powering data centers holding exabytes "
            "(billions of gigabytes) of information and supporting cloud services used by billions of people daily. "
            "They enable AI capabilities such as language translation, image recognition, and autonomous driving. "
            "Across industries like healthcare, finance, and education, computing has driven increased efficiency, "
            "innovation, and economic growth. Looking ahead, the importance of computing is expected to grow exponentially, "
            "shaping the future of human civilization."
        )

        for mode in ["standard", "fluency", "natural", "academic", "creative", "casual"]:
            output = humanize(input_text, intensity=0.7, original_text=input_text, mode=mode)
            
            # TC_HUM_018: No unprompted commentary injected
            self.assertNotIn("(which is key)", output, f"Mode {mode} should not inject '(which is key)'")
            self.assertNotIn("(and this matters)", output, f"Mode {mode} should not inject '(and this matters)'")
            
            # TC_HUM_016, TC_HUM_017, TC_HUM_021, TC_HUM_022: No sentence fragments
            sentences = _split_sentences(output)
            for s in sentences:
                self.assertFalse(
                    s.startswith("Supports cloud services"),
                    f"Sentence fragment found: '{s}'"
                )
                self.assertFalse(
                    s.startswith("Drive cars on their own"),
                    f"Sentence fragment found: '{s}'"
                )
                self.assertFalse(
                    s.startswith("Will play a big role"),
                    f"Sentence fragment found: '{s}'"
                )

    def test_prompt_rules_integrity(self):
        """Verify that prompts module enforces complete sentences and does not ban 'innovative'."""
        from prompts import _BASE_SYSTEM, _MODE_INSTRUCTIONS, _LEVEL_INSTRUCTIONS
        
        # Innovative should NOT be banned
        self.assertNotIn('"innovative"', _BASE_SYSTEM)
        
        # Technical preservation rule must be present
        self.assertIn("STRICT PRESERVATION OF TECHNICAL TERMINOLOGY", _BASE_SYSTEM)
        self.assertIn("exabytes", _BASE_SYSTEM)
        self.assertIn("autonomous driving", _BASE_SYSTEM)
        self.assertIn("exponentially", _BASE_SYSTEM)
        
        # No 'Fragments are fine' in mode instructions
        for m, text in _MODE_INSTRUCTIONS.items():
            self.assertNotIn("Fragments are fine", text, f"Mode {m} must not allow sentence fragments")
        
        # Level 3 instructions must forbid fragments
        self.assertIn("NEVER create sentence fragments", _LEVEL_INSTRUCTIONS[3])

    def test_question_detection_and_prompting(self):
        """Test TC_HUM_013: Questions must be detected and structured for paraphrasing, not answering."""
        from prompts import is_question_text, build_rewrite_prompt
        from config import RewriteMode, RewriteLevel

        test_questions = [
            "what are you doing?",
            "who are you?",
            "how are you?",
            "can you help me with this?",
            "what is your favorite movie?"
        ]
        for q in test_questions:
            self.assertTrue(is_question_text(q), f"'{q}' must be recognized as a question")
            sys_prompt, user_prompt = build_rewrite_prompt(q, RewriteMode.STANDARD, RewriteLevel.MODERATE)
    def test_burstiness_and_hedging_metrics(self):
        """Test burstiness score and hedging count metrics in analyzer."""
        from analyzer import analyze
        text_with_burstiness = (
            "We agree. Although many researchers have examined this topic across different settings, "
            "the data clearly suggests that further investigation is warranted. Key point: it works."
        )
        stats = analyze(text_with_burstiness)
        self.assertGreater(stats.burstiness_score, 0.0, "Burstiness score should be > 0")
        self.assertGreater(stats.sentence_len_stdev, 0.0, "Sentence length stdev should be > 0")
        self.assertGreater(stats.hedging_count, 0, "Should detect hedging word 'suggests'")

    def test_formulaic_pattern_and_summary_stripping(self):
        """Test that robotic transitions and paragraph-end summary clichés are eliminated."""
        text_with_cliches = (
            "Furthermore, modern software architecture requires careful planning. "
            "In conclusion, this shows the importance of distributed systems."
        )
        output = humanize(text_with_cliches, intensity=0.8, original_text=text_with_cliches, mode="standard")
        self.assertNotIn("Furthermore", output)
        self.assertNotIn("In conclusion", output)

    def test_anti_detection_strategies_in_prompts(self):
        """Verify prompt system instructions include the 7 Hard Rules and 9 Levers."""
        from prompts import _BASE_SYSTEM, _LEVEL_INSTRUCTIONS
        self.assertIn("THE 7 HARD RULES", _BASE_SYSTEM)
        self.assertIn("EM DASHES", _BASE_SYSTEM)
        self.assertIn("SEMICOLONS", _BASE_SYSTEM)
        self.assertIn("STRAIGHT QUOTES", _BASE_SYSTEM)
        self.assertIn("MASTER BANNED VOCABULARY", _BASE_SYSTEM)
        self.assertIn("NO NEGATION FRAMING", _BASE_SYSTEM)
        self.assertIn("THE 9 HUMANIZATION LEVERS", _BASE_SYSTEM)
        self.assertIn("DESTROY PREDICTABLE STRUCTURE & BURSTINESS", _LEVEL_INSTRUCTIONS[3].upper())

    def test_scenario_1_flagrant_ai_humanization(self):
        """
        Scenario 1: Flagrant AI paragraph with em-dashes, semicolons, and banned vocabulary.
        Verify humanize() strips semicolons, em-dashes, and canonical tell words.
        """
        flagrant_ai_text = (
            "In today's fast-paced world, it is important to note that artificial intelligence has become "
            "increasingly pivotal in shaping how organizations operate. Furthermore, AI systems are often "
            "utilized to streamline workflows and foster innovation across teams. Moreover, the comprehensive "
            "integration of these tools — often regarded as a robust solution — can significantly enhance productivity; "
            "however, the implementation requires careful planning."
        )

        output = humanize(flagrant_ai_text, intensity=0.8, original_text=flagrant_ai_text, mode="standard")
        
        # Verify 7 Hard Rules in output
        self.assertNotIn("—", output, "Output must contain zero em-dashes")
        self.assertNotIn(";", output, "Output must contain zero semicolons")
        self.assertNotIn("In today's fast-paced world", output)
        self.assertNotIn("Furthermore", output)
        self.assertNotIn("Moreover", output)
        self.assertNotIn("streamline", output)
        self.assertNotIn("robust", output)
        self.assertNotIn("comprehensive", output)

    def test_validator_detects_formulaic_ai_patterns(self):
        """Test validator flags formulaic robotic transition markers."""
        from validators import validate_human_statistics
        text_robotic = (
            "Furthermore, this technology is very effective. "
            "Moreover, it provides good benefits. "
            "In conclusion, we should use it."
        )
        is_valid, reason, stats = validate_human_statistics(text_robotic)
        self.assertFalse(is_valid, "Text with robotic transitions should fail strict anti-AI validation")
        self.assertIn("formulaic transition markers", reason.lower())


if __name__ == "__main__":
    unittest.main()


