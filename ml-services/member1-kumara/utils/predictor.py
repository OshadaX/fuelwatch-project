import json
import numpy as np
import pandas as pd
from joblib import load
from pathlib import Path
import tensorflow as tf

from utils.config import PROCESSED_DAILY_CSV


def make_time_features_for_date(date: pd.Timestamp) -> dict:
    return {
        "dow": int(date.dayofweek),
        "month": int(date.month),
        "weekofyear": int(date.isocalendar().week),
        "year": int(date.year),
        "is_weekend": int(date.dayofweek >= 5),
    }


class FuelDemandPredictor:
    def __init__(self):
        # models/ files created by notebook
        base_dir = Path(__file__).resolve().parents[1]
        models_dir = base_dir / "models"

        self.model_path = models_dir / "fuel_lstm.keras"
        self.scaler_x_path = models_dir / "scaler_X.pkl"
        self.scaler_y_path = models_dir / "scaler_y.pkl"
        self.meta_path = models_dir / "model_meta.json"

        if not self.meta_path.exists():
            raise FileNotFoundError(f"Missing model meta: {self.meta_path}. Train in notebook first.")

        with open(self.meta_path, "r", encoding="utf-8") as f:
            self.meta = json.load(f)

        self.lookback = int(self.meta["lookback_days"])
        self.feature_cols = self.meta["feature_cols"]
        self.fuel_cols = self.meta["fuel_cols"]
        self.time_cols = self.meta["time_cols"]

        self.model = tf.keras.models.load_model(self.model_path)
        self.scaler_X = load(self.scaler_x_path)
        self.scaler_y = load(self.scaler_y_path)

    def _row_features_from_state(self, date: pd.Timestamp, fuel_values: dict) -> list:
        tfv = make_time_features_for_date(date)

        row = {}
        for fc in self.fuel_cols:
            row[fc] = float(fuel_values.get(fc, 0.0))
        for tc in self.time_cols:
            row[tc] = float(tfv[tc])

        return [row[c] for c in self.feature_cols]

    def forecast_days(self, history_df: pd.DataFrame, days: int) -> pd.DataFrame:
        hist = history_df.copy()
        hist["Date"] = pd.to_datetime(hist["Date"])
        hist = hist.sort_values("Date")

        hist_tail = hist.tail(self.lookback).copy()
        if len(hist_tail) < self.lookback:
            raise ValueError(f"Need at least {self.lookback} days of history for prediction.")

        feats = hist_tail[self.feature_cols].values.astype(np.float32)
        feats_scaled = self.scaler_X.transform(feats)

        last_date = hist_tail["Date"].iloc[-1]
        preds = []

        last_fuel_vals = {fc: float(hist_tail[fc].iloc[-1]) for fc in self.fuel_cols}
        seq = feats_scaled.copy()  # (lookback, n_features)

        for i in range(1, days + 1):
            next_date = last_date + pd.Timedelta(days=i)

            x_in = seq.reshape(1, self.lookback, seq.shape[-1])
            yhat_scaled = self.model.predict(x_in, verbose=0)[0]
            yhat = self.scaler_y.inverse_transform(yhat_scaled.reshape(1, -1))[0]

            pred_row = {"Date": next_date}
            for j, fc in enumerate(self.fuel_cols):
                pred_row[fc] = float(max(0.0, yhat[j]))  # non-negative

            preds.append(pred_row)

            # prepare next input row
            last_fuel_vals = {fc: pred_row[fc] for fc in self.fuel_cols}
            next_feat_row = self._row_features_from_state(next_date, last_fuel_vals)
            next_feat_scaled = self.scaler_X.transform(np.array(next_feat_row, dtype=np.float32).reshape(1, -1))[0]

            seq = np.vstack([seq[1:], next_feat_scaled])

        return pd.DataFrame(preds)

    def predict_mode(self, history_df: pd.DataFrame, mode: str) -> dict:
        mode = mode.lower().strip()
        if mode == "weekly":
            days = 7
        elif mode == "monthly":
            days = 30
        elif mode == "annual":
            days = 365
        else:
            raise ValueError("mode must be one of: weekly, monthly, annual")

        daily_preds = self.forecast_days(history_df, days=days)
        totals = daily_preds[self.fuel_cols].sum().to_dict()

        return {
            "mode": mode,
            "from": str(daily_preds["Date"].min().date()),
            "to": str(daily_preds["Date"].max().date()),
            "totals": {k: float(v) for k, v in totals.items()},
            "daily": daily_preds.to_dict(orient="records"),
        }
