"""
Exploratory Data Analysis (EDA) script for Daily Cash-Flow Forecaster.
Saves figure charts to reports/figures/ and prints summary statistics.
"""

from pathlib import Path
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns

# Directory setup
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH = BASE_DIR / "data" / "all_shops.csv"
FIGURES_DIR = BASE_DIR / "reports" / "figures"
FIGURES_DIR.mkdir(parents=True, exist_ok=True)

sns.set_theme(style="whitegrid")
plt.rcParams["figure.dpi"] = 120


def main():
    print(f"Loading data from {DATA_PATH}...")
    df = pd.read_csv(DATA_PATH, parse_dates=["date"])
    print(f"Data shape: {df.shape}")

    # 1. Line chart of cash sales over time (4 panels)
    print("Generating Figure 1: Cash sales over time...")
    fig, axes = plt.subplots(4, 1, figsize=(14, 12), sharex=True)
    shop_order = ["tea_stall", "vegetable_shop", "tiffin_center", "kirana"]
    titles = {
        "tea_stall": "Tea Stall",
        "vegetable_shop": "Vegetable Shop",
        "tiffin_center": "Tiffin Center",
        "kirana": "Kirana Store",
    }
    colors = ["#2b5c8f", "#2e7d32", "#d84315", "#6a1b9a"]

    for ax, shop, color in zip(axes, shop_order, colors):
        sub = df[df["shop_type"] == shop]
        ax.plot(
            sub["date"],
            sub["cash_sales"],
            label=titles[shop],
            color=color,
            alpha=0.85,
            linewidth=1.2,
        )
        ax.set_title(f"{titles[shop]} — Daily Cash Sales", fontsize=12, fontweight="bold")
        ax.set_ylabel("Cash Sales (₹)")
        ax.legend(loc="upper left")

    axes[-1].set_xlabel("Date")
    plt.tight_layout()
    fig_path1 = FIGURES_DIR / "01_cash_sales_over_time.png"
    plt.savefig(fig_path1)
    plt.close()
    print(f"Saved {fig_path1}")

    # 2. Bar chart: average cash_sales by day_of_week per shop
    print("Generating Figure 2: Average cash sales by weekday...")
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    weekday_avg = df.groupby(["shop_type", "day_of_week"])["cash_sales"].mean().reset_index()

    plt.figure(figsize=(12, 6))
    sns.barplot(
        data=weekday_avg,
        x="day_of_week",
        y="cash_sales",
        hue="shop_type",
        order=days,
        palette="tab10",
    )
    plt.title("Average Cash Sales by Day of Week", fontsize=14, fontweight="bold")
    plt.xlabel("Day of Week")
    plt.ylabel("Average Cash Sales (₹)")
    plt.legend(title="Shop Type")
    plt.tight_layout()
    fig_path2 = FIGURES_DIR / "02_weekday_avg_sales.png"
    plt.savefig(fig_path2)
    plt.close()
    print(f"Saved {fig_path2}")

    # 3. Festival effect
    print("Generating Figure 3: Festival sales boost...")
    festival_stats = []
    for shop, group in df.groupby("shop_type"):
        fest_mean = group[group["is_festival"] == 1]["cash_sales"].mean()
        non_fest_mean = group[group["is_festival"] == 0]["cash_sales"].mean()
        pct_diff = ((fest_mean - non_fest_mean) / non_fest_mean) * 100
        festival_stats.append({
            "Shop": shop,
            "Normal Day Sales (₹)": round(non_fest_mean, 1),
            "Festival Sales (₹)": round(fest_mean, 1),
            "Difference (%)": f"+{pct_diff:.1f}%",
            "pct_diff_num": pct_diff,
        })

    fest_df = pd.DataFrame(festival_stats)
    plt.figure(figsize=(9, 5))
    sns.barplot(data=fest_df, x="Shop", y="pct_diff_num", palette="Oranges_r")
    plt.title(
        "Festival Sales Boost (% Increase on Festival vs Normal Days)",
        fontsize=13,
        fontweight="bold",
    )
    plt.ylabel("% Sales Increase")
    plt.xlabel("Shop Type")
    for i, row in fest_df.iterrows():
        plt.text(
            i, row["pct_diff_num"] + 0.8, f"+{row['pct_diff_num']:.1f}%", ha="center", fontweight="bold"
        )
    plt.ylim(0, 55)
    plt.tight_layout()
    fig_path3 = FIGURES_DIR / "03_festival_sales_boost.png"
    plt.savefig(fig_path3)
    plt.close()
    print(f"Saved {fig_path3}")

    # 4. Salary week and rain effects
    print("Generating Figure 4: Salary week and rain effects...")
    effect_rows = []
    for shop, group in df.groupby("shop_type"):
        sal_mean = group[group["is_month_start"] == 1]["cash_sales"].mean()
        non_sal_mean = group[group["is_month_start"] == 0]["cash_sales"].mean()
        sal_pct = ((sal_mean - non_sal_mean) / non_sal_mean) * 100

        rain_mean = group[group["is_rainy"] == 1]["cash_sales"].mean()
        dry_mean = group[group["is_rainy"] == 0]["cash_sales"].mean()
        rain_pct = ((rain_mean - dry_mean) / dry_mean) * 100

        effect_rows.append({
            "Shop": shop,
            "Salary_pct": sal_pct,
            "Rain_pct": rain_pct,
        })

    effects_df = pd.DataFrame(effect_rows)
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    sns.barplot(data=effects_df, x="Shop", y="Salary_pct", ax=axes[0], palette="Greens_r")
    axes[0].set_title("Salary Week Boost (Days 1–7)", fontsize=12, fontweight="bold")
    axes[0].set_ylabel("% Sales Increase")
    for i, row in effects_df.iterrows():
        axes[0].text(
            i, row["Salary_pct"] + 0.3, f"+{row['Salary_pct']:.1f}%", ha="center", fontweight="bold"
        )
    axes[0].set_ylim(0, 22)

    sns.barplot(data=effects_df, x="Shop", y="Rain_pct", ax=axes[1], palette="Blues")
    axes[1].set_title("Rainy Day Impact", fontsize=12, fontweight="bold")
    axes[1].set_ylabel("% Sales Change")
    for i, row in effects_df.iterrows():
        axes[1].text(
            i, row["Rain_pct"] - 1.2, f"{row['Rain_pct']:.1f}%", ha="center", fontweight="bold"
        )
    axes[1].set_ylim(-26, 0)

    plt.tight_layout()
    fig_path4 = FIGURES_DIR / "04_salary_and_rain_effects.png"
    plt.savefig(fig_path4)
    plt.close()
    print(f"Saved {fig_path4}")

    # 5. Kirana closing cash & 3-day expense threshold
    print("Generating Figure 5: Kirana closing cash and buffer line...")
    kirana_df = df[df["shop_type"] == "kirana"].copy().reset_index(drop=True)
    avg_expenses = kirana_df["expenses"].mean()
    low_threshold = 3 * avg_expenses
    low_days = (kirana_df["closing_cash"] < low_threshold).sum()
    low_pct = 100.0 * low_days / len(kirana_df)

    plt.figure(figsize=(14, 6))
    plt.plot(
        kirana_df["date"],
        kirana_df["closing_cash"],
        color="#6a1b9a",
        linewidth=1.5,
        label="Closing Cash (Till)",
    )
    plt.axhline(
        low_threshold,
        color="crimson",
        linestyle="--",
        linewidth=1.8,
        label=f"3 Days Avg Expenses (₹{low_threshold:,.0f})",
    )

    plt.fill_between(
        kirana_df["date"],
        kirana_df["closing_cash"],
        low_threshold,
        where=(kirana_df["closing_cash"] < low_threshold),
        color="crimson",
        alpha=0.35,
        label=f"Low-Cash Days ({low_days} days, {low_pct:.1f}%)",
    )

    plt.title(
        "Kirana Store: Closing Cash Over Time & Low-Cash Buffer Alert",
        fontsize=14,
        fontweight="bold",
    )
    plt.xlabel("Date")
    plt.ylabel("Closing Cash (₹)")
    plt.legend(loc="upper left")
    plt.tight_layout()
    fig_path5 = FIGURES_DIR / "05_kirana_closing_cash_buffer.png"
    plt.savefig(fig_path5)
    plt.close()
    print(f"Saved {fig_path5}")

    # 6. Autocorrelation plot of Kirana sales
    print("Generating Figure 6: Kirana autocorrelation plot...")
    lags = range(1, 31)
    autocorrs = [kirana_df["cash_sales"].autocorr(lag=lag) for lag in lags]

    plt.figure(figsize=(12, 5))
    plt.stem(lags, autocorrs, basefmt=" ")
    plt.axhline(0, color="black", linewidth=0.8, linestyle="--")
    for weekly_lag in [7, 14, 21, 28]:
        plt.axvline(weekly_lag, color="red", linestyle=":", alpha=0.6)

    plt.title(
        "Kirana Cash Sales: Autocorrelation Plot (Lags 1 to 30)", fontsize=14, fontweight="bold"
    )
    plt.xlabel("Lag (Days)")
    plt.ylabel("Autocorrelation")
    plt.xticks(list(range(1, 31)))
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    fig_path6 = FIGURES_DIR / "06_kirana_autocorrelation.png"
    plt.savefig(fig_path6)
    plt.close()
    print(f"Saved {fig_path6}")

    print("\nEDA run complete! All figures saved in reports/figures/.")


if __name__ == "__main__":
    main()
