"""
SMTP Email Service supporting registration verification, forgot password reset codes, and security notices.
"""

import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("MAIL", os.getenv("SMTP_USER", "dishantgiri22@gmail.com"))
SMTP_PASSWORD = os.getenv("APP_PASSWORD", os.getenv("SMTP_PASSWORD", "hcgbmemrqmuqtuid"))
SMTP_FROM = os.getenv("SMTP_FROM", f"CloakWriter AI <{SMTP_USER}>")


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send an HTML email via SMTP (TLS). Returns True on success.
    """
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not set. Email not sent to %s", to_email)
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to_email

        html_part = MIMEText(html_content, "html")
        msg.attach(html_part)

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, [to_email], msg.as_string())

        logger.info("Email sent successfully to %s: subject='%s'", to_email, subject)
        return True

    except Exception as e:
        logger.error("Failed to send SMTP email to %s: %s", to_email, e)
        return False


def send_verification_email(email: str, name: str, code: str) -> bool:
    """
    Sends 6-digit email verification code for new user registration.
    High contrast WCAG AA compliant inline styling.
    """
    subject = "Verification Code - CloakWriter AI"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="color-scheme" content="dark">
      <meta name="supported-color-schemes" content="dark">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #ffffff; margin: 0; padding: 24px 12px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; padding: 32px 28px; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
        <div style="font-size: 22px; font-weight: 800; color: #38bdf8; margin-bottom: 16px; letter-spacing: -0.01em;">CloakWriter AI</div>
        <p style="color: #ffffff !important; font-size: 15px; line-height: 1.6; margin: 0 0 14px 0; font-weight: 600;">Hello {name},</p>
        <p style="color: #e2e8f0 !important; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">Welcome to CloakWriter! Your registration verification code is below. Enter this code to verify your account:</p>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #10b981 !important; background-color: #0f172a; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid rgba(16,185,129,0.4);">{code}</div>
        <p style="color: #cbd5e1 !important; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0;">This code will expire in 15 minutes. If you did not register for an account, please ignore this email.</p>
        <div style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 24px; padding-top: 16px; font-size: 12px; color: #94a3b8 !important; text-align: center;">&copy; 2026 CloakWriter AI. All rights reserved.</div>
      </div>
    </body>
    </html>
    """
    return send_email(email, subject, html)


def send_forgot_password_email(email: str, name: str, code: str) -> bool:
    """
    Sends 6-digit password reset code for forgot password requests.
    High contrast WCAG AA compliant inline styling.
    """
    subject = "Reset Password Code - CloakWriter AI"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="color-scheme" content="dark">
      <meta name="supported-color-schemes" content="dark">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #ffffff; margin: 0; padding: 24px 12px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; padding: 32px 28px; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
        <div style="font-size: 22px; font-weight: 800; color: #38bdf8; margin-bottom: 16px; letter-spacing: -0.01em;">CloakWriter AI</div>
        <p style="color: #ffffff !important; font-size: 15px; line-height: 1.6; margin: 0 0 14px 0; font-weight: 600;">Hello {name},</p>
        <p style="color: #e2e8f0 !important; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">We received a request to reset your password. Use the verification code below to reset your password:</p>
        <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #f43f5e !important; background-color: #0f172a; padding: 18px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid rgba(244,63,94,0.4);">{code}</div>
        <p style="color: #cbd5e1 !important; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0;">This code is valid for 15 minutes. If you did not request a password reset, please secure your account immediately.</p>
        <div style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 24px; padding-top: 16px; font-size: 12px; color: #94a3b8 !important; text-align: center;">&copy; 2026 CloakWriter AI. All rights reserved.</div>
      </div>
    </body>
    </html>
    """
    return send_email(email, subject, html)


def send_password_changed_notice(email: str, name: str) -> bool:
    """
    Sends confirmation email when password is successfully changed.
    High contrast WCAG AA compliant inline styling.
    """
    subject = "Password Security Alert - CloakWriter AI"
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="color-scheme" content="dark">
      <meta name="supported-color-schemes" content="dark">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #ffffff; margin: 0; padding: 24px 12px;">
      <div style="max-width: 520px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; padding: 32px 28px; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
        <div style="font-size: 22px; font-weight: 800; color: #10b981; margin-bottom: 16px; letter-spacing: -0.01em;">Password Changed</div>
        <p style="color: #ffffff !important; font-size: 15px; line-height: 1.6; margin: 0 0 14px 0; font-weight: 600;">Hello {name},</p>
        <p style="color: #e2e8f0 !important; font-size: 15px; line-height: 1.6; margin: 0 0 14px 0;">Your password for your CloakWriter account was successfully updated.</p>
        <p style="color: #cbd5e1 !important; font-size: 14px; line-height: 1.6; margin: 16px 0 0 0; padding: 12px 14px; background: rgba(244,63,94,0.1); border-left: 4px solid #f43f5e; border-radius: 6px;">
          If you did not perform this change, please contact support immediately to secure your account.
        </p>
        <div style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 24px; padding-top: 16px; font-size: 12px; color: #94a3b8 !important; text-align: center;">&copy; 2026 CloakWriter AI. All rights reserved.</div>
      </div>
    </body>
    </html>
    """
    return send_email(email, subject, html)
