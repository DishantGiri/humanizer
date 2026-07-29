"""
Authentication API routes integrated with MySQL / DB abstraction.
"""

import os
import hashlib
import uuid
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel, EmailStr, Field
from db import execute_query, fetch_one, fetch_all

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ── Password Utilities ──────────────────────────────────────────────────────

def hash_password(password: str, salt: Optional[str] = None) -> tuple[str, str]:
    if not salt:
        salt = os.urandom(16).hex()
    hashed = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return hashed, salt

# ── Models ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, description="User full name")
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password (min 6 chars)")

class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    plan: str = "free"
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

# ── Auth Helper ─────────────────────────────────────────────────────────────

def get_current_user_from_token(authorization: Optional[str] = Header(None)) -> UserResponse:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")
    
    token = authorization.split(" ")[1]
    query = """
        SELECT u.id, u.name, u.email, u.plan, u.usage_count, u.avatar_url, u.created_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ?
    """
    user_row = fetch_one(query, (token,))
    if not user_row:
        raise HTTPException(status_code=401, detail="Invalid or expired session token")
    
    return UserResponse(
        id=user_row["id"],
        name=user_row["name"],
        email=user_row["email"],
        plan=user_row.get("plan", "free"),
        usage_count=user_row.get("usage_count", 0),
        avatar_url=user_row.get("avatar_url"),
        created_at=str(user_row["created_at"])
    )

def get_optional_user_from_token(authorization: Optional[str] = Header(None)) -> Optional[UserResponse]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        return get_current_user_from_token(authorization)
    except Exception:
        return None

# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/register", response_model=AuthResponse)
async def register(request: RegisterRequest):
    """
    Register a new user account (defaults to 'free' plan with 0 usage).
    """
    email_clean = request.email.lower().strip()
    name_clean = request.name.strip()
    
    q_check = "SELECT id FROM users WHERE email = ?"
    if fetch_one(q_check, (email_clean,)):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    
    user_id = str(uuid.uuid4())
    pwd_hash, salt = hash_password(request.password)
    created_at = datetime.utcnow().isoformat()
    
    q_ins_u = """
        INSERT INTO users (id, name, email, password_hash, salt, plan, usage_count, created_at)
        VALUES (?, ?, ?, ?, ?, 'free', 0, ?)
    """
    execute_query(q_ins_u, (user_id, name_clean, email_clean, pwd_hash, salt, created_at))
    
    # Create session token
    token = uuid.uuid4().hex
    q_ins_s = "INSERT INTO sessions (token, user_id) VALUES (?, ?)"
    execute_query(q_ins_s, (token, user_id))
    
    user_resp = UserResponse(
        id=user_id,
        name=name_clean,
        email=email_clean,
        plan="free",
        usage_count=0,
        created_at=created_at
    )
    return AuthResponse(
        user=user_resp,
        token=token,
        message="Account registered successfully."
    )

@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest):
    """
    Authenticate email and password.
    """
    email_clean = request.email.lower().strip()
    
    q_get = "SELECT id, name, email, password_hash, salt, plan, usage_count, avatar_url, created_at FROM users WHERE email = ?"
    user_row = fetch_one(q_get, (email_clean,))
    
    if not user_row:
        raise HTTPException(status_code=400, detail="Invalid email or password.")
    
    expected_hash, _ = hash_password(request.password, user_row["salt"])
    if expected_hash != user_row["password_hash"]:
        raise HTTPException(status_code=400, detail="Invalid email or password.")
    
    # Create new session token
    token = uuid.uuid4().hex
    q_ins_s = "INSERT INTO sessions (token, user_id) VALUES (?, ?)"
    execute_query(q_ins_s, (token, user_row["id"]))
    
    user_resp = UserResponse(
        id=user_row["id"],
        name=user_row["name"],
        email=user_row["email"],
        plan=user_row.get("plan", "free"),
        usage_count=user_row.get("usage_count", 0),
        avatar_url=user_row.get("avatar_url"),
        created_at=str(user_row["created_at"])
    )
    return AuthResponse(
        user=user_resp,
        token=token,
        message="Logged in successfully."
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user_from_token)):
    """
    Retrieve profile of current user.
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
        q_upd = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        execute_query(q_upd, tuple(params))
        
    return current_user

@router.post("/upgrade", response_model=UserResponse)
async def upgrade_to_pro(current_user: UserResponse = Depends(get_current_user_from_token)):
    """
    Upgrade current user account to Pro ($1/mo).
    """
    q_upg = "UPDATE users SET plan = 'pro' WHERE id = ?"
    execute_query(q_upg, (current_user.id,))
    
    current_user.plan = "pro"
    return current_user

@router.post("/logout")
async def logout(authorization: Optional[str] = Header(None)):
    """
    Log out session token.
    """
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        q_del = "DELETE FROM sessions WHERE token = ?"
        execute_query(q_del, (token,))
    return {"message": "Logged out successfully."}
