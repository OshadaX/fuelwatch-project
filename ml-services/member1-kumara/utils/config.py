# utils/config.py
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]

DATA_RAW_DIR = BASE_DIR / "data" / "raw"
DATA_PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODELS_DIR = BASE_DIR / "models"

PROCESSED_DAILY_CSV = DATA_PROCESSED_DIR / "fuel_daily_pivot.csv"
MODEL_PATH = MODELS_DIR / "fuel_lstm.keras"
SCALER_X_PATH = MODELS_DIR / "scaler_X.pkl"
SCALER_Y_PATH = MODELS_DIR / "scaler_y.pkl"
MODEL_META_PATH = MODELS_DIR / "model_meta.json"

# Defaults (can tune later)
LOOKBACK_DAYS = 14
FORECAST_DAYS_WEEKLY = 7
FORECAST_DAYS_MONTHLY = 30
FORECAST_DAYS_ANNUAL = 365

RANDOM_SEED = 42
