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

            # Seed Udhaar demo customers ONLY when the udhaar table is completely empty
            udhaar_count = conn.execute("SELECT COUNT(*) AS c FROM udhaar").fetchone()["c"]
            if udhaar_count == 0:
                print("\n--> Seeding demo Udhaar credit records...")
                # Fetch shop IDs by type
                shops_by_type = {
                    r["shop_type"]: r["id"]
                    for r in conn.execute("SELECT id, shop_type FROM shops").fetchall()
                }

                demo_udhaar_records = []

                # 1. Tea Stall (6 demo customers: monthly office pass, tea tokens, snacks)
                ts_id = shops_by_type.get("tea_stall")
                if ts_id:
                    demo_udhaar_records.extend([
                        (ts_id, "Ravi Auto Driver", 450.0, 150.0, "2026-11-02", "2026-11-12", "Weekly tea & biscuit tab", "open"),
                        (ts_id, "Sharma Tailors", 1200.0, 0.0, "2026-11-05", "2026-11-15", "Shop staff evening tea", "open"),
                        (ts_id, "Kumar Electrician", 350.0, 0.0, "2026-11-14", "2026-11-20", "Tea and vadai", "open"),
                        (ts_id, "Deepak Courier", 600.0, 200.0, "2026-11-16", "2026-11-26", "Monthly tea account", "open"),
                        (ts_id, "Mani Plumber", 250.0, 0.0, "2026-11-18", None, "Snacks & ginger tea", "open"),
                        (ts_id, "Suresh Xerox", 500.0, 500.0, "2026-10-25", "2026-11-05", "Cleared on Monday", "closed"),
                    ])

                # 2. Vegetable Shop (6 demo customers: restaurant orders, neighbors)
                vs_id = shops_by_type.get("vegetable_shop")
                if vs_id:
                    demo_udhaar_records.extend([
                        (vs_id, "Hotel Sangeetha", 3200.0, 1000.0, "2026-11-03", "2026-11-10", "Bulk onions & tomatoes", "open"),
                        (vs_id, "Lakshmi Amma (3rd Cross)", 850.0, 0.0, "2026-11-06", "2026-11-16", "Weekly kitchen veggies", "open"),
                        (vs_id, "Ganesh Fast Food", 1800.0, 500.0, "2026-11-10", "2026-11-20", "Cabbage, capsicum sacks", "open"),
                        (vs_id, "Meena Teacher", 650.0, 0.0, "2026-11-15", "2026-11-25", "Monthly greens and veggies", "open"),
                        (vs_id, "Appu Juice Shop", 1400.0, 0.0, "2026-11-17", None, "Mint and ginger box", "open"),
                        (vs_id, "Karthik Caterer", 2500.0, 2500.0, "2026-10-28", "2026-11-08", "Function supply (settled)", "closed"),
                    ])

                # 3. Tiffin Center (6 demo customers: hostel students, regular breakfast)
                tc_id = shops_by_type.get("tiffin_center")
                if tc_id:
                    demo_udhaar_records.extend([
                        (tc_id, "Vignesh (Hostel #4)", 2100.0, 600.0, "2026-11-01", "2026-11-11", "Monthly mess fees balance", "open"),
                        (tc_id, "Sri Ram Builders", 4500.0, 1500.0, "2026-11-04", "2026-11-14", "Worker lunch packets (20 nos)", "open"),
                        (tc_id, "Pooja Software", 1250.0, 0.0, "2026-11-09", "2026-11-20", "Daily tiffin dabba", "open"),
                        (tc_id, "Anbarasan Driver", 700.0, 200.0, "2026-11-15", "2026-11-27", "Idli and parotta pack", "open"),
                        (tc_id, "Balaji Gym", 1600.0, 0.0, "2026-11-18", None, "Egg whites and chapati pass", "open"),
                        (tc_id, "Murugesh Mason", 1100.0, 1100.0, "2026-10-29", "2026-11-05", "Cleared on Diwali eve", "closed"),
                    ])

                # 4. Kirana Store (10 demo customers: family monthly khata / grocery accounts)
                ks_id = shops_by_type.get("kirana")
                if ks_id:
                    demo_udhaar_records.extend([
                        (ks_id, "Ramesh Kumar (House 12)", 5500.0, 1500.0, "2026-11-02", "2026-11-12", "Monthly rice, oil, atta pack", "open"),
                        (ks_id, "Senthil Auto Consultant", 8200.0, 2000.0, "2026-11-03", "2026-11-13", "House grocery and provisions", "open"),
                        (ks_id, "Radha Akka (Flat 2B)", 3400.0, 0.0, "2026-11-07", "2026-11-17", "Ghee, dry fruits and masala", "open"),
                        (ks_id, "Muthu Carpenter", 2800.0, 800.0, "2026-11-11", "2026-11-20", "Provisions and detergent box", "open"),
                        (ks_id, "Dr. Arvind Clinic", 6200.0, 0.0, "2026-11-12", "2026-11-22", "Coffee, sugar, soap packs", "open"),
                        (ks_id, "Kala Madam (School)", 4100.0, 1000.0, "2026-11-14", "2026-11-25", "Snacks and stationery groceries", "open"),
                        (ks_id, "Saravanan Painter", 1950.0, 0.0, "2026-11-16", "2026-11-28", "Rice bag & cooking oil", "open"),
                        (ks_id, "Shanthi Tailor", 2200.0, 0.0, "2026-11-18", None, "Monthly dal, tamarind, spices", "open"),
                        (ks_id, "Naveen IT Student", 1500.0, 1500.0, "2026-10-26", "2026-11-06", "Hostel snacks (settled in full)", "closed"),
                        (ks_id, "Pravin Bakery", 9000.0, 9000.0, "2026-10-20", "2026-11-01", "Maida and sugar bags (paid)", "closed"),
                    ])

                conn.executemany(
                    """
                    INSERT INTO udhaar (
                        shop_id, customer_name, amount_given, amount_paid,
                        given_date, due_date, note, status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    demo_udhaar_records,
                )
                print(f"✓ Seeded {len(demo_udhaar_records)} demo udhaar credit records across all 4 shops.")
            else:
                print(f"ℹ Udhaar table already has {udhaar_count} records. Keeping existing data.")

        print("\n--> Database seeding completed successfully!")
    finally:
        conn.close()


if __name__ == "__main__":
    seed_database()
