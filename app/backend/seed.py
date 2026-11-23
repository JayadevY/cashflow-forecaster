"""
Database seed script for Daily Cash-Flow Forecaster.

This script sets up demo data in SQLite:
1. Creates the database tables if they do not exist.
2. Registers 4 realistic neighborhood demo shops (one per business type):
   - Murugan Tea Stall (tea_stall)
   - Kavitha Vegetable Mart (vegetable_shop)
   - Amma Tiffin Center (tiffin_center)
   - Lakshmi Grocery Store (kirana)
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
        "name": "Lakshmi Grocery Store",
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

            # Fetch shop IDs by type for referencing foreign keys
            shops_by_type = {
                r["shop_type"]: r["id"]
                for r in conn.execute("SELECT id, shop_type FROM shops").fetchall()
            }
            ts_id = shops_by_type.get("tea_stall")
            vs_id = shops_by_type.get("vegetable_shop")
            tc_id = shops_by_type.get("tiffin_center")
            ks_id = shops_by_type.get("kirana")

            # Seed Udhaar demo customers ONLY when the udhaar table is completely empty
            udhaar_count = conn.execute("SELECT COUNT(*) AS c FROM udhaar").fetchone()["c"]
            if udhaar_count == 0:
                print("\n--> Seeding demo Udhaar credit records...")
                demo_udhaar_records = []

                # 1. Tea Stall (6 demo customers: monthly office pass, tea tokens, snacks)
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

                # 4. Grocery Store (10 demo customers: family monthly khata / grocery accounts)
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

            # Seed demo transactions ONLY when the transactions table is completely empty
            tx_count = conn.execute("SELECT COUNT(*) AS c FROM transactions").fetchone()["c"]
            if tx_count == 0:
                print("\n--> Seeding demo live transactions for today...")
                today_str = pd.Timestamp.now().strftime("%Y-%m-%d")

                # Times throughout the business day
                times = [
                    "07:30:00", "08:15:00", "08:50:00", "09:20:00", "10:05:00",
                    "10:45:00", "11:30:00", "12:15:00", "13:00:00", "14:20:00",
                    "15:10:00", "16:00:00", "16:45:00", "17:30:00", "18:15:00"
                ]

                demo_tx_records = []

                # 1. Tea Stall (15 tx: cash & UPI)
                if ts_id:
                    amounts_modes = [
                        (20.0, "cash", "manual", "Morning tea"),
                        (40.0, "upi", "simulated", "Tea & samosa"),
                        (30.0, "cash", "manual", "Ginger tea x 2"),
                        (60.0, "upi", "simulated", "Office break tea"),
                        (15.0, "cash", "manual", "Single tea"),
                        (25.0, "cash", "manual", "Filter coffee"),
                        (50.0, "upi", "simulated", "Snacks & tea"),
                        (120.0, "upi", "simulated", "Parcel order"),
                        (40.0, "cash", "manual", "Tea & biscuit"),
                        (80.0, "upi", "simulated", "GPay quick pay"),
                        (25.0, "cash", "manual", "Lemon tea"),
                        (35.0, "upi", "simulated", "Evening boost"),
                        (100.0, "upi", "simulated", "Office tray"),
                        (15.0, "cash", "manual", "Tea"),
                        (70.0, "upi", "simulated", "Tea & vadai"),
                    ]
                    for idx, (amt, mode, src, note) in enumerate(amounts_modes):
                        created_at = f"{today_str}T{times[idx]}"
                        ref = f"TS-{today_str.replace('-', '')}-{idx+1:03d}"
                        demo_tx_records.append((ts_id, created_at, amt, mode, src, "success", ref, note))

                # 2. Vegetable Mart (15 tx: cash & UPI)
                if vs_id:
                    amounts_modes = [
                        (140.0, "cash", "manual", "Tomato and onions"),
                        (320.0, "upi", "simulated", "Vegetable bag"),
                        (85.0, "cash", "manual", "Greens & coriander"),
                        (260.0, "upi", "simulated", "Potatoes & beans"),
                        (190.0, "cash", "manual", "Carrot and ginger"),
                        (450.0, "upi", "simulated", "Full basket"),
                        (95.0, "cash", "manual", "Mint & curry leaf"),
                        (380.0, "upi", "simulated", "Weekly kitchen veggies"),
                        (150.0, "cash", "manual", "Cabbage & cauliflower"),
                        (520.0, "upi", "simulated", "PhonePe payment"),
                        (110.0, "cash", "manual", "Drumstick & gourd"),
                        (280.0, "upi", "simulated", "Evening veg pack"),
                        (350.0, "upi", "simulated", "Salad essentials"),
                        (75.0, "cash", "manual", "Lemons & chilli"),
                        (420.0, "upi", "simulated", "Customer QR scan"),
                    ]
                    for idx, (amt, mode, src, note) in enumerate(amounts_modes):
                        created_at = f"{today_str}T{times[idx]}"
                        ref = f"VM-{today_str.replace('-', '')}-{idx+1:03d}"
                        demo_tx_records.append((vs_id, created_at, amt, mode, src, "success", ref, note))

                # 3. Tiffin Center (15 tx: cash, UPI, card)
                if tc_id:
                    amounts_modes = [
                        (90.0, "cash", "manual", "Idli & vadai"),
                        (160.0, "upi", "simulated", "Masala dosa combo"),
                        (70.0, "cash", "manual", "Poori bhaji"),
                        (240.0, "upi", "simulated", "Family breakfast"),
                        (350.0, "card", "simulated", "Card tap - brunch"),
                        (120.0, "cash", "manual", "Lunch thali"),
                        (180.0, "upi", "simulated", "Mini meal parcel"),
                        (260.0, "upi", "simulated", "GPay quick counter"),
                        (80.0, "cash", "manual", "Coffee & vada"),
                        (420.0, "upi", "simulated", "Office meal parcel"),
                        (110.0, "cash", "manual", "Rava dosa"),
                        (150.0, "upi", "simulated", "Evening snacks"),
                        (290.0, "card", "simulated", "Dinner order"),
                        (190.0, "cash", "manual", "Parotta set"),
                        (310.0, "upi", "simulated", "Paytm scan"),
                    ]
                    for idx, (amt, mode, src, note) in enumerate(amounts_modes):
                        created_at = f"{today_str}T{times[idx]}"
                        ref = f"TC-{today_str.replace('-', '')}-{idx+1:03d}"
                        demo_tx_records.append((tc_id, created_at, amt, mode, src, "success", ref, note))

                # 4. Grocery Store (15 tx: mix of cash, UPI, card, netbanking)
                if ks_id:
                    amounts_modes = [
                        (180.0, "cash", "manual", "Milk & bread"),
                        (450.0, "upi", "simulated", "Rice pack 5kg"),
                        (850.0, "upi", "simulated", "Cooking oil & spices"),
                        (1450.0, "card", "simulated", "Provisions debit card"),
                        (320.0, "cash", "manual", "Detergent & soap"),
                        (95.0, "cash", "manual", "Biscuits & tea"),
                        (2100.0, "upi", "simulated", "Monthly khata partial pay"),
                        (680.0, "upi", "simulated", "Ghee & sugar"),
                        (1250.0, "netbanking", "simulated", "Wholesale supplier netbanking"),
                        (390.0, "cash", "manual", "Pulses and atta"),
                        (1750.0, "card", "simulated", "Groceries credit card"),
                        (720.0, "upi", "simulated", "Dry fruits pack"),
                        (430.0, "cash", "manual", "Sundry items"),
                        (1500.0, "upi", "simulated", "PhonePe counter"),
                        (290.0, "cash", "manual", "Toothpaste & shampoo"),
                    ]
                    for idx, (amt, mode, src, note) in enumerate(amounts_modes):
                        created_at = f"{today_str}T{times[idx]}"
                        ref = f"KS-{today_str.replace('-', '')}-{idx+1:03d}"
                        demo_tx_records.append((ks_id, created_at, amt, mode, src, "success", ref, note))

                conn.executemany(
                    """
                    INSERT INTO transactions (
                        shop_id, created_at, amount, mode, source,
                        status, reference, customer_note
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    demo_tx_records,
                )
                print(f"✓ Seeded {len(demo_tx_records)} demo live transactions across all 4 shops for {today_str}.")
            else:
                print(f"ℹ Transactions table already has {tx_count} records. Keeping existing data.")

        print("\n--> Database seeding completed successfully!")
    finally:
        conn.close()


if __name__ == "__main__":
    seed_database()
