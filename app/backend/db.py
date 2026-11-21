"""
Database configuration and SQLite helpers for Daily Cash-Flow Forecaster.

This module connects to the local SQLite database file, creates tables if
they do not exist yet, and provides helper functions to run SQL queries safely.
"""

import os
import sqlite3
from pathlib import Path
from typing import Generator

# Define where the SQLite database file lives on disk.
# Default location: app/backend/cashflow.db
BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR / "cashflow.db"


def get_db_path() -> Path:
    """
    Get the path to the SQLite database file.
    Can be overridden by setting the CASHFLOW_DB_PATH environment variable
    (this is very helpful for isolated tests).
    """
    env_path = os.getenv("CASHFLOW_DB_PATH")
    if env_path:
        return Path(env_path)
    return DEFAULT_DB_PATH


def get_connection(db_path: Path = None) -> sqlite3.Connection:
    """
    Create and return a new SQLite database connection.
    - Enables foreign key constraints so relations stay valid.
    - Sets row_factory = sqlite3.Row so we can access columns by name (like row['cash_sales']).
    """
    path = db_path or get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def init_db(db_path: Path = None) -> None:
    """
    Initialize database tables and indexes if they do not already exist.

    Tables created:
    1. shops: stores shop profiles (name, business type, opening cash, risk threshold)
    2. daily_entries: stores each day's sales, collections, expenses, and cash balance
    3. planned_payments: stores future bills or planned supplier payments entered by the owner
    """
    path = db_path or get_db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = get_connection(path)

    with conn:
        # Table 1: Shops
        conn.execute("""
            CREATE TABLE IF NOT EXISTS shops (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                shop_type TEXT NOT NULL,
                low_cash_threshold REAL,
                opening_cash REAL NOT NULL DEFAULT 0.0
            );
        """)

        # Table 2: Daily Entries
        # UNIQUE(shop_id, date) ensures a shop cannot have duplicate rows for the same date.
        conn.execute("""
            CREATE TABLE IF NOT EXISTS daily_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                shop_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                cash_sales REAL NOT NULL,
                credit_given REAL NOT NULL DEFAULT 0.0,
                udhaar_collected REAL NOT NULL DEFAULT 0.0,
                expenses REAL NOT NULL,
                owner_withdrawal REAL NOT NULL DEFAULT 0.0,
                unplanned_outflow REAL NOT NULL DEFAULT 0.0,
                closing_cash REAL NOT NULL,
                digital_sales REAL DEFAULT 0.0,
                transaction_cash_sales REAL DEFAULT 0.0,
                FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
                UNIQUE(shop_id, date)
            );
        """)

        # Migration helper for existing daily_entries tables missing digital_sales or transaction_cash_sales
        columns = [row["name"] for row in conn.execute("PRAGMA table_info(daily_entries)").fetchall()]
        if "digital_sales" not in columns:
            conn.execute("ALTER TABLE daily_entries ADD COLUMN digital_sales REAL DEFAULT 0.0;")
        if "transaction_cash_sales" not in columns:
            conn.execute("ALTER TABLE daily_entries ADD COLUMN transaction_cash_sales REAL DEFAULT 0.0;")

        # Table 3: Planned Payments
        conn.execute("""
            CREATE TABLE IF NOT EXISTS planned_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                shop_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                amount REAL NOT NULL,
                note TEXT,
                FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
            );
        """)

        # Table 4: Udhaar (Customer Credit Tracker)
        # Keeps track of money owed by customers to the shopkeeper
        conn.execute("""
            CREATE TABLE IF NOT EXISTS udhaar (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                shop_id INTEGER NOT NULL,
                customer_name TEXT NOT NULL,
                amount_given REAL NOT NULL,
                amount_paid REAL NOT NULL DEFAULT 0.0,
                given_date TEXT NOT NULL,
                due_date TEXT,
                note TEXT,
                status TEXT NOT NULL DEFAULT 'open',
                FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
            );
        """)

        # Table 5: Transactions (Live and recorded shop payments)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                shop_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                amount REAL NOT NULL,
                mode TEXT NOT NULL CHECK(mode IN ('cash', 'upi', 'card', 'netbanking')),
                source TEXT NOT NULL CHECK(source IN ('manual', 'simulated', 'gateway')),
                status TEXT NOT NULL DEFAULT 'success' CHECK(status IN ('success', 'failed', 'pending')),
                reference TEXT UNIQUE,
                customer_note TEXT,
                FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
            );
        """)

        # Helpful indexes for fast queries
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_daily_entries_shop_date
            ON daily_entries(shop_id, date);
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_planned_payments_shop_date
            ON planned_payments(shop_id, date);
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_udhaar_shop_status
            ON udhaar(shop_id, status);
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_udhaar_shop_due
            ON udhaar(shop_id, due_date);
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_transactions_shop_created
            ON transactions(shop_id, created_at);
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_transactions_shop_mode
            ON transactions(shop_id, mode);
        """)

    conn.close()


def get_db():
    """
    FastAPI dependency that yields an active database connection
    and closes it when the request is finished.
    """
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()
