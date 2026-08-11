"""
Unit tests for the Forensic AI-Check Engine (Signals A-I, 0-27 score, and regression scenarios).
Based on test scenarios from research literature and SCENARIOS.md.
"""

import unittest
from ai_checker import AICheckEngine, AICheckReport


class TestAICheckEngine(unittest.TestCase):
    """Test suite for AI forensic detection and signal analysis."""

    def test_flagrant_ai_prose_scenario_2(self):
        """
        Scenario 2: ai-check on flagrant AI prose.
        Expects:
        - Verdict: AI
        - Confidence: High
        - Overall score: >= 14/27
        - Signal F (transitions) scores >= 2
        - Signal A (perplexity / banned vocab) scores >= 2
        """
        flagrant_ai_text = (
            "In today's fast-paced world, it is important to note that artificial intelligence has become "
            "increasingly pivotal in shaping how organizations operate. Furthermore, AI systems are often "
            "utilized to streamline workflows and foster innovation across teams. Moreover, the comprehensive "
            "integration of these tools — often regarded as a robust solution — can significantly enhance productivity. "
            "It is clear that companies leveraging AI capabilities tend to outperform their peers; however, the "
            "implementation requires careful planning. The standard approach: identify use cases, evaluate vendors, "
            "and pilot incrementally."
        )

        report = AICheckEngine.analyze(flagrant_ai_text)
        
        self.assertEqual(report.verdict, "AI", f"Expected 'AI' verdict, got '{report.verdict}'")
        self.assertIn(report.confidence, ("Medium", "High"), f"Expected high/medium confidence, got '{report.confidence}'")
        self.assertGreaterEqual(report.overall_score, 14, f"Score should be >= 14/27, got {report.overall_score}")
        
        # Verify Signal A (Perplexity / Banned vocab)
        sig_a = report.signals.get("perplexity")
        self.assertIsNotNone(sig_a)
        self.assertGreaterEqual(sig_a.score, 2, f"Signal A score should be >= 2, got {sig_a.score}")

        # Verify Signal F (Transitions)
        sig_f = report.signals.get("transitions")
        self.assertIsNotNone(sig_f)
        self.assertGreaterEqual(sig_f.score, 2, f"Signal F score should be >= 2, got {sig_f.score}")

        # Verify Signal G (Punctuation) detected em-dash and semicolon
        sig_g = report.signals.get("punctuation")
        self.assertIsNotNone(sig_g)
        self.assertGreaterEqual(sig_g.score, 2, f"Signal G score should be >= 2, got {sig_g.score}")

        # Verify what_gave_it_away and recommended_fixes are populated
        self.assertTrue(len(report.what_gave_it_away) > 0)
        self.assertTrue(len(report.recommended_fixes) > 0)

    def test_real_slack_false_positive_scenario_3(self):
        """
        Scenario 3: ai-check on real Slack message (false-positive calibration).
        Expects:
        - Verdict: Human
        - Overall score: <= 6/27
        - AI-EDITED FRACTION: Pure human
        """
        slack_text = (
            "ok so the migration is mostly done. ~80% of rows backfilled, the rest are stuck behind "
            "a weird FK constraint i didn't know existed. fwiw the constraint was added in 2022 by "
            "someone who left, no comments. gonna dig into it tmrw morning.\n\n"
            "oh also - the staging cluster keeps OOMing during the backfill. bumped the memory limit twice "
            "already. lmk if anyone has a better idea than just throwing ram at it"
        )

        report = AICheckEngine.analyze(slack_text)

        self.assertEqual(report.verdict, "Human", f"Expected 'Human' verdict for informal Slack, got '{report.verdict}'")
        self.assertLessEqual(report.overall_score, 6, f"Overall score for real human text should be low, got {report.overall_score}")
        self.assertEqual(report.ai_edited_fraction, "Pure human")

    def test_empty_or_whitespace_input(self):
        """Test safe handling of empty or blank text."""
        report = AICheckEngine.analyze("   ")
        self.assertEqual(report.verdict, "Human")
        self.assertEqual(report.overall_score, 0)
        self.assertEqual(report.ai_edited_fraction, "Pure human")


if __name__ == "__main__":
    unittest.main()
