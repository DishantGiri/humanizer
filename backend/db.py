"""
Database abstraction layer supporting MySQL with automatic SQLite fallback.
"""

import os
import sqlite3
import logging
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# MySQL connection configuration from environment
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "humanizer_db")

SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), "humanizer.db")

_use_mysql = False

try:
    import pymysql
    import pymysql.cursors
    # Test if MySQL environment is explicitly configured or reachable
    if os.getenv("MYSQL_HOST") or os.getenv("USE_MYSQL") == "true":
        conn_test = pymysql.connect(
            host=MYSQL_HOST,
            port=MYSQL_PORT,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            connect_timeout=2
        )
        conn_test.close()
        _use_mysql = True
        logger.info("Connected to MySQL server at %s:%d", MYSQL_HOST, MYSQL_PORT)
except Exception as e:
    logger.info("MySQL connection unavailable (%s). Falling back to embedded database.", e)
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
                    usage_count INT DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
                """,
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    token VARCHAR(64) PRIMARY KEY,
                    user_id VARCHAR(64) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_session_user (user_id)
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
                        usage_count INTEGER DEFAULT 0,
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
