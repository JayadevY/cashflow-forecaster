# Project state

Living notes for the Daily Cash-Flow Forecaster. Update this file as the work moves forward.

## Current phase

Frontend application & Udhaar (Customer Credit) Tracker complete and live. Added dedicated Udhaar tracker across backend (SQLite `udhaar` table, 4 REST endpoints, idempotent seed data for 28 demo accounts, 5 unit tests) and mobile-first React UI (4th bottom tab, total outstanding card, red overdue indicator, collect today list with inline payment box, and add credit form in EN/தமிழ்/हिंदी). All 20 API tests passing.

## Files done

- `README.md` — what the project is, backend and frontend run instructions
- `PROJECT_STATE.md` — this progress log
- `requirements.txt` — dependencies (pandas, numpy, matplotlib, seaborn, jupyter, ipykernel, scikit-learn, statsmodels, xgboost, fastapi, uvicorn, pydantic, httpx, pytest)
- `.gitignore` — ignores SQLite databases (`cashflow.db`, `*.db`) and python caches
- `src/generate_data.py` — builds two years of daily cash-flow numbers with cash drawer dynamics
- `data/tea_stall.csv`, `data/vegetable_shop.csv`, `data/tiffin_center.csv`, `data/kirana.csv` — one file per shop
- `data/all_shops.csv` — all four shops stacked together (2920 rows)
- `notebooks/01_eda.ipynb` — beginner-friendly exploratory data analysis with embedded charts and summaries
- `src/eda.py` — standalone script to generate and save charts to `reports/figures/`
- `src/models.py` — time-series cross-validation evaluation for Moving Average, Seasonal Naive, SARIMAX, and XGBoost
- `notebooks/02_model_comparison.ipynb` — beginner-friendly model comparison notebook with embedded evaluation outputs
- `reports/model_comparison.csv` — benchmark evaluation metrics table
- `reports/figures/model_comparison_mape.png` — comparison bar chart of MAPE per model per shop
- `src/forecast.py` — probabilistic 7-day cash flow forecasting engine and risk alert system
- `notebooks/03_alerts.ipynb` — 52-week rolling backtest, interval calibration, and precision/recall evaluation
- `src/run_backtest_v2.py` — 3-setting backtest separating forecastable risk from owner-driven draws
- `reports/alert_backtest.csv` — 52-week backtest performance summary across all shops
- `reports/alert_backtest_v2.csv` — three-setting backtest comparison table
- `reports/figures/kirana_alert_example.png` — visual chart of cash uncertainty band and alert threshold
- `app/backend/db.py` — SQLite database connection helper, schema migrations, and index definitions (`shops`, `daily_entries`, `planned_payments`, and `udhaar`)
- `app/backend/schemas.py` — Pydantic request/response models with validation (rejects negative numbers, future dates, and overpayment)
- `app/backend/seed.py` — seeds 4 realistic demo shops with 365 days of history each from `data/` and 28 demo customer credit accounts
- `app/backend/main.py` — FastAPI application with 12 REST endpoints (including Udhaar management), CORS for localhost:5173, and forecast caching
- `tests/test_api.py` — 20 pytest tests covering health, shop registration, daily entries, closing cash math, basic/full forecasts (`data_ends_on`), planned-payments date validation, what-if simulation verdicts (`too_large`, `ok`, `better_day_exists`), input validation (`date=4`, `amount=0`, `max_safe_amount`), and complete Udhaar lifecycles (add, partial pay, overpay rejection, auto-close, and overdue summary)
- `app/backend/cashflow.db` — seeded local SQLite database
- `app/frontend/package.json` — React 18, Vite, Tailwind CSS, Recharts, Lucide React dependencies
- `app/frontend/vite.config.js` — Vite dev server config running on port 5173
- `app/frontend/tailwind.config.js`, `postcss.config.js` — mobile-first styling and theme setup
- `app/frontend/index.html` — responsive mobile meta viewport and title
- `app/frontend/src/config.js` — single config file defining API base URL (`http://127.0.0.1:8000`)
- `app/frontend/src/api.js` — API client module for all backend endpoints (daily entries, forecasts, what-if, and Udhaar tracking)
- `app/frontend/src/i18n.js` — everyday language translations in English, Tamil (தமிழ்), and Hindi (हिंदी) across all 4 screens
- `app/frontend/src/utils/formatters.js` — Indian numbering rupee formatting (`₹1,25,472`) and color-blind status cues
- `app/frontend/src/components/StatusBadge.jsx` — color-blind friendly badge (Safe / Watch / Danger) with icons
- `app/frontend/src/components/CashMeterCard.jsx` — big cash drawer balance card, safety line, and worst-day alert
- `app/frontend/src/components/ForecastChart.jsx` — 7-day Recharts chart with shaded p10-p90 uncertainty band and dashed safety line
- `app/frontend/src/components/DayRiskList.jsx` — 7-day breakdown cards with weekday, date, risk %, and status badge
- `app/frontend/src/components/HomeScreen.jsx` — Tab 1 main dashboard
- `app/frontend/src/components/EntryFormScreen.jsx` — Tab 2 daily transaction entry with auto-closing cash feedback
- `app/frontend/src/components/WhatIfScreen.jsx` — Tab 3 scenario planner, max safe amount, and planned payment tracker
- `app/frontend/src/components/UdhaarScreen.jsx` — Tab 4 customer credit tracker (outstanding balance, overdue alerts, collect today list with inline quick payments, and credit creation form)
- `app/frontend/src/components/Navbar.jsx` — sticky top bar with shop selector and language switcher
- `app/frontend/src/components/BottomNav.jsx` — fixed bottom navigation bar with 4 large touch tabs
- `app/frontend/src/components/ErrorScreen.jsx` — friendly server offline screen with retry
- `app/frontend/src/components/LoadingSpinner.jsx` — animated loading spinner
- `app/frontend/src/App.jsx`, `main.jsx` — main application entry and state coordinator

## Decisions

- Resume project for small shops (kirana stores, tea stalls, vegetable shops, tiffin centers).
- Compare three methods: moving-average baseline, ARIMA, and XGBoost.
- Judge models with time-series cross-validation using MAE and MAPE.
- Forecast the next 7 days of sales.
- Alert when forecasted cash looks too low.
- Use **synthetic** data (made-up numbers that look real), not a real shop’s books.
- Date range: **2024-11-01** to **2026-10-31** (730 days per shop).
- Random seed **42** so re-running the generator makes the same files.
- Festival list is hardcoded (Pongal, Diwali, Tamil New Year, Eid, Christmas).
- Rainy days are the same calendar for every shop (~15% of days).
- `closing_cash` follows: previous closing + cash sales + udhaar collected − expenses − owner_withdrawal − unplanned_outflow + owner_topup.
- Real shops have irregular withdrawals and surprise costs, and the alert needs realistic tight days:
  - Sunday withdrawals happen with 60% probability, taking 50–100% of surplus above target cash.
  - `unplanned_outflow` models ~2 random surprise costs per month (0.5–1.5 days of average expenses) for repairs, bulk purchases, or family needs.
  - Emergency `owner_topup` tops cash back up to ₹500 if the till would go negative.
  - Cash target levels are tuned so that 8%–12% of days fall below 3 days of expenses for every shop, with 0–6 emergency top-up days.
- Probabilistic 7-day cash simulation:
  - 1,000 Monte Carlo simulations per origin, combining best model point forecasts with empirical residuals drawn from matching horizons.
  - Cash trajectory: `cash_{h} = cash_{h-1} + simulated_sales + expected_udhaar (28d avg) - expected_expenses (8-wk weekday avg + day 1 rent) - planned_payments`.
  - Alert threshold: 3 days of average daily expenses over the last 90 days.
  - Risk classification: Green (< 20% risk), Amber (20%–50% risk), Red (> 50% risk).
  - Explicitly acknowledge limitation: owner discretionary withdrawals and sudden unplanned breakdowns cannot be anticipated without user inputs.
- Planned payments input is essential because owner withdrawals cause most low-cash days:
  - 55% to 100% of non-rent crises (tea stall: 82.4%, tiffin center: 100%, vegetable shop: 54.5%) were preceded by owner withdrawals.
  - Adding user-entered planned withdrawals in the app restores alert recall from ~6%–24% up to 88%–94% with high precision.
- Backend Architecture (FastAPI + SQLite):
  - Local SQLite file `app/backend/cashflow.db` provides zero-configuration, reliable persistence for shops, daily entries, and planned payments.
  - Server-side cash identity enforcement: owner only inputs transaction flows; the server computes `closing_cash = prior_closing + cash_sales + udhaar_collected - expenses - owner_withdrawal` and cascades adjustments to any subsequent days.
  - Multi-tier forecast modes: returns a simple 7-day moving-average projection (`mode: "basic"`) when entries < 60 days, and full machine-learning probabilistic simulations (`mode: "full"`) when >= 60 days.
  - In-memory caching: forecast predictions and residual matrices are cached per shop to make repeated dashboard calls and what-if queries instant; automatically invalidated whenever an entry, payment, or setting changes.
  - Forecast metadata & strict input validation: `/forecast` returns `data_ends_on` (latest entry date); `/what-if` validates `amount > 0` and real `YYYY-MM-DD` date inside the 7-day forecast window before running any model (HTTP 422 otherwise); `POST /planned-payments` enforces real `YYYY-MM-DD` dates not more than 60 days ahead (HTTP 422 otherwise).
  - What-If optimization: tests user-proposed bills across the 7-day horizon, returns a clear `verdict` (`too_large` if every day exceeds 80% peak risk, `better_day_exists` if another day is safer, or `ok` if the chosen day is safest), and computes `max_safe_amount` (largest multiple of ₹1,000 up to current cash on the chosen date keeping peak risk < 20%; always >= requested amount if safe, 0 only if even ₹1,000 is unsafe).
- Udhaar (Customer Credit) Tracker Architecture:
  - Table schema: `udhaar(id, shop_id, customer_name, amount_given, amount_paid DEFAULT 0, given_date, due_date, note, status 'open'|'closed')` created via `CREATE TABLE IF NOT EXISTS` with index on `(shop_id, status)` and `(shop_id, due_date)`.
  - Payment validation: enforces payments >= ₹1 and <= outstanding balance (`amount_given - amount_paid`); automatically transitions status to `'closed'` when remaining balance reaches ₹0.
  - Overdue classification: any open credit with `due_date < today` is marked overdue with `days_overdue = (today - due_date).days`.
  - Daily recovery prioritization: `/shops/{id}/udhaar/summary` delivers total outstanding, customer count, overdue sum, top 3 debtor balances, and a "collect today" priority list sorted by largest balance first.
  - Seed dataset: 28 customer credit records (6 tea stall, 6 vegetable shop, 6 tiffin center, 10 kirana) with realistic khata/tab descriptions, seeded idempotently only when the table is empty.
  - Mobile UI (Tab 4): prominent total outstanding balance card, red overdue pill with `AlertOctagon` icon, collect today list with inline 1-click payment box, and a clean credit creation form with full multi-language translations.
- Frontend Architecture (React + Vite + Tailwind + Recharts):
  - Mobile-first responsive layout constrained to 480px width max centered on desktop with large 56px touch targets for phone use.
  - Multi-language everyday wording support (English, தமிழ், हिंदी) toggleable dynamically with zero reload.
  - Color-blind accessible indicators: every status pairs a distinct shape icon (Check, Triangle, Octagon) with an explicit text label (Safe, Watch, Danger) and high-contrast color styling.
  - Indian numbering system: all currency amounts formatted with standard Indian commas (`₹1,25,472`).
  - Seamless 4-tab flow: Tab 1 Home (meter card, Recharts 7-day projection band, day list), Tab 2 Add Today (daily bookkeeping with automatic closing cash calculation), Tab 3 Plan Payment (interactive what-if scenario testing and planned payment tracking), Tab 4 Udhaar (customer credit tracker and recovery queue).

## Results

Generated with `python src/generate_data.py` (seed 42):

| Shop            | Rows | Typical daily cash sales | Notes |
|-----------------|------|--------------------------|--------|
| tea_stall       | 730  | ~₹4,900                  | smallest shop |
| vegetable_shop  | 730  | ~₹11,300                 | tightest cash; some negative days after rent |
| tiffin_center   | 730  | ~₹14,700                 | weekday lunch crowd; a few tight rent days |
| kirana          | 730  | ~₹20,500                 | largest shop, more udhaar |
| all_shops       | 2920 | —                        | combined file |

Checked patterns: weekends > weekdays, festivals up ~30–60%, days 1–7 up ~15%, rainy days down ~15–20%. Cash identity holds for every row.

### 7-Day Ahead Forecast Model Comparison (TimeSeriesSplit, 10 Folds)

| Shop Type | Model | MAE (₹) | MAE Std | MAPE (%) | MAPE Std | Winner |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **tea_stall** | moving_average | ₹805.43 | ₹491.65 | 15.13% | 6.19% | |
| | seasonal_naive | ₹904.89 | ₹486.04 | 17.13% | 6.67% | |
| | arima | ₹551.00 | ₹192.00 | 10.73% | 3.42% | |
| | **xgboost** | **₹512.36** | **₹131.23** | **9.86%** | **2.46%** | **Best (Lowest MAPE)** |
| **vegetable_shop** | moving_average | ₹2,475.24 | ₹1,083.91 | 19.91% | 7.28% | |
| | seasonal_naive | ₹2,251.91 | ₹1,068.42 | 18.36% | 6.21% | |
| | arima | ₹1,473.15 | ₹501.38 | 12.23% | 2.57% | |
| | **xgboost** | **₹1,320.47** | **₹403.39** | **10.70%** | **2.87%** | **Best (Lowest MAPE)** |
| **tiffin_center** | moving_average | ₹2,752.37 | ₹2,026.63 | 17.22% | 8.48% | |
| | seasonal_naive | ₹3,151.50 | ₹1,964.70 | 19.99% | 8.43% | |
| | **arima** | **₹1,583.47** | **₹417.34** | **10.46%** | **2.09%** | **Best (Lowest MAPE)** |
| | xgboost | ₹1,630.19 | ₹536.20 | 10.48% | 2.36% | |
| **kirana** | moving_average | ₹4,126.77 | ₹3,052.84 | 18.31% | 8.41% | |
| | seasonal_naive | ₹4,450.91 | ₹3,127.74 | 19.95% | 9.93% | |
| | **arima** | **₹2,697.81** | **₹450.47** | **12.45%** | **2.69%** | **Best (Lowest MAPE)** |
| | xgboost | ₹2,955.11 | ₹1,422.35 | 12.89% | 3.62% | |

### 52-Week Rolling Low-Cash Alert Backtest Results

| Shop Type | Best Model | Windows | Sales p10–p90 Coverage | Actual Crises | Alerts Issued | TP | FP | FN | Precision | Recall |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **tea_stall** | xgboost | 52 | 78.8% | 17 | 4 | 4 | 0 | 13 | 100.0% | 23.5% |
| **vegetable_shop** | xgboost | 52 | 66.2% | 11 | 6 | 5 | 1 | 6 | 83.3% | 45.5% |
| **tiffin_center** | arima | 52 | 72.8% | 16 | 1 | 1 | 0 | 15 | 100.0% | 6.2% |
| **kirana** | arima | 52 | 72.5% | 9 | 13 | 9 | 4 | 0 | 69.2% | 100.0% |

### Three-Setting Alert Backtest Comparison (Reports: `reports/alert_backtest_v2.csv`)

| Shop Type | Setting | Crises | Alerts | TP | FP | Precision | Recall |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **tea_stall** | A (As-is) | 17 | 4 | 4 | 0 | 100.0% | 23.5% |
| | B (Forecastable-only) | 4 | 4 | 4 | 0 | 100.0% | 100.0% |
| | C (Owner-informed) | 17 | 18 | 15 | 3 | 83.3% | 88.2% |
| **vegetable_shop** | A (As-is) | 11 | 6 | 5 | 1 | 83.3% | 45.5% |
| | B (Forecastable-only) | 4 | 6 | 4 | 2 | 66.7% | 100.0% |
| | C (Owner-informed) | 11 | 6 | 5 | 1 | 83.3% | 45.5% |
| **tiffin_center** | A (As-is) | 16 | 1 | 1 | 0 | 100.0% | 6.2% |
| | B (Forecastable-only) | 0 | 1 | 0 | 1 | 0.0% | 0.0% |
| | C (Owner-informed) | 16 | 17 | 15 | 2 | 88.2% | 93.8% |
| **kirana** | A (As-is) | 9 | 13 | 9 | 4 | 69.2% | 100.0% |
| | B (Forecastable-only) | 8 | 13 | 8 | 5 | 61.5% | 100.0% |
| | C (Owner-informed) | 9 | 13 | 9 | 4 | 69.2% | 100.0% |

**Setting-A Crises Preceded by Owner Withdrawal in Same Window**:
- `tea_stall`: 14 / 17 (82.4%)
- `vegetable_shop`: 6 / 11 (54.5%)
- `tiffin_center`: 16 / 16 (100.0%)
- `kirana`: 0 / 9 (0.0%)

## Open bugs

None yet.

## Next step

plain-language tips.
