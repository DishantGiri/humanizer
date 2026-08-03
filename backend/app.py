"""
FastAPI application entry point.
"""

import os
import logging
from fastapi import FastAPI, Request    
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routes.rewrite import router as rewrite_router
from routes.auth import router as auth_router
from routes.admin import router as admin_router

# ── Logging ─────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-7s │ %(name)s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Humyn API",
    description="Rewrite text to sound more natural using Groq-hosted LLMs.",
    version="1.0.0",
)

cors_origins = os.getenv("CORS_ORIGINS", "").split(",")
cors_origins = [o.strip() for o in cors_origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins else ["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ──────────────────────────────────────────────────────────────────

app.include_router(rewrite_router)
app.include_router(auth_router)
app.include_router(admin_router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "AI Humanizer API"}


# ── Global Exception Handler ───────────────────────────────────────────────

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again."},
    )
