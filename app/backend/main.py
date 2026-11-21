"""
FastAPI Backend Application for Daily Cash-Flow Forecaster.

This server provides REST API endpoints for:
1. Registering and listing shops
2. Logging daily shopkeeper entries (with automatic closing cash calculation)
3. Viewing past entries
4. Managing upcoming planned payments (bills/rent/supplies)
5. Updating safety thresholds
6. Generating 7-day cash forecasts (AI-powered with basic fallback)
7. Simulating 'what-if' expense scenarios to find the safest payment day
8. System health check
"""

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import numpy as np
import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
import sqlite3

# Ensure project root is on Python path so we can import src.forecast
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.forecast import forecast_cash_risk, FESTIVAL_DATES, collect_cv_residuals, get_best_model_name
from app.backend.db import get_connection, get_db, init_db
from app.backend.insights import build_tips
from app.backend.seed import seed_database
from app.backend.schemas import (
    DailyEntryCreate,
    DailyEntryOut,
    ForecastDayOut,
    ForecastResponse,
    HealthResponse,
    PlannedPaymentCreate,
    PlannedPaymentOut,
    ShopCreate,
    ShopOut,
    ShopSettingsUpdate,
    WhatIfResponse,
    UdhaarCreate,
    UdhaarPaymentCreate,
    UdhaarOut,
    UdhaarSummaryResponse,
    TipOut,
)

# Initialize FastAPI application
app = FastAPI(
    title="Daily Cash-Flow Forecaster API",
    description="Probabilistic cash-flow forecasting and early-warning alerts for small businesses.",
    version="1.0.0",
)

# Read allowed CORS origins from an env var CORS_ORIGINS (comma separated),
# defaulting to http://localhost:5173,http://localhost:5174
cors_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5174")
allowed_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]
# Add 127.0.0.1 equivalents for local convenience if localhost is included
if "http://localhost:5173" in allowed_origins and "http://127.0.0.1:5173" not in allowed_origins:
    allowed_origins.append("http://127.0.0.1:5173")
if "http://localhost:5174" in allowed_origins and "http://127.0.0.1:5174" not in allowed_origins:
    allowed_origins.append("http://127.0.0.1:5174")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory forecast cache: maps shop_id -> cached ForecastResponse dict
# Cache is cleared whenever daily entries, planned payments, or settings are modified.
_forecast_cache: Dict[int, dict] = {}
# Residuals cache: caches time-series cross-validation residuals per shop so repeated runs and what-if calls are fast
_residual_cache: Dict[int, dict] = {}


def clear_shop_cache(shop_id: int) -> None:
    """Invalidate cached forecast results for a shop when its data changes."""
    _forecast_cache.pop(shop_id, None)
    _residual_cache.pop(shop_id, None)


@app.on_event("startup")
def on_startup():
    """Ensure database tables exist and auto-run demo seed if database has no shops."""
    init_db()
    # Check if database has no shops (e.g. fresh Render deployment or first run)
    if os.getenv("DISABLE_AUTO_SEED", "").lower() not in ("1", "true", "yes"):
        conn = get_connection()
        try:
            shop_count = conn.execute("SELECT COUNT(*) AS c FROM shops").fetchone()["c"]
            if shop_count == 0:
                print("--> Fresh instance detected (no shops in DB). Auto-running demo seed...")
                seed_database()
        except Exception as e:
            print(f"Warning: Auto-seed on startup failed: {e}")
        finally:
            conn.close()


# ============================================================================
# 8. Health Check Endpoint
# ============================================================================

@app.get("/health", response_model=HealthResponse, tags=["System"])
def health_check():
    """Simple ping endpoint to check that the API service is up and running."""
    return {"status": "ok", "app": "CashFlow Forecaster API"}


# ============================================================================
# 1. Shop Endpoints: Create & List
# ============================================================================

@app.post("/shops", response_model=ShopOut, status_code=status.HTTP_201_CREATED, tags=["Shops"])
def create_shop(shop_in: ShopCreate, db: sqlite3.Connection = Depends(get_db)):
    """Register a new shop profile."""
    with db:
        cursor = db.execute(
            """
            INSERT INTO shops (name, shop_type, low_cash_threshold, opening_cash)
            VALUES (?, ?, ?, ?)
            """,
            (shop_in.name, shop_in.shop_type, shop_in.low_cash_threshold, shop_in.opening_cash),
        )
        shop_id = cursor.lastrowid
        row = db.execute("SELECT * FROM shops WHERE id = ?", (shop_id,)).fetchone()
    return dict(row)


@app.get("/shops", response_model=List[ShopOut], tags=["Shops"])
def list_shops(db: sqlite3.Connection = Depends(get_db)):
    """List all registered shops."""
    rows = db.execute("SELECT * FROM shops ORDER BY id ASC").fetchall()
    return [dict(r) for r in rows]


# ============================================================================
# 2 & 3. Daily Entries: Add/Update & View
# ============================================================================

@app.post("/shops/{shop_id}/entries", response_model=DailyEntryOut, tags=["Daily Entries"])
def add_or_update_entry(
    shop_id: int, entry_in: DailyEntryCreate, db: sqlite3.Connection = Depends(get_db)
):
    """
    Add or update a daily record for a shop.

    Business Rules:
    1. The owner provides only cash sales, credit given, udhaar collected, expenses,
       and optional owner withdrawal.
    2. The server automatically calculates closing_cash based on the previous day's closing cash.
    3. Any existing entries occurring AFTER this date will have their closing cash recalculated
       so the till balance chain remains 100% mathematically consistent.
    4. Clears the shop's forecast cache.
    """
    shop = db.execute("SELECT * FROM shops WHERE id = ?", (shop_id,)).fetchone()
    if not shop:
        raise HTTPException(status_code=404, detail=f"Shop #{shop_id} not found.")

    with db:
        # Step A: Find the most recent closing cash before this entry's date
        prior_entry = db.execute(
            """
            SELECT closing_cash FROM daily_entries
            WHERE shop_id = ? AND date < ?
            ORDER BY date DESC LIMIT 1
            """,
            (shop_id, entry_in.date),
        ).fetchone()

        prev_cash = float(prior_entry["closing_cash"]) if prior_entry else float(shop["opening_cash"])

        # Step B: Check if an entry for this date already exists (to preserve unplanned_outflow if set)
        existing = db.execute(
            "SELECT id, unplanned_outflow FROM daily_entries WHERE shop_id = ? AND date = ?",
            (shop_id, entry_in.date),
        ).fetchone()

        unplanned = float(existing["unplanned_outflow"]) if existing else 0.0

        # Step C: Compute today's closing cash
        # Formula: previous closing + cash sales + udhaar collected - expenses - owner withdrawal - unplanned outflow
        computed_closing = (
            prev_cash
            + entry_in.cash_sales
            + entry_in.udhaar_collected
            - entry_in.expenses
            - entry_in.owner_withdrawal
            - unplanned
        )

        if existing:
            # Update existing entry
            db.execute(
                """
                UPDATE daily_entries
                SET cash_sales = ?, credit_given = ?, udhaar_collected = ?,
                    expenses = ?, owner_withdrawal = ?, closing_cash = ?
                WHERE shop_id = ? AND date = ?
                """,
                (
                    entry_in.cash_sales,
                    entry_in.credit_given,
                    entry_in.udhaar_collected,
                    entry_in.expenses,
                    entry_in.owner_withdrawal,
                    computed_closing,
                    shop_id,
                    entry_in.date,
                ),
            )
            entry_id = existing["id"]
        else:
            # Insert new entry
            cursor = db.execute(
                """
                INSERT INTO daily_entries (
                    shop_id, date, cash_sales, credit_given, udhaar_collected,
                    expenses, owner_withdrawal, unplanned_outflow, closing_cash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    shop_id,
                    entry_in.date,
                    entry_in.cash_sales,
                    entry_in.credit_given,
                    entry_in.udhaar_collected,
                    entry_in.expenses,
                    entry_in.owner_withdrawal,
                    unplanned,
                    computed_closing,
                ),
            )
            entry_id = cursor.lastrowid

        # Step D: Recalculate closing cash for any subsequent days in order
        subsequent_rows = db.execute(
            """
            SELECT id, cash_sales, udhaar_collected, expenses, owner_withdrawal, unplanned_outflow
            FROM daily_entries
            WHERE shop_id = ? AND date > ?
            ORDER BY date ASC
            """,
            (shop_id, entry_in.date),
        ).fetchall()

        running_cash = computed_closing
        for sub in subsequent_rows:
            running_cash = (
                running_cash
                + float(sub["cash_sales"])
                + float(sub["udhaar_collected"])
                - float(sub["expenses"])
                - float(sub["owner_withdrawal"])
                - float(sub["unplanned_outflow"])
            )
            db.execute(
                "UPDATE daily_entries SET closing_cash = ? WHERE id = ?",
                (running_cash, sub["id"]),
            )

        # Clear cache for this shop since new data arrived
        clear_shop_cache(shop_id)

        saved = db.execute("SELECT * FROM daily_entries WHERE id = ?", (entry_id,)).fetchone()

    return dict(saved)


@app.get("/shops/{shop_id}/entries", response_model=List[DailyEntryOut], tags=["Daily Entries"])
def get_shop_entries(
    shop_id: int, days: int = Query(30, ge=1, le=1000), db: sqlite3.Connection = Depends(get_db)
):
    """Retrieve recent transaction entries for a shop, sorted with newest first."""
    shop = db.execute("SELECT id FROM shops WHERE id = ?", (shop_id,)).fetchone()
    if not shop:
        raise HTTPException(status_code=404, detail=f"Shop #{shop_id} not found.")

    rows = db.execute(
        """
        SELECT * FROM daily_entries
        WHERE shop_id = ?
        ORDER BY date DESC
        LIMIT ?
        """,
        (shop_id, days),
    ).fetchall()
    return [dict(r) for r in rows]


# ============================================================================
# 4. Planned Payments: Add, List, Delete
# ============================================================================

@app.post(
    "/shops/{shop_id}/planned-payments",
    response_model=PlannedPaymentOut,
    status_code=status.HTTP_201_CREATED,
    tags=["Planned Payments"],
)
def add_planned_payment(
    shop_id: int, payment_in: PlannedPaymentCreate, db: sqlite3.Connection = Depends(get_db)
):
    """Log an upcoming supplier bill or fixed payment."""
    shop = db.execute("SELECT id FROM shops WHERE id = ?", (shop_id,)).fetchone()
    if not shop:
        raise HTTPException(status_code=404, detail=f"Shop #{shop_id} not found.")

    # Validate date is a real YYYY-MM-DD date and not more than 60 days ahead
    try:
        parsed_date = datetime.strptime(payment_in.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=422, detail="date must be a real YYYY-MM-DD date")

    if payment_in.date != parsed_date.strftime("%Y-%m-%d"):
        raise HTTPException(status_code=422, detail="date must be a real YYYY-MM-DD date")

    latest_row = db.execute(
        "SELECT MAX(date) AS max_date FROM daily_entries WHERE shop_id = ?",
        (shop_id,),
    ).fetchone()
    if latest_row and latest_row["max_date"]:
        ref_date = datetime.strptime(str(latest_row["max_date"]), "%Y-%m-%d").date()
    else:
        ref_date = datetime.today().date()

    max_allowed_date = ref_date + timedelta(days=60)
    if parsed_date > max_allowed_date:
        raise HTTPException(
            status_code=422,
            detail=(
                f"date cannot be more than 60 days ahead "
                f"(latest allowed: {max_allowed_date.strftime('%Y-%m-%d')})"
            ),
        )

    with db:
        cursor = db.execute(
            """
            INSERT INTO planned_payments (shop_id, date, amount, note)
            VALUES (?, ?, ?, ?)
            """,
            (shop_id, payment_in.date, payment_in.amount, payment_in.note),
        )
        payment_id = cursor.lastrowid
        clear_shop_cache(shop_id)
        row = db.execute("SELECT * FROM planned_payments WHERE id = ?", (payment_id,)).fetchone()

    return dict(row)


@app.get(
    "/shops/{shop_id}/planned-payments",
    response_model=List[PlannedPaymentOut],
    tags=["Planned Payments"],
)
def list_planned_payments(shop_id: int, db: sqlite3.Connection = Depends(get_db)):
    """List all future planned payments recorded for this shop."""
    shop = db.execute("SELECT id FROM shops WHERE id = ?", (shop_id,)).fetchone()
    if not shop:
        raise HTTPException(status_code=404, detail=f"Shop #{shop_id} not found.")

    rows = db.execute(
        """
        SELECT * FROM planned_payments
        WHERE shop_id = ?
        ORDER BY date ASC
        """,
        (shop_id,),
    ).fetchall()
    return [dict(r) for r in rows]


@app.delete("/shops/{shop_id}/planned-payments/{payment_id}", tags=["Planned Payments"])
def delete_planned_payment(
    shop_id: int, payment_id: int, db: sqlite3.Connection = Depends(get_db)
):
    """Delete a planned payment by ID."""
    with db:
        row = db.execute(
            "SELECT id FROM planned_payments WHERE id = ? AND shop_id = ?",
            (payment_id, shop_id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Planned payment #{payment_id} not found.")

        db.execute("DELETE FROM planned_payments WHERE id = ?", (payment_id,))
        clear_shop_cache(shop_id)

    return {"status": "deleted", "id": payment_id}


@app.delete("/shops/{shop_id}/planned-payments", tags=["Planned Payments"])
def delete_planned_payment_by_query(
    shop_id: int, payment_id: Optional[int] = Query(None), db: sqlite3.Connection = Depends(get_db)
):
    """Delete planned payment(s) via query parameter."""
    with db:
        if payment_id is not None:
            row = db.execute(
                "SELECT id FROM planned_payments WHERE id = ? AND shop_id = ?",
                (payment_id, shop_id),
            ).fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"Planned payment #{payment_id} not found.")
            db.execute("DELETE FROM planned_payments WHERE id = ?", (payment_id,))
            clear_shop_cache(shop_id)
            return {"status": "deleted", "id": payment_id}
        else:
            db.execute("DELETE FROM planned_payments WHERE shop_id = ?", (shop_id,))
            clear_shop_cache(shop_id)
            return {"status": "deleted_all", "shop_id": shop_id}


# ============================================================================
# 5. Shop Settings: Update Safety Threshold
# ============================================================================

@app.put("/shops/{shop_id}/settings", response_model=ShopOut, tags=["Shops"])
def update_shop_settings(
    shop_id: int, settings: ShopSettingsUpdate, db: sqlite3.Connection = Depends(get_db)
):
    """Update low-cash alert threshold or name for a shop."""
    shop = db.execute("SELECT * FROM shops WHERE id = ?", (shop_id,)).fetchone()
    if not shop:
        raise HTTPException(status_code=404, detail=f"Shop #{shop_id} not found.")

    new_threshold = settings.low_cash_threshold if settings.low_cash_threshold is not None else shop["low_cash_threshold"]
    new_name = settings.name if settings.name is not None else shop["name"]

    with db:
        db.execute(
            "UPDATE shops SET low_cash_threshold = ?, name = ? WHERE id = ?",
            (new_threshold, new_name, shop_id),
        )
        clear_shop_cache(shop_id)
        updated = db.execute("SELECT * FROM shops WHERE id = ?", (shop_id,)).fetchone()

    return dict(updated)


# ============================================================================
# 6. Forecast Endpoint: 7-Day Risk & Alert Engine
# ============================================================================

def _compute_basic_forecast(
    shop: sqlite3.Row,
    entries: List[sqlite3.Row],
    planned_dict: Dict[str, float],
    threshold: float,
) -> dict:
    """
    Generate a simple moving-average fallback forecast when fewer than 60 days
    of transaction history are available.
    """
    df = pd.DataFrame([dict(e) for e in entries])
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    last_date = df["date"].iloc[-1]
    target_dates = [last_date + pd.Timedelta(days=h) for h in range(1, 8)]
    start_cash = float(df["closing_cash"].iloc[-1])

    # Simple historical averages
    avg_sales = float(df["cash_sales"].mean()) if len(df) > 0 else 5000.0
    avg_expenses = float(df["expenses"].mean()) if len(df) > 0 else 3000.0
    avg_udhaar = float(df.get("udhaar_collected", pd.Series([0])).mean())

    forecast_days = []
    curr_cash = start_cash

    for h, td in enumerate(target_dates, start=1):
        td_str = td.strftime("%Y-%m-%d")
        dow_str = td.day_name()
        plan_pay = float(planned_dict.get(td_str, 0.0))

        # Carry forward cash
        curr_cash = curr_cash + avg_sales + avg_udhaar - avg_expenses - plan_pay

        # Pessimistic / optimistic bands via square-root of horizon uncertainty
        uncertainty = avg_sales * 0.15 * (h ** 0.5)
        c_p50 = round(curr_cash, 1)
        c_p10 = round(curr_cash - uncertainty, 1)
        c_p90 = round(curr_cash + uncertainty, 1)

        s_p50 = round(avg_sales, 1)
        s_p10 = round(avg_sales * 0.85, 1)
        s_p90 = round(avg_sales * 1.15, 1)

        # Basic risk estimation based on distance to threshold
        if c_p10 >= threshold:
            risk_pct = 5.0
            alert_level = "green"
            msg = f"Cash safe ({risk_pct:.0f}% risk below Rs {int(round(threshold)):,} on {dow_str})."
        elif c_p50 >= threshold:
            risk_pct = 35.0
            alert_level = "amber"
            msg = f"{risk_pct:.0f}% chance cash drops below Rs {int(round(threshold)):,} on {dow_str}."
        else:
            risk_pct = 85.0
            alert_level = "red"
            msg = f"{risk_pct:.0f}% chance cash drops below Rs {int(round(threshold)):,} on {dow_str}."

        forecast_days.append({
            "date": td_str,
            "sales_p10": s_p10,
            "sales_p50": s_p50,
            "sales_p90": s_p90,
            "cash_p10": c_p10,
            "cash_p50": c_p50,
            "cash_p90": c_p90,
            "risk_pct": risk_pct,
            "alert_level": alert_level,
            "alert_message": msg,
        })

    return {
        "shop_id": shop["id"],
        "shop_name": shop["name"],
        "shop_type": shop["shop_type"],
        "mode": "basic",
        "message": f"Only {len(df)} days of history recorded. Showing basic moving-average projection. Record at least 60 days to unlock AI models and empirical risk simulations.",
        "data_ends_on": last_date.strftime("%Y-%m-%d"),
        "start_cash": start_cash,
        "threshold": threshold,
        "forecast": forecast_days,
    }


def _compute_full_forecast(
    shop: sqlite3.Row,
    entries: List[sqlite3.Row],
    planned_dict: Dict[str, float],
    threshold: float,
) -> dict:
    """
    Generate full 7-day probabilistic ML forecast using forecast_cash_risk from src/forecast.py.
    """
    df = pd.DataFrame([dict(e) for e in entries])
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values("date").reset_index(drop=True)

    # Prepare required calendar features for ARIMA/XGBoost
    df["day_of_week"] = df["date"].dt.day_name()
    df["is_weekend"] = df["day_of_week"].isin(["Saturday", "Sunday"]).astype(int)
    df["is_month_start"] = (df["date"].dt.day <= 7).astype(int)
    df["is_festival"] = df["date"].dt.strftime("%Y-%m-%d").isin(FESTIVAL_DATES).astype(int)

    last_date = df["date"].iloc[-1]
    start_cash = float(df["closing_cash"].iloc[-1])

    # Check cached residuals for speed
    shop_id = shop["id"]
    residuals = _residual_cache.get(shop_id)
    if residuals is None:
        model_name = get_best_model_name(shop["shop_type"])
        residuals = collect_cv_residuals(df, model_name, n_splits=6)
        _residual_cache[shop_id] = residuals

    # Run forecast engine
    forecast_df = forecast_cash_risk(
        history_df=df,
        shop_type=shop["shop_type"],
        start_cash=start_cash,
        planned_payments=planned_dict,
        threshold=threshold,
        residuals_by_horizon=residuals,
    )

    forecast_days = forecast_df.to_dict(orient="records")

    return {
        "shop_id": shop["id"],
        "shop_name": shop["name"],
        "shop_type": shop["shop_type"],
        "mode": "full",
        "message": "Full 7-day probabilistic ML forecast generated successfully.",
        "data_ends_on": last_date.strftime("%Y-%m-%d"),
        "start_cash": start_cash,
        "threshold": threshold,
        "forecast": forecast_days,
    }


class ForecastResponseWithDataEnd(ForecastResponse):
    """Forecast response extended with the date of the latest recorded entry."""
    data_ends_on: str


@app.get("/shops/{shop_id}/forecast", response_model=ForecastResponseWithDataEnd, tags=["Forecasting"])
def get_shop_forecast(shop_id: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Return the 7-day cash forecast and low-cash alerts for a shop.

    - Uses cached results if no entries have been added since the last call.
    - If < 60 days of entries, returns 'mode': 'basic' with moving average.
    - If >= 60 days, runs the full probabilistic model ('mode': 'full').
    """
    # 1. Return cached forecast if available
    if shop_id in _forecast_cache:
        return _forecast_cache[shop_id]

    # 2. Check shop
    shop = db.execute("SELECT * FROM shops WHERE id = ?", (shop_id,)).fetchone()
    if not shop:
        raise HTTPException(status_code=404, detail=f"Shop #{shop_id} not found.")

    # 3. Fetch history
    entries = db.execute(
        "SELECT * FROM daily_entries WHERE shop_id = ? ORDER BY date ASC", (shop_id,)
    ).fetchall()

    if not entries:
        raise HTTPException(
            status_code=400,
            detail=f"Shop #{shop_id} has no daily entries recorded yet. Add daily transactions first.",
        )

    # 4. Fetch planned payments
    p_rows = db.execute(
        "SELECT date, amount FROM planned_payments WHERE shop_id = ?", (shop_id,)
    ).fetchall()
    planned_dict = {str(r["date"]): float(r["amount"]) for r in p_rows}

    # 5. Determine threshold
    threshold = shop["low_cash_threshold"]
    if threshold is None or threshold <= 0:
        exp_vals = [float(e["expenses"]) for e in entries[-90:]]
        threshold = float(round(3.0 * np.mean(exp_vals)))

    # 6. Branch on history length
    if len(entries) < 60:
        result = _compute_basic_forecast(shop, entries, planned_dict, threshold)
    else:
        result = _compute_full_forecast(shop, entries, planned_dict, threshold)

    # 7. Store in cache
    _forecast_cache[shop_id] = result
    return result


# ============================================================================
# 7. What-If Scenario Endpoint: Test a Future Payment
# ============================================================================

@app.get("/shops/{shop_id}/what-if", response_model=WhatIfResponse, tags=["Forecasting"])
def what_if_payment_scenario(
    shop_id: int,
    date: str = Query(..., description="Hypothetical payment date (YYYY-MM-DD)"),
    amount: float = Query(..., gt=0, description="Hypothetical payment amount in rupees"),
    db: sqlite3.Connection = Depends(get_db),
):
    """
    Simulate what happens if the owner makes a large payment of `amount` on `date`.

    Validates input BEFORE running any simulation:
    - `amount` must be greater than 0 (HTTP 422).
    - `date` must be a real YYYY-MM-DD date inside the 7-day forecast window (HTTP 422).

    Evaluates:
    1. The 7-day risk trajectory if paid on `date`.
    2. Which day within the 7-day forecast window is the safest (lowest peak risk) to pay it.
    3. A clear verdict:
       - "too_large" if peak risk stays above 80% on EVERY day of the 7-day window
       - "better_day_exists" if moving the payment to another day lowers peak risk
       - "ok" if the chosen day is already the safest day
    4. "max_safe_amount": the largest payment (in Rs 1,000 steps, up to current cash)
       on `date` that keeps peak risk under 20% (or 0 only if even Rs 1,000 is unsafe).
    """
    if amount <= 0:
        raise HTTPException(status_code=422, detail="amount must be greater than 0")

    shop = db.execute("SELECT * FROM shops WHERE id = ?", (shop_id,)).fetchone()
    if not shop:
        raise HTTPException(status_code=404, detail=f"Shop #{shop_id} not found.")

    entries = db.execute(
        "SELECT * FROM daily_entries WHERE shop_id = ? ORDER BY date ASC", (shop_id,)
    ).fetchall()

    if not entries:
        # Still validate date format before reporting missing history
        try:
            parsed_check = datetime.strptime(date, "%Y-%m-%d").date()
            if date != parsed_check.strftime("%Y-%m-%d"):
                raise ValueError
        except ValueError:
            raise HTTPException(status_code=422, detail="date must be a real YYYY-MM-DD date")
        raise HTTPException(status_code=400, detail="No entries available for what-if simulation.")

    # Compute the 7-day forecast window and validate `date` BEFORE running any model
    last_dt = datetime.strptime(str(entries[-1]["date"]), "%Y-%m-%d").date()
    window_start = last_dt + timedelta(days=1)
    window_end = last_dt + timedelta(days=7)
    window_start_str = window_start.strftime("%Y-%m-%d")
    window_end_str = window_end.strftime("%Y-%m-%d")

    try:
        parsed_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail=f"date must be YYYY-MM-DD and inside the forecast window ({window_start_str} to {window_end_str})",
        )

    if date != parsed_date.strftime("%Y-%m-%d") or not (window_start <= parsed_date <= window_end):
        raise HTTPException(
            status_code=422,
            detail=f"date must be YYYY-MM-DD and inside the forecast window ({window_start_str} to {window_end_str})",
        )

    # Base planned payments already saved in the database
    p_rows = db.execute(
        "SELECT date, amount FROM planned_payments WHERE shop_id = ?", (shop_id,)
    ).fetchall()
    base_plans = {str(r["date"]): float(r["amount"]) for r in p_rows}

    threshold = shop["low_cash_threshold"]
    if threshold is None or threshold <= 0:
        exp_vals = [float(e["expenses"]) for e in entries[-90:]]
        threshold = float(round(3.0 * np.mean(exp_vals)))

    def _run_sim(pay_date: str, pay_amount: float) -> List[dict]:
        """Helper: add a hypothetical payment on `pay_date` and return the 7-day forecast rows."""
        plans = base_plans.copy()
        plans[pay_date] = plans.get(pay_date, 0.0) + pay_amount
        if len(entries) < 60:
            res = _compute_basic_forecast(shop, entries, plans, threshold)
        else:
            res = _compute_full_forecast(shop, entries, plans, threshold)
        return res["forecast"]

    def _peak_risk(pay_date: str, pay_amount: float) -> float:
        """Helper: return the maximum daily risk_pct across the 7-day horizon."""
        return max(r["risk_pct"] for r in _run_sim(pay_date, pay_amount))

    # Step 1: Simulate paying `amount` on the owner's requested date
    req_forecast = _run_sim(date, amount)
    req_peak_risk = max(row["risk_pct"] for row in req_forecast)

    # Step 2: Check every day in the 7-day forecast window to find the safest day
    candidate_dates = [row["date"] for row in req_forecast]
    candidate_peaks: Dict[str, float] = {}
    best_day = date
    best_peak_risk = req_peak_risk

    for cand_date in candidate_dates:
        if cand_date == date:
            cand_peak = req_peak_risk
        else:
            cand_peak = _peak_risk(cand_date, amount)

        candidate_peaks[cand_date] = cand_peak
        if cand_peak < best_peak_risk:
            best_peak_risk = cand_peak
            best_day = cand_date

    # Step 3: Find max_safe_amount (steps of Rs 1,000, up to current cash) keeping peak risk < 20%
    # If the requested amount is already safe (< 20%), ensure upper bound covers at least `amount`.
    start_cash = float(entries[-1]["closing_cash"])
    upper_cap_rupees = max(start_cash, amount if req_peak_risk < 20.0 else 0.0)
    max_k = int(upper_cap_rupees // 1000)

    if max_k < 1 or _peak_risk(date, 1000.0) >= 20.0:
        # Even Rs 1,000 keeps or pushes peak risk to >= 20%
        max_safe_amount = 0
    elif _peak_risk(date, float(max_k * 1000)) < 20.0:
        # Paying up to the full current cash cap still keeps peak risk under 20%
        max_safe_amount = max_k * 1000
    else:
        # Binary search between `low` (known < 20% risk) and `high` (known >= 20% risk)
        if req_peak_risk < 20.0:
            low = max(1, int(amount // 1000))
            high = max_k
        else:
            low = 1
            high = min(max_k, max(2, int(np.ceil(amount / 1000.0))))

        while low + 1 < high:
            mid = (low + high) // 2
            if _peak_risk(date, float(mid * 1000)) < 20.0:
                low = mid
            else:
                high = mid

        max_safe_amount = low * 1000

    # Step 4: Decide verdict and build plain-language recommendation
    all_days_high_risk = all(p > 80.0 for p in candidate_peaks.values())

    if all_days_high_risk:
        verdict = "too_large"
        rec = (
            f"Rs {int(round(amount)):,} is too large for your cash this week. "
            "Risk stays high on every day. Consider paying a smaller amount or splitting it into parts."
        )
    elif best_day != date and best_peak_risk < req_peak_risk:
        verdict = "better_day_exists"
        rec = (
            f"Paying Rs {int(round(amount)):,} on {date} causes a peak cash risk of {req_peak_risk:.0f}%. "
            f"The safest day to pay is {best_day}, where peak risk drops to {best_peak_risk:.0f}%."
        )
    else:
        verdict = "ok"
        rec = (
            f"Paying Rs {int(round(amount)):,} on {date} has a peak risk of {req_peak_risk:.0f}%. "
            "This is already the safest timing within the 7-day window."
        )

    return {
        "shop_id": shop_id,
        "target_date": date,
        "amount": amount,
        "verdict": verdict,
        "max_safe_amount": max_safe_amount,
        "current_date_peak_risk": round(req_peak_risk, 1),
        "safest_day": best_day,
        "safest_day_peak_risk": round(best_peak_risk, 1),
        "recommendation": rec,
        "forecast": req_forecast,
    }


# ============================================================================
# 9. Udhaar (Customer Credit Tracker) Endpoints
# ============================================================================

def _format_udhaar_row(row: sqlite3.Row) -> dict:
    """Helper to convert a database row into an UdhaarOut dictionary with balance and days_overdue."""
    given = float(row["amount_given"])
    paid = float(row["amount_paid"])
    balance = round(max(0.0, given - paid), 2)

    days_overdue = 0
    if row["due_date"] and row["status"] == "open":
        try:
            due_dt = datetime.strptime(str(row["due_date"]), "%Y-%m-%d").date()
            today_dt = datetime.today().date()
            if due_dt < today_dt:
                days_overdue = (today_dt - due_dt).days
        except ValueError:
            pass

    return {
        "id": row["id"],
        "shop_id": row["shop_id"],
        "customer_name": row["customer_name"],
        "amount_given": given,
        "amount_paid": paid,
        "balance": balance,
        "given_date": str(row["given_date"]),
        "due_date": str(row["due_date"]) if row["due_date"] else None,
        "days_overdue": days_overdue,
        "note": str(row["note"]) if row["note"] else None,
        "status": row["status"],
    }


@app.post(
    "/shops/{shop_id}/udhaar",
    response_model=UdhaarOut,
    status_code=status.HTTP_201_CREATED,
    tags=["Udhaar Tracker"],
)
def add_udhaar_entry(
    shop_id: int, entry_in: UdhaarCreate, db: sqlite3.Connection = Depends(get_db)
):
    """Record credit (udhaar) given to a customer."""
    shop = db.execute("SELECT id FROM shops WHERE id = ?", (shop_id,)).fetchone()
    if not shop:
        raise HTTPException(status_code=404, detail=f"Shop #{shop_id} not found.")

    given_date = entry_in.given_date or datetime.today().strftime("%Y-%m-%d")

    with db:
        cursor = db.execute(
            """
            INSERT INTO udhaar (
                shop_id, customer_name, amount_given, amount_paid,
                given_date, due_date, note, status
            ) VALUES (?, ?, ?, 0.0, ?, ?, ?, 'open')
            """,
            (
                shop_id,
                entry_in.customer_name,
                entry_in.amount_given,
                given_date,
                entry_in.due_date,
                entry_in.note,
            ),
        )
        uid = cursor.lastrowid
        row = db.execute("SELECT * FROM udhaar WHERE id = ?", (uid,)).fetchone()

    return _format_udhaar_row(row)


@app.get(
    "/shops/{shop_id}/udhaar",
    response_model=List[UdhaarOut],
    tags=["Udhaar Tracker"],
)
def list_udhaar_entries(
    shop_id: int,
    status: Optional[str] = Query("open", description="Filter by status ('open', 'closed', or 'all')"),
    db: sqlite3.Connection = Depends(get_db),
):
    """List customer credit entries with computed balance."""
    shop = db.execute("SELECT id FROM shops WHERE id = ?", (shop_id,)).fetchone()
    if not shop:
        raise HTTPException(status_code=404, detail=f"Shop #{shop_id} not found.")

    if status and status != "all":
        rows = db.execute(
            """
            SELECT * FROM udhaar
            WHERE shop_id = ? AND status = ?
            ORDER BY given_date DESC, id DESC
            """,
            (shop_id, status),
        ).fetchall()
    else:
        rows = db.execute(
            """
            SELECT * FROM udhaar
            WHERE shop_id = ?
            ORDER BY given_date DESC, id DESC
            """,
            (shop_id,),
        ).fetchall()

    return [_format_udhaar_row(r) for r in rows]


@app.post(
    "/shops/{shop_id}/udhaar/{uid}/payment",
    response_model=UdhaarOut,
    tags=["Udhaar Tracker"],
)
def record_udhaar_payment(
    shop_id: int,
    uid: int,
    payment_in: UdhaarPaymentCreate,
    db: sqlite3.Connection = Depends(get_db),
):
    """
    Record customer payment against an open credit entry.
    - Rejects amounts below 1 or amounts above the outstanding balance.
    - Automatically marks the entry 'closed' when balance reaches 0.
    """
    shop = db.execute("SELECT id FROM shops WHERE id = ?", (shop_id,)).fetchone()
    if not shop:
        raise HTTPException(status_code=404, detail=f"Shop #{shop_id} not found.")

    with db:
        row = db.execute(
            "SELECT * FROM udhaar WHERE id = ? AND shop_id = ?",
            (uid, shop_id),
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail=f"Udhaar entry #{uid} not found for this shop.")

        if row["status"] == "closed":
            raise HTTPException(status_code=400, detail="This udhaar entry is already fully paid and closed.")

        current_balance = round(float(row["amount_given"]) - float(row["amount_paid"]), 2)

        if payment_in.amount < 1.0:
            raise HTTPException(status_code=422, detail="Payment amount must be at least ₹1.")

        if payment_in.amount > current_balance:
            raise HTTPException(
                status_code=422,
                detail=f"Payment amount (₹{int(payment_in.amount):,}) cannot exceed outstanding balance (₹{int(current_balance):,}).",
            )

        new_paid = round(float(row["amount_paid"]) + float(payment_in.amount), 2)
        new_balance = round(float(row["amount_given"]) - new_paid, 2)
        new_status = "closed" if new_balance <= 0 else "open"

        db.execute(
            "UPDATE udhaar SET amount_paid = ?, status = ? WHERE id = ?",
            (new_paid, new_status, uid),
        )
        updated = db.execute("SELECT * FROM udhaar WHERE id = ?", (uid,)).fetchone()

    return _format_udhaar_row(updated)


@app.get(
    "/shops/{shop_id}/udhaar/summary",
    response_model=UdhaarSummaryResponse,
    tags=["Udhaar Tracker"],
)
def get_udhaar_summary(shop_id: int, db: sqlite3.Connection = Depends(get_db)):
    """
    Return high-level udhaar credit summary:
    - total outstanding balance
    - number of customers with open credit
    - overdue amount (due_date before today)
    - 'collect today' list (due today or overdue, largest balance first)
    - top 3 customers by total balance
    """
    shop = db.execute("SELECT id FROM shops WHERE id = ?", (shop_id,)).fetchone()
    if not shop:
        raise HTTPException(status_code=404, detail=f"Shop #{shop_id} not found.")

    rows = db.execute(
        "SELECT * FROM udhaar WHERE shop_id = ? AND status = 'open'",
        (shop_id,),
    ).fetchall()

    today_dt = datetime.today().date()
    total_outstanding = 0.0
    customer_names = set()
    overdue_amount = 0.0
    collect_today = []
    cust_balances = {}

    for r in rows:
        bal = round(float(r["amount_given"]) - float(r["amount_paid"]), 2)
        if bal <= 0:
            continue

        total_outstanding += bal
        cname = str(r["customer_name"])
        customer_names.add(cname)
        cust_balances[cname] = cust_balances.get(cname, 0.0) + bal

        formatted = _format_udhaar_row(r)
        if r["due_date"]:
            try:
                due_dt = datetime.strptime(str(r["due_date"]), "%Y-%m-%d").date()
                if due_dt <= today_dt:
                    collect_today.append(formatted)
                    if due_dt < today_dt:
                        overdue_amount += bal
            except ValueError:
                pass

    # Sort 'collect today' list: largest balance first
    collect_today.sort(key=lambda x: x["balance"], reverse=True)

    # Top 3 customers by balance
    sorted_custs = sorted(cust_balances.items(), key=lambda x: x[1], reverse=True)[:3]
    top_customers = [{"customer_name": k, "balance": round(v, 2)} for k, v in sorted_custs]

    return {
        "shop_id": shop_id,
        "total_outstanding": round(total_outstanding, 2),
        "customer_count": len(customer_names),
        "overdue_amount": round(overdue_amount, 2),
        "collect_today": collect_today,
        "top_customers": top_customers,
    }


# ============================================================================
# Plain-Language Insights & Tips Endpoint
# ============================================================================

@app.get(
    "/shops/{shop_id}/tips",
    response_model=List[TipOut],
    tags=["Insights & Tips"],
)
def get_shop_tips(
    shop_id: int,
    db: sqlite3.Connection = Depends(get_db),
):
    """
    Return plain-language business insight tips for a shop:
    - Best and worst selling weekdays
    - Weekend vs weekday difference
    - First week of month (days 1-7) salary effect
    - Upcoming rent warning (if within 5 days of 1st)
    - Tight cash alert if upcoming forecast worst day is amber or red
    - Overdue udhaar recovery impact (days of cash cover)
    - Recent expense trend (last 4w vs prev 4w if >10% change)

    Skips tips if history < 8 weeks. Returns at most 5 tips, sorted by severity (danger > watch > info).
    """
    shop = db.execute("SELECT id FROM shops WHERE id = ?", (shop_id,)).fetchone()
    if not shop:
        raise HTTPException(status_code=404, detail=f"Shop #{shop_id} not found.")

    # Reuse cached forecast if available; do not recompute heavy ML simulation
    cached_fc = _forecast_cache.get(shop_id)

    tips = build_tips(shop_id, db=db, forecast=cached_fc)
    return tips
