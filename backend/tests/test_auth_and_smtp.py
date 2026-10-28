"""
Unit tests for duplicate email registration prevention and SMTP mailer robustness.
"""

import unittest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from mailer import get_smtp_config
from routes.auth import register, RegisterRequest, resend_verification, ResendVerificationRequest
from db import execute_query, fetch_one, init_db


class TestAuthAndSMTP(unittest.TestCase):
    def setUp(self):
        init_db()
        self.test_email = "test_duplicate_user@example.com"
        execute_query("DELETE FROM reset_codes WHERE email = ?", (self.test_email,))
        execute_query("DELETE FROM users WHERE email = ?", (self.test_email,))

    def tearDown(self):
        execute_query("DELETE FROM reset_codes WHERE email = ?", (self.test_email,))
        execute_query("DELETE FROM users WHERE email = ?", (self.test_email,))

    def test_app_password_space_stripping(self):
        """Ensure Google App Passwords formatted with spaces like 'abcd efgh ijkl mnop' are sanitized."""
        with patch("mailer.ENV_PATH", "/non/existent/path"):
            with patch.dict(os.environ, {"APP_PASSWORD": "abcd efgh ijkl mnop", "MAIL": "test@example.com"}):
                cfg = get_smtp_config()
                self.assertEqual(cfg["password"], "abcdefghijklmnop")

    async def _register_user(self, name="Test User", email=None, password="Password123!"):
        email = email or self.test_email
        req = RegisterRequest(name=name, email=email, password=password)
        with patch("routes.auth.send_verification_email", return_value=True):
            return await register(req)

    def test_duplicate_verified_registration_fails(self):
        """A user cannot register an email that is already registered and verified."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # 1. First registration
        res1 = loop.run_until_complete(self._register_user())
        self.assertTrue(res1["require_verification"])

        # Mark user as verified
        execute_query("UPDATE users SET email_verified = 1 WHERE email = ?", (self.test_email,))

        # 2. Duplicate registration attempt must raise HTTPException 400
        req_dup = RegisterRequest(name="Imposter User", email=self.test_email, password="NewPassword456!")
        with self.assertRaises(HTTPException) as cm:
            loop.run_until_complete(register(req_dup))
        
        self.assertEqual(cm.exception.status_code, 400)
        self.assertIn("already exists", cm.exception.detail)
        loop.close()

    def test_smtp_failure_rolls_back_user_and_raises_500(self):
        """If SMTP fails to send verification code, newly created user is rolled back and 500 is returned."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        req = RegisterRequest(name="Unsent User", email=self.test_email, password="Password123!")
        with patch("routes.auth.send_verification_email", return_value=False):
            with self.assertRaises(HTTPException) as cm:
                loop.run_until_complete(register(req))
            self.assertEqual(cm.exception.status_code, 500)

        # Confirm user was NOT left in the database
        user = fetch_one("SELECT id FROM users WHERE email = ?", (self.test_email,))
        self.assertIsNone(user, "User should have been rolled back upon SMTP failure")
        loop.close()

    def test_resend_verification_validations(self):
        """Test resend verification endpoint validation."""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        # 1. Non-existent email -> 404
        with self.assertRaises(HTTPException) as cm404:
            loop.run_until_complete(resend_verification(ResendVerificationRequest(email="nonexistent@example.com")))
        self.assertEqual(cm404.exception.status_code, 404)

        # 2. Create verified user -> 400
        loop.run_until_complete(self._register_user())
        execute_query("UPDATE users SET email_verified = 1 WHERE email = ?", (self.test_email,))
        with self.assertRaises(HTTPException) as cm400:
            loop.run_until_complete(resend_verification(ResendVerificationRequest(email=self.test_email)))
        self.assertEqual(cm400.exception.status_code, 400)

        loop.close()


if __name__ == "__main__":
    unittest.main()
