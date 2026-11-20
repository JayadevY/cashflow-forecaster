"""
Enhanced Alert Backtest (v2): Separating Forecastable from Owner-Driven Risk.

Compares three operational settings across 52 weekly rolling windows per shop:
A. As-is:
   Truth = actual closing_cash dips below threshold.
   Alert = point forecast + residual simulation (no owner inputs).
B. Forecastable-only truth:
   Counterfactual cash = actual closing_cash + cumsum(owner_withdrawal) + cumsum(unplanned_outflow).
   Truth = counterfactual_cash dips below threshold.
   Alert logic unchanged.
   Shows how well the model catches crises caused purely by sales/expense swings.
C. Owner-informed:
   Truth = actual closing_cash dips below threshold (same as A).
   Alert = model informed with owner_withdrawal as planned_payments.
   Shows performance when the owner logs their planned personal draws.

Also analyzes what share of Setting-A crises were preceded by an owner_withdrawal.
Saves comparison table to reports/alert_backtest_v2.csv.
"""

from pathlib import Path
import sys
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from src.forecast import collect_cv_residuals, forecast_cash_risk, get_best_model_name

DATA_PATH = BASE_DIR / "data" / "all_shops.csv"
REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def run_backtest_v2():
    df = pd.read_csv(DATA_PATH, parse_dates=["date"])
    shops = ["tea_stall", "vegetable_shop", "tiffin_center", "kirana"]
    origins = list(range(365, 723, 7))

    print(f"Running v2 backtest over {len(origins)} weekly windows across 4 shops...")

    comparison_records = []
    withdrawal_share_records = []

    for shop in shops:
        print(f"\nEvaluating {shop} across Settings A, B, and C...")
        sub = df[df["shop_type"] == shop].reset_index(drop=True)
        model_type = get_best_model_name(shop)

        # Collect CV residuals once on historical data (first 365 days)
        res_pool = collect_cv_residuals(sub.iloc[:365], model_type, n_splits=6)

        stats = {
            "A (As-is)": {"crises": 0, "alerts": 0, "tp": 0, "fp": 0, "fn": 0},
            "B (Forecastable-only)": {"crises": 0, "alerts": 0, "tp": 0, "fp": 0, "fn": 0},
            "C (Owner-informed)": {"crises": 0, "alerts": 0, "tp": 0, "fp": 0, "fn": 0},
        }

        setting_A_crises_total = 0
        setting_A_crises_with_withdrawal = 0

        for i, org in enumerate(origins):
            history = sub.iloc[: org + 1]
            actual_7 = sub.iloc[org + 1 : org + 8]
            if len(actual_7) < 7:
                continue

            start_cash = float(history["closing_cash"].iloc[-1])
            threshold = float(round(3.0 * history["expenses"].iloc[-90:].mean()))

            # 1. Base forecast (no planned payments)
            fc_base = forecast_cash_risk(
                history_df=history,
                shop_type=shop,
                start_cash=start_cash,
                planned_payments=None,
                threshold=threshold,
                residuals_by_horizon=res_pool,
                seed=42 + i,
            )
            alert_base = bool(any(fc_base["alert_level"].isin(["amber", "red"])))

            # 2. Owner-informed forecast (pass actual owner_withdrawal as planned_payments)
            planned_p = {}
            for h in range(7):
                w = float(actual_7["owner_withdrawal"].iloc[h])
                if w > 0:
                    d_str = actual_7["date"].iloc[h].strftime("%Y-%m-%d")
                    planned_p[d_str] = w

            fc_informed = forecast_cash_risk(
                history_df=history,
                shop_type=shop,
                start_cash=start_cash,
                planned_payments=planned_p,
                threshold=threshold,
                residuals_by_horizon=res_pool,
                seed=42 + i,
            )
            alert_informed = bool(any(fc_informed["alert_level"].isin(["amber", "red"])))

            # Truth A: actual closing_cash dips below threshold
            truth_A = bool(any(actual_7["closing_cash"] < threshold))

            # Truth B: counterfactual cash (without withdrawals & unplanned outflows) dips below threshold
            cf_cash = (
                actual_7["closing_cash"].values
                + np.cumsum(actual_7["owner_withdrawal"].values)
                + np.cumsum(actual_7["unplanned_outflow"].values)
            )
            truth_B = bool(any(cf_cash < threshold))

            # Truth C: same actual reality as A
            truth_C = truth_A

            # Track owner withdrawal correlation with Setting-A crises
            if truth_A:
                setting_A_crises_total += 1
                crisis_mask = (actual_7["closing_cash"] < threshold).values
                first_crisis_idx = int(np.argmax(crisis_mask))
                # Check if an owner withdrawal occurred on or before the crisis day in this window
                if (actual_7["owner_withdrawal"].iloc[: first_crisis_idx + 1] > 0).any():
                    setting_A_crises_with_withdrawal += 1

            # Update Setting A
            if truth_A: stats["A (As-is)"]["crises"] += 1
            if alert_base: stats["A (As-is)"]["alerts"] += 1
            if alert_base and truth_A: stats["A (As-is)"]["tp"] += 1
            elif alert_base and not truth_A: stats["A (As-is)"]["fp"] += 1
            elif not alert_base and truth_A: stats["A (As-is)"]["fn"] += 1

            # Update Setting B (alert logic unchanged = alert_base)
            if truth_B: stats["B (Forecastable-only)"]["crises"] += 1
            if alert_base: stats["B (Forecastable-only)"]["alerts"] += 1
            if alert_base and truth_B: stats["B (Forecastable-only)"]["tp"] += 1
            elif alert_base and not truth_B: stats["B (Forecastable-only)"]["fp"] += 1
            elif not alert_base and truth_B: stats["B (Forecastable-only)"]["fn"] += 1

            # Update Setting C (truth C, alert_informed)
            if truth_C: stats["C (Owner-informed)"]["crises"] += 1
            if alert_informed: stats["C (Owner-informed)"]["alerts"] += 1
            if alert_informed and truth_C: stats["C (Owner-informed)"]["tp"] += 1
            elif alert_informed and not truth_C: stats["C (Owner-informed)"]["fp"] += 1
            elif not alert_informed and truth_C: stats["C (Owner-informed)"]["fn"] += 1

        # Calculate metrics for each setting
        for setting_name in ["A (As-is)", "B (Forecastable-only)", "C (Owner-informed)"]:
            st = stats[setting_name]
            prec = (st["tp"] / (st["tp"] + st["fp"]) * 100.0) if (st["tp"] + st["fp"]) > 0 else 0.0
            rec = (st["tp"] / (st["tp"] + st["fn"]) * 100.0) if (st["tp"] + st["fn"]) > 0 else 0.0

            comparison_records.append({
                "shop_type": shop,
                "setting": setting_name,
                "crises": st["crises"],
                "alerts": st["alerts"],
                "true_positives": st["tp"],
                "false_positives": st["fp"],
                "precision": f"{prec:.1f}%",
                "recall": f"{rec:.1f}%",
            })

        share_pct = (
            (setting_A_crises_with_withdrawal / setting_A_crises_total * 100.0)
            if setting_A_crises_total > 0
            else 0.0
        )
        withdrawal_share_records.append({
            "shop_type": shop,
            "total_crises": setting_A_crises_total,
            "crises_preceded_by_withdrawal": setting_A_crises_with_withdrawal,
            "share_preceded_by_withdrawal": f"{share_pct:.1f}%",
        })

    v2_df = pd.DataFrame(comparison_records)
    out_csv = REPORTS_DIR / "alert_backtest_v2.csv"
    v2_df.to_csv(out_csv, index=False)
    print(f"\nSaved v2 comparison table to {out_csv}")

    share_df = pd.DataFrame(withdrawal_share_records)
    return v2_df, share_df


if __name__ == "__main__":
    v2_results, withdrawal_shares = run_backtest_v2()
    print("\n=== Three-Setting Alert Backtest Results (reports/alert_backtest_v2.csv) ===")
    print(v2_results.to_string(index=False))
    print("\n=== Share of Setting-A Crises Preceded by Owner Withdrawal ===")
    print(withdrawal_shares.to_string(index=False))
