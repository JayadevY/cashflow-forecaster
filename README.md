# Daily Cash-Flow Forecaster for Small Shop Owners

This project helps a small shop (kirana store, tea stall) look a week ahead.

It will:

- Forecast the next **7 days** of sales
- Compare a simple **moving average** against **ARIMA** and **XGBoost**
- Score the models with **MAE** and **MAPE** using time-series cross-validation
- Warn when forecasted cash looks **too low** to cover typical costs

**The data is synthetic.** Numbers are generated to look like a small shop, not taken from a real business.

## Folders

- `data/` — sales and cash numbers (CSV files later)
- `src/` — Python code that loads data, trains models, and makes forecasts
- `notebooks/` — Jupyter notebooks for trying ideas and plotting
- `app/` — a simple user-facing app (later)

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## How to run the backend

```bash
source .venv/bin/activate
python app/backend/seed.py
uvicorn app.backend.main:app --reload
```
The API is available at `http://127.0.0.1:8000` (docs at `http://127.0.0.1:8000/docs`).

## How to run the frontend

```bash
cd app/frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

