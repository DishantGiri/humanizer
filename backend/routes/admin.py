"""
Admin Portal API routes for analytics, user management, and coupon generation.
"""

import uuid
import json
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
    Guard function verifying user has admin privileges based on DB role.
    """
    if current_user.role == 'admin':
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
    plan: str = Field(..., description="Target plan: plus, pro, or enterprise")
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

class SeoSettingsUpdateRequest(BaseModel):
    page_name: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    keywords: Optional[str] = None
    h1_title: Optional[str] = None
    h2_subtitle: Optional[str] = None
    canonical_url: Optional[str] = None
    robots_index: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    og_type: Optional[str] = None
    twitter_card: Optional[str] = None
    twitter_site: Optional[str] = None
    schema_type: Optional[str] = None
    schema_json: Optional[str] = None
    custom_head_tags: Optional[str] = None
    google_verification: Optional[str] = None
    bing_verification: Optional[str] = None
    robots_txt: Optional[str] = None
    sitemap_enabled: Optional[int] = None
    custom_header_scripts: Optional[str] = None
    custom_footer_scripts: Optional[str] = None


def format_mode_label(mode_raw: Optional[str]) -> str:
    m = (mode_raw or "standard").strip().lower()
    mapping = {
        "standard": "Standard",
        "native": "Standard",
        "fluency": "Fluency",
        "professional": "Fluency",
        "natural": "Natural",
        "casual": "Natural",
        "academic": "Academic",
        "creative": "Creative",
        "friendly": "Creative",
        "business": "Business",
        "formal": "Formal",
        "simple": "Simple",
        "concise": "Concise",
    }
    return mapping.get(m, m.capitalize() if m else "Standard")


# ── Analytics Endpoint ──────────────────────────────────────────────────────

@router.get("/analytics")
async def get_analytics_overview(admin: UserResponse = Depends(require_admin_user)):
    """
    Returns platform-wide metrics, usage totals, plan breakdown, and daily activity.
    """
    u_total = fetch_one("SELECT COUNT(*) as count FROM users")
    h_total = fetch_one("SELECT COUNT(*) as count FROM history")
    w_total = fetch_one("SELECT SUM(word_count) as total_words FROM history")
    subs_total = fetch_one("SELECT COUNT(*) as count FROM users WHERE LOWER(TRIM(COALESCE(plan, 'free'))) NOT IN ('free', '')")

    # Plan distribution
    plans_raw = fetch_all("SELECT LOWER(TRIM(COALESCE(plan, 'free'))) as plan_name, COUNT(*) as count FROM users GROUP BY LOWER(TRIM(COALESCE(plan, 'free')))")
    plan_counts = {"free": 0, "plus": 0, "pro": 0, "enterprise": 0, "starter": 0}
    for item in plans_raw:
        raw_name = str(item.get("plan_name") or item.get("plan") or "free").lower().strip()
        cnt = int(item.get("count", 0) or 0)
        if raw_name in ("pro", "pro plan"):
            plan_counts["pro"] += cnt
        elif raw_name in ("enterprise", "enterprise plan"):
            plan_counts["enterprise"] += cnt
        elif raw_name in ("plus", "plus plan"):
            plan_counts["plus"] += cnt
        elif raw_name in ("starter", "starter plan"):
            plan_counts["starter"] += cnt
        else:
            plan_counts["free"] += cnt

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
            "mode": format_mode_label(r.get("mode")),
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
        p_filter = plan_filter.lower().strip()
        if p_filter == "plus":
            query += " AND LOWER(TRIM(COALESCE(plan, 'free'))) IN ('plus', 'starter')"
        elif p_filter == "free":
            query += " AND LOWER(TRIM(COALESCE(plan, 'free'))) = 'free'"
        else:
            query += " AND LOWER(TRIM(COALESCE(plan, 'free'))) = ?"
            params.append(p_filter)

    query += " ORDER BY created_at DESC"

    users_raw = fetch_all(query, tuple(params))
    users_list = []
    for u in users_raw:
        raw_plan = str(u.get("plan") or "free").lower().strip()
        users_list.append({
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "plan": raw_plan,
            "role": str(u.get("role") or "user").lower().strip(),
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
    Generate one or multiple promo coupon codes for plus, pro, or enterprise plans.
    """
    target_plan = request.plan.lower().strip()
    if target_plan not in ("plus", "pro", "enterprise", "starter"):
        raise HTTPException(status_code=400, detail="Invalid plan. Must be plus, pro, or enterprise.")

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


# ── SEO Management Endpoints (Technical & Non-Technical) ───────────────────

@router.get("/seo")
async def get_all_seo_settings(admin: UserResponse = Depends(require_admin_user)):
    """
    Returns all SEO configurations across all pages.
    """
    query = """
        SELECT page_slug, page_name, meta_title, meta_description, keywords,
               h1_title, h2_subtitle, canonical_url, robots_index,
               og_title, og_description, og_image, og_type,
               twitter_card, twitter_site, schema_type, schema_json,
               custom_head_tags, google_verification, bing_verification,
               robots_txt, sitemap_enabled, custom_header_scripts, custom_footer_scripts,
               updated_at
        FROM seo_settings
        ORDER BY CASE WHEN page_slug = 'global' THEN 0 WHEN page_slug = 'home' THEN 1 ELSE 2 END, page_slug ASC
    """
    rows = fetch_all(query)
    return {"pages": rows or []}


@router.get("/seo/{page_slug}")
async def get_single_page_seo(page_slug: str, admin: UserResponse = Depends(require_admin_user)):
    """
    Returns SEO settings for a specific page.
    """
    row = fetch_one("SELECT * FROM seo_settings WHERE page_slug = ?", (page_slug,))
    if not row:
        raise HTTPException(status_code=404, detail=f"SEO settings not found for page: {page_slug}")
    return row


@router.put("/seo/{page_slug}")
async def update_page_seo(
    page_slug: str,
    request: SeoSettingsUpdateRequest,
    admin: UserResponse = Depends(require_admin_user)
):
    """
    Updates technical and non-technical SEO parameters for a specific page.
    """
    existing = fetch_one("SELECT page_slug FROM seo_settings WHERE page_slug = ?", (page_slug,))
    if not existing:
        raise HTTPException(status_code=404, detail=f"SEO settings not found for page: {page_slug}")

    # Validate Schema JSON syntax if provided
    if request.schema_json and request.schema_json.strip():
        try:
            json.loads(request.schema_json)
        except json.JSONDecodeError as json_err:
            raise HTTPException(status_code=400, detail=f"Invalid Schema JSON format: {str(json_err)}")

    fields_map = {
        "page_name": request.page_name,
        "meta_title": request.meta_title,
        "meta_description": request.meta_description,
        "keywords": request.keywords,
        "h1_title": request.h1_title,
        "h2_subtitle": request.h2_subtitle,
        "canonical_url": request.canonical_url,
        "robots_index": request.robots_index,
        "og_title": request.og_title,
        "og_description": request.og_description,
        "og_image": request.og_image,
        "og_type": request.og_type,
        "twitter_card": request.twitter_card,
        "twitter_site": request.twitter_site,
        "schema_type": request.schema_type,
        "schema_json": request.schema_json,
        "custom_head_tags": request.custom_head_tags,
        "google_verification": request.google_verification,
        "bing_verification": request.bing_verification,
        "robots_txt": request.robots_txt,
        "sitemap_enabled": request.sitemap_enabled,
        "custom_header_scripts": request.custom_header_scripts,
        "custom_footer_scripts": request.custom_footer_scripts,
    }

    updates = []
    params = []
    for col, val in fields_map.items():
        if val is not None:
            updates.append(f"{col} = ?")
            params.append(val)

    if updates:
        sql = f"UPDATE seo_settings SET {', '.join(updates)}, updated_at = CURRENT_TIMESTAMP WHERE page_slug = ?"
        params.append(page_slug)
        execute_query(sql, tuple(params))

    updated = fetch_one("SELECT * FROM seo_settings WHERE page_slug = ?", (page_slug,))
    return {
        "message": f"SEO settings for '{page_slug}' successfully saved.",
        "seo": updated
    }


@router.post("/seo/reset/{page_slug}")
async def reset_page_seo(
    page_slug: str,
    admin: UserResponse = Depends(require_admin_user)
):
    """
    Resets a page's SEO settings to default optimal configuration.
    """
    from db import _seed_default_seo
    execute_query("DELETE FROM seo_settings WHERE page_slug = ?", (page_slug,))
    _seed_default_seo()
    updated = fetch_one("SELECT * FROM seo_settings WHERE page_slug = ?", (page_slug,))
    return {
        "message": f"SEO settings for '{page_slug}' reset to optimal defaults.",
        "seo": updated
    }


# ── Public SEO Route (Used by Frontend for Dynamic Meta Injection) ─────────

@router.get("/public/seo/{page_slug}")
async def get_public_seo(page_slug: str):
    """
    Publicly accessible endpoint for frontend pages to fetch live SEO tags and schema JSON-LD.
    Merges page-specific SEO with global defaults.
    """
    global_seo = fetch_one("SELECT * FROM seo_settings WHERE page_slug = 'global'") or {}
    page_seo = fetch_one("SELECT * FROM seo_settings WHERE page_slug = ?", (page_slug,)) or {}

    merged = dict(global_seo)
    for k, v in page_seo.items():
        if v is not None and str(v).strip():
            merged[k] = v

    return merged

