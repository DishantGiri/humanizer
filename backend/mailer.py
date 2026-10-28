"""
SMTP Email Service supporting registration verification, forgot password reset codes, and security notices.
"""

import os
import ssl
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

ENV_PATH = os.path.join(os.path.dirname(__file__), ".env")


def get_smtp_config():
    """
    Dynamically reload and return current SMTP configuration from environment.
    This guarantees that modifications to backend/.env take immediate effect
    without requiring a server process restart.
    """
    if os.path.exists(ENV_PATH):
        load_dotenv(ENV_PATH, override=True)

    host = (os.getenv("SMTP_HOST") or "smtp.gmail.com").strip()
    try:
        port = int((os.getenv("SMTP_PORT") or "587").strip())
    except Exception:
        port = 587

    user = (os.getenv("MAIL") or os.getenv("SMTP_USER") or "").strip()
    # Remove any internal spaces (Google App Passwords are shown as 4 groups of 4: 'xxxx xxxx xxxx xxxx')
    raw_pw = (os.getenv("APP_PASSWORD") or os.getenv("SMTP_PASSWORD") or "").strip()
    password = raw_pw.replace(" ", "")

    from_name = (os.getenv("SMTP_FROM_NAME") or "CloakWriter AI").strip()
    from_addr = (os.getenv("SMTP_FROM") or f"{from_name} <{user}>").strip()

    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "from_addr": from_addr,
    }


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send an HTML email via SMTP. Automatically handles port 587 (STARTTLS)
    and port 465 (SSL), with automatic retry across ports if connection fails.
    Returns True on success, False on failure.
    """
    cfg = get_smtp_config()
    host = cfg["host"]
    port = cfg["port"]
    user = cfg["user"]
    password = cfg["password"]
    from_addr = cfg["from_addr"]

    if not user or not password:
        logger.warning(
            "SMTP credentials not configured (MAIL or APP_PASSWORD missing in backend/.env). Cannot send email to %s",
            to_email
        )
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_email

    html_part = MIMEText(html_content, "html")
    msg.attach(html_part)

    def _attempt_send(p: int, use_ssl: bool) -> bool:
        ssl_ctx = ssl.create_default_context()
        if use_ssl:
            with smtplib.SMTP_SSL(host, p, context=ssl_ctx, timeout=12) as server:
                server.ehlo()
                server.login(user, password)
                server.sendmail(user, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(host, p, timeout=12) as server:
                server.ehlo()
                server.starttls(context=ssl_ctx)
                server.ehlo()
                server.login(user, password)
                server.sendmail(user, [to_email], msg.as_string())
        return True

    # 1. Try preferred port
    primary_ssl = (port == 465)
    try:
        _attempt_send(port, primary_ssl)
        logger.info("Email sent successfully to %s: subject='%s' via %s:%d", to_email, subject, host, port)
        return True
    except smtplib.SMTPAuthenticationError as auth_err:
        logger.error(
            "SMTP Authentication failed (BadCredentials) for %s on %s:%d. "
            "Please check APP_PASSWORD in backend/.env (ensure 2FA is active and generate a valid 16-char App Password at https://myaccount.google.com/apppasswords): %s",
            user, host, port, auth_err
        )
        return False
    except Exception as primary_err:
        logger.warning(
            "Primary SMTP attempt on %s:%d (ssl=%s) failed: %s. Trying alternate port fallback...",
            host, port, primary_ssl, primary_err
        )

    # 2. Try alternate port fallback (465 <-> 587)
    fallback_port = 465 if port == 587 else (587 if port == 465 else None)
    if fallback_port:
        try:
            _attempt_send(fallback_port, fallback_port == 465)
            logger.info("Email sent successfully to %s via fallback port %d", to_email, fallback_port)
            return True
        except smtplib.SMTPAuthenticationError as auth_err:
            logger.error("SMTP Authentication failed on fallback port %d: %s", fallback_port, auth_err)
            return False
        except Exception as fb_err:
            logger.error("Fallback SMTP attempt on %s:%d also failed: %s", host, fallback_port, fb_err)

    return False


def test_smtp_connection() -> dict:
    """
    Test and diagnose SMTP connectivity and credentials without sending an email.
    """
    cfg = get_smtp_config()
    host = cfg["host"]
    port = cfg["port"]
    user = cfg["user"]
    password = cfg["password"]

    if not user or not password:
        return {
            "success": False,
            "error": "MAIL or APP_PASSWORD is missing in backend/.env",
            "host": host,
            "port": port,
            "user": user or None
        }

    last_err = "Unknown error"
    for p, use_ssl in [(port, port == 465), (465 if port == 587 else 587, port != 465)]:
        try:
            ssl_ctx = ssl.create_default_context()
            if use_ssl:
                with smtplib.SMTP_SSL(host, p, context=ssl_ctx, timeout=8) as server:
                    server.ehlo()
                    server.login(user, password)
            else:
                with smtplib.SMTP(host, p, timeout=8) as server:
                    server.ehlo()
                    server.starttls(context=ssl_ctx)
                    server.ehlo()
                    server.login(user, password)
            return {
                "success": True,
                "message": f"SMTP authentication successful on {host}:{p} (SSL={use_ssl})",
                "host": host,
                "port": p,
                "user": user
            }
        except smtplib.SMTPAuthenticationError as e:
            err_msg = e.smtp_error.decode() if hasattr(e.smtp_error, "decode") else str(e)
            return {
                "success": False,
                "error": f"Authentication failed (BadCredentials) on {host}:{p}: {err_msg}. Ensure 2-Step Verification is active and generate a valid 16-character App Password at https://myaccount.google.com/apppasswords",
                "host": host,
                "port": p,
                "user": user
            }
        except smtplib.SMTPServerDisconnected:
            # Gmail drops connection immediately after 535 BadCredentials during auth handshake
            last_err = (
                f"Google SMTP server disconnected during authentication on {host}:{p}. "
                "This usually indicates invalid credentials (BadCredentials). "
                "Please generate a fresh 16-character App Password at https://myaccount.google.com/apppasswords "
                "and update APP_PASSWORD in backend/.env"
            )
            continue
        except Exception as e:
            last_err = f"{type(e).__name__}: {e}"
            continue

    return {
        "success": False,
        "error": last_err,
        "host": host,
        "port": port,
        "user": user
    }


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
