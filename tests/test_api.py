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
        "name": "Lakshmi Grocery Store",
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


# ============================================================================
# Test 16 - 20: Udhaar (Customer Credit Tracker) Tests
# ============================================================================

def test_udhaar_add(client):
    """1. Test adding an open udhaar credit entry."""
    shop = client.post("/shops", json={"name": "Udhaar Shop", "shop_type": "tea_stall"}).json()
    shop_id = shop["id"]

    res = client.post(f"/shops/{shop_id}/udhaar", json={
        "customer_name": "Ramesh Kumar",
        "amount_given": 3500.0,
        "given_date": "2026-11-10",
        "due_date": "2026-11-20",
        "note": "Office tea pass",
    })
    assert res.status_code == 201
    data = res.json()
    assert data["customer_name"] == "Ramesh Kumar"
    assert data["amount_given"] == 3500.0
    assert data["amount_paid"] == 0.0
    assert data["balance"] == 3500.0
    assert data["status"] == "open"

    # Verify listing open credits returns this entry
    list_res = client.get(f"/shops/{shop_id}/udhaar?status=open")
    assert list_res.status_code == 200
    entries = list_res.json()
    assert len(entries) == 1
    assert entries[0]["id"] == data["id"]
    assert entries[0]["balance"] == 3500.0


def test_udhaar_partial_payment(client):
    """2. Test recording a partial payment against open udhaar."""
    shop = client.post("/shops", json={"name": "Udhaar Shop", "shop_type": "kirana"}).json()
    shop_id = shop["id"]

    entry = client.post(f"/shops/{shop_id}/udhaar", json={
        "customer_name": "Suresh Painter",
        "amount_given": 5000.0,
        "given_date": "2026-11-05",
        "due_date": "2026-11-15",
    }).json()
    uid = entry["id"]

    # Record partial payment of 2,000
    pay_res = client.post(f"/shops/{shop_id}/udhaar/{uid}/payment", json={
        "amount": 2000.0,
        "note": "Partial cash payment",
    })
    assert pay_res.status_code == 200
    updated = pay_res.json()
    assert updated["amount_given"] == 5000.0
    assert updated["amount_paid"] == 2000.0
    assert updated["balance"] == 3000.0
    assert updated["status"] == "open"


def test_udhaar_overpay_rejected(client):
    """3. Test that payment amount above balance or below 1 is rejected (HTTP 422)."""
    shop = client.post("/shops", json={"name": "Udhaar Shop", "shop_type": "vegetable_shop"}).json()
    shop_id = shop["id"]

    entry = client.post(f"/shops/{shop_id}/udhaar", json={
        "customer_name": "Hotel Priya",
        "amount_given": 4000.0,
    }).json()
    uid = entry["id"]

    # Overpayment rejected
    overpay_res = client.post(f"/shops/{shop_id}/udhaar/{uid}/payment", json={
        "amount": 4001.0,
    })
    assert overpay_res.status_code == 422
    assert "cannot exceed outstanding balance" in overpay_res.json()["detail"]

    # Less than 1 rejected
    underpay_res = client.post(f"/shops/{shop_id}/udhaar/{uid}/payment", json={
        "amount": 0.5,
    })
    assert underpay_res.status_code == 422


def test_udhaar_close_on_full_payment(client):
    """4. Test that entry automatically closes when balance reaches 0."""
    shop = client.post("/shops", json={"name": "Udhaar Shop", "shop_type": "tiffin_center"}).json()
    shop_id = shop["id"]

    entry = client.post(f"/shops/{shop_id}/udhaar", json={
        "customer_name": "Balaji Driver",
        "amount_given": 1500.0,
    }).json()
    uid = entry["id"]

    # Pay full amount
    full_pay_res = client.post(f"/shops/{shop_id}/udhaar/{uid}/payment", json={
        "amount": 1500.0,
    })
    assert full_pay_res.status_code == 200
    closed_entry = full_pay_res.json()
    assert closed_entry["amount_paid"] == 1500.0
    assert closed_entry["balance"] == 0.0
    assert closed_entry["status"] == "closed"

    # Verify not in open list, but in closed list
    open_list = client.get(f"/shops/{shop_id}/udhaar?status=open").json()
    assert len(open_list) == 0

    closed_list = client.get(f"/shops/{shop_id}/udhaar?status=closed").json()
    assert len(closed_list) == 1
    assert closed_list[0]["id"] == uid

    # Paying on already closed entry should be rejected
    repay_res = client.post(f"/shops/{shop_id}/udhaar/{uid}/payment", json={"amount": 100.0})
    assert repay_res.status_code == 400


def test_udhaar_summary_overdue(client):
    """5. Test summary calculations: total outstanding, customer count, overdue amount, collect today list."""
    shop = client.post("/shops", json={"name": "Udhaar Shop", "shop_type": "kirana"}).json()
    shop_id = shop["id"]

    # Customer 1: 5,000 given, overdue (due Nov 1)
    e1 = client.post(f"/shops/{shop_id}/udhaar", json={
        "customer_name": "Customer One",
        "amount_given": 5000.0,
        "due_date": "2026-11-01",
    }).json()
    # Partial payment of 1,000 -> balance 4,000
    client.post(f"/shops/{shop_id}/udhaar/{e1['id']}/payment", json={"amount": 1000.0})

    # Customer 2: 3,000 given, overdue (due Nov 10) -> balance 3,000
    client.post(f"/shops/{shop_id}/udhaar", json={
        "customer_name": "Customer Two",
        "amount_given": 3000.0,
        "due_date": "2026-11-10",
    })

    # Customer 3: 2,000 given, upcoming due date (due Dec 15, not overdue) -> balance 2,000
    client.post(f"/shops/{shop_id}/udhaar", json={
        "customer_name": "Customer Three",
        "amount_given": 2000.0,
        "due_date": "2026-12-15",
    })

    # Customer 4: 1,000 given, fully paid (closed) -> balance 0
    e4 = client.post(f"/shops/{shop_id}/udhaar", json={
        "customer_name": "Customer Four",
        "amount_given": 1000.0,
        "due_date": "2026-11-05",
    }).json()
    client.post(f"/shops/{shop_id}/udhaar/{e4['id']}/payment", json={"amount": 1000.0})

    # Fetch summary
    summary_res = client.get(f"/shops/{shop_id}/udhaar/summary")
    assert summary_res.status_code == 200
    summary = summary_res.json()

    # Total outstanding = 4,000 + 3,000 + 2,000 = 9,000
    assert summary["total_outstanding"] == 9000.0
    # Customer count = 3 (One, Two, Three)
    assert summary["customer_count"] == 3
    # Overdue amount = 4,000 (One) + 3,000 (Two) = 7,000
    assert summary["overdue_amount"] == 7000.0

    # Collect today list should have Customer One (4,000) and Customer Two (3,000)
    assert len(summary["collect_today"]) == 2
    assert summary["collect_today"][0]["customer_name"] == "Customer One"
    assert summary["collect_today"][0]["balance"] == 4000.0
    assert summary["collect_today"][0]["days_overdue"] > 0
    assert summary["collect_today"][1]["customer_name"] == "Customer Two"
    assert summary["collect_today"][1]["balance"] == 3000.0

    # Top customers
    top_names = [c["customer_name"] for c in summary["top_customers"]]
    assert top_names == ["Customer One", "Customer Two", "Customer Three"]


# ============================================================================
# Test 21, 22, 23, 24, 25: Plain-Language Insight Tips Tests
# ============================================================================

def test_tips_weekday_correct(client):
    """1. Test that best and worst weekday tip correctly identifies Saturday and Thursday for Kirana."""
    shop_id = _seed_kirana_shop(client)
    res = client.get(f"/shops/{shop_id}/tips")
    assert res.status_code == 200
    tips = res.json()

    weekday_tip = next((t for t in tips if t["id"] == "best_worst_weekday"), None)
    assert weekday_tip is not None
    assert weekday_tip["severity"] == "info"
    assert weekday_tip["params"]["best_day"] == "Saturday"
    assert weekday_tip["params"]["worst_day"] == "Thursday"
    assert weekday_tip["params"]["pct"] == 28


def test_tips_rent_day_appears(client):
    """2. Test that rent day warning appears when the 1st of the month is within 5 days."""
    shop_id = _seed_kirana_shop(client)
    res = client.get(f"/shops/{shop_id}/tips")
    assert res.status_code == 200
    tips = res.json()

    rent_tip = next((t for t in tips if t["id"] == "rent_day_coming"), None)
    assert rent_tip is not None
    assert rent_tip["severity"] == "watch"
    assert rent_tip["params"]["days"] == 1
    assert rent_tip["params"]["amount"] > 0


def test_tips_empty_when_data_too_short(client):
    """3. Test that no tips are returned when history is under 8 weeks (56 days)."""
    shop = client.post("/shops", json={"name": "Short History Shop", "shop_type": "tea_stall"}).json()
    shop_id = shop["id"]

    # Add only 10 daily entries (< 56 days)
    start_d = date(2026, 1, 1)
    for i in range(10):
        d_str = (start_d + timedelta(days=i)).strftime("%Y-%m-%d")
        client.post(f"/shops/{shop_id}/entries", json={
            "date": d_str,
            "cash_sales": 3000.0,
            "credit_given": 0.0,
            "udhaar_collected": 0.0,
            "expenses": 1500.0,
        })

    res = client.get(f"/shops/{shop_id}/tips")
    assert res.status_code == 200
    assert res.json() == []


def test_tips_max_five_and_sorted_severity(client):
    """4. Test that tips list returns at most 5 tips and is sorted by severity (danger > watch > info)."""
    shop_id = _seed_kirana_shop(client)

    # Seed overdue udhaar so overdue tip triggers
    client.post(f"/shops/{shop_id}/udhaar", json={
        "customer_name": "Test Debtor",
        "amount_given": 8000.0,
        "due_date": "2026-11-01",
    })

    res = client.get(f"/shops/{shop_id}/tips")
    assert res.status_code == 200
    tips = res.json()

    assert len(tips) <= 5
    assert len(tips) > 0

    severity_order = {"danger": 0, "watch": 1, "info": 2}
    ranks = [severity_order.get(t["severity"], 3) for t in tips]
    assert ranks == sorted(ranks), f"Tips not sorted by severity: {[t['severity'] for t in tips]}"


def test_tips_overdue_udhaar_appears(client):
    """5. Test that udhaar tip appears with overdue amount and days of cash cover when overdue exists."""
    shop_id = _seed_kirana_shop(client)

    client.post(f"/shops/{shop_id}/udhaar", json={
        "customer_name": "Overdue Customer",
        "amount_given": 12000.0,
        "due_date": "2026-11-05",
    })

    res = client.get(f"/shops/{shop_id}/tips")
    assert res.status_code == 200
    tips = res.json()

    udhaar_tip = next((t for t in tips if t["id"] == "overdue_udhaar"), None)
    assert udhaar_tip is not None
    assert udhaar_tip["severity"] == "watch"
    assert udhaar_tip["params"]["amount"] == 12000
    assert udhaar_tip["params"]["customers"] == 1
    assert udhaar_tip["params"]["days_cover"] >= 1


# ============================================================================
# Live Transactions Tests
# ============================================================================

def _create_simple_shop(client, opening_cash=10000.0) -> int:
    """Helper to create a fresh shop."""
    res = client.post("/shops", json={
        "name": "Live Tx Kirana",
        "shop_type": "kirana",
        "opening_cash": opening_cash,
        "low_cash_threshold": 5000.0,
    })
    return res.json()["id"]


def test_transaction_manual_cash(client):
    """1. Test recording a manual cash transaction successfully."""
    shop_id = _create_simple_shop(client)

    payload = {
        "amount": 250.0,
        "mode": "cash",
        "reference": "CASH-001",
        "customer_note": "Rice & dal purchase",
    }
    res = client.post(f"/shops/{shop_id}/transactions", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["shop_id"] == shop_id
    assert data["amount"] == 250.0
    assert data["mode"] == "cash"
    assert data["source"] == "manual"
    assert data["status"] == "success"
    assert data["reference"] == "CASH-001"
    assert data["customer_note"] == "Rice & dal purchase"
    assert "created_at" in data


def test_transaction_duplicate_reference_rejected(client):
    """2. Test that a duplicate reference is rejected with 400 and plain message."""
    shop_id = _create_simple_shop(client)

    res1 = client.post(f"/shops/{shop_id}/transactions", json={
        "amount": 100.0,
        "mode": "upi",
        "reference": "DUP-REF-123",
    })
    assert res1.status_code == 201

    res2 = client.post(f"/shops/{shop_id}/transactions", json={
        "amount": 200.0,
        "mode": "upi",
        "reference": "DUP-REF-123",
    })
    assert res2.status_code == 400
    assert "already exists" in res2.json()["detail"].lower()


def test_transaction_negative_or_zero_amount_rejected(client):
    """3. Test that non-positive transaction amounts are rejected."""
    shop_id = _create_simple_shop(client)

    res_zero = client.post(f"/shops/{shop_id}/transactions", json={
        "amount": 0.0,
        "mode": "cash",
    })
    assert res_zero.status_code in (400, 422)

    res_neg = client.post(f"/shops/{shop_id}/transactions", json={
        "amount": -50.0,
        "mode": "cash",
    })
    assert res_neg.status_code in (400, 422)


def test_transaction_since_filter(client):
    """4. Test that the 'since' filter returns only transactions created after timestamp."""
    shop_id = _create_simple_shop(client)

    # Insert 3 transactions with explicit timestamps in database
    conn = get_connection()
    with conn:
        conn.execute(
            """
            INSERT INTO transactions (shop_id, created_at, amount, mode, source, status, reference)
            VALUES (?, '2026-11-21T10:00:00', 100.0, 'cash', 'manual', 'success', 'T1'),
                   (?, '2026-11-21T10:30:00', 200.0, 'upi', 'simulated', 'success', 'T2'),
                   (?, '2026-11-21T11:00:00', 300.0, 'card', 'simulated', 'success', 'T3')
            """,
            (shop_id, shop_id, shop_id),
        )
    conn.close()

    # Query without since
    res_all = client.get(f"/shops/{shop_id}/transactions")
    assert res_all.status_code == 200
    assert len(res_all.json()) == 3

    # Query with since=2026-11-21T10:15:00 (should return T2 and T3)
    res_since = client.get(f"/shops/{shop_id}/transactions?since=2026-11-21T10:15:00")
    assert res_since.status_code == 200
    txs = res_since.json()
    assert len(txs) == 2
    refs = [t["reference"] for t in txs]
    assert refs == ["T3", "T2"]  # Newest first


def test_transaction_summary_totals_by_mode(client):
    """5. Test transaction summary aggregates totals by mode, cash total, and digital total."""
    shop_id = _create_simple_shop(client)
    today = date.today().isoformat()

    conn = get_connection()
    with conn:
        conn.execute(
            """
            INSERT INTO transactions (shop_id, created_at, amount, mode, source, status, reference)
            VALUES (?, ? || 'T09:00:00', 500.0, 'cash', 'manual', 'success', 'SUM1'),
                   (?, ? || 'T09:30:00', 200.0, 'cash', 'manual', 'success', 'SUM2'),
                   (?, ? || 'T10:00:00', 1200.0, 'upi', 'simulated', 'success', 'SUM3'),
                   (?, ? || 'T11:00:00', 800.0, 'card', 'simulated', 'success', 'SUM4'),
                   (?, ? || 'T11:30:00', 150.0, 'netbanking', 'simulated', 'success', 'SUM5')
            """,
            (shop_id, today, shop_id, today, shop_id, today, shop_id, today, shop_id, today),
        )
    conn.close()

    res = client.get(f"/shops/{shop_id}/transactions/summary?date=today")
    assert res.status_code == 200
    data = res.json()
    assert data["total_count"] == 5
    assert data["cash_total"] == 700.0
    assert data["digital_total"] == 2150.0  # 1200 + 800 + 150
    assert data["by_mode"]["cash"] == 700.0
    assert data["by_mode"]["upi"] == 1200.0
    assert data["by_mode"]["card"] == 800.0
    assert data["by_mode"]["netbanking"] == 150.0
    assert data["last_transaction_time"] == f"{today}T11:30:00"


def test_transaction_close_day_adds_only_cash_to_closing_cash(client):
    """
    6. CRITICAL ACCOUNTING TEST:
    Close day must add cash transactions to closing_cash in the till,
    while digital transactions go to digital_sales without changing drawer cash.
    Also verifies idempotency (calling close-day repeatedly does not duplicate).
    """
    shop_id = _create_simple_shop(client, opening_cash=10000.0)
    today = date.today().isoformat()

    # Insert 1 cash transaction (₹1,000) and 1 UPI transaction (₹2,500)
    conn = get_connection()
    with conn:
        conn.execute(
            """
            INSERT INTO transactions (shop_id, created_at, amount, mode, source, status, reference)
            VALUES (?, ? || 'T10:00:00', 1000.0, 'cash', 'manual', 'success', 'CLOSE-C1'),
                   (?, ? || 'T10:15:00', 2500.0, 'upi', 'simulated', 'success', 'CLOSE-U1')
            """,
            (shop_id, today, shop_id, today),
        )
    conn.close()

    # Call close-day
    res = client.post(f"/shops/{shop_id}/transactions/close-day?date=today")
    assert res.status_code == 200
    data = res.json()

    # Opening was 10,000. Only ₹1,000 cash added. Closing cash must be 11,000 (NOT 13,500)
    assert data["cash_sales_added"] == 1000.0
    assert data["total_cash_sales"] == 1000.0
    assert data["digital_sales"] == 2500.0
    assert data["closing_cash"] == 11000.0

    # Verify daily_entries row in database
    conn = get_connection()
    entry = conn.execute(
        "SELECT * FROM daily_entries WHERE shop_id = ? AND date = ?", (shop_id, today)
    ).fetchone()
    conn.close()

    assert entry is not None
    assert float(entry["cash_sales"]) == 1000.0
    assert float(entry["digital_sales"]) == 2500.0
    assert float(entry["closing_cash"]) == 11000.0

    # Idempotency check: Call close-day AGAIN without new transactions
    res2 = client.post(f"/shops/{shop_id}/transactions/close-day?date=today")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["cash_sales_added"] == 0.0  # Zero added!
    assert data2["total_cash_sales"] == 1000.0
    assert data2["closing_cash"] == 11000.0  # Not 12,000!


def test_transaction_delete_undo(client):
    """7. Test deleting a manual cash transaction within 10 minutes vs rejecting non-cash."""
    shop_id = _create_simple_shop(client)

    # 1. Create a manual cash transaction
    c_res = client.post(f"/shops/{shop_id}/transactions", json={
        "amount": 350.0,
        "mode": "cash",
        "reference": "UNDO-1",
    })
    assert c_res.status_code == 201
    tid = c_res.json()["id"]

    # Delete it (should succeed)
    del_res = client.delete(f"/shops/{shop_id}/transactions/{tid}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] if "status" in del_res.json() else del_res.json()["id"] == tid

    # 2. Create a simulated digital transaction
    sim_res = client.post(f"/shops/{shop_id}/transactions/simulate")
    sim_tid = sim_res.json()["id"]

    # Attempting to delete digital simulated transaction should be rejected (400)
    del_sim_res = client.delete(f"/shops/{shop_id}/transactions/{sim_tid}")
    assert del_sim_res.status_code == 400
    assert "manual cash" in del_sim_res.json()["detail"].lower()


def test_transaction_simulate(client):
    """8. Test simulation endpoint generates realistic digital transactions."""
    shop_id = _create_simple_shop(client)

    res = client.post(f"/shops/{shop_id}/transactions/simulate")
    assert res.status_code == 201
    tx = res.json()
    assert tx["shop_id"] == shop_id
    assert 20.0 <= tx["amount"] <= 2000.0
    assert tx["mode"] in ("upi", "card", "netbanking")
    assert tx["source"] == "simulated"
    assert tx["status"] == "success"
    assert tx["reference"].startswith("SIM-")


def test_startup_migration_renames_kirana_shop(client):
    """Test startup step automatically renames 'Lakshmi Kirana Store' to 'Lakshmi Grocery Store'."""
    conn = get_connection()
    with conn:
        cursor = conn.execute(
            "INSERT INTO shops (name, shop_type, low_cash_threshold, opening_cash) VALUES (?, ?, ?, ?)",
            ("Lakshmi Kirana Store", "kirana", 20000.0, 30000.0),
        )
        shop_id = cursor.lastrowid

    # Run on_startup
    main.on_startup()

    # Verify name updated
    with conn:
        row = conn.execute("SELECT name FROM shops WHERE id = ?", (shop_id,)).fetchone()
        assert row["name"] == "Lakshmi Grocery Store"


