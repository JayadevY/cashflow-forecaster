"""
app/backend/insights.py

Generates plain-language data-driven tips for shop owners.
Analyzes patterns from daily_entries (sales, expenses, calendar) and udhaar credit records.
Returns structured text keys and params so the frontend can format and localize them.
"""

import sqlite3
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional
import pandas as pd

from app.backend.db import get_connection


def build_tips(
    shop_id: int,
    db: Optional[sqlite3.Connection] = None,
    forecast: Optional[dict] = None,
) -> List[Dict[str, Any]]:
    """
    Build plain-language insight tips for a shop.

    Rules:
    - Minimum 8 weeks (56 days) of entries. If less, returns empty list [].
    - Tips computed:
      1. Best and worst weekday sales comparison
      2. Weekend vs weekday sales difference
      3. First-week-of-month effect (days 1-7)
      4. Rent day coming (if within 5 days of month start, based on day 1 expenses)
      5. Tight-cash warning (if forecast worst day is amber or red)
      6. Overdue udhaar recovery impact (days of cash cover)
      7. Expense trend (last 4 weeks vs previous 4 weeks if > 10% change)
    - Returns at most 5 tips, sorted by severity: danger > watch > info.
    """
    close_db = False
    if db is None:
        db = get_connection()
        close_db = True

    try:
        # 1. Fetch daily entries for this shop ordered by date
        rows = db.execute(
            "SELECT * FROM daily_entries WHERE shop_id = ? ORDER BY date ASC",
            (shop_id,),
        ).fetchall()

        # Rule: skip all tips if there is not enough data (minimum 8 weeks = 56 entries)
        if len(rows) < 56:
            return []

        df = pd.DataFrame([dict(r) for r in rows])
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date").reset_index(drop=True)
        df["day_name"] = df["date"].dt.day_name()
        df["day"] = df["date"].dt.day
        df["cash_sales"] = df["cash_sales"].astype(float)
        df["expenses"] = df["expenses"].astype(float)

        tips: List[Dict[str, Any]] = []

        # -------------------------------------------------------------
        # TIP 1: Best and worst weekday sales
        # -------------------------------------------------------------
        by_weekday = df.groupby("day_name")["cash_sales"].mean()
        if len(by_weekday) >= 5:
            best_day = by_weekday.idxmax()
            worst_day = by_weekday.idxmin()
            best_sales = float(by_weekday[best_day])
            worst_sales = float(by_weekday[worst_day])

            if worst_sales > 0 and best_sales > worst_sales:
                pct_diff = round(((best_sales - worst_sales) / worst_sales) * 100)
                if pct_diff >= 3:
                    tips.append({
                        "id": "best_worst_weekday",
                        "icon": "calendar",
                        "severity": "info",
                        "text_key": "tip_best_worst_weekday",
                        "params": {
                            "best_day": best_day,
                            "worst_day": worst_day,
                            "pct": pct_diff,
                        },
                    })

        # -------------------------------------------------------------
        # TIP 2: Weekend vs weekday sales difference
        # -------------------------------------------------------------
        df["is_weekend"] = df["day_name"].isin(["Saturday", "Sunday"])
        weekend_sales = float(df[df["is_weekend"]]["cash_sales"].mean())
        weekday_sales = float(df[~df["is_weekend"]]["cash_sales"].mean())

        if weekend_sales > 0 and weekday_sales > 0:
            if weekend_sales > weekday_sales:
                pct_diff = round(((weekend_sales - weekday_sales) / weekday_sales) * 100)
                if pct_diff >= 3:
                    tips.append({
                        "id": "weekend_vs_weekday",
                        "icon": "sun",
                        "severity": "info",
                        "text_key": "tip_weekend_higher",
                        "params": {"pct": pct_diff},
                    })
            elif weekday_sales > weekend_sales:
                pct_diff = round(((weekday_sales - weekend_sales) / weekend_sales) * 100)
                if pct_diff >= 3:
                    tips.append({
                        "id": "weekend_vs_weekday",
                        "icon": "briefcase",
                        "severity": "info",
                        "text_key": "tip_weekday_higher",
                        "params": {"pct": pct_diff},
                    })

        # -------------------------------------------------------------
        # TIP 3: First-week-of-month effect (days 1-7)
        # -------------------------------------------------------------
        df["is_month_start"] = df["day"] <= 7
        start_sales = float(df[df["is_month_start"]]["cash_sales"].mean())
        rest_sales = float(df[~df["is_month_start"]]["cash_sales"].mean())

        if start_sales > 0 and rest_sales > 0:
            if start_sales > rest_sales:
                pct_diff = round(((start_sales - rest_sales) / rest_sales) * 100)
                if pct_diff >= 3:
                    tips.append({
                        "id": "month_start_effect",
                        "icon": "award",
                        "severity": "info",
                        "text_key": "tip_month_start_higher",
                        "params": {"pct": pct_diff},
                    })
            elif rest_sales > start_sales:
                pct_diff = round(((rest_sales - start_sales) / start_sales) * 100)
                if pct_diff >= 3:
                    tips.append({
                        "id": "month_start_effect",
                        "icon": "calendar-check",
                        "severity": "info",
                        "text_key": "tip_month_start_lower",
                        "params": {"pct": pct_diff},
                    })

        # -------------------------------------------------------------
        # TIP 4: Rent day coming (1st of month within 5 days)
        # -------------------------------------------------------------
        last_dt = df["date"].iloc[-1].date()
        if last_dt.day == 1:
            days_to_first = 0
        else:
            if last_dt.month == 12:
                next_first = date(last_dt.year + 1, 1, 1)
            else:
                next_first = date(last_dt.year, last_dt.month + 1, 1)
            days_to_first = (next_first - last_dt).days

        if 0 <= days_to_first <= 5:
            # Average expenses on day 1 of previous months
            day1_entries = df[df["day"] == 1]
            if not day1_entries.empty:
                avg_rent_exp = float(day1_entries["expenses"].mean())
            else:
                avg_rent_exp = float(df["expenses"].mean()) * 3

            tips.append({
                "id": "rent_day_coming",
                "icon": "home",
                "severity": "watch",
                "text_key": "tip_rent_coming",
                "params": {
                    "days": days_to_first,
                    "amount": int(round(avg_rent_exp)),
                },
            })

        # -------------------------------------------------------------
        # TIP 5: Tight-cash warning (reusing cached forecast)
        # -------------------------------------------------------------
        if forecast is None:
            try:
                from app.backend.main import _forecast_cache
                forecast = _forecast_cache.get(shop_id)
            except Exception:
                forecast = None

        if forecast and "forecast" in forecast:
            forecast_days = forecast["forecast"]
            if forecast_days:
                worst_day = max(forecast_days, key=lambda x: x.get("risk_pct", 0.0))
                alert_lvl = str(worst_day.get("alert_level", "")).lower()
                if alert_lvl in ["amber", "red"]:
                    w_date_str = str(worst_day.get("date", ""))
                    try:
                        w_day_name = datetime.strptime(w_date_str, "%Y-%m-%d").strftime("%A")
                    except Exception:
                        w_day_name = w_date_str
                    w_risk = int(round(float(worst_day.get("risk_pct", 0.0))))
                    sev = "danger" if alert_lvl == "red" else "watch"
                    tips.append({
                        "id": "tight_cash",
                        "icon": "alert-triangle",
                        "severity": sev,
                        "text_key": "tip_tight_cash",
                        "params": {
                            "day": w_day_name,
                            "date": w_date_str,
                            "risk_pct": w_risk,
                        },
                    })

        # -------------------------------------------------------------
        # TIP 6: Udhaar (overdue credit recovery)
        # -------------------------------------------------------------
        udhaar_rows = db.execute(
            "SELECT * FROM udhaar WHERE shop_id = ? AND status = 'open'",
            (shop_id,),
        ).fetchall()

        today_dt = datetime.today().date()
        overdue_amount = 0.0
        overdue_customers = set()

        for u in udhaar_rows:
            bal = round(float(u["amount_given"]) - float(u["amount_paid"]), 2)
            if bal <= 0:
                continue
            due_str = u["due_date"]
            if due_str:
                try:
                    due_d = datetime.strptime(str(due_str), "%Y-%m-%d").date()
                    if due_d < today_dt:
                        overdue_amount += bal
                        overdue_customers.add(str(u["customer_name"]))
                except ValueError:
                    pass

        if overdue_amount > 0 and len(overdue_customers) > 0:
            recent_90 = df.iloc[-90:] if len(df) >= 90 else df
            avg_daily_exp = float(recent_90["expenses"].mean())
            if avg_daily_exp > 0:
                days_cover = max(1, round(overdue_amount / avg_daily_exp))
            else:
                days_cover = 1

            tips.append({
                "id": "overdue_udhaar",
                "icon": "book-open",
                "severity": "watch",
                "text_key": "tip_overdue_udhaar",
                "params": {
                    "amount": int(round(overdue_amount)),
                    "customers": len(overdue_customers),
                    "days_cover": int(days_cover),
                },
            })

        # -------------------------------------------------------------
        # TIP 7: Expense trend (last 4 weeks vs previous 4 weeks)
        # -------------------------------------------------------------
        if len(df) >= 56:
            last_4w = float(df.iloc[-28:]["expenses"].sum())
            prev_4w = float(df.iloc[-56:-28]["expenses"].sum())

            if prev_4w > 0:
                change_pct = ((last_4w - prev_4w) / prev_4w) * 100
                if abs(change_pct) >= 10.0:
                    pct_val = round(abs(change_pct))
                    if change_pct > 0:
                        tips.append({
                            "id": "expense_trend",
                            "icon": "trending-up",
                            "severity": "watch",
                            "text_key": "tip_expense_trend_up",
                            "params": {"pct": pct_val},
                        })
                    else:
                        tips.append({
                            "id": "expense_trend",
                            "icon": "trending-down",
                            "severity": "info",
                            "text_key": "tip_expense_trend_down",
                            "params": {"pct": pct_val},
                        })

        # -------------------------------------------------------------
        # Sort by severity: danger > watch > info, return at most 5
        # -------------------------------------------------------------
        severity_rank = {"danger": 0, "watch": 1, "info": 2}
        tips.sort(key=lambda t: severity_rank.get(t["severity"], 3))
        return tips[:5]

    finally:
        if close_db:
            db.close()
