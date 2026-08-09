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


if __name__ == "__main__":
    unittest.main()
