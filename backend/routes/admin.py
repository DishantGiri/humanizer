"""
Admin Portal API routes for analytics, user management, and coupon generation.
"""

import uuid
import secrets
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field

from db import execute_query, fetch_one, fetch_all
from routes.auth import get_current_user_from_token, UserResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Admin Auth Guard ────────────────────────────────────────────────────────

def require_admin_user(current_user: UserResponse = Depends(get_current_user_from_token)) -> UserResponse:
    """
    Guard function verifying user has admin privileges.
    Allow if user.role == 'admin' OR user is a primary admin email.
    """
    if current_user.role == 'admin' or current_user.email.lower() in ('admin@gmail.com', 'admin@cloakwriter.com', 'rahul@fishtailinfosolutions.com'):
        return current_user
    raise HTTPException(status_code=403, detail="Access denied. Admin privileges required.")


# ── Pydantic Request & Response Schemas ─────────────────────────────────────

class UserUpdateRequest(BaseModel):
    plan: Optional[str] = None
    role: Optional[str] = None
    usage_count: Optional[int] = None

class AdminUpdateCredentialsRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    new_password: Optional[str] = None
    current_password: Optional[str] = None

class GenerateCouponRequest(BaseModel):
    plan: str = Field(..., description="Target plan: starter, plus, or pro")
    prefix: str = Field("CLOAK", description="Coupon code prefix")
    quantity: int = Field(1, ge=1, le=50, description="Number of coupons to generate")
    max_uses: int = Field(1, ge=1, description="Max uses per coupon")

class CouponItem(BaseModel):
    code: str
    plan: str
    max_uses: int
    used_count: int
    is_redeemed: bool
    redeemed_by: Optional[str] = None
    redeemed_at: Optional[str] = None
    created_at: str


# ── Analytics Endpoint ──────────────────────────────────────────────────────

@router.get("/analytics")
async def get_analytics_overview(admin: UserResponse = Depends(require_admin_user)):
    """
    Returns platform-wide metrics, usage totals, plan breakdown, and daily activity.
    """
    u_total = fetch_one("SELECT COUNT(*) as count FROM users")
    h_total = fetch_one("SELECT COUNT(*) as count FROM history")
    w_total = fetch_one("SELECT SUM(word_count) as total_words FROM history")
    subs_total = fetch_one("SELECT COUNT(*) as count FROM users WHERE plan != 'free'")

    # Plan distribution
    plans_raw = fetch_all("SELECT plan, COUNT(*) as count FROM users GROUP BY plan")
    plan_counts = {"free": 0, "plus": 0, "pro": 0, "enterprise": 0, "starter": 0}
    for item in plans_raw:
        p_name = item.get("plan", "free")
        if p_name in plan_counts:
            plan_counts[p_name] = item.get("count", 0)

    # Recent rewrites stream
    recent_raw = fetch_all("""
        SELECT h.id, h.original_text, h.rewritten_text, h.word_count, h.mode, h.created_at, u.name as user_name, u.email as user_email
        FROM history h
        LEFT JOIN users u ON h.user_id = u.id
        ORDER BY h.created_at DESC
        LIMIT 10
    """)

    recent_stream = []
    for r in recent_raw:
        recent_stream.append({
            "id": r["id"],
            "user_name": r.get("user_name") or "Anonymous",
            "user_email": r.get("user_email") or "",
            "original_snippet": (r["original_text"][:60] + "...") if len(r["original_text"]) > 60 else r["original_text"],
            "rewritten_snippet": (r["rewritten_text"][:60] + "...") if len(r["rewritten_text"]) > 60 else r["rewritten_text"],
            "word_count": r.get("word_count", 0),
            "mode": r.get("mode", "native"),
            "created_at": str(r["created_at"])
        })

    # Coupons total
    c_total = fetch_one("SELECT COUNT(*) as count FROM coupons")

    return {
        "stats": {
            "total_users": u_total["count"] if u_total else 0,
            "total_rewrites": h_total["count"] if h_total else 0,
            "total_words": int(w_total["total_words"] or 0) if w_total and w_total["total_words"] else 0,
            "active_subscribers": subs_total["count"] if subs_total else 0,
            "total_coupons": c_total["count"] if c_total else 0,
        },
        "plan_breakdown": plan_counts,
        "recent_activity": recent_stream
    }


# ── User Management Endpoints ───────────────────────────────────────────────

@router.get("/users")
async def list_all_users(
    search: Optional[str] = None,
    plan_filter: Optional[str] = None,
    admin: UserResponse = Depends(require_admin_user)
):
    """
    List all registered users with optional search and plan filtering.
    """
    query = "SELECT id, name, email, plan, role, usage_count, avatar_url, created_at FROM users WHERE 1=1"
    params = []

    if search:
        s_term = f"%{search.strip()}%"
        query += " AND (name LIKE ? OR email LIKE ?)"
        params.extend([s_term, s_term])

    if plan_filter and plan_filter.lower() != "all":
        query += " AND plan = ?"
        params.append(plan_filter.lower())

    query += " ORDER BY created_at DESC"

    users_raw = fetch_all(query, tuple(params))
    users_list = []
    for u in users_raw:
        users_list.append({
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "plan": u.get("plan", "free"),
            "role": u.get("role", "user"),
            "usage_count": u.get("usage_count", 0),
            "avatar_url": u.get("avatar_url"),
            "created_at": str(u["created_at"])
        })

    return {"total": len(users_list), "users": users_list}


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    update_data: UserUpdateRequest,
    admin: UserResponse = Depends(require_admin_user)
):
    """
    Update a user's plan, role, or usage count.
    """
    user_row = fetch_one("SELECT id, name, email, plan, role, usage_count FROM users WHERE id = ?", (user_id,))
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found.")

    updates = []
    params = []

    if update_data.plan is not None:
        updates.append("plan = ?")
        params.append(update_data.plan.lower())

    if update_data.role is not None:
        updates.append("role = ?")
        params.append(update_data.role.lower())

    if update_data.usage_count is not None:
        updates.append("usage_count = ?")
        params.append(update_data.usage_count)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided for update.")

    params.append(user_id)
    q_update = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
    execute_query(q_update, tuple(params))

    updated_user = fetch_one("SELECT id, name, email, plan, role, usage_count, avatar_url, created_at FROM users WHERE id = ?", (user_id,))
    logger.info("Admin %s updated user %s", admin.email, user_id)

    return {
        "message": "User updated successfully.",
        "user": {
            "id": updated_user["id"],
            "name": updated_user["name"],
            "email": updated_user["email"],
            "plan": updated_user.get("plan", "free"),
            "role": updated_user.get("role", "user"),
            "usage_count": updated_user.get("usage_count", 0),
            "avatar_url": updated_user.get("avatar_url"),
            "created_at": str(updated_user["created_at"])
        }
    }


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    admin: UserResponse = Depends(require_admin_user)
):
    """
    Delete a user account and associated session/history records.
    """
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account.")

    user_row = fetch_one("SELECT id, email FROM users WHERE id = ?", (user_id,))
    if not user_row:
        raise HTTPException(status_code=404, detail="User not found.")

    execute_query("DELETE FROM sessions WHERE user_id = ?", (user_id,))
    execute_query("DELETE FROM history WHERE user_id = ?", (user_id,))
    execute_query("DELETE FROM users WHERE id = ?", (user_id,))

    logger.info("Admin %s deleted user account %s (%s)", admin.email, user_id, user_row["email"])
    return {"message": f"User {user_row['email']} successfully deleted."}


# ── Coupon Management Endpoints ─────────────────────────────────────────────

@router.get("/coupons")
async def list_all_coupons(admin: UserResponse = Depends(require_admin_user)):
    """
    List all generated coupons with redemption details.
    """
    coupons_raw = fetch_all("SELECT code, plan, max_uses, used_count, redeemed_by, redeemed_at, created_at FROM coupons ORDER BY created_at DESC")
    coupons_list = []
    for c in coupons_raw:
        coupons_list.append({
            "code": c["code"],
            "plan": c["plan"],
            "max_uses": c.get("max_uses", 1),
            "used_count": c.get("used_count", 1 if c.get("redeemed_by") else 0),
            "is_redeemed": bool(c.get("redeemed_by") or (c.get("used_count", 0) >= c.get("max_uses", 1))),
            "redeemed_by": c.get("redeemed_by"),
            "redeemed_at": str(c["redeemed_at"]) if c.get("redeemed_at") else None,
            "created_at": str(c["created_at"])
        })
    return {"total": len(coupons_list), "coupons": coupons_list}


@router.post("/coupons/generate")
async def generate_coupons(
    request: GenerateCouponRequest,
    admin: UserResponse = Depends(require_admin_user)
):
    """
    Generate one or multiple promo coupon codes for starter, plus, or pro plans.
    """
    target_plan = request.plan.lower().strip()
    if target_plan not in ("starter", "plus", "pro"):
        raise HTTPException(status_code=400, detail="Invalid plan. Must be starter, plus, or pro.")

    generated_codes = []
    prefix = request.prefix.upper().strip() or "CLOAK"
    created_at = datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')

    for _ in range(request.quantity):
        code_rand = secrets.token_hex(3).upper()
        code = f"{prefix}-{target_plan.upper()}-{code_rand}"
        
        q_ins = """
            INSERT INTO coupons (code, plan, max_uses, used_count, created_at)
            VALUES (?, ?, ?, 0, ?)
        """
        execute_query(q_ins, (code, target_plan, request.max_uses, created_at))
        generated_codes.append(code)

    logger.info("Admin %s generated %d coupons for plan %s", admin.email, len(generated_codes), target_plan)
    return {
        "message": f"Successfully generated {len(generated_codes)} coupon code(s).",
        "codes": generated_codes,
        "plan": target_plan,
        "max_uses": request.max_uses
    }


@router.delete("/coupons/{code}")
async def revoke_coupon(
    code: str,
    admin: UserResponse = Depends(require_admin_user)
):
    """
    Revoke/delete a coupon code.
    """
    coupon = fetch_one("SELECT code FROM coupons WHERE code = ?", (code.strip(),))
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon code not found.")

    execute_query("DELETE FROM coupons WHERE code = ?", (code.strip(),))
    logger.info("Admin %s revoked coupon code %s", admin.email, code)
    return {"message": f"Coupon code {code} successfully revoked."}


@router.post("/update-credentials")
async def update_admin_credentials(
    request: AdminUpdateCredentialsRequest,
    admin: UserResponse = Depends(require_admin_user)
):
    """
    Allows an admin to change their email, name, or password.
    Requires current_password if is_first_login == 0.
    Resets is_first_login to 0 and returns a fresh JWT token.
    """
    from routes.auth import hash_password, verify_password, create_jwt_token

    admin_row = fetch_one("SELECT password_hash, salt, is_first_login FROM users WHERE id = ?", (admin.id,))
    if not admin_row:
        raise HTTPException(status_code=404, detail="Admin user record not found.")

    is_first_login = admin_row.get("is_first_login", 0)

    # Bypass current_password on first login setup (is_first_login == 1)
    if is_first_login != 1:
        if request.current_password and request.current_password.strip():
            if not verify_password(request.current_password, admin_row["password_hash"], admin_row["salt"]):
                raise HTTPException(status_code=400, detail="Incorrect current password.")
        else:
            raise HTTPException(status_code=400, detail="Current password is required to change credentials.")

    updates = []
    params = []

    if request.name and request.name.strip():
        updates.append("name = ?")
        params.append(request.name.strip())

    if request.email and request.email.strip():
        new_email = request.email.strip().lower()
        if new_email != admin.email.lower():
            existing = fetch_one("SELECT id FROM users WHERE email = ? AND id != ?", (new_email, admin.id))
            if existing:
                raise HTTPException(status_code=400, detail="An account with this email address already exists.")
            updates.append("email = ?")
            params.append(new_email)

    if request.new_password and request.new_password.strip():
        pwd = request.new_password.strip()
        if len(pwd) < 6:
            raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
        new_hash, new_salt = hash_password(pwd)
        updates.append("password_hash = ?")
        params.append(new_hash)
        updates.append("salt = ?")
        params.append(new_salt)

    updates.append("is_first_login = 0")

    if updates:
        sql = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        params.append(admin.id)
        execute_query(sql, tuple(params))

    updated_user = fetch_one("SELECT id, name, email, plan, role, usage_count, is_first_login, avatar_url, created_at FROM users WHERE id = ?", (admin.id,))
    new_token = create_jwt_token(updated_user["id"], updated_user["email"], updated_user["name"])

    return {
        "message": "Admin credentials successfully updated.",
        "user": updated_user,
        "token": new_token
    }
