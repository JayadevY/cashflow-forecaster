"""
Database seed script for Daily Cash-Flow Forecaster.

This script sets up demo data in SQLite:
1. Creates the database tables if they do not exist.
2. Registers 4 realistic neighborhood demo shops (one per business type):
   - Murugan Tea Stall (tea_stall)
   - Kavitha Vegetable Mart (vegetable_shop)
   - Amma Tiffin Center (tiffin_center)
   - Lakshmi Kirana Store (kirana)
3. Loads the last 365 days of historical transactions from data/<shop_type>.csv
   into daily_entries for each shop.
"""

import sys
from pathlib import Path
import sqlite3
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.backend.db import init_db, get_connection, get_db_path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"

# Demo shop configurations
DEMO_SHOPS = [
    {
        "name": "Murugan Tea Stall",
        "shop_type": "tea_stall",
        "csv_file": "tea_stall.csv",
    },
    {
        "name": "Kavitha Vegetable Mart",
        "shop_type": "vegetable_shop",
        "csv_file": "vegetable_shop.csv",
    },
    {
        "name": "Amma Tiffin Center",
        "shop_type": "tiffin_center",
        "csv_file": "tiffin_center.csv",
    },
    {
        "name": "Lakshmi Kirana Store",
        "shop_type": "kirana",
        "csv_file": "kirana.csv",
    },
]


def seed_database(db_path: Path = None) -> None:
    """
    Populate the SQLite database with 4 demo shops and 365 days of historical entries each.
    """
    target_path = db_path or get_db_path()
    print(f"--> Initializing database tables at: {target_path}")
    init_db(target_path)

    conn = get_connection(target_path)

    try:
        with conn:
            for shop_info in DEMO_SHOPS:
                csv_path = DATA_DIR / shop_info["csv_file"]
                if not csv_path.exists():
                    print(f"Warning: {csv_path} not found. Skipping {shop_info['name']}.")
                    continue

                df = pd.read_csv(csv_path)

                # We extract the last 365 days of history for each shop
                df_365 = df.iloc[-365:].copy().reset_index(drop=True)

                # Prior closing cash before day 1 of the 365-day slice
                prev_closing = float(df.iloc[-366]["closing_cash"]) if len(df) > 365 else float(df_365["closing_cash"].iloc[0])

                # Default 3-day expenses threshold
                avg_daily_expenses = float(df_365["expenses"].mean())
                threshold = float(round(3.0 * avg_daily_expenses))

                # Check if this demo shop already exists
                existing = conn.execute(
                    "SELECT id FROM shops WHERE shop_type = ?", (shop_info["shop_type"],)
                ).fetchone()

                if existing:
                    shop_id = existing["id"]
                    # Update shop details
                    conn.execute(
                        """
                        UPDATE shops
                        SET name = ?, low_cash_threshold = ?, opening_cash = ?
                        WHERE id = ?
                        """,
                        (shop_info["name"], threshold, prev_closing, shop_id),
                    )
                    # Clear out old entries for a clean re-seed
                    conn.execute("DELETE FROM daily_entries WHERE shop_id = ?", (shop_id,))
                else:
                    # Insert new shop
                    cursor = conn.execute(
                        """
                        INSERT INTO shops (name, shop_type, low_cash_threshold, opening_cash)
                        VALUES (?, ?, ?, ?)
                        """,
                        (shop_info["name"], shop_info["shop_type"], threshold, prev_closing),
                    )
                    shop_id = cursor.lastrowid

                # Bulk insert the last 365 days into daily_entries
                entries_to_insert = []
                for _, row in df_365.iterrows():
                    entries_to_insert.append((
                        shop_id,
                        str(row["date"]),
                        float(row["cash_sales"]),
                        float(row.get("credit_given", 0.0)),
                        float(row.get("udhaar_collected", 0.0)),
                        float(row["expenses"]),
                        float(row.get("owner_withdrawal", 0.0)),
                        float(row.get("unplanned_outflow", 0.0)),
                        float(row["closing_cash"]),
                    ))

                conn.executemany(
                    """
                    INSERT INTO daily_entries (
                        shop_id, date, cash_sales, credit_given, udhaar_collected,
                        expenses, owner_withdrawal, unplanned_outflow, closing_cash
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    entries_to_insert,
                )

                start_date = df_365["date"].iloc[0]
                end_date = df_365["date"].iloc[-1]
                latest_cash = float(df_365["closing_cash"].iloc[-1])
                print(
                    f"✓ Seeded shop #{shop_id} [{shop_info['name']}] ({shop_info['shop_type']}): "
                    f"{len(entries_to_insert)} days ({start_date} to {end_date}) | "
                    f"Threshold: Rs {int(threshold):,} | Latest Cash: Rs {int(latest_cash):,}"
                )

        print("\n--> Database seeding completed successfully!")
    finally:
        conn.close()


if __name__ == "__main__":
    seed_database()
