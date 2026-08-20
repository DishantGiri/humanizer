"""
Unit tests for minimum word count validation (40 words).
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app import app
from config import MIN_INPUT_WORDS


class TestMinimumWordCount(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_rewrite_rejects_under_40_words(self):
        """Test that inputs with less than 40 words return HTTP 400."""
        short_text = "This is a short input sentence containing only eight words."
        words_count = len(short_text.split())
        self.assertLess(words_count, MIN_INPUT_WORDS)

        response = self.client.post(
            "/api/rewrite",
            json={"text": short_text, "mode": "standard", "level": 2}
        )

        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertEqual(data["detail"], "Text must be at least 40 words.")

    def test_min_input_words_constant(self):
        """Test that MIN_INPUT_WORDS is configured to 40."""
        self.assertEqual(MIN_INPUT_WORDS, 40)


if __name__ == "__main__":
    unittest.main()
