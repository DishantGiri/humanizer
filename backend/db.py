"""
Database abstraction layer supporting MySQL with automatic SQLite fallback.
"""

import os
import sqlite3
import secrets
import logging
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

from urllib.parse import urlparse

load_dotenv()

logger = logging.getLogger(__name__)

# MySQL connection configuration from environment
MYSQL_URL = os.getenv("MYSQL_URL") or os.getenv("DATABASE_URL")
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "humanizer_db")

_use_mysql = False

if MYSQL_URL:
    try:
        parsed = urlparse(MYSQL_URL)
        if parsed.username:
            MYSQL_USER = parsed.username
        if parsed.password:
            MYSQL_PASSWORD = parsed.password
        if parsed.hostname:
            MYSQL_HOST = parsed.hostname
        if parsed.port:
            MYSQL_PORT = parsed.port
        if parsed.path and len(parsed.path) > 1:
            MYSQL_DATABASE = parsed.path.lstrip("/")
        _use_mysql = True
    except Exception as parse_err:
        logger.warning("Failed to parse MYSQL_URL: %s", parse_err)

SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), "humanizer.db")

try:
    import pymysql
    import pymysql.cursors
    # Test if MySQL environment is explicitly configured or reachable
    if _use_mysql or os.getenv("MYSQL_HOST") or os.getenv("USE_MYSQL") == "true":
        conn_test = pymysql.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            connect_timeout=3
        )
        conn_test.close()
        _use_mysql = True
        logger.info("Connected to MySQL server at %s:%d/%s", MYSQL_HOST, MYSQL_PORT, MYSQL_DATABASE)
except Exception as e:
    logger.info("MySQL connection unavailable (%s). Falling back to embedded database.", e)
    if not MYSQL_URL and os.getenv("USE_MYSQL") != "true":
        _use_mysql = False


def get_db_connection():
    if _use_mysql:
        try:
            import pymysql
            import pymysql.cursors
            conn = pymysql.connect(
                host=MYSQL_HOST,
                port=MYSQL_PORT,
                user=MYSQL_USER,
                password=MYSQL_PASSWORD,
                database=MYSQL_DATABASE,
                cursorclass=pymysql.cursors.DictCursor,
                autocommit=True
            )
            return conn, "mysql"
        except Exception as e:
            logger.warning("Failed MySQL connection attempt: %s. Using SQLite fallback.", e)
    
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn, "sqlite"


def init_db():
    conn, engine = get_db_connection()
    try:
        if engine == "mysql":
            cursor = conn.cursor()
            try:
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS {MYSQL_DATABASE}")
                cursor.execute(f"USE {MYSQL_DATABASE}")
                cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
            except Exception as e:
                logger.warning("MySQL database select issue: %s", e)

            statements = [
                """
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR(64) PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    salt VARCHAR(255) NOT NULL,
                    plan VARCHAR(32) DEFAULT 'free',
                    plan_expires_at DATETIME NULL,
                    role VARCHAR(32) DEFAULT 'user',
                    email_verified INT DEFAULT 0,
                    usage_count INT DEFAULT 0,
                    avatar_url TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """,
                """
                CREATE TABLE IF NOT EXISTS reset_codes (
                    id VARCHAR(64) PRIMARY KEY,
                    email VARCHAR(255) NOT NULL,
                    code VARCHAR(16) NOT NULL,
                    purpose VARCHAR(32) NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_reset_email (email)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """,
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    token VARCHAR(512) PRIMARY KEY,
                    user_id VARCHAR(64) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_session_user (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """,
                """
                CREATE TABLE IF NOT EXISTS coupons (
                    code VARCHAR(48) PRIMARY KEY,
                    plan VARCHAR(32) NOT NULL,
                    max_uses INT DEFAULT 1,
                    used_count INT DEFAULT 0,
                    redeemed_by VARCHAR(64) DEFAULT NULL,
                    redeemed_at DATETIME DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """,
                """
                CREATE TABLE IF NOT EXISTS history (
                    id VARCHAR(64) PRIMARY KEY,
                    user_id VARCHAR(64) NOT NULL,
                    original_text TEXT NOT NULL,
                    rewritten_text TEXT NOT NULL,
                    mode VARCHAR(32) NOT NULL,
                    level INT NOT NULL,
                    word_count INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_history_user (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """,
                """
                CREATE TABLE IF NOT EXISTS seo_settings (
                    page_slug VARCHAR(64) PRIMARY KEY,
                    page_name VARCHAR(128) NOT NULL,
                    meta_title VARCHAR(255),
                    meta_description TEXT,
                    keywords TEXT,
                    h1_title VARCHAR(255),
                    h2_subtitle TEXT,
                    canonical_url VARCHAR(255),
                    robots_index VARCHAR(64) DEFAULT 'index, follow',
                    og_title VARCHAR(255),
                    og_description TEXT,
                    og_image TEXT,
                    og_type VARCHAR(32) DEFAULT 'website',
                    twitter_card VARCHAR(32) DEFAULT 'summary_large_image',
                    twitter_site VARCHAR(64) DEFAULT '@cloakwriter',
                    schema_type VARCHAR(64) DEFAULT 'SoftwareApplication',
                    schema_json TEXT,
                    custom_head_tags TEXT,
                    google_verification VARCHAR(128),
                    bing_verification VARCHAR(128),
                    robots_txt TEXT,
                    sitemap_enabled INT DEFAULT 1,
                    custom_header_scripts TEXT,
                    custom_footer_scripts TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """,
                """
                CREATE TABLE IF NOT EXISTS orders (
                    order_id VARCHAR(64) PRIMARY KEY,
                    user_id VARCHAR(64) NOT NULL,
                    plan VARCHAR(32) NOT NULL,
                    amount INT NOT NULL,
                    currency VARCHAR(16) DEFAULT 'INR',
                    status VARCHAR(32) DEFAULT 'created',
                    payment_id VARCHAR(64) DEFAULT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_orders_user (user_id)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """
            ]
            for stmt in statements:
                try:
                    cursor.execute(stmt)
                except Exception as ex:
                    logger.info("MySQL table setup note: %s", ex)
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN plan_expires_at DATETIME")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(32) DEFAULT 'user'")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN email_verified INT DEFAULT 0")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN is_first_login INT DEFAULT 0")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE coupons ADD COLUMN max_uses INT DEFAULT 1")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE coupons ADD COLUMN used_count INT DEFAULT 0")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE sessions MODIFY token VARCHAR(512)")
            except Exception:
                pass
            conn.close()
        else:
            with conn:
                cursor = conn.cursor()
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        password_hash TEXT NOT NULL,
                        salt TEXT NOT NULL,
                        plan TEXT DEFAULT 'free',
                        plan_expires_at TIMESTAMP NULL,
                        role TEXT DEFAULT 'user',
                        email_verified INTEGER DEFAULT 0,
                        is_first_login INTEGER DEFAULT 0,
                        usage_count INTEGER DEFAULT 0,
                        avatar_url TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS reset_codes (
                        id TEXT PRIMARY KEY,
                        email TEXT NOT NULL,
                        code TEXT NOT NULL,
                        purpose TEXT NOT NULL,
                        expires_at TIMESTAMP NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS sessions (
                        token TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS coupons (
                        code TEXT PRIMARY KEY,
                        plan TEXT NOT NULL,
                        max_uses INTEGER DEFAULT 1,
                        used_count INTEGER DEFAULT 0,
                        redeemed_by TEXT DEFAULT NULL,
                        redeemed_at TIMESTAMP DEFAULT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS history (
                        id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        original_text TEXT NOT NULL,
                        rewritten_text TEXT NOT NULL,
                        mode TEXT NOT NULL,
                        level INTEGER NOT NULL,
                        word_count INTEGER DEFAULT 0,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS seo_settings (
                        page_slug TEXT PRIMARY KEY,
                        page_name TEXT NOT NULL,
                        meta_title TEXT,
                        meta_description TEXT,
                        keywords TEXT,
                        h1_title TEXT,
                        h2_subtitle TEXT,
                        canonical_url TEXT,
                        robots_index TEXT DEFAULT 'index, follow',
                        og_title TEXT,
                        og_description TEXT,
                        og_image TEXT,
                        og_type TEXT DEFAULT 'website',
                        twitter_card TEXT DEFAULT 'summary_large_image',
                        twitter_site TEXT DEFAULT '@cloakwriter',
                        schema_type TEXT DEFAULT 'SoftwareApplication',
                        schema_json TEXT,
                        custom_head_tags TEXT,
                        google_verification TEXT,
                        bing_verification TEXT,
                        robots_txt TEXT,
                        sitemap_enabled INTEGER DEFAULT 1,
                        custom_header_scripts TEXT,
                        custom_footer_scripts TEXT,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS orders (
                        order_id TEXT PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        plan TEXT NOT NULL,
                        amount INTEGER NOT NULL,
                        currency TEXT DEFAULT 'INR',
                        status TEXT DEFAULT 'created',
                        payment_id TEXT DEFAULT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """)
                try:
                    cursor.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT")
                except Exception:
                    pass
                try:
                    cursor.execute("ALTER TABLE users ADD COLUMN plan_expires_at TIMESTAMP")
                except Exception:
                    pass
                try:
                    cursor.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
                except Exception:
                    pass
                try:
                    cursor.execute("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0")
                except Exception:
                    pass
                try:
                    cursor.execute("ALTER TABLE users ADD COLUMN is_first_login INTEGER DEFAULT 0")
                except Exception:
                    pass
                try:
                    cursor.execute("ALTER TABLE coupons ADD COLUMN max_uses INTEGER DEFAULT 1")
                except Exception:
                    pass
                try:
                    cursor.execute("ALTER TABLE coupons ADD COLUMN used_count INTEGER DEFAULT 0")
                except Exception:
                    pass
    finally:
        if engine == "sqlite":
            conn.close()

    _seed_default_seo()


def _seed_default_seo():
    """Seeds rich default SEO configurations across all key pages if not present."""
    default_pages = [
        {
            "page_slug": "home",
            "page_name": "Landing Page (/)",
            "meta_title": "CloakWriter — #1 AI Humanizer & Bypass AI Detection Engine",
            "meta_description": "Transform ChatGPT, Claude, and Gemini text into 100% natural, undetectable human-written content. Bypass Turnitin, GPTZero, CopyLeaks, and Originality.ai effortlessly.",
            "keywords": "AI humanizer, bypass AI detection, humanize AI text, undetectable AI, bypass Turnitin, GPTZero bypass, AI to human text",
            "h1_title": "Transform AI Text into Undetectable Human Prose",
            "h2_subtitle": "Bypass every major AI detector with natural cadence, rich vocabulary, and 100% human authenticity.",
            "canonical_url": "https://cloakwriter.app",
            "robots_index": "index, follow, max-image-preview:large, max-snippet:-1",
            "og_title": "CloakWriter — The Most Advanced AI Humanizer",
            "og_description": "Effortlessly convert AI-generated writing into natural human text that passes every AI detector.",
            "og_image": "https://cloakwriter.app/og-image.png",
            "og_type": "website",
            "twitter_card": "summary_large_image",
            "twitter_site": "@cloakwriter",
            "schema_type": "SoftwareApplication",
            "schema_json": """{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "CloakWriter",
  "operatingSystem": "All",
  "applicationCategory": "UtilitiesApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "ratingCount": "1420"
  },
  "description": "Convert AI text from ChatGPT, Claude, and Gemini into natural human writing that passes every AI detector."
}""",
            "custom_head_tags": "",
            "google_verification": "",
            "bing_verification": "",
            "robots_txt": "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: https://cloakwriter.app/sitemap.xml",
            "sitemap_enabled": 1,
            "custom_header_scripts": "",
            "custom_footer_scripts": "",
        },
        {
            "page_slug": "dashboard",
            "page_name": "Humanizer Dashboard (/dashboard)",
            "meta_title": "AI Content Humanizer Dashboard — CloakWriter",
            "meta_description": "Paste and humanize your content in real-time. Choose from Standard, Fluency, Academic, and Creative modes with granular intensity controls.",
            "keywords": "humanizer dashboard, rewrite AI text, humanize content, AI detector bypass tool",
            "h1_title": "AI Content Humanizer",
            "h2_subtitle": "Paste your text below and convert it to natural, human-sounding prose in one click.",
            "canonical_url": "https://cloakwriter.app/dashboard",
            "robots_index": "index, follow",
            "og_title": "AI Content Humanizer — CloakWriter",
            "og_description": "Paste your AI text and convert it to natural, human-sounding prose in seconds.",
            "og_image": "https://cloakwriter.app/og-dashboard.png",
            "og_type": "website",
            "twitter_card": "summary_large_image",
            "twitter_site": "@cloakwriter",
            "schema_type": "WebApplication",
            "schema_json": """{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "CloakWriter Humanizer Dashboard",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "All",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  }
}""",
            "custom_head_tags": "",
            "google_verification": "",
            "bing_verification": "",
            "robots_txt": "",
            "sitemap_enabled": 1,
            "custom_header_scripts": "",
            "custom_footer_scripts": "",
        },
        {
            "page_slug": "login",
            "page_name": "Login Page (/login)",
            "meta_title": "Sign In to Your Account — CloakWriter",
            "meta_description": "Access your CloakWriter account to humanize documents, manage your subscription, and view rewriting history.",
            "keywords": "cloakwriter login, sign in, AI humanizer account",
            "h1_title": "Welcome Back to CloakWriter",
            "h2_subtitle": "Sign in to continue humanizing your AI text.",
            "canonical_url": "https://cloakwriter.app/login",
            "robots_index": "index, follow",
            "og_title": "Sign In — CloakWriter",
            "og_description": "Access your CloakWriter account and humanize documents.",
            "og_image": "https://cloakwriter.app/og-image.png",
            "og_type": "website",
            "twitter_card": "summary",
            "twitter_site": "@cloakwriter",
            "schema_type": "WebPage",
            "schema_json": """{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "CloakWriter Login"
}""",
            "custom_head_tags": "",
            "google_verification": "",
            "bing_verification": "",
            "robots_txt": "",
            "sitemap_enabled": 1,
            "custom_header_scripts": "",
            "custom_footer_scripts": "",
        },
        {
            "page_slug": "register",
            "page_name": "Sign Up Page (/register)",
            "meta_title": "Create Free Account — CloakWriter",
            "meta_description": "Get started with CloakWriter for free. Start transforming AI text into undetectable human writing in seconds.",
            "keywords": "cloakwriter sign up, create account, free AI humanizer",
            "h1_title": "Get Started with CloakWriter",
            "h2_subtitle": "Create an account to unlock advanced humanization modes.",
            "canonical_url": "https://cloakwriter.app/register",
            "robots_index": "index, follow",
            "og_title": "Create Free Account — CloakWriter",
            "og_description": "Get started with CloakWriter for free.",
            "og_image": "https://cloakwriter.app/og-image.png",
            "og_type": "website",
            "twitter_card": "summary",
            "twitter_site": "@cloakwriter",
            "schema_type": "WebPage",
            "schema_json": """{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "CloakWriter Sign Up"
}""",
            "custom_head_tags": "",
            "google_verification": "",
            "bing_verification": "",
            "robots_txt": "",
            "sitemap_enabled": 1,
            "custom_header_scripts": "",
            "custom_footer_scripts": "",
        },
        {
            "page_slug": "global",
            "page_name": "Global Site Defaults (All Pages)",
            "meta_title": "CloakWriter — Undetectable AI Writing Platform",
            "meta_description": "The leading platform for humanizing AI text and bypassing AI content detectors.",
            "keywords": "AI humanizer, bypass AI, undetectable text",
            "h1_title": "CloakWriter",
            "h2_subtitle": "Undetectable AI Text Humanizer",
            "canonical_url": "https://cloakwriter.app",
            "robots_index": "index, follow",
            "og_title": "CloakWriter",
            "og_description": "Undetectable AI Text Humanizer",
            "og_image": "https://cloakwriter.app/og-image.png",
            "og_type": "website",
            "twitter_card": "summary_large_image",
            "twitter_site": "@cloakwriter",
            "schema_type": "Organization",
            "schema_json": """{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "CloakWriter",
  "url": "https://cloakwriter.app",
  "logo": "https://cloakwriter.app/logo.png",
  "sameAs": [
    "https://twitter.com/cloakwriter"
  ]
}""",
            "custom_head_tags": "",
            "google_verification": "",
            "bing_verification": "",
            "robots_txt": "User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: https://cloakwriter.app/sitemap.xml",
            "sitemap_enabled": 1,
            "custom_header_scripts": "",
            "custom_footer_scripts": "",
        },
    ]

    conn, engine = get_db_connection()
    try:
        cursor = conn.cursor()
        for p in default_pages:
            try:
                check_q = _prepare_query("SELECT page_slug FROM seo_settings WHERE page_slug = %s", engine)
                cursor.execute(check_q, (p["page_slug"],))
                row = cursor.fetchone()
                if not row:
                    ins_q = _prepare_query(
                        """
                        INSERT INTO seo_settings (
                            page_slug, page_name, meta_title, meta_description, keywords,
                            h1_title, h2_subtitle, canonical_url, robots_index,
                            og_title, og_description, og_image, og_type,
                            twitter_card, twitter_site, schema_type, schema_json,
                            custom_head_tags, google_verification, bing_verification,
                            robots_txt, sitemap_enabled, custom_header_scripts, custom_footer_scripts
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        engine
                    )
                    cursor.execute(
                        ins_q,
                        (
                            p["page_slug"], p["page_name"], p["meta_title"], p["meta_description"], p["keywords"],
                            p["h1_title"], p["h2_subtitle"], p["canonical_url"], p["robots_index"],
                            p["og_title"], p["og_description"], p["og_image"], p["og_type"],
                            p["twitter_card"], p["twitter_site"], p["schema_type"], p["schema_json"],
                            p["custom_head_tags"], p["google_verification"], p["bing_verification"],
                            p["robots_txt"], p["sitemap_enabled"], p["custom_header_scripts"], p["custom_footer_scripts"]
                        )
                    )
            except Exception as seed_err:
                logger.warning("SEO seed note for %s: %s", p["page_slug"], seed_err)
        if hasattr(conn, 'commit'):
            conn.commit()
    finally:
        conn.close()



# ── Helper Query Wrappers ───────────────────────────────────────────────────

def _prepare_query(query: str, engine: str) -> str:
    if engine == "mysql":
        return query.replace("?", "%s")
    else:
        return query.replace("%s", "?")


# Initialize DB on module load
init_db()


def execute_query(query: str, params: tuple = ()):
    conn, engine = get_db_connection()
    try:
        cursor = conn.cursor()
        q = _prepare_query(query, engine)
        cursor.execute(q, params)
        if hasattr(conn, 'commit'):
            conn.commit()
    finally:
        conn.close()


def fetch_one(query: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
    conn, engine = get_db_connection()
    try:
        cursor = conn.cursor()
        q = _prepare_query(query, engine)
        cursor.execute(q, params)
        row = cursor.fetchone()
        if not row:
            return None
        if engine == "sqlite":
            return dict(row)
        return row
    finally:
        conn.close()


def fetch_all(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    conn, engine = get_db_connection()
    try:
        cursor = conn.cursor()
        q = _prepare_query(query, engine)
        cursor.execute(q, params)
        rows = cursor.fetchall()
        if engine == "sqlite":
            return [dict(r) for r in rows]
        return list(rows)
    finally:
        conn.close()


# ── Coupon Seeding ──────────────────────────────────────────────────────────

def seed_coupons():
    """
    Seed 10 cryptographically random coupon codes if the coupons table is empty.
    Codes use HUMYN- prefix + 16-char hex, making them impossible to guess.
    """
    existing = fetch_one("SELECT code FROM coupons LIMIT 1")
    if existing:
        logger.info("Coupons already seeded, skipping.")
        return

    # Distribution: 4 plus, 3 pro, 3 enterprise
    plan_distribution = (
        ['plus'] * 4 +
        ['pro'] * 3 +
        ['enterprise'] * 3
    )

    for plan in plan_distribution:
        code = f"HUMYN-{secrets.token_hex(8)}"
        execute_query(
            "INSERT INTO coupons (code, plan) VALUES (?, ?)",
            (code, plan)
        )
        logger.info("Seeded coupon: %s -> %s plan", code, plan)

    logger.info("Successfully seeded 10 coupon codes.")


seed_coupons()
