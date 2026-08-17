"""
Unit and Integration Tests for the Standard Humanize Pipeline and Cross-Engine Modules.
"""

import os
import sys
import unittest
from unittest.mock import patch, MagicMock

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from config import RewriteMode, RewriteLevel
from translator import (
    _split_text,
    google_translate,
    niutrans_translate,
    TranslationBouncer,
    get_bouncer,
)
from humanizer import (
    humanize,
    disrupt_sentence_rhythm,
    AI_REPLACEMENTS,
    AI_VOCAB_WEIGHTS,
)
from rewriter import TextRewriter
from humanize_pipeline import StandardHumanizePipeline, get_standard_pipeline


class TestTranslatorModule(unittest.TestCase):
    """Test chunking, Google Translate, Niutrans API fallback, and cross-engine chain."""

    def test_split_text_short(self):
        text = "This is a short sentence. Here is another one."
        chunks = _split_text(text, max_len=100)
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0], text)

    def test_split_text_long(self):
        sentences = [f"Sentence number {i} with some extra descriptive words." for i in range(20)]
        long_text = " ".join(sentences)
        chunks = _split_text(long_text, max_len=100)
        self.assertTrue(len(chunks) > 1)
        for chunk in chunks:
            self.assertTrue(len(chunk) <= 120)

    @patch("translator.GoogleTranslator")
    def test_google_translate_mocked(self, mock_gt_class):
        mock_instance = MagicMock()
        mock_instance.translate.return_value = "Hei maailma"
        mock_gt_class.return_value = mock_instance

        res = google_translate("Hello world", source="en", target="fi")
        self.assertEqual(res, "Hei maailma")

    @patch("translator.google_translate")
    def test_niutrans_fallback_without_key(self, mock_gt):
        mock_gt.return_value = "Fallback translated text"
        res = niutrans_translate("Some text", source="fi", target="en", api_key="")
        self.assertEqual(res, "Fallback translated text")
        mock_gt.assert_called_once_with("Some text", source="fi", target="en")

    @patch("translator.google_translate")
    @patch("translator.niutrans_translate")
    def test_cross_engine_chain(self, mock_nt, mock_gt):
        mock_gt.return_value = "Finnish text"
        mock_nt.return_value = "English reconstructed text"

        bouncer = TranslationBouncer()
        hop1, hop2 = bouncer.cross_engine_chain("Japanese text", intermediate_lang="fi", target_lang="en")
        self.assertEqual(hop1, "Finnish text")
        self.assertEqual(hop2, "English reconstructed text")


class TestHumanizerStylistics(unittest.TestCase):
    """Test vocabulary replacements and sentence rhythm disruption."""

    def test_ai_vocab_expansion(self):
        self.assertIn("meticulous", AI_VOCAB_WEIGHTS)
        self.assertIn("encompasses", AI_VOCAB_WEIGHTS)
        self.assertIn("subsequently", AI_VOCAB_WEIGHTS)
        self.assertIn("demonstrate", AI_VOCAB_WEIGHTS)
        self.assertIn("ecosystem", AI_VOCAB_WEIGHTS)

        self.assertIn("meticulous", AI_REPLACEMENTS)
        self.assertIn("encompasses", AI_REPLACEMENTS)

    def test_disrupt_sentence_rhythm(self):
        choppy_text = "It is cold. We go out. He sees snow. Then it begins to rain outside."
        disrupted = disrupt_sentence_rhythm(choppy_text, short_threshold=6)
        self.assertIsInstance(disrupted, str)
        self.assertTrue(len(disrupted) > 0)


class TestStandardHumanizePipeline(unittest.TestCase):
    """Test full pipeline integration with mocked LLM and translators."""

    def setUp(self):
        self.mock_rewriter = MagicMock(spec=TextRewriter)
        self.mock_bouncer = MagicMock(spec=TranslationBouncer)
        self.pipeline = StandardHumanizePipeline(
            rewriter=self.mock_rewriter,
            bouncer=self.mock_bouncer,
            intermediate_lang="fi",
        )

    @patch("humanize_pipeline.google_translate")
    @patch("humanize_pipeline.niutrans_translate")
    def test_run_standard_chain_end_to_end(self, mock_nt, mock_gt):
        self.mock_rewriter.cross_lingual_rewrite.side_effect = [
            "这是中文改写文本，消除了AI味道。",  # Step 1
            "これは日本語の書き換えテキストです。",      # Step 2
        ]
        mock_gt.return_value = "Tämä on suomenkielinen teksti."  # Step 3
        mock_nt.return_value = "This is the final humanized English reconstruction without AI tells."  # Step 4

        input_sample = "Artificial intelligence leverages advanced models to facilitate comprehensive solutions."
        result_dict = self.pipeline.run_standard_chain(
            text=input_sample,
            target_lang="en",
            mode=RewriteMode.STANDARD,
            level=RewriteLevel.MODERATE,
            apply_detection_feedback=False,
        )

        self.assertIn("result", result_dict)
        self.assertIn("steps", result_dict)
        self.assertEqual(len(result_dict["steps"]), 5)
        self.assertTrue(result_dict["processing_time_ms"] >= 0)
        # Check that Step 1 and Step 2 were recorded
        self.assertEqual(result_dict["steps"][0]["step"], 1)
        self.assertEqual(result_dict["steps"][1]["step"], 2)
        self.assertEqual(result_dict["steps"][2]["step"], 3)
        self.assertEqual(result_dict["steps"][3]["step"], 4)

    @patch("humanize_pipeline.google_translate")
    @patch("humanize_pipeline.niutrans_translate")
    def test_pipeline_process_list(self, mock_nt, mock_gt):
        self.mock_rewriter.cross_lingual_rewrite.return_value = "Item rewrite"
        mock_gt.return_value = "FI item"
        mock_nt.return_value = "Clean bullet point item"

        list_text = "- First point: AI is fast\n- Second point: Human writing is varied"
        output = self.pipeline.process(list_text, mode=RewriteMode.STANDARD, level=RewriteLevel.MODERATE)

        self.assertTrue("- " in output or "• " in output)


if __name__ == "__main__":
    unittest.main()
