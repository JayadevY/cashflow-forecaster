"""
Automated API tests for Daily Cash-Flow Forecaster backend.

Uses pytest and FastAPI TestClient to verify:
1. Health check endpoint responds OK.
2. Shop creation and listing work as expected.
3. Adding a daily entry correctly computes closing_cash from the previous balance.
4. Negative amounts are rejected with HTTP 422.
5. Future dates are rejected.
6. Updating shop settings (threshold) and managing planned payments work.
7. Forecast returns 'mode': 'basic' when fewer than 60 days of history exist.
8. Forecast returns 7 rows with risk_pct between 0 and 100.
9. What-If scenario simulates future expense and returns the safest day.
"""

import sys
from datetime import date, timedelta
from pathlib import Path
import pytest
import pandas as pd
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import app.backend.main as main
from app.backend.db import init_db, get_connection
DATA_DIR = PROJECT_ROOT / "data"


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    """
    Creates an isolated temporary SQLite database for each test function,
    ensuring test runs do not affect real data.
    """
    test_db = tmp_path / "test_cashflow.db"
    monkeypatch.setenv("CASHFLOW_DB_PATH", str(test_db))
    main.clear_shop_cache(1)
    main.clear_shop_cache(2)
    main._forecast_cache.clear()
    main._residual_cache.clear()
    init_db(test_db)
    yield test_db


@pytest.fixture
def client():
    """FastAPI test client instance."""
    return TestClient(main.app)


# ============================================================================
# Test 1: System Health Check
# ============================================================================

def test_health_check(client):
    """Verify that the health check endpoint returns 200 and 'ok'."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "CashFlow Forecaster" in data["app"]


# ============================================================================
# Test 2: Shop Registration & Listing
# ============================================================================

def test_create_and_list_shops(client):
    """Verify registering a new shop and fetching the shop list."""
    payload = {
        "name": "Test Kirana",
        "shop_type": "kirana",
        "opening_cash": 15000.0,
        "low_cash_threshold": 30000.0,
    }
    create_res = client.post("/shops", json=payload)
    assert create_res.status_code == 201
    shop = create_res.json()
    assert shop["name"] == "Test Kirana"
    assert shop["shop_type"] == "kirana"
    assert shop["opening_cash"] == 15000.0
    assert shop["low_cash_threshold"] == 30000.0
    assert "id" in shop

    # Check listing
    list_res = client.get("/shops")
    assert list_res.status_code == 200
    shops = list_res.json()
    assert len(shops) == 1
    assert shops[0]["id"] == shop["id"]


# ============================================================================
# Test 3: Daily Entry Addition & Closing Cash Calculation
# ============================================================================

def test_add_entry_and_closing_cash_calculation(client):
    """
    Verify that the server correctly computes closing_cash from opening_cash / previous day:
    closing_cash = previous_closing + cash_sales + udhaar_collected - expenses - owner_withdrawal
    """
    # 1. Create a shop with 5,000 opening cash
    shop = client.post("/shops", json={
        "name": "Chai Point",
        "shop_type": "tea_stall",
        "opening_cash": 5000.0,
    }).json()
    shop_id = shop["id"]

    # 2. Add Day 1:
    # cash_sales: 8000, udhaar_collected: 500, expenses: 3000, withdrawal: 1000
    # Expected closing = 5000 + 8000 + 500 - 3000 - 1000 = 9500
    d1 = client.post(f"/shops/{shop_id}/entries", json={
        "date": "2026-10-01",
        "cash_sales": 8000.0,
        "credit_given": 200.0,
        "udhaar_collected": 500.0,
        "expenses": 3000.0,
        "owner_withdrawal": 1000.0,
    })
    assert d1.status_code == 200
    entry1 = d1.json()
    assert entry1["closing_cash"] == 9500.0

    # 3. Add Day 2:
    # cash_sales: 6000, udhaar_collected: 400, expenses: 2000, withdrawal: 500
    # Expected closing = 9500 + 6000 + 400 - 2000 - 500 = 13400
    d2 = client.post(f"/shops/{shop_id}/entries", json={
        "date": "2026-10-02",
        "cash_sales": 6000.0,
        "credit_given": 100.0,
        "udhaar_collected": 400.0,
        "expenses": 2000.0,
        "owner_withdrawal": 500.0,
    })
    assert d2.status_code == 200
    entry2 = d2.json()
    assert entry2["closing_cash"] == 13400.0

    # 4. Check GET /entries returns 2 records ordered by newest first
    entries_res = client.get(f"/shops/{shop_id}/entries?days=30")
    assert entries_res.status_code == 200
    entries = entries_res.json()
    assert len(entries) == 2
    assert entries[0]["date"] == "2026-10-02"
    assert entries[1]["date"] == "2026-10-01"


# ============================================================================
# Test 4 & 5: Negative Amounts & Future Dates Rejected
# ============================================================================

def test_negative_amounts_rejected(client):
    """Verify that negative amounts are rejected by validation (HTTP 422)."""
    shop = client.post("/shops", json={"name": "Veg Stall", "shop_type": "vegetable_shop"}).json()
    shop_id = shop["id"]

    # Negative cash_sales
    res1 = client.post(f"/shops/{shop_id}/entries", json={
        "date": "2026-10-01",
        "cash_sales": -500.0,
        "expenses": 200.0,
    })
    assert res1.status_code == 422

    # Negative expenses
    res2 = client.post(f"/shops/{shop_id}/entries", json={
        "date": "2026-10-01",
        "cash_sales": 500.0,
        "expenses": -200.0,
    })
    assert res2.status_code == 422


def test_future_dates_rejected(client):
    """Verify that dates in the future are rejected with HTTP 422."""
    shop = client.post("/shops", json={"name": "Veg Stall", "shop_type": "vegetable_shop"}).json()
    shop_id = shop["id"]

    future_date = (date.today() + timedelta(days=10)).strftime("%Y-%m-%d")
    res = client.post(f"/shops/{shop_id}/entries", json={
        "date": future_date,
        "cash_sales": 500.0,
        "expenses": 200.0,
    })
    assert res.status_code == 422
    assert "Future dates are not allowed" in res.text


# ============================================================================
# Test 6: Settings & Planned Payments Management
# ============================================================================

def test_settings_and_planned_payments(client):
    """Verify updating threshold and creating/listing/deleting planned payments."""
    shop = client.post("/shops", json={"name": "Tiffin King", "shop_type": "tiffin_center"}).json()
    shop_id = shop["id"]

    # 1. Update settings
    settings_res = client.put(f"/shops/{shop_id}/settings", json={
        "low_cash_threshold": 25000.0,
        "name": "Amma Tiffin Center",
    })
    assert settings_res.status_code == 200
    assert settings_res.json()["low_cash_threshold"] == 25000.0
    assert settings_res.json()["name"] == "Amma Tiffin Center"

    # 2. Add planned payment
    pay_res = client.post(f"/shops/{shop_id}/planned-payments", json={
        "date": "2026-11-05",
        "amount": 8000.0,
        "note": "Rice sack purchase",
    })
    assert pay_res.status_code == 201
    pay = pay_res.json()
    assert pay["amount"] == 8000.0
    assert pay["note"] == "Rice sack purchase"
    pay_id = pay["id"]

    # 3. List planned payments
    list_res = client.get(f"/shops/{shop_id}/planned-payments")
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 4. Delete planned payment
    del_res = client.delete(f"/shops/{shop_id}/planned-payments/{pay_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # Confirm deletion
    list_after = client.get(f"/shops/{shop_id}/planned-payments").json()
    assert len(list_after) == 0


# ============================================================================
# Test 7: Basic Forecast Under 60 Days
# ============================================================================

def test_forecast_basic_mode_under_60_days(client):
    """Verify that fewer than 60 days of entries returns 'mode': 'basic'."""
    shop = client.post("/shops", json={"name": "New Shop", "shop_type": "tea_stall", "opening_cash": 2000.0}).json()
    shop_id = shop["id"]

    # Insert 10 days
    for i in range(1, 11):
        day_str = f"2026-10-{i:02d}"
        client.post(f"/shops/{shop_id}/entries", json={
            "date": day_str,
            "cash_sales": 4000.0 + (i * 100),
            "expenses": 2500.0,
            "owner_withdrawal": 500.0 if i == 5 else 0.0,
        })

    f_res = client.get(f"/shops/{shop_id}/forecast")
    assert f_res.status_code == 200
    data = f_res.json()
    assert data["mode"] == "basic"
    assert "At least 60 days" in data["message"] or "Only 10 days" in data["message"]
    assert len(data["forecast"]) == 7

    for day in data["forecast"]:
        assert 0.0 <= day["risk_pct"] <= 100.0
        assert day["alert_level"] in {"green", "amber", "red"}
        assert day["sales_p50"] > 0


# ============================================================================
# Test 8 & 9: Full Forecast Mode (>=60 days) and What-If Safest Day
# ============================================================================

def test_full_forecast_and_what_if_safest_day(client):
    """
    Load 90 days from tea_stall.csv to test the full ML forecast mode
    and verify the what-if endpoint returns 7 forecast rows and a safest day.
    """
    csv_path = DATA_DIR / "tea_stall.csv"
    if not csv_path.exists():
        pytest.skip("tea_stall.csv not found for full forecast test")

    df = pd.read_csv(csv_path)
    df_slice = df.iloc[-90:].copy().reset_index(drop=True)

    shop = client.post("/shops", json={
        "name": "Murugan Tea Stall",
        "shop_type": "tea_stall",
        "opening_cash": float(df_slice["closing_cash"].iloc[0]),
        "low_cash_threshold": 12000.0,
    }).json()
    shop_id = shop["id"]

    # Bulk insert historical entries directly for test speed
    conn = get_connection()
    with conn:
        for _, r in df_slice.iterrows():
            conn.execute(
                """
                INSERT INTO daily_entries (
                    shop_id, date, cash_sales, credit_given, udhaar_collected,
                    expenses, owner_withdrawal, unplanned_outflow, closing_cash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    shop_id,
                    str(r["date"]),
                    float(r["cash_sales"]),
                    float(r.get("credit_given", 0.0)),
                    float(r.get("udhaar_collected", 0.0)),
                    float(r["expenses"]),
                    float(r.get("owner_withdrawal", 0.0)),
                    float(r.get("unplanned_outflow", 0.0)),
                    float(r["closing_cash"]),
                ),
            )
    conn.close()

    # 1. Test full forecast
    f_res = client.get(f"/shops/{shop_id}/forecast")
    assert f_res.status_code == 200
    forecast_data = f_res.json()
    assert forecast_data["mode"] == "full"
    assert len(forecast_data["forecast"]) == 7

    for row in forecast_data["forecast"]:
        assert 0.0 <= row["risk_pct"] <= 100.0
        assert row["alert_level"] in {"green", "amber", "red"}
        assert row["cash_p50"] is not None
        assert row["sales_p50"] is not None

    # 2. Test repeat call hits cache fast
    f_res_cached = client.get(f"/shops/{shop_id}/forecast")
    assert f_res_cached.status_code == 200
    assert f_res_cached.json() == forecast_data

    # 3. Test What-If scenario
    whatif_res = client.get(f"/shops/{shop_id}/what-if?date=2026-11-03&amount=10000")
    assert whatif_res.status_code == 200
    whatif_data = whatif_res.json()

    assert whatif_data["shop_id"] == shop_id
    assert whatif_data["target_date"] == "2026-11-03"
    assert whatif_data["amount"] == 10000.0
    assert len(whatif_data["forecast"]) == 7
    assert "safest_day" in whatif_data
    assert "verdict" in whatif_data
    assert "max_safe_amount" in whatif_data
    assert "recommendation" in whatif_data
    assert len(whatif_data["recommendation"]) > 10


# ============================================================================
# Helper for What-If Verdict Tests
# ============================================================================

def _seed_kirana_shop(client) -> int:
    """Create a Kirana shop loaded with the last 365 days from data/kirana.csv."""
    csv_path = DATA_DIR / "kirana.csv"
    if not csv_path.exists():
        pytest.skip("kirana.csv not found for what-if verdict tests")

    df = pd.read_csv(csv_path)
    df_365 = df.iloc[-365:].copy().reset_index(drop=True)
    prev_closing = float(df.iloc[-366]["closing_cash"])
    threshold = float(round(3.0 * df_365["expenses"].mean()))

    shop = client.post("/shops", json={
        "name": "Lakshmi Kirana Store",
        "shop_type": "kirana",
        "opening_cash": prev_closing,
        "low_cash_threshold": threshold,
    }).json()
    shop_id = shop["id"]

    conn = get_connection()
    with conn:
        conn.executemany(
            """
            INSERT INTO daily_entries (
                shop_id, date, cash_sales, credit_given, udhaar_collected,
                expenses, owner_withdrawal, unplanned_outflow, closing_cash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [
                (
                    shop_id,
                    str(r["date"]),
                    float(r["cash_sales"]),
                    float(r.get("credit_given", 0.0)),
                    float(r.get("udhaar_collected", 0.0)),
                    float(r["expenses"]),
                    float(r.get("owner_withdrawal", 0.0)),
                    float(r.get("unplanned_outflow", 0.0)),
                    float(r["closing_cash"]),
                )
                for _, r in df_365.iterrows()
            ],
        )
    conn.close()
    return shop_id


# ============================================================================
# Test 9, 10, 11: What-If Verdicts (too_large, ok, better_day_exists)
# ============================================================================

def test_what_if_verdict_too_large(client):
    """Verify verdict='too_large' when payment pushes risk >80% on every day."""
    shop_id = _seed_kirana_shop(client)
    res = client.get(f"/shops/{shop_id}/what-if?date=2026-11-03&amount=100000")
    assert res.status_code == 200
    data = res.json()

    assert data["verdict"] == "too_large"
    assert (
        data["recommendation"]
        == "Rs 100,000 is too large for your cash this week. Risk stays high on every day. Consider paying a smaller amount or splitting it into parts."
    )
    assert data["max_safe_amount"] >= 0
    assert data["max_safe_amount"] % 1000 == 0
    assert data["max_safe_amount"] < 100000


def test_what_if_verdict_ok(client):
    """Verify verdict='ok' when the chosen day is already the safest day."""
    shop_id = _seed_kirana_shop(client)
    res = client.get(f"/shops/{shop_id}/what-if?date=2026-11-03&amount=10000")
    assert res.status_code == 200
    data = res.json()

    assert data["verdict"] == "ok"
    assert data["safest_day"] == "2026-11-03"
    assert data["current_date_peak_risk"] < 20.0
    assert data["max_safe_amount"] >= 10000
    assert data["max_safe_amount"] % 1000 == 0


def test_what_if_verdict_better_day_exists(client):
    """Verify verdict='better_day_exists' and names the safer day when moving the payment lowers risk."""
    shop_id = _seed_kirana_shop(client)
    res = client.get(f"/shops/{shop_id}/what-if?date=2026-11-03&amount=70000")
    assert res.status_code == 200
    data = res.json()

    assert data["verdict"] == "better_day_exists"
    assert data["safest_day"] != "2026-11-03"
    assert data["safest_day_peak_risk"] < data["current_date_peak_risk"]
    assert data["safest_day"] in data["recommendation"]
    assert data["max_safe_amount"] >= 0
    assert data["max_safe_amount"] % 1000 == 0
    assert data["max_safe_amount"] < 70000


# ============================================================================
# Test 12, 13, 14, 15: Input Validation, max_safe_amount & data_ends_on
# ============================================================================

def test_what_if_invalid_date_returns_422(client):
    """Verify date=4 and out-of-window dates return HTTP 422 with forecast window hint."""
    shop_id = _seed_kirana_shop(client)

    # Malformed date string
    res_bad = client.get(f"/shops/{shop_id}/what-if?date=4&amount=10000")
    assert res_bad.status_code == 422
    assert "2026-11-01 to 2026-11-07" in res_bad.json()["detail"]

    # Real date but outside the 7-day forecast window
    res_outside = client.get(f"/shops/{shop_id}/what-if?date=2026-12-01&amount=10000")
    assert res_outside.status_code == 422
    assert "2026-11-01 to 2026-11-07" in res_outside.json()["detail"]


def test_what_if_zero_amount_returns_422(client):
    """Verify amount=0 is rejected with HTTP 422."""
    shop_id = _seed_kirana_shop(client)
    res = client.get(f"/shops/{shop_id}/what-if?date=2026-11-03&amount=0")
    assert res.status_code == 422


def test_what_if_safe_amount_max_safe_at_least_amount(client):
    """Verify a safe requested amount gives max_safe_amount >= amount (never 0)."""
    shop_id = _seed_kirana_shop(client)
    amount = 15000
    res = client.get(f"/shops/{shop_id}/what-if?date=2026-11-03&amount={amount}")
    assert res.status_code == 200
    data = res.json()

    assert data["current_date_peak_risk"] < 20.0
    assert data["max_safe_amount"] >= amount
    assert data["max_safe_amount"] % 1000 == 0


def test_planned_payment_date_check_and_forecast_data_ends_on(client):
    """
    Verify:
    1. POST /planned-payments rejects bad dates and dates more than 60 days ahead (HTTP 422).
    2. GET /forecast includes 'data_ends_on' matching the latest entry date.
    """
    shop_id = _seed_kirana_shop(client)

    # Bad date format
    bad_res = client.post(f"/shops/{shop_id}/planned-payments", json={
        "date": "4",
        "amount": 5000.0,
        "note": "Invalid date test",
    })
    assert bad_res.status_code == 422

    # More than 60 days ahead of 2026-10-31 (max is 2026-12-30)
    far_res = client.post(f"/shops/{shop_id}/planned-payments", json={
        "date": "2027-02-15",
        "amount": 5000.0,
        "note": "Too far ahead",
    })
    assert far_res.status_code == 422
    assert "60 days" in far_res.json()["detail"]

    # Forecast includes data_ends_on
    f_res = client.get(f"/shops/{shop_id}/forecast")
    assert f_res.status_code == 200
    assert f_res.json()["data_ends_on"] == "2026-10-31"
