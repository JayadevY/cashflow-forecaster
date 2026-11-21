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

## Deployment

The project is structured for easy deployment on free-tier platforms: **Render** for the FastAPI backend and **Vercel** for the React PWA frontend.

### 1. Backend Deployment (Render)

You can deploy using Render's Blueprint (`render.yaml`) or manually create a **Web Service**:

1. **Repository & Runtime**: Connect your GitHub repository. Select runtime **Python 3**.
2. **Build Command**:
   ```bash
   pip install -r requirements-backend.txt
   ```
   *(This uses the lean requirements file without heavy notebook/plotting packages).*
3. **Start Command** (Procfile-free):
   ```bash
   uvicorn app.backend.main:app --host 0.0.0.0 --port $PORT
   ```
4. **Health Check Path**:
   `/health`
5. **Environment Variables**:
   - `CORS_ORIGINS`: Comma-separated list of allowed frontend URLs (e.g. `https://your-app.vercel.app,http://localhost:5173`). Defaults to `http://localhost:5173,http://localhost:5174`.
   - `PYTHON_VERSION`: `3.11.9`
6. **Automatic Demo Seeding**:
   On fresh instances where the SQLite database has no shops, the backend automatically seeds all 4 neighborhood demo shops, 365 days of historical data from `data/*.csv`, and 28 Udhaar records on startup.

### 2. Frontend Deployment (Vercel)

1. **Import Project**: In Vercel, import your repository.
2. **Root Directory**: Set to `app/frontend`.
3. **Framework Preset**: **Vite**.
4. **Build & Output**:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Environment Variables**:
   - `VITE_API_URL`: The deployed Render backend URL (e.g. `https://cashflow-forecaster-backend.onrender.com`). Fallback is `http://127.0.0.1:8000`.
6. **Single-Page Application Routing**:
   [`app/frontend/vercel.json`](file:///Users/jayadevygmail.com/cashflow-forecaster/app/frontend/vercel.json) routes all incoming requests to `/index.html` for client-side routing and PWA support.
7. **Cold-Start Wake-Up Handling**:
   Free-tier Render instances sleep after 15 minutes of inactivity. If the initial request takes longer than 4 seconds, the app gracefully displays `"Waking up the server, this can take up to a minute..."` and retries connection attempts for up to 90 seconds before displaying an error screen.


