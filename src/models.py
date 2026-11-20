"""
Model Comparison for Daily Cash-Flow Forecaster.

Compares four forecasters on 7-day ahead cash sales for each shop:
1. Moving Average (baseline): mean of the last 7 days.
2. Seasonal Naive (extra benchmark): value of the same weekday one week earlier.
3. ARIMA (SARIMAX): order (1,0,1), seasonal_order (1,0,1,7) with calendar exog.
4. XGBoost: direct multi-step forecasting (h=1..7) using lags and target calendar features.

Validation uses sklearn TimeSeriesSplit (10 folds, test_size=7) to ensure
strict chronological ordering without data leakage.
"""

from pathlib import Path
import warnings
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.model_selection import TimeSeriesSplit
from statsmodels.tsa.statespace.sarimax import SARIMAX
from xgboost import XGBRegressor

warnings.filterwarnings("ignore")

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "all_shops.csv"
REPORTS_DIR = BASE_DIR / "reports"
FIGURES_DIR = REPORTS_DIR / "figures"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

DOW_MAP = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
    "Saturday": 5,
    "Sunday": 6,
}


def build_xgb_training_data(sales, dows, weekends, month_starts, festivals, h, max_origin):
    """Build feature matrix X and target y for XGBoost at forecast horizon h.
    
    All features (lag_1, lag_7, lag_14, rolling_mean_7) are calculated
    strictly using information up to origin tau. Only calendar features
    (which are known in advance) are used for the target day (tau + h).
    """
    X = []
    y = []
    for tau in range(13, max_origin - h + 1):
        target_idx = tau + h
        feat = [
            sales[tau],  # lag_1
            sales[tau - 6],  # lag_7
            sales[tau - 13],  # lag_14
            np.mean(sales[tau - 6 : tau + 1]),  # rolling_mean_7
            dows[target_idx],
            weekends[target_idx],
            month_starts[target_idx],
            festivals[target_idx],
        ]
        X.append(feat)
        y.append(sales[target_idx])
    return np.array(X), np.array(y)


def run_evaluation(df=None, n_splits=10, test_size=7):
    """Run TimeSeriesSplit cross-validation across all shops and models."""
    if df is None:
        df = pd.read_csv(DATA_PATH, parse_dates=["date"])

    tscv = TimeSeriesSplit(n_splits=n_splits, test_size=test_size)
    shops = ["tea_stall", "vegetable_shop", "tiffin_center", "kirana"]

    model_names = ["moving_average", "seasonal_naive", "arima", "xgboost"]
    records = []

    for shop in shops:
        print(f"Evaluating models for {shop}...")
        sub = df[df["shop_type"] == shop].copy().reset_index(drop=True)

        # Precompute arrays for fast indexing
        sales_full = sub["cash_sales"].values
        dows_full = sub["day_of_week"].map(DOW_MAP).values
        weekends_full = sub["is_weekend"].values
        month_starts_full = sub["is_month_start"].values
        festivals_full = sub["is_festival"].values

        # Calendar features for SARIMAX exog (avoiding collinearity)
        dow_dummies = pd.get_dummies(sub["day_of_week"], drop_first=True, dtype=float)
        exog_sarimax = pd.concat([sub[["is_month_start", "is_festival"]], dow_dummies], axis=1)

        fold_metrics = {m: {"mae": [], "mape": []} for m in model_names}

        for fold, (train_idx, test_idx) in enumerate(tscv.split(sub)):
            y_train = sub["cash_sales"].iloc[train_idx]
            y_test = sub["cash_sales"].iloc[test_idx].values
            max_origin = train_idx[-1]

            # 1. Moving Average: mean of last 7 days of training series
            pred_ma = np.full(test_size, y_train.iloc[-7:].mean())
            mae_ma = np.mean(np.abs(pred_ma - y_test))
            mape_ma = np.mean(np.abs((y_test - pred_ma) / y_test)) * 100
            fold_metrics["moving_average"]["mae"].append(mae_ma)
            fold_metrics["moving_average"]["mape"].append(mape_ma)

            # 2. Seasonal Naive: same weekday one week earlier (last 7 days of train)
            pred_sn = y_train.iloc[-7:].values
            mae_sn = np.mean(np.abs(pred_sn - y_test))
            mape_sn = np.mean(np.abs((y_test - pred_sn) / y_test)) * 100
            fold_metrics["seasonal_naive"]["mae"].append(mae_sn)
            fold_metrics["seasonal_naive"]["mape"].append(mape_sn)

            # 3. ARIMA: SARIMAX (1,0,1)x(1,0,1,7) with calendar exog
            try:
                model_ari = SARIMAX(
                    y_train,
                    order=(1, 0, 1),
                    seasonal_order=(1, 0, 1, 7),
                    exog=exog_sarimax.iloc[train_idx],
                    enforce_stationarity=False,
                    enforce_invertibility=False,
                )
                fit_ari = model_ari.fit(disp=False, maxiter=50)
                pred_ari = fit_ari.forecast(steps=test_size, exog=exog_sarimax.iloc[test_idx]).values
            except Exception:
                pred_ari = pred_sn  # fallback if convergence fails
            mae_ari = np.mean(np.abs(pred_ari - y_test))
            mape_ari = np.mean(np.abs((y_test - pred_ari) / y_test)) * 100
            fold_metrics["arima"]["mae"].append(mae_ari)
            fold_metrics["arima"]["mape"].append(mape_ari)

            # 4. XGBoost: Direct Multi-Step (h=1..7)
            pred_xgb = []
            sales_train = sales_full[: max_origin + 1]

            for h in range(1, test_size + 1):
                X_tr, y_tr = build_xgb_training_data(
                    sales_train,
                    dows_full,
                    weekends_full,
                    month_starts_full,
                    festivals_full,
                    h=h,
                    max_origin=max_origin,
                )
                model_xgb = XGBRegressor(
                    n_estimators=200,
                    max_depth=3,
                    learning_rate=0.05,
                    random_state=42,
                    n_jobs=-1,
                )
                model_xgb.fit(X_tr, y_tr)

                target_idx = max_origin + h
                x_te = np.array([[
                    sales_train[-1],  # lag_1
                    sales_train[-7],  # lag_7
                    sales_train[-14],  # lag_14
                    np.mean(sales_train[-7:]),  # rolling_mean_7
                    dows_full[target_idx],
                    weekends_full[target_idx],
                    month_starts_full[target_idx],
                    festivals_full[target_idx],
                ]])
                pred_xgb.append(model_xgb.predict(x_te)[0])

            pred_xgb = np.array(pred_xgb)
            mae_xgb = np.mean(np.abs(pred_xgb - y_test))
            mape_xgb = np.mean(np.abs((y_test - pred_xgb) / y_test)) * 100
            fold_metrics["xgboost"]["mae"].append(mae_xgb)
            fold_metrics["xgboost"]["mape"].append(mape_xgb)

        # Aggregate metrics across the 10 folds
        for m_name in model_names:
            records.append({
                "shop_type": shop,
                "model": m_name,
                "MAE": round(float(np.mean(fold_metrics[m_name]["mae"])), 2),
                "MAE_std": round(float(np.std(fold_metrics[m_name]["mae"])), 2),
                "MAPE": round(float(np.mean(fold_metrics[m_name]["mape"])), 2),
                "MAPE_std": round(float(np.std(fold_metrics[m_name]["mape"])), 2),
            })

    results_df = pd.DataFrame(records)

    # Save comparison table
    out_csv = REPORTS_DIR / "model_comparison.csv"
    results_df.to_csv(out_csv, index=False)
    print(f"\nSaved comparison results to {out_csv}")

    # Determine best model per shop (lowest MAPE)
    best_models = []
    for shop, g in results_df.groupby("shop_type"):
        best_row = g.sort_values("MAPE").iloc[0]
        best_models.append({
            "shop_type": shop,
            "best_model": best_row["model"],
            "MAE": best_row["MAE"],
            "MAPE": f"{best_row['MAPE']:.2f}%",
        })
    best_df = pd.DataFrame(best_models)

    # Generate and save MAPE bar chart
    plt.figure(figsize=(12, 6))
    sns.set_theme(style="whitegrid")
    ax = sns.barplot(
        data=results_df,
        x="shop_type",
        y="MAPE",
        hue="model",
        palette="Blues_r",
    )
    plt.title("Forecasting Accuracy (MAPE %) Across Models & Shops", fontsize=14, fontweight="bold")
    plt.xlabel("Shop Type")
    plt.ylabel("Mean Absolute Percentage Error (MAPE %)")
    plt.legend(title="Model")

    # Add data labels
    for p in ax.patches:
        h = p.get_height()
        if h > 0:
            ax.annotate(
                f"{h:.1f}%",
                (p.get_x() + p.get_width() / 2.0, h),
                ha="center",
                va="bottom",
                fontsize=9,
                xytext=(0, 2),
                textcoords="offset points",
            )

    plt.tight_layout()
    fig_path = FIGURES_DIR / "model_comparison_mape.png"
    plt.savefig(fig_path, dpi=120)
    plt.close()
    print(f"Saved bar chart to {fig_path}")

    return results_df, best_df


if __name__ == "__main__":
    res_df, best_df = run_evaluation()
    print("\n--- Model Comparison Table ---")
    print(res_df.to_string(index=False))
    print("\n--- Best Model per Shop ---")
    print(best_df.to_string(index=False))
