"""
Authentication API routes integrated with MySQL / DB abstraction.
"""

import os
import hmac
import requests
import hashlib
import uuid
import secrets
import logging
import jwt
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, EmailStr, Field
from db import execute_query, fetch_one, fetch_all
from mailer import (
    send_verification_email,
    send_forgot_password_email,
    send_password_changed_notice,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ── JWT & Security Configuration ────────────────────────────────────────────

JWT_SECRET = os.getenv("JWT_SECRET", "humyn_jwt_secret_key_2026_super_secure_auth_token")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 30


def create_jwt_token(user_id: str, email: str, name: str) -> str:
    """
    Generate a signed JWT token containing user identity and expiration claims.
    """
    now = datetime.utcnow()
    payload = {
        "sub": user_id,
        "email": email,
        "name": name,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=JWT_EXPIRATION_DAYS)).timestamp())
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# ── Password Utilities ──────────────────────────────────────────────────────

def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    if not salt:
        salt = os.urandom(16).hex()
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return hashed, salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    pwd_hash, _ = hash_password(password, salt)
    return hmac.compare_digest(pwd_hash, stored_hash)

# ── Models ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, description="User full name")
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password (min 6 chars)")

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, description="Current password")
    new_password: str = Field(..., min_length=6, description="New password (min 6 chars)")

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str = Field(..., min_length=6, description="New password (min 6 chars)")

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    plan: str = "free"
    role: str = "user"
    usage_count: int = 0
    avatar_url: Optional[str] = None
    created_at: str

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class AuthResponse(BaseModel):
    user: UserResponse
    token: str
    message: str

class HistoryItem(BaseModel):
    id: str
    original_text: str
    rewritten_text: str
    mode: str
    level: int
    word_count: int
    created_at: str

class UpgradeRequest(BaseModel):
    plan: Optional[str] = "pro"

class CreateRazorpayOrderRequest(BaseModel):
    plan: str = Field(..., description="Plan name: starter, plus, or pro")

class VerifyRazorpayPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan: str

class RedeemCouponRequest(BaseModel):
    code: str = Field(..., description="Coupon code to redeem")

class GoogleAuthRequest(BaseModel):
    credential: Optional[str] = Field(None, description="Google ID Token from Google Sign-In button")
    code: Optional[str] = Field(None, description="Google OAuth 2.0 authorization code")
    redirect_uri: Optional[str] = Field(None, description="Redirect URI used for OAuth code exchange")

# ── Plan Pricing ─────────────────────────────────────────────────────────────

PLAN_PRICES_INR_PAISA = {
    "starter": 8800,   # ~$1 (₹88)
    "plus": 17500,     # ~$2 (₹175)
    "pro": 43000,      # ~$5 (₹430)
}

# ── Auth Helpers ─────────────────────────────────────────────────────────────

def get_current_user_from_token(authorization: Optional[str] = Header(None)) -> UserResponse:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")

    token = authorization.split(" ")[1]
    user_id = None

    # 1. Decode JWT Token
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except jwt.InvalidTokenError:
        # 2. Legacy fallback for old session tokens stored in DB
        query_legacy = """
            SELECT u.id
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.token = ?
        """
        user_row_legacy = fetch_one(query_legacy, (token,))
        if user_row_legacy:
            user_id = user_row_legacy["id"]

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")

    query = """
        SELECT id, name, email, plan, role, usage_count, avatar_url, created_at
        FROM users
        WHERE id = ?
    """
    user_row = fetch_one(query, (user_id,))
    if not user_row:
        raise HTTPException(status_code=401, detail="User account not found")

    email_clean = user_row["email"].lower().strip()
    user_plan = user_row.get("plan", "free")

    # If fishtailinfosolutions domain, auto-grant pro plan
    if PRO_PERK_DOMAIN_KEYWORD in email_clean.split("@")[-1]:
        user_plan = "pro"
        if user_row.get("plan") != "pro":
            execute_query("UPDATE users SET plan = 'pro' WHERE id = ?", (user_row["id"],))

    return UserResponse(
        id=user_row["id"],
        name=user_row["name"],
        email=user_row["email"],
        plan=user_plan,
        role=user_row.get("role", "user"),
        usage_count=user_row.get("usage_count", 0),
        avatar_url=user_row.get("avatar_url"),
        created_at=str(user_row["created_at"])
    )


def get_optional_user_from_token(authorization: Optional[str] = Header(None)) -> Optional[UserResponse]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return get_current_user_from_token(authorization)
    except HTTPException:
        return None


PRO_PERK_DOMAIN_KEYWORD = "fishtailinfosolutions"


def check_and_apply_pro_perk(email: str, user_id: Optional[str] = None) -> bool:
    """
    Checks if an email belongs to the fishtailinfosolutions domain.
    If so, automatically upgrades the account to the 'pro' plan.
    Returns True if Pro perk was applied, False otherwise.
    """
    email_clean = email.lower().strip()
    if "@" not in email_clean:
        return False

    domain = email_clean.split("@")[-1]
    if PRO_PERK_DOMAIN_KEYWORD in domain:
        if user_id:
            execute_query("UPDATE users SET plan = 'pro' WHERE id = ?", (user_id,))
        else:
            execute_query("UPDATE users SET plan = 'pro' WHERE email = ?", (email_clean,))
        return True

    return False


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/register")
async def register(request: RegisterRequest):
    """
    Register a new user account and send an SMTP email verification code.
    """
    email_clean = request.email.lower().strip()
    name_clean = request.name.strip()

    if fetch_one("SELECT id FROM users WHERE email = ?", (email_clean,)):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    initial_plan = "pro" if PRO_PERK_DOMAIN_KEYWORD in email_clean.split("@")[-1] else "free"
    user_id = str(uuid.uuid4())
    pwd_hash, salt = hash_password(request.password)
    created_at = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

    execute_query(
        """INSERT INTO users (id, name, email, password_hash, salt, plan, role, email_verified, usage_count, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'user', 0, 0, ?)""",
        (user_id, name_clean, email_clean, pwd_hash, salt, initial_plan, created_at)
    )

    # Generate 6-digit verification code
    code = str(secrets.randbelow(900000) + 100000)
    expires_at = (datetime.utcnow() + timedelta(minutes=15)).strftime('%Y-%m-%d %H:%M:%S')
    code_id = str(uuid.uuid4())

    execute_query("DELETE FROM reset_codes WHERE email = ? AND purpose = 'verify_registration'", (email_clean,))
    execute_query(
        "INSERT INTO reset_codes (id, email, code, purpose, expires_at) VALUES (?, ?, ?, 'verify_registration', ?)",
        (code_id, email_clean, code, expires_at)
    )

    sent = send_verification_email(email_clean, name_clean, code)

    return {
        "message": "Registration successful. Please check your email for the 6-digit verification code.",
        "email": email_clean,
        "require_verification": True,
        "email_sent": sent
    }


@router.post("/verify-email", response_model=AuthResponse)
async def verify_email(request: VerifyEmailRequest):
    """
    Verify 6-digit registration code and activate user account.
    """
    email_clean = request.email.lower().strip()
    code_clean = request.code.strip()

    row = fetch_one(
        "SELECT id, expires_at FROM reset_codes WHERE email = ? AND code = ? AND purpose = 'verify_registration'",
        (email_clean, code_clean)
    )
    if not row:
        raise HTTPException(status_code=400, detail="Invalid verification code. Please check and try again.")

    check_and_apply_pro_perk(email_clean)
    execute_query("UPDATE users SET email_verified = 1 WHERE email = ?", (email_clean,))
    execute_query("DELETE FROM reset_codes WHERE id = ?", (row["id"],))

    user_row = fetch_one(
        "SELECT id, name, email, plan, role, usage_count, avatar_url, created_at FROM users WHERE email = ?",
        (email_clean,)
    )
    if not user_row:
        raise HTTPException(status_code=404, detail="User account not found.")

    token = create_jwt_token(user_row["id"], user_row["email"], user_row["name"])
    execute_query("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_row["id"]))

    return AuthResponse(
        user=UserResponse(
            id=user_row["id"],
            name=user_row["name"],
            email=user_row["email"],
            plan=user_row.get("plan", "free"),
            role=user_row.get("role", "user"),
            usage_count=user_row.get("usage_count", 0),
            avatar_url=user_row.get("avatar_url"),
            created_at=str(user_row["created_at"])
        ),
        token=token,
        message="Email verified successfully! Welcome to CloakWriter."
    )


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Authenticate email and password. Returns JWT token.
    """
    email_clean = request.email.lower().strip()

    user_row = fetch_one(
        "SELECT id, name, email, password_hash, salt, plan, role, usage_count, avatar_url, created_at FROM users WHERE email = ?",
        (email_clean,)
    )

    if not user_row:
        raise HTTPException(status_code=400, detail="Invalid email or password.")

    expected_hash, _ = hash_password(request.password, user_row["salt"])
    if expected_hash != user_row["password_hash"]:
        raise HTTPException(status_code=400, detail="Invalid email or password.")

    user_plan = user_row.get("plan", "free")
    if PRO_PERK_DOMAIN_KEYWORD in email_clean.split("@")[-1]:
        execute_query("UPDATE users SET plan = 'pro' WHERE email = ?", (email_clean,))
        user_plan = "pro"

    token = create_jwt_token(user_row["id"], user_row["email"], user_row["name"])
    execute_query("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_row["id"]))

    return AuthResponse(
        user=UserResponse(
            id=user_row["id"],
            name=user_row["name"],
            email=user_row["email"],
            plan=user_plan,
            role=user_row.get("role", "user"),
            usage_count=user_row.get("usage_count", 0),
            avatar_url=user_row.get("avatar_url"),
            created_at=str(user_row["created_at"])
        ),
        token=token,
        message="Logged in successfully."
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user_from_token)):
    """
    Retrieve profile of current authenticated user.
    """
    return current_user


@router.patch("/profile", response_model=UserResponse)
async def update_profile(
    request: ProfileUpdateRequest,
    current_user: UserResponse = Depends(get_current_user_from_token)
):
    """
    Update profile details (name, avatar_url).
    """
    updates = []
    params = []

    if request.name is not None and request.name.strip():
        updates.append("name = ?")
        params.append(request.name.strip())
        current_user.name = request.name.strip()

    if request.avatar_url is not None:
        updates.append("avatar_url = ?")
        params.append(request.avatar_url.strip())
        current_user.avatar_url = request.avatar_url.strip()

    if updates:
        params.append(current_user.id)
        execute_query(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", tuple(params))

    return current_user


@router.post("/upgrade", response_model=UserResponse)
async def upgrade_to_pro(
    request: Optional[UpgradeRequest] = None,
    current_user: UserResponse = Depends(get_current_user_from_token)
):
    """
    Upgrade current user account to specified plan.
    """
    target_plan = (request.plan if request and request.plan else "pro").lower()
    execute_query("UPDATE users SET plan = ? WHERE id = ?", (target_plan, current_user.id))
    current_user.plan = target_plan
    return current_user


@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """
    Log out session token.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        execute_query("DELETE FROM sessions WHERE token = ?", (token,))
    return {"message": "Logged out successfully."}


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """
    Generate and email a 6-digit password reset code via SMTP.
    """
    email_clean = request.email.lower().strip()
    user_row = fetch_one("SELECT id, name, email FROM users WHERE email = ?", (email_clean,))

    if not user_row:
        # Don't leak whether the email is registered
        return {"message": "If an account exists for this email, a reset code has been sent."}

    code = str(secrets.randbelow(900000) + 100000)
    expires_at = (datetime.utcnow() + timedelta(minutes=15)).strftime('%Y-%m-%d %H:%M:%S')
    code_id = str(uuid.uuid4())

    execute_query("DELETE FROM reset_codes WHERE email = ? AND purpose = 'forgot_password'", (email_clean,))
    execute_query(
        "INSERT INTO reset_codes (id, email, code, purpose, expires_at) VALUES (?, ?, ?, 'forgot_password', ?)",
        (code_id, email_clean, code, expires_at)
    )

    send_forgot_password_email(email_clean, user_row["name"], code)
    return {"message": "If an account exists for this email, a reset code has been sent."}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """
    Reset password using 6-digit SMTP reset code.
    """
    email_clean = request.email.lower().strip()
    code_clean = request.code.strip()

    row = fetch_one(
        "SELECT id FROM reset_codes WHERE email = ? AND code = ? AND purpose = 'forgot_password'",
        (email_clean, code_clean)
    )
    if not row:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code. Please try again.")

    user_row = fetch_one("SELECT id, name, email FROM users WHERE email = ?", (email_clean,))
    if not user_row:
        raise HTTPException(status_code=404, detail="User account not found.")

    new_hash, new_salt = hash_password(request.new_password)
    execute_query("UPDATE users SET password_hash = ?, salt = ? WHERE email = ?", (new_hash, new_salt, email_clean))
    execute_query("DELETE FROM reset_codes WHERE id = ?", (row["id"],))

    send_password_changed_notice(email_clean, user_row["name"])
    return {"message": "Password reset successfully. You may now log in with your new password."}


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: UserResponse = Depends(get_current_user_from_token)
):
    """
    Change user password after verifying current password.
    """
    row = fetch_one("SELECT password_hash, salt, name, email FROM users WHERE id = ?", (current_user.id,))
    if not row:
        raise HTTPException(status_code=404, detail="User account not found.")

    check_hash, _ = hash_password(request.current_password, row["salt"])
    if check_hash != row["password_hash"]:
        raise HTTPException(status_code=400, detail="Current password is incorrect. Please try again.")

    new_hash, new_salt = hash_password(request.new_password)
    execute_query("UPDATE users SET password_hash = ?, salt = ? WHERE id = ?", (new_hash, new_salt, current_user.id))

    send_password_changed_notice(row["email"], row["name"])
    return {"message": "Password changed successfully."}


# ── Google OAuth 2.0 ─────────────────────────────────────────────────────────

@router.get("/google/config")
async def get_google_oauth_config():
    """
    Returns public Google OAuth Client ID for frontend button initialization.
    """
    client_id = os.getenv("CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID") or ""
    return {"client_id": client_id}


@router.post("/google", response_model=AuthResponse)
async def google_auth(request: GoogleAuthRequest):
    """
    OAuth 2.0 Google Sign-In endpoint.
    Accepts Google ID Token (credential) or authorization code.
    """
    import urllib.request
    import urllib.parse
    import json

    user_info = None

    # Case 1: ID Token credential from Google One Tap / Sign-In button
    if request.credential:
        try:
            tokeninfo_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={request.credential}"
            req = urllib.request.Request(tokeninfo_url)
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode('utf-8'))
                if "email" in data:
                    user_info = {
                        "email": data.get("email"),
                        "name": data.get("name", data.get("email").split("@")[0]),
                        "picture": data.get("picture")
                    }
        except Exception as e:
            logger.error("Failed to verify Google ID Token: %s", e)
            raise HTTPException(status_code=400, detail="Invalid or expired Google authentication token.")

    # Case 2: OAuth 2.0 Authorization Code exchange
    elif request.code:
        client_id = os.getenv("CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID", "")
        client_secret = os.getenv("CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET", "")
        redirect_uri = request.redirect_uri or "http://localhost:3000/api/auth/callback/google"

        try:
            token_url = "https://oauth2.googleapis.com/token"
            post_data = urllib.parse.urlencode({
                "code": request.code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            }).encode('utf-8')

            req = urllib.request.Request(
                token_url, data=post_data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'}
            )
            with urllib.request.urlopen(req, timeout=10) as response:
                tokens = json.loads(response.read().decode('utf-8'))
                access_token = tokens.get("access_token")

                if access_token:
                    userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
                    u_req = urllib.request.Request(
                        userinfo_url, headers={'Authorization': f'Bearer {access_token}'}
                    )
                    with urllib.request.urlopen(u_req, timeout=10) as u_resp:
                        data = json.loads(u_resp.read().decode('utf-8'))
                        if "email" in data:
                            user_info = {
                                "email": data.get("email"),
                                "name": data.get("name", data.get("email").split("@")[0]),
                                "picture": data.get("picture")
                            }
        except Exception as e:
            logger.error("Failed Google OAuth code exchange: %s", e)
            raise HTTPException(status_code=400, detail="Failed to complete Google OAuth authorization code exchange.")

    if not user_info or not user_info.get("email"):
        raise HTTPException(status_code=400, detail="Google authentication failed. No verified email returned.")

    email_clean = user_info["email"].lower().strip()
    name_clean = user_info["name"].strip()
    avatar_url = user_info.get("picture")
    is_pro_domain = PRO_PERK_DOMAIN_KEYWORD in email_clean.split("@")[-1]

    user_row = fetch_one(
        "SELECT id, name, email, plan, role, usage_count, avatar_url, created_at FROM users WHERE email = ?",
        (email_clean,)
    )

    if user_row:
        user_id = user_row["id"]
        if is_pro_domain:
            execute_query("UPDATE users SET plan = 'pro' WHERE id = ?", (user_id,))
            plan = "pro"
        else:
            plan = user_row.get("plan", "free")
        if avatar_url and not user_row.get("avatar_url"):
            execute_query("UPDATE users SET avatar_url = ? WHERE id = ?", (avatar_url, user_id))
        role = user_row.get("role", "user")
        usage_count = user_row.get("usage_count", 0)
        created_at = str(user_row["created_at"])
    else:
        user_id = str(uuid.uuid4())
        pwd_hash, salt = hash_password(uuid.uuid4().hex)
        created_at = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
        plan = "pro" if is_pro_domain else "free"
        role = "user"
        usage_count = 0

        execute_query(
            """INSERT INTO users (id, name, email, password_hash, salt, plan, usage_count, avatar_url, created_at)
               VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)""",
            (user_id, name_clean, email_clean, pwd_hash, salt, plan, avatar_url, created_at)
        )

    token = create_jwt_token(user_id, email_clean, name_clean)
    execute_query("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))

    return AuthResponse(
        user=UserResponse(
            id=user_id,
            name=name_clean,
            email=email_clean,
            plan=plan,
            role=role,
            usage_count=usage_count,
            avatar_url=avatar_url,
            created_at=created_at
        ),
        token=token,
        message="Google OAuth authentication successful."
    )


# ── Razorpay Payment Endpoints ───────────────────────────────────────────────

@router.post("/razorpay/create-order")
async def create_razorpay_order(
    request: CreateRazorpayOrderRequest,
    current_user: UserResponse = Depends(get_current_user_from_token)
):
    """
    Create a Razorpay Order for plan upgrade payment.
    """
    plan = request.plan.lower()
    amount = PLAN_PRICES_INR_PAISA.get(plan, 8800)

    key_id = os.getenv("RAZORPAY_API_KEY", "")
    key_secret = os.getenv("RAZORPAY_SECRET", "")

    if not key_id or not key_secret:
        raise HTTPException(status_code=500, detail="Razorpay API keys not configured on server.")

    try:
        url = "https://api.razorpay.com/v1/orders"
        payload = {
            "amount": amount,
            "currency": "INR",
            "receipt": f"rcpt_{current_user.id[:8]}_{int(datetime.utcnow().timestamp())}",
            "notes": {
                "user_id": current_user.id,
                "user_email": current_user.email,
                "plan": plan
            }
        }
        res = requests.post(url, json=payload, auth=(key_id, key_secret), timeout=10)
        if res.status_code not in (200, 201):
            logger.error("Razorpay order creation failed: %s", res.text)
            raise HTTPException(status_code=res.status_code, detail=f"Razorpay order failed: {res.text}")

        data = res.json()
        return {
            "order_id": data.get("id"),
            "amount": data.get("amount"),
            "currency": data.get("currency"),
            "key_id": key_id,
            "plan": plan
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error creating Razorpay order: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/razorpay/verify-payment", response_model=UserResponse)
async def verify_razorpay_payment(
    request: VerifyRazorpayPaymentRequest,
    current_user: UserResponse = Depends(get_current_user_from_token)
):
    """
    Verify Razorpay payment signature and upgrade user plan.
    """
    key_secret = os.getenv("RAZORPAY_SECRET", "")
    if not key_secret:
        raise HTTPException(status_code=500, detail="Razorpay secret not configured on server.")

    msg = f"{request.razorpay_order_id}|{request.razorpay_payment_id}"
    generated_sig = hmac.new(
        key_secret.encode("utf-8"),
        msg.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    if generated_sig != request.razorpay_signature:
        raise HTTPException(status_code=400, detail="Invalid Razorpay payment signature.")

    target_plan = request.plan.lower()
    execute_query("UPDATE users SET plan = ? WHERE id = ?", (target_plan, current_user.id))
    current_user.plan = target_plan
    logger.info("Verified Razorpay payment for user %s -> plan %s", current_user.id, target_plan)
    return current_user


# ── Coupon Redemption ────────────────────────────────────────────────────────

@router.post("/redeem-coupon", response_model=UserResponse)
async def redeem_coupon(
    request: RedeemCouponRequest,
    current_user: UserResponse = Depends(get_current_user_from_token)
):
    """
    Redeem a one-time coupon code to upgrade user's plan.
    """
    code_clean = request.code.strip()
    coupon = fetch_one("SELECT code, plan, redeemed_by FROM coupons WHERE code = ?", (code_clean,))

    if not coupon:
        raise HTTPException(status_code=400, detail="Invalid coupon code. Please check and try again.")
    if coupon.get("redeemed_by"):
        raise HTTPException(status_code=400, detail="This coupon has already been redeemed.")

    redeemed_at = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    execute_query(
        "UPDATE coupons SET redeemed_by = ?, redeemed_at = ? WHERE code = ?",
        (current_user.id, redeemed_at, code_clean)
    )

    target_plan = coupon["plan"]
    execute_query("UPDATE users SET plan = ? WHERE id = ?", (target_plan, current_user.id))
    current_user.plan = target_plan
    logger.info("Coupon %s redeemed by user %s -> plan %s", code_clean, current_user.id, target_plan)
    return current_user


@router.get("/coupons/list")
async def list_coupons():
    """
    List all coupon codes and their redemption status.
    """
    coupons = fetch_all("SELECT code, plan, redeemed_by, redeemed_at, created_at FROM coupons ORDER BY created_at")
    return {
        "total": len(coupons),
        "coupons": [
            {
                "code": c["code"],
                "plan": c["plan"],
                "is_redeemed": bool(c.get("redeemed_by")),
                "redeemed_by": c.get("redeemed_by"),
                "redeemed_at": str(c["redeemed_at"]) if c.get("redeemed_at") else None,
                "created_at": str(c["created_at"]),
            }
            for c in coupons
        ],
    }
