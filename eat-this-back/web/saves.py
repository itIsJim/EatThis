"""Server-side saved-recipes store (replaces the former localStorage list).

Keyed by an anonymous session cookie; SQLite, same data directory as auth.
"""
import os
import sqlite3
import threading
import uuid
from pathlib import Path

DB_PATH = Path(os.environ.get("SAVES_DB_PATH",
                              Path(__file__).resolve().parent.parent / "data" / "app.db"))

_lock = threading.Lock()


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _lock, _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS saves (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sid TEXT NOT NULL,
                recipe TEXT NOT NULL,
                image TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_saves_sid ON saves(sid)")


def new_sid() -> str:
    return uuid.uuid4().hex


def add_save(sid: str, recipe: str, image: str) -> None:
    with _lock, _connect() as conn:
        conn.execute("INSERT INTO saves (sid, recipe, image) VALUES (?, ?, ?)",
                     (sid, recipe, image))
        # keep at most 20 per session (images are large data URIs)
        conn.execute("""
            DELETE FROM saves WHERE sid = ? AND id NOT IN (
                SELECT id FROM saves WHERE sid = ? ORDER BY id DESC LIMIT 20
            )
        """, (sid, sid))


def list_saves(sid: str) -> list[sqlite3.Row]:
    with _connect() as conn:
        return conn.execute(
            "SELECT id, recipe, image, created_at FROM saves WHERE sid = ? ORDER BY id DESC",
            (sid,),
        ).fetchall()


def delete_save(sid: str, save_id: int) -> None:
    with _lock, _connect() as conn:
        conn.execute("DELETE FROM saves WHERE sid = ? AND id = ?", (sid, save_id))
