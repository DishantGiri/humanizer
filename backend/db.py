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
                cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(32) DEFAULT 'user'")
            except Exception:
                pass
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN email_verified INT DEFAULT 0")
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
                        role TEXT DEFAULT 'user',
                        email_verified INTEGER DEFAULT 0,
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
                try:
                    cursor.execute("ALTER TABLE users ADD COLUMN avatar_url TEXT")
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

# Initialize DB on module load
init_db()

# ── Helper Query Wrappers ───────────────────────────────────────────────────

def _prepare_query(query: str, engine: str) -> str:
    if engine == "mysql":
        return query.replace("?", "%s")
    else:
        return query.replace("%s", "?")


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

    # Distribution: 4 starter, 3 plus, 3 pro
    plan_distribution = (
        ['starter'] * 4 +
        ['plus'] * 3 +
        ['pro'] * 3
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
