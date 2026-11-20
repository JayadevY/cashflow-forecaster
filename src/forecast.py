"""
Low-Cash Alert and Risk Forecasting Engine.

Implements probabilistic 7-day cash flow forecasting with risk alert levels.
Combines point forecasts from best models with empirical residual simulations.
"""

from pathlib import Path
import warnings
import numpy as np
import pandas as pd
from sklearn.model_selection import TimeSeriesSplit
from statsmodels.tsa.statespace.sarimax import SARIMAX
from xgboost import XGBRegressor

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "all_shops.csv"
MODEL_COMP_PATH = BASE_DIR / "reports" / "model_comparison.csv"

# Pre-defined festival dates (Nov 2024 to Oct 2026)
FESTIVAL_DATES = set([
    "2024-11-01", "2024-11-02", "2024-11-03",
    "2024-12-24", "2024-12-25",
    "2025-01-14", "2025-01-15", "2025-01-16",
    "2025-03-30", "2025-03-31",
    "2025-04-14",
    "2025-06-06", "2025-06-07",
    "2025-10-18", "2025-10-19", "2025-10-20", "2025-10-21",
    "2025-12-24", "2025-12-25",
    "2026-01-14", "2026-01-15", "2026-01-16",
    "2026-03-20", "2026-03-21",
    "2026-04-14",
    "2026-05-26", "2026-05-27",
    "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"
])

DOW_MAP = {
    "Monday": 0, "Tuesday": 1, "Wednesday": 2,
    "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6
}


def get_best_model_name(shop_type: str) -> str:
    """Read reports/model_comparison.csv to find best model, or use fallback."""
    if MODEL_COMP_PATH.exists():
        try:
            m_df = pd.read_csv(MODEL_COMP_PATH)
            sub = m_df[m_df["shop_type"] == shop_type]
            if len(sub) > 0:
                return sub.sort_values("MAPE").iloc[0]["model"]
        except Exception:
            pass
    # Verified defaults from cross-validation:
    defaults = {
        "tea_stall": "xgboost",
        "vegetable_shop": "xgboost",
        "tiffin_center": "arima",
        "kirana": "arima",
    }
    return defaults.get(shop_type, "arima")


def collect_cv_residuals(history_df: pd.DataFrame, model_type: str, n_splits: int = 8) -> dict:
    """Collect out-of-sample forecast errors from time-series CV on historical data."""
    tscv = TimeSeriesSplit(n_splits=n_splits, test_size=7)
    res_by_h = {h: [] for h in range(1, 8)}

    if model_type == "arima":
        dow_dummies = pd.get_dummies(history_df["day_of_week"], drop_first=True, dtype=float)
        exog = pd.concat([history_df[["is_month_start", "is_festival"]], dow_dummies], axis=1)

        for tr_idx, te_idx in tscv.split(history_df):
            y_tr = history_df["cash_sales"].iloc[tr_idx]
            y_te = history_df["cash_sales"].iloc[te_idx].values
            try:
                m = SARIMAX(
                    y_tr,
                    order=(1, 0, 1),
                    seasonal_order=(1, 0, 1, 7),
                    exog=exog.iloc[tr_idx],
                    enforce_stationarity=False,
                    enforce_invertibility=False,
                )
                fit = m.fit(disp=False, maxiter=35)
                pred = fit.forecast(steps=7, exog=exog.iloc[te_idx]).values
            except Exception:
                pred = y_tr.iloc[-7:].values

            for h in range(7):
                res_by_h[h + 1].append(float(y_te[h] - pred[h]))

    else:  # xgboost
        sales = history_df["cash_sales"].values
        dows = history_df["day_of_week"].map(DOW_MAP).values
        wknds = history_df["is_weekend"].values
        ms = history_df["is_month_start"].values
        fest = history_df["is_festival"].values

        for tr_idx, te_idx in tscv.split(history_df):
            max_org = tr_idx[-1]
            actual = history_df["cash_sales"].iloc[te_idx].values

            for h in range(1, 8):
                X_tr, y_tr = [], []
                for tau in range(13, max_org - h + 1):
                    t_idx = tau + h
                    X_tr.append([
                        sales[tau],
                        sales[tau - 6],
                        sales[tau - 13],
                        np.mean(sales[tau - 6 : tau + 1]),
                        dows[t_idx],
                        wknds[t_idx],
                        ms[t_idx],
                        fest[t_idx],
                    ])
                    y_tr.append(sales[t_idx])

                xgb = XGBRegressor(
                    n_estimators=100, max_depth=3, learning_rate=0.05, random_state=42, n_jobs=-1
                )
                xgb.fit(np.array(X_tr), np.array(y_tr))

                t_idx = max_org + h
                x_te = np.array([[
                    sales[max_org],
                    sales[max_org - 6],
                    sales[max_org - 13],
                    np.mean(sales[max_org - 6 : max_org + 1]),
                    dows[t_idx],
                    wknds[t_idx],
                    ms[t_idx],
                    fest[t_idx],
                ]])
                pred_h = float(xgb.predict(x_te)[0])
                res_by_h[h].append(float(actual[h - 1] - pred_h))

    return res_by_h


def generate_point_forecast(history_df: pd.DataFrame, model_type: str, target_dates: list) -> np.ndarray:
    """Generate 7-day point forecast of cash_sales using the selected model."""
    if model_type == "arima":
        dow_dummies = pd.get_dummies(history_df["day_of_week"], drop_first=True, dtype=float)
        target_df = pd.DataFrame({"date": target_dates})
        target_df["day_of_week"] = target_df["date"].dt.day_name()
        target_df["is_month_start"] = (target_df["date"].dt.day <= 7).astype(int)
        target_df["is_festival"] = target_df["date"].dt.strftime("%Y-%m-%d").isin(FESTIVAL_DATES).astype(int)

        t_dow_d = pd.get_dummies(target_df["day_of_week"], drop_first=False, dtype=float)
        for col in dow_dummies.columns:
            if col not in t_dow_d.columns:
                t_dow_d[col] = 0.0
        t_dow_d = t_dow_d[dow_dummies.columns]

        ex_tr = pd.concat([history_df[["is_month_start", "is_festival"]], dow_dummies], axis=1)
        ex_te = pd.concat([target_df[["is_month_start", "is_festival"]], t_dow_d], axis=1)

        try:
            m = SARIMAX(
                history_df["cash_sales"],
                order=(1, 0, 1),
                seasonal_order=(1, 0, 1, 7),
                exog=ex_tr,
                enforce_stationarity=False,
                enforce_invertibility=False,
            )
            fit = m.fit(disp=False, maxiter=45)
            preds = fit.forecast(steps=7, exog=ex_te).values
        except Exception:
            preds = history_df["cash_sales"].iloc[-7:].values
        return np.maximum(0, preds)

    else:  # xgboost
        sales = history_df["cash_sales"].values
        max_org = len(history_df) - 1

        target_df = pd.DataFrame({"date": target_dates})
        target_df["day_of_week"] = target_df["date"].dt.day_name()
        target_df["dow_num"] = target_df["day_of_week"].map(DOW_MAP)
        target_df["is_weekend"] = target_df["day_of_week"].isin(["Saturday", "Sunday"]).astype(int)
        target_df["is_month_start"] = (target_df["date"].dt.day <= 7).astype(int)
        target_df["is_festival"] = target_df["date"].dt.strftime("%Y-%m-%d").isin(FESTIVAL_DATES).astype(int)

        dows_hist = history_df["day_of_week"].map(DOW_MAP).values
        wknds_hist = history_df["is_weekend"].values
        ms_hist = history_df["is_month_start"].values
        fest_hist = history_df["is_festival"].values

        preds = []
        for h in range(1, 8):
            X_tr, y_tr = [], []
            for tau in range(13, max_org - h + 1):
                t_idx = tau + h
                X_tr.append([
                    sales[tau],
                    sales[tau - 6],
                    sales[tau - 13],
                    np.mean(sales[tau - 6 : tau + 1]),
                    dows_hist[t_idx],
                    wknds_hist[t_idx],
                    ms_hist[t_idx],
                    fest_hist[t_idx],
                ])
                y_tr.append(sales[t_idx])

            xgb = XGBRegressor(
                n_estimators=100, max_depth=3, learning_rate=0.05, random_state=42, n_jobs=-1
            )
            xgb.fit(np.array(X_tr), np.array(y_tr))

            target_row = target_df.iloc[h - 1]
            x_te = np.array([[
                sales[max_org],
                sales[max_org - 6],
                sales[max_org - 13],
                np.mean(sales[max_org - 6 : max_org + 1]),
                target_row["dow_num"],
                target_row["is_weekend"],
                target_row["is_month_start"],
                target_row["is_festival"],
            ]])
            pred_h = float(xgb.predict(x_te)[0])
            preds.append(max(0, pred_h))

        return np.array(preds)


def forecast_cash_risk(
    history_df: pd.DataFrame,
    shop_type: str,
    start_cash: float,
    planned_payments: dict = None,
    threshold: float = None,
    residuals_by_horizon: dict = None,
    n_simulations: int = 1000,
    seed: int = 42,
) -> pd.DataFrame:
    """Forecast 7-day ahead cash risk and daily alert levels.

    Parameters:
    - history_df: historical dataframe containing rows up to forecast origin
    - shop_type: one of 'tea_stall', 'vegetable_shop', 'tiffin_center', 'kirana'
    - start_cash: till balance at forecast origin
    - planned_payments: optional dict of {date_str: rupees} entered by owner
    - threshold: low-cash alert line (defaults to 3 days of avg daily expenses)
    - residuals_by_horizon: optional cached dict {h: [errors]} for fast backtesting
    - n_simulations: number of simulation paths (default 1,000)
    - seed: random seed for reproducibility

    Returns:
    DataFrame with columns:
    date, sales_p10, sales_p50, sales_p90, cash_p10, cash_p50, cash_p90,
    risk_pct, alert_level, alert_message
    """
    history_df = history_df.copy().reset_index(drop=True)
    planned_payments = planned_payments or {}

    # 1. Target horizon dates (next 7 calendar days)
    last_date = history_df["date"].iloc[-1]
    target_dates = [last_date + pd.Timedelta(days=h) for h in range(1, 8)]

    # 2. Threshold: default = 3 days of avg daily expenses over last 90 days
    if threshold is None:
        last_90 = history_df.iloc[-90:] if len(history_df) >= 90 else history_df
        threshold = float(round(3.0 * last_90["expenses"].mean()))

    # 3. Model selection & Point forecast
    model_type = get_best_model_name(shop_type)
    point_sales = generate_point_forecast(history_df, model_type, target_dates)

    # 4. Residual pool for uncertainty simulation
    if residuals_by_horizon is None:
        residuals_by_horizon = collect_cv_residuals(history_df, model_type, n_splits=6)

    # 5. 1,000 Sales simulations
    rng = np.random.default_rng(seed)
    sim_sales = np.zeros((n_simulations, 7))
    for h in range(7):
        res_pool = residuals_by_horizon.get(h + 1, [0.0])
        draws = rng.choice(res_pool, size=n_simulations) if len(res_pool) > 0 else np.zeros(n_simulations)
        sim_sales[:, h] = np.maximum(0, point_sales[h] + draws)

    # 6. Expected udhaar collections (last 28 days average)
    last_28 = history_df.iloc[-28:] if len(history_df) >= 28 else history_df
    exp_udhaar = float(last_28["udhaar_collected"].mean())

    # 7. Expected expenses per day (same weekday over last 8 weeks + rent on day 1)
    last_56 = history_df.iloc[-56:] if len(history_df) >= 56 else history_df
    day1_history = history_df[history_df["date"].dt.day == 1]["expenses"]
    norm_history = history_df[history_df["date"].dt.day != 1]["expenses"]
    rent_bump = float(day1_history.mean() - norm_history.mean()) if len(day1_history) > 0 else 0.0

    exp_expenses = []
    for td in target_dates:
        dow = td.day_name()
        weekday_exp = last_56[last_56["day_of_week"] == dow]["expenses"]
        base_exp = float(weekday_exp.mean()) if len(weekday_exp) > 0 else float(history_df["expenses"].mean())
        if td.day == 1:
            exp_expenses.append(base_exp + max(0.0, rent_bump))
        else:
            exp_expenses.append(base_exp)

    # 8. Planned payments
    payments = []
    for td in target_dates:
        d_str = td.strftime("%Y-%m-%d")
        payments.append(float(planned_payments.get(d_str, planned_payments.get(td, 0.0))))

    # 9. Cash path simulation (cumulative carry-forward across the 7 days)
    sim_cash = np.zeros((n_simulations, 7))
    for s in range(n_simulations):
        current_cash = float(start_cash)
        for h in range(7):
            current_cash = current_cash + sim_sales[s, h] + exp_udhaar - exp_expenses[h] - payments[h]
            sim_cash[s, h] = current_cash

    # 10. Assemble output records
    records = []
    for h in range(7):
        td = target_dates[h]
        d_str = td.strftime("%Y-%m-%d")
        dow_str = td.day_name()

        s_p10 = float(np.percentile(sim_sales[:, h], 10))
        s_p50 = float(np.percentile(sim_sales[:, h], 50))
        s_p90 = float(np.percentile(sim_sales[:, h], 90))

        c_p10 = float(np.percentile(sim_cash[:, h], 10))
        c_p50 = float(np.percentile(sim_cash[:, h], 50))
        c_p90 = float(np.percentile(sim_cash[:, h], 90))

        risk_pct = float(100.0 * np.mean(sim_cash[:, h] < threshold))

        if risk_pct < 20.0:
            alert_level = "green"
            msg = f"Cash safe ({risk_pct:.0f}% risk below Rs {int(round(threshold)):,} on {dow_str})."
        elif risk_pct <= 50.0:
            alert_level = "amber"
            msg = f"{risk_pct:.0f}% chance cash drops below Rs {int(round(threshold)):,} on {dow_str}."
        else:
            alert_level = "red"
            msg = f"{risk_pct:.0f}% chance cash drops below Rs {int(round(threshold)):,} on {dow_str}."

        records.append({
            "date": d_str,
            "sales_p10": round(s_p10, 1),
            "sales_p50": round(s_p50, 1),
            "sales_p90": round(s_p90, 1),
            "cash_p10": round(c_p10, 1),
            "cash_p50": round(c_p50, 1),
            "cash_p90": round(c_p90, 1),
            "risk_pct": round(risk_pct, 1),
            "alert_level": alert_level,
            "alert_message": msg,
        })

    out_df = pd.DataFrame(records)
    out_df.attrs["threshold"] = threshold
    out_df.attrs["shop_type"] = shop_type
    out_df.attrs["start_cash"] = start_cash
    return out_df


if __name__ == "__main__":
    df = pd.read_csv(DATA_PATH, parse_dates=["date"])
    k_df = df[df["shop_type"] == "kirana"].reset_index(drop=True)
    history = k_df.iloc[:365]
    start_c = float(history["closing_cash"].iloc[-1])
    res = forecast_cash_risk(history, "kirana", start_cash=start_c)
    print("\n--- Example Kirana 7-Day Forecast & Alert Output ---")
    cols = ["date", "sales_p50", "cash_p10", "cash_p50", "cash_p90", "risk_pct", "alert_level", "alert_message"]
    print(res[cols].to_string(index=False))
