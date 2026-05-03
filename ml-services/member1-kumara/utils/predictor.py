# utils/predictor.py
import json
import numpy as np
import pandas as pd
from pathlib import Path
from joblib import load
import tensorflow as tf

from utils.config import LOOKBACK_DAYS


@tf.keras.utils.register_keras_serializable()
def tolerance_accuracy(y_true, y_pred):
    eps = tf.keras.backend.epsilon()
    rel_error = tf.abs((y_true - y_pred) / (tf.abs(y_true) + eps))
    return tf.reduce_mean(tf.cast(rel_error <= 0.10, tf.float32))


tf.keras.utils.get_custom_objects()["tolerance_accuracy"] = tolerance_accuracy
tf.keras.utils.get_custom_objects()["function"] = tolerance_accuracy


def make_time_features_for_date(date: pd.Timestamp) -> dict:
    return {
        "dow": int(date.dayofweek),
        "month": int(date.month),
        "weekofyear": int(date.isocalendar().week),
        "year": int(date.year),
        "is_weekend": int(date.dayofweek >= 5),
    }


def compute_floor_from_history(series: np.ndarray) -> float:
    s = np.asarray(series, dtype=float)
    s = s[np.isfinite(s)]
    if s.size == 0:
        return 0.0

    s = np.clip(s, 0, None)

    if np.mean(s > 0) < 0.2:
        return 0.0

    nonzero = s[s > 0]
    if nonzero.size == 0:
        return 0.0

    p10 = float(np.percentile(nonzero, 10))
    med = float(np.median(nonzero))

    return max(p10, 0.2 * med)


class FuelDemandPredictor:
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

        self.model = tf.keras.models.load_model(self.model_path, compile=False)
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
        if not fuel_filter:
            return None

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

    def _compute_floors(self, hist: pd.DataFrame) -> dict:
        recent_hist = hist.tail(max(self.lookback * 2, 30)).copy()
        floors = {}
        for fc in self.fuel_cols:
            if fc in recent_hist.columns:
                floors[fc] = compute_floor_from_history(recent_hist[fc].values)
            else:
                floors[fc] = 0.0
        return floors

    def forecast_days(self, history_df: pd.DataFrame, days: int, fuel_filter=None) -> pd.DataFrame:
        selected_fuels = self._normalize_fuel_filter(fuel_filter)

        hist = history_df.copy()
        hist["Date"] = pd.to_datetime(hist["Date"])
        hist = hist.sort_values("Date").reset_index(drop=True)

        floors = self._compute_floors(hist)

        hist_tail = hist.tail(self.lookback).copy()
        if len(hist_tail) < self.lookback:
            raise ValueError(f"Need at least {self.lookback} days of history for prediction.")

        missing_cols = [c for c in self.feature_cols if c not in hist_tail.columns]
        if missing_cols:
            raise ValueError(f"History is missing required columns: {missing_cols}")

        feats = hist_tail[self.feature_cols].values.astype(np.float32)
        feats_scaled = self.scaler_X.transform(feats)

        last_date = pd.to_datetime(hist_tail["Date"].iloc[-1])
        preds = []

        last_fuel_vals = {fc: float(hist_tail[fc].iloc[-1]) for fc in self.fuel_cols}
        seq = feats_scaled.copy()

        ALPHA = 0.7

        for i in range(1, days + 1):
            next_date = last_date + pd.Timedelta(days=i)

            x_in = seq.reshape(1, self.lookback, seq.shape[-1])
            yhat_scaled = self.model.predict(x_in, verbose=0)[0]
            yhat = self.scaler_y.inverse_transform(yhat_scaled.reshape(1, -1))[0]

            pred_row = {"Date": next_date}
            all_pred = {}

            for j, fc in enumerate(self.fuel_cols):
                raw_pred = float(yhat[j])
                last_val = float(last_fuel_vals.get(fc, 0.0))

                if not np.isfinite(raw_pred):
                    raw_pred = last_val

                safe_pred = max(raw_pred, 0.0)

                floor = float(floors.get(fc, 0.0))
                if floor > 0:
                    safe_pred = max(safe_pred, floor)

                safe_pred = ALPHA * safe_pred + (1.0 - ALPHA) * last_val
                all_pred[fc] = float(safe_pred)

            out_fuels = selected_fuels if selected_fuels is not None else self.fuel_cols
            for fc in out_fuels:
                pred_row[fc] = all_pred[fc]

            preds.append(pred_row)

            last_fuel_vals = all_pred
            next_feat_row = self._row_features_from_state(next_date, last_fuel_vals)

            next_feat_scaled = self.scaler_X.transform(
                np.array(next_feat_row, dtype=np.float32).reshape(1, -1)
            )[0]

            seq = np.vstack([seq[1:], next_feat_scaled])

        from datetime import date
        today = pd.Timestamp(date.today())
        for i, p in enumerate(preds):
            p["Date"] = today + pd.Timedelta(days=i + 1)

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

        fuels_in_output = [c for c in daily_preds.columns if c != "Date"]
        totals = daily_preds[fuels_in_output].sum().to_dict()

        monthly = []
        if mode == "annual":
            dfm = daily_preds.copy()
            dfm["Date"] = pd.to_datetime(dfm["Date"])
            dfm["Month"] = dfm["Date"].dt.strftime("%b")
            dfm["MonthNo"] = dfm["Date"].dt.month

            g = dfm.groupby(["MonthNo", "Month"])[fuels_in_output].sum().reset_index()
            g = g.sort_values("MonthNo").drop(columns=["MonthNo"])

            monthly = g.to_dict(orient="records")

        return {
            "mode": mode,
            "fuel_types_used": fuels_in_output,
            "from": str(pd.to_datetime(daily_preds["Date"].min()).date()),
            "to": str(pd.to_datetime(daily_preds["Date"].max()).date()),
            "totals": {k: float(v) for k, v in totals.items()},
            "daily": daily_preds.to_dict(orient="records") if mode != "annual" else [],
            "monthly": monthly,
        }