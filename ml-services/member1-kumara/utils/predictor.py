# utils/predictor.py
import json
import numpy as np
import pandas as pd
from pathlib import Path
from joblib import load
import tensorflow as tf

from utils.config import LOOKBACK_DAYS


def make_time_features_for_date(date: pd.Timestamp) -> dict:
    return {
        "dow": int(date.dayofweek),
        "month": int(date.month),
        "weekofyear": int(date.isocalendar().week),
        "year": int(date.year),
        "is_weekend": int(date.dayofweek >= 5),
    }


class FuelDemandPredictor:
    """
    Loads notebook-trained artifacts:
    - models/fuel_lstm.keras
    - models/scaler_X.pkl
    - models/scaler_y.pkl
    - models/model_meta.json
    and provides weekly/monthly/annual forecasts.

    NEW:
    - Supports filtering output to selected fuel types (fuel_filter)
    """
    def __init__(self):
        base_dir = Path(__file__).resolve().parents[1]
        models_dir = base_dir / "models"

        self.model_path = models_dir / "fuel_lstm.keras"
        self.scaler_x_path = models_dir / "scaler_X.pkl"
        self.scaler_y_path = models_dir / "scaler_y.pkl"
        self.meta_path = models_dir / "model_meta.json"

        if not self.meta_path.exists():
            raise FileNotFoundError(
                f"Missing {self.meta_path}. Train the model first in Notebook to generate artifacts."
            )

        with open(self.meta_path, "r", encoding="utf-8") as f:
            self.meta = json.load(f)

        self.lookback = int(self.meta.get("lookback_days", LOOKBACK_DAYS))
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

    def _normalize_fuel_filter(self, fuel_filter):
        """
        Convert fuel_filter to a clean list that exists in model fuel_cols.
        """
        if not fuel_filter:
            return None

        # make unique, preserve order
        seen = set()
        cleaned = []
        for f in fuel_filter:
            if f is None:
                continue
            name = str(f).strip()
            if not name:
                continue
            if name in self.fuel_cols and name not in seen:
                cleaned.append(name)
                seen.add(name)

        return cleaned if cleaned else None

    def forecast_days(self, history_df: pd.DataFrame, days: int, fuel_filter=None) -> pd.DataFrame:
        """
        history_df must contain: Date + feature_cols (fuel cols + time cols)
        fuel_filter: optional list of fuel names to return in output
        """
        selected_fuels = self._normalize_fuel_filter(fuel_filter)  # None or list

        hist = history_df.copy()
        hist["Date"] = pd.to_datetime(hist["Date"])
        hist = hist.sort_values("Date").reset_index(drop=True)

        hist_tail = hist.tail(self.lookback).copy()
        if len(hist_tail) < self.lookback:
            raise ValueError(f"Need at least {self.lookback} days of history for prediction.")

        feats = hist_tail[self.feature_cols].values.astype(np.float32)
        feats_scaled = self.scaler_X.transform(feats)

        last_date = pd.to_datetime(hist_tail["Date"].iloc[-1])
        preds = []

        last_fuel_vals = {fc: float(hist_tail[fc].iloc[-1]) for fc in self.fuel_cols}
        seq = feats_scaled.copy()  # (lookback, n_features)

        for i in range(1, days + 1):
            next_date = last_date + pd.Timedelta(days=i)

            x_in = seq.reshape(1, self.lookback, seq.shape[-1])
            yhat_scaled = self.model.predict(x_in, verbose=0)[0]
            yhat = self.scaler_y.inverse_transform(yhat_scaled.reshape(1, -1))[0]

            pred_row = {"Date": next_date}

            # produce all fuels internally
            all_pred = {}
            for j, fc in enumerate(self.fuel_cols):
                all_pred[fc] = float(max(0.0, yhat[j]))  # non-negative

            # output only selected fuels if provided
            out_fuels = selected_fuels if selected_fuels is not None else self.fuel_cols
            for fc in out_fuels:
                pred_row[fc] = all_pred[fc]

            preds.append(pred_row)

            # update state for next day input (must use all fuels for internal consistency)
            last_fuel_vals = all_pred
            next_feat_row = self._row_features_from_state(next_date, last_fuel_vals)

            next_feat_scaled = self.scaler_X.transform(
                np.array(next_feat_row, dtype=np.float32).reshape(1, -1)
            )[0]

            seq = np.vstack([seq[1:], next_feat_scaled])

        return pd.DataFrame(preds)

    def predict_mode(self, history_df: pd.DataFrame, mode: str, fuel_filter=None) -> dict:
        mode = mode.lower().strip()
        if mode == "weekly":
            days = 7
        elif mode == "monthly":
            days = 30
        elif mode == "annual":
            days = 365
        else:
            raise ValueError("mode must be one of: weekly, monthly, annual")

        selected_fuels = self._normalize_fuel_filter(fuel_filter)
        daily_preds = self.forecast_days(history_df, days=days, fuel_filter=selected_fuels)

        # totals must be only for returned fuels
        fuels_in_output = [c for c in daily_preds.columns if c != "Date"]
        totals = daily_preds[fuels_in_output].sum().to_dict()

        return {
            "mode": mode,
            "fuel_types_used": fuels_in_output,  # ✅ important for frontend
            "from": str(pd.to_datetime(daily_preds["Date"].min()).date()),
            "to": str(pd.to_datetime(daily_preds["Date"].max()).date()),
            "totals": {k: float(v) for k, v in totals.items()},
            "daily": daily_preds.to_dict(orient="records"),
        }
