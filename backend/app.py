"""
FastAPI application entry point.
"""

import os
import re
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from fastapi.exceptions import HTTPException, RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware

from routes.rewrite import router as rewrite_router
from routes.auth import router as auth_router
from routes.admin import router as admin_router
from db import fetch_one, fetch_all

# ── Logging ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CloakWriter API",
    description="AI-powered text humanizer API.",
    version="1.0.0",
)

# ── Allowed Origins ──────────────────────────────────────────────────────────

ALLOWED_ORIGIN_PATTERN = re.compile(
    r"^https?://(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|(.*\.)?cloakwriter\.(app|com))$"
)

default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://cloakwriter.app",
    "https://www.cloakwriter.app",
    "https://cloakwriter.com",
    "https://www.cloakwriter.com",
]

env_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
cors_origins = list(set(default_origins + env_origins))


def get_cors_origin(origin: str) -> str:
    """Return the origin if allowed, else the first default origin."""
    if origin and ALLOWED_ORIGIN_PATTERN.match(origin):
        return origin
    if origin and origin in cors_origins:
        return origin
    return ""


# ── Custom CORS Middleware ───────────────────────────────────────────────────
# FastAPI's built-in CORSMiddleware does NOT inject headers into responses
# produced by exception handlers (HTTPException, 400, 401, 500). We add a
# custom raw middleware that ensures every response — including error responses
# — carries the correct Access-Control headers.

class CORSFixMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        origin = request.headers.get("origin", "")
        allowed_origin = get_cors_origin(origin)

        # Handle preflight OPTIONS
        if request.method == "OPTIONS":
            response = JSONResponse(content={}, status_code=200)
            if allowed_origin:
                response.headers["Access-Control-Allow-Origin"] = allowed_origin
                response.headers["Access-Control-Allow-Credentials"] = "true"
                response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
                response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, Origin"
                response.headers["Access-Control-Max-Age"] = "600"
            return response

        response = await call_next(request)

        if allowed_origin:
            response.headers["Access-Control-Allow-Origin"] = allowed_origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type, Accept, Origin"

        return response


# Register the raw middleware first (outermost layer)
app.add_middleware(CORSFixMiddleware)

# Also keep the standard CORSMiddleware as a fallback
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https?://(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|(.*\.)?cloakwriter\.(app|com))",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Exception Handlers ───────────────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    origin = request.headers.get("origin", "")
    allowed_origin = get_cors_origin(origin)
    headers = {}
    if allowed_origin:
        headers["Access-Control-Allow-Origin"] = allowed_origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    origin = request.headers.get("origin", "")
    allowed_origin = get_cors_origin(origin)
    headers = {}
    if allowed_origin:
        headers["Access-Control-Allow-Origin"] = allowed_origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
        headers=headers,
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server error: %s", exc, exc_info=True)
    origin = request.headers.get("origin", "")
    allowed_origin = get_cors_origin(origin)
    headers = {}
    if allowed_origin:
        headers["Access-Control-Allow-Origin"] = allowed_origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again later."},
        headers=headers,
    )


@app.on_event("startup")
async def startup_event():
    """Pre-warm NLP models and sentence embeddings on server startup."""
    try:
        from similarity import _load_sentence_transformers
        _load_sentence_transformers()
        logger.info("SentenceTransformers pre-warmed successfully.")
    except Exception as err:
        logger.info("SentenceTransformers pre-warm skipped: %s", err)


# ── Routes ──────────────────────────────────────────────────────────────────

app.include_router(rewrite_router)
app.include_router(auth_router)
app.include_router(admin_router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "CloakWriter API"}


@app.get("/robots.txt", response_class=PlainTextResponse)
async def get_dynamic_robots_txt():
    """
    Serves dynamic robots.txt configured from the Admin SEO dashboard.
    """
    global_seo = fetch_one("SELECT robots_txt FROM seo_settings WHERE page_slug = 'global'")
    if global_seo and global_seo.get("robots_txt") and global_seo["robots_txt"].strip():
        return global_seo["robots_txt"]
    return "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: https://cloakwriter.app/sitemap.xml"


@app.get("/sitemap.xml")
async def get_dynamic_sitemap_xml():
    """
    Generates dynamic XML sitemap based on SEO settings.
    """
    pages = fetch_all("SELECT page_slug, canonical_url, updated_at FROM seo_settings WHERE sitemap_enabled = 1")
    xml_items = []
    base_url = "https://cloakwriter.app"

    for p in (pages or []):
        slug = p.get("page_slug", "")
        if slug == "global":
            continue
        loc = p.get("canonical_url") or (base_url if slug == "home" else f"{base_url}/{slug}")
        priority = "1.0" if slug == "home" else ("0.9" if slug == "dashboard" else "0.7")
        freq = "daily" if slug in ("home", "dashboard") else "monthly"
        xml_items.append(f"""  <url>
    <loc>{loc}</loc>
    <changefreq>{freq}</changefreq>
    <priority>{priority}</priority>
  </url>""")

    xml_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{chr(10).join(xml_items)}
</urlset>"""
    return Response(content=xml_content, media_type="application/xml")

