"""
Make-believe daily cash-flow data for four small shop types.

This file does not talk to any real shop. It invents numbers that still
follow real-life patterns (weekends, festivals, salary week, rain).
"""

# pandas = tables (rows and columns). numpy = random numbers and math.
import pandas as pd
import numpy as np
from pathlib import Path

# Same seed every time so you get the same CSV if you run the script again.
RANDOM_SEED = 42

# Separate seed for the cash drawer (withdrawals and unplanned costs)
# so new randomness does not change sales, udhaar, or everyday expenses.
DRAWER_SEED = 43

# Two full years of calendar days, inclusive on both ends.
START_DATE = "2024-11-01"
END_DATE = "2026-10-31"

# Festival days for both years. Dates are written by hand so a beginner
# can open this list and see exactly which days get a sales boost.
# Diwali 2024 was 31 Oct (just before our start), so we keep the leftover
# festive days in early November. Diwali 2026 falls after our end date,
# so late October 2026 is treated as pre-Diwali shopping.
FESTIVAL_DATES = pd.to_datetime(
    [
        # Diwali leftover 2024
        "2024-11-01",
        "2024-11-02",
        "2024-11-03",
        # Christmas 2024
        "2024-12-24",
        "2024-12-25",
        # Pongal 2025 (Bhogi, Thai Pongal, Mattu Pongal)
        "2025-01-14",
        "2025-01-15",
        "2025-01-16",
        # Eid al-Fitr 2025
        "2025-03-30",
        "2025-03-31",
        # Tamil New Year 2025
        "2025-04-14",
        # Eid al-Adha 2025
        "2025-06-06",
        "2025-06-07",
        # Diwali 2025
        "2025-10-18",
        "2025-10-19",
        "2025-10-20",
        "2025-10-21",
        # Christmas 2025
        "2025-12-24",
        "2025-12-25",
        # Pongal 2026
        "2026-01-14",
        "2026-01-15",
        "2026-01-16",
        # Eid al-Fitr 2026
        "2026-03-20",
        "2026-03-21",
        # Tamil New Year 2026
        "2026-04-14",
        # Eid al-Adha 2026
        "2026-05-26",
        "2026-05-27",
        # Pre-Diwali shopping 2026 (Diwali itself is 8 Nov 2026)
        "2026-10-25",
        "2026-10-26",
        "2026-10-27",
        "2026-10-28",
        "2026-10-29",
        "2026-10-30",
        "2026-10-31",
    ]
)

# Typical rupee levels for each shop. A tea stall is smaller than a kirana.
# weekend_mult > weekday_mult because weekends sell more.
# credit_share = how much of the day's sales is given as udhaar (not cash).
# collect_share = how much of leftover udhaar customers usually repay that day.
# cash_target_days = how many days of typical cash sales to leave in the till
# after the Sunday bank deposit. Tuned per shop so that between 8% and 12%
# of days fall below 3 days of average expenses (realistic low-cash alert days).
SHOP_SETTINGS = {
    "tea_stall": {
        "base_sales": 4500,
        "weekday_mult": 1.05,  # office crowd on weekdays
        "weekend_mult": 1.20,
        "credit_share": 0.08,
        "collect_share": 0.22,
        "cogs_share": 0.55,  # milk, tea, snacks
        "fixed_daily_expense": 200,
        "rent": 10000,
        "friday_restock": 2500,
        "opening_cash": 12000,
        "cash_target_days": 2.0,
    },
    "vegetable_shop": {
        "base_sales": 11000,
        "weekday_mult": 0.95,
        "weekend_mult": 1.40,  # people buy more veg for weekend cooking
        "credit_share": 0.12,
        "collect_share": 0.20,
        "cogs_share": 0.70,
        "fixed_daily_expense": 350,
        "rent": 15000,
        "friday_restock": 6000,
        "opening_cash": 22000,
        "cash_target_days": 3.0,
    },
    "tiffin_center": {
        "base_sales": 14000,
        "weekday_mult": 1.10,  # lunch crowd on working days
        "weekend_mult": 1.25,
        "credit_share": 0.15,
        "collect_share": 0.18,
        "cogs_share": 0.58,
        "fixed_daily_expense": 500,
        "rent": 22000,
        "friday_restock": 7000,
        "opening_cash": 28000,
        "cash_target_days": 1.7,
    },
    "kirana": {
        "base_sales": 22000,
        "weekday_mult": 1.00,
        "weekend_mult": 1.30,
        "credit_share": 0.20,  # neighbourhood udhaar is common
        "collect_share": 0.16,
        "cogs_share": 0.78,
        "fixed_daily_expense": 400,
        "rent": 30000,
        "friday_restock": 12000,
        "opening_cash": 55000,
        "cash_target_days": 5.2,
    },
}

# Put the CSV files in the data/ folder next to this project, not inside src/.
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def make_calendar(rng):
    """Build one shared calendar: dates, flags, and which days are rainy."""

    # Make every date from start to end, one row per day.
    dates = pd.date_range(START_DATE, END_DATE, freq="D")

    # Put those dates in a table so we can add extra columns.
    calendar = pd.DataFrame({"date": dates})

    # day_of_week is the English name (Monday, Tuesday, ...).
    calendar["day_of_week"] = calendar["date"].dt.day_name()

    # Weekend = Saturday or Sunday.
    calendar["is_weekend"] = calendar["day_of_week"].isin(["Saturday", "Sunday"]).astype(int)

    # Salary week: 1st to 7th of each month, people have more cash.
    calendar["is_month_start"] = (calendar["date"].dt.day <= 7).astype(int)

    # Festival flag: 1 if this date is in our festival list, else 0.
    calendar["is_festival"] = calendar["date"].isin(FESTIVAL_DATES).astype(int)

    # About 15% of days are rainy. Same rain calendar for every shop
    # (they are imagined to be in the same town).
    n_days = len(calendar)
    n_rainy = int(round(0.15 * n_days))
    rainy_positions = rng.choice(n_days, size=n_rainy, replace=False)
    calendar["is_rainy"] = 0
    calendar.loc[rainy_positions, "is_rainy"] = 1

    return calendar


def make_shop_rows(shop_type, settings, calendar, rng, rng_drawer):
    """Invent one row per day for a single shop type."""

    n_days = len(calendar)
    rows = []

    # Udhaar that customers still owe from earlier days (start at 0).
    udhaar_outstanding = 0.0

    # First pass: sales, udhaar, and shop expenses only.
    # We do not touch closing_cash here, so those rupee columns stay the same
    # even when we later change how the cash drawer is emptied or topped up.
    for i in range(n_days):
        day = calendar.iloc[i]
        date = day["date"]

        # Slow growth: about 5% more sales after one year.
        years_passed = i / 365.25
        trend_mult = 1.0 + 0.05 * years_passed

        # Weekends use a bigger multiplier than weekdays. Each shop is different.
        if day["is_weekend"] == 1:
            day_mult = settings["weekend_mult"]
        else:
            day_mult = settings["weekday_mult"]

        # Festival days sell 30% to 60% extra (random inside that range).
        if day["is_festival"] == 1:
            festival_mult = 1.0 + rng.uniform(0.30, 0.60)
        else:
            festival_mult = 1.0

        # Days 1-7: about 15% extra (salary / pension week).
        if day["is_month_start"] == 1:
            salary_mult = 1.15
        else:
            salary_mult = 1.0

        # Rainy days sell 10% to 25% less (people stay home).
        if day["is_rainy"] == 1:
            rain_mult = 1.0 - rng.uniform(0.10, 0.25)
        else:
            rain_mult = 1.0

        # Small random wiggle of about 8% to 12% so days are not too smooth.
        noise_size = rng.uniform(0.08, 0.12)
        noise_mult = 1.0 + rng.normal(0.0, noise_size)

        # Combine every effect. Keep sales from going negative if noise is wild.
        total_sales = (
            settings["base_sales"]
            * trend_mult
            * day_mult
            * festival_mult
            * salary_mult
            * rain_mult
            * noise_mult
        )
        total_sales = max(total_sales, 0.0)

        # Split today's sales into cash now vs udhaar given to customers.
        credit_given = int(round(total_sales * settings["credit_share"]))
        cash_sales = int(round(total_sales - credit_given))

        # Customers repay some old udhaar. They pay a bit more in salary week.
        collect_rate = settings["collect_share"]
        if day["is_month_start"] == 1:
            collect_rate = collect_rate + 0.10
        udhaar_collected = int(round(udhaar_outstanding * collect_rate))
        # Never collect more than what is still owed.
        udhaar_collected = min(udhaar_collected, int(round(udhaar_outstanding)))
        udhaar_outstanding = max(udhaar_outstanding + credit_given - udhaar_collected, 0.0)

        # Everyday shop costs: goods sold + current/gas. Rent and restock added next.
        shop_costs = total_sales * settings["cogs_share"] + settings["fixed_daily_expense"]

        # Rent (or a big supplier bill) hits on the 1st of the month.
        if date.day == 1:
            shop_costs = shop_costs + settings["rent"]

        # Friday restocking: extra stock bought for the weekend.
        if day["day_of_week"] == "Friday":
            shop_costs = shop_costs + settings["friday_restock"]

        shop_costs = int(round(shop_costs))

        # Shop expenses only (stock, rent, Friday restock). Owner money
        # in/out is stored in separate columns later, not mixed in here.
        expenses = shop_costs

        rows.append(
            {
                "date": date.strftime("%Y-%m-%d"),
                "shop_type": shop_type,
                "cash_sales": cash_sales,
                "credit_given": credit_given,
                "udhaar_collected": udhaar_collected,
                "expenses": expenses,
                "is_festival": int(day["is_festival"]),
                "is_month_start": int(day["is_month_start"]),
                "is_weekend": int(day["is_weekend"]),
                "day_of_week": day["day_of_week"],
                "is_rainy": int(day["is_rainy"]),
            }
        )

    shop_table = pd.DataFrame(rows)

    # Second pass: run the cash drawer using the sales and expenses we just made.
    return fill_cash_drawer(shop_table, settings, rng_drawer)


def fill_cash_drawer(shop_table, settings, rng_drawer):
    """Turn daily sales and expenses into a till balance that stays in a band.

    Think of the shop like a real cash drawer:
    - During the week, cash moves with sales, udhaar collected, and expenses.
    - Surprise costs happen about twice a month (repairs, sudden inventory, family needs).
    - On Sundays, the owner may take some surplus cash home (60% chance, 50-100% of surplus).
    - If cash would go below zero, the owner puts money back in to reach ₹500.
    """

    # Typical daily cash sales and daily expenses for this shop.
    avg_cash_sales = shop_table["cash_sales"].mean()
    avg_expenses = shop_table["expenses"].mean()
    cash_target = int(round(settings["cash_target_days"] * avg_cash_sales))

    # Start the till near the target so early weeks are not a special case.
    closing_cash = cash_target

    withdrawals = []
    outflows = []
    topups = []
    closings = []

    # About 2 surprise outflow events per month (~6.6% chance per day).
    prob_surprise = 2.0 / 30.4

    for i in range(len(shop_table)):
        row = shop_table.iloc[i]

        # 1. Unplanned surprise expense: ~2 times a month, between 0.5 and 1.5 days of avg expenses.
        if rng_drawer.random() < prob_surprise:
            surprise_days = rng_drawer.uniform(0.5, 1.5)
            unplanned_outflow = int(round(surprise_days * avg_expenses))
        else:
            unplanned_outflow = 0

        # 2. Today's business cash before owner transactions or surprise costs.
        cash_after_business = (
            closing_cash
            + int(row["cash_sales"])
            + int(row["udhaar_collected"])
            - int(row["expenses"])
        )

        # 3. Sunday withdrawal: 60% chance the owner withdraws 50% to 100% of the surplus above target.
        owner_withdrawal = 0
        if row["day_of_week"] == "Sunday":
            if rng_drawer.random() < 0.6:
                surplus = cash_after_business - cash_target
                if surplus > 0:
                    skim_pct = rng_drawer.uniform(0.50, 1.00)
                    owner_withdrawal = int(round(surplus * skim_pct))

        # 4. Subtract Sunday withdrawal and unplanned surprise outflow.
        cash_after_draws = cash_after_business - owner_withdrawal - unplanned_outflow

        # 5. Emergency top-up: if cash would go below 0, bring it up to ₹500.
        owner_topup = 0
        if cash_after_draws < 0:
            owner_topup = 500 - cash_after_draws

        closing_cash = cash_after_draws + owner_topup

        withdrawals.append(int(owner_withdrawal))
        outflows.append(int(unplanned_outflow))
        topups.append(int(owner_topup))
        closings.append(int(closing_cash))

    shop_table = shop_table.copy()
    shop_table["owner_withdrawal"] = withdrawals
    shop_table["unplanned_outflow"] = outflows
    shop_table["owner_topup"] = topups
    shop_table["closing_cash"] = closings

    # Put money columns next to each other so the CSV is easy to read.
    column_order = [
        "date",
        "shop_type",
        "cash_sales",
        "credit_given",
        "udhaar_collected",
        "expenses",
        "owner_withdrawal",
        "unplanned_outflow",
        "owner_topup",
        "closing_cash",
        "is_festival",
        "is_month_start",
        "is_weekend",
        "day_of_week",
        "is_rainy",
    ]
    return shop_table[column_order]


def print_cash_report(shop_table):
    """Print min/mean/max cash, low-cash days, and top-up days for one shop."""

    shop_type = shop_table["shop_type"].iloc[0]
    cash = shop_table["closing_cash"]
    avg_expenses = shop_table["expenses"].mean()
    n_days = len(shop_table)

    pct_1x = 100.0 * (cash < 1 * avg_expenses).sum() / n_days
    pct_2x = 100.0 * (cash < 2 * avg_expenses).sum() / n_days
    pct_3x = 100.0 * (cash < 3 * avg_expenses).sum() / n_days

    n_topup = int((shop_table["owner_topup"] > 0).sum())
    sundays = shop_table[shop_table["day_of_week"] == "Sunday"]
    n_withdrawals = int((sundays["owner_withdrawal"] > 0).sum())

    print(f"\n{shop_type}")
    print(f"  closing_cash min/mean/max: {int(cash.min())} / {int(round(cash.mean()))} / {int(cash.max())}")
    print(f"  % days below 1 / 2 / 3 days of avg expenses: {pct_1x:.1f}% / {pct_2x:.1f}% / {pct_3x:.1f}%")
    print(f"  owner_topup days: {n_topup}")
    print(f"  Sundays with withdrawal: {n_withdrawals} / {len(sundays)}")


def main():
    """Create four shop CSVs plus one combined file."""

    # One random-number engine for calendar and shop sales/expenses.
    rng = np.random.default_rng(RANDOM_SEED)

    # Separate random-number engine for cash drawer withdrawals and surprise outflows.
    rng_drawer = np.random.default_rng(DRAWER_SEED)

    # Shared dates and flags (festival, weekend, rain, salary week).
    calendar = make_calendar(rng)

    # Make sure the data/ folder exists before we save files.
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Build each shop, save it, and keep a copy for the combined file.
    all_shops = []
    for shop_type, settings in SHOP_SETTINGS.items():
        shop_table = make_shop_rows(shop_type, settings, calendar, rng, rng_drawer)
        out_path = DATA_DIR / f"{shop_type}.csv"
        shop_table.to_csv(out_path, index=False)
        print(f"Saved {out_path} ({len(shop_table)} rows)")
        print_cash_report(shop_table)
        all_shops.append(shop_table)

    # One file with every shop stacked together, useful for later notebooks.
    combined = pd.concat(all_shops, ignore_index=True)
    combined_path = DATA_DIR / "all_shops.csv"
    combined.to_csv(combined_path, index=False)
    print(f"Saved {combined_path} ({len(combined)} rows)")


# This runs only when you type: python src/generate_data.py
if __name__ == "__main__":
    main()
