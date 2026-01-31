# scripts/train_lstm.py
import json
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from joblib import dump

import tensorflow as tf
from tensorflow.keras import layers, models, callbacks

from utils.config import (
    PROCESSED_DAILY_CSV, LOOKBACK_DAYS,
    MODEL_PATH, SCALER_X_PATH, SCALER_Y_PATH, MODEL_META_PATH,
    MODELS_DIR, RANDOM_SEED
)
from utils.windowing import make_supervised_windows


def build_model(lookback: int, n_features: int, n_targets: int) -> tf.keras.Model:
    model = models.Sequential([
        layers.Input(shape=(lookback, n_features)),
        layers.LSTM(64, return_sequences=True),
        layers.Dropout(0.2),
        layers.LSTM(32),
        layers.Dropout(0.2),
        layers.Dense(n_targets)  # regression output
    ])
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss="mse")
    return model


def main():
    np.random.seed(RANDOM_SEED)
    tf.random.set_seed(RANDOM_SEED)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(PROCESSED_DAILY_CSV)
    df["Date"] = pd.to_datetime(df["Date"])

    time_cols = ["dow", "month", "weekofyear", "year", "is_weekend"]
    fuel_cols = [c for c in df.columns if c not in ["Date"] + time_cols]

    # Features for model input: fuel history + time features
    feature_cols = fuel_cols + time_cols

    X_raw = df[feature_cols].values.astype(np.float32)
    y_raw = df[fuel_cols].values.astype(np.float32)

    # --- Time-based split (no shuffling) ---
    n = len(df)
    train_end = int(n * 0.7)
    val_end = int(n * 0.85)

    X_train_raw, y_train_raw = X_raw[:train_end], y_raw[:train_end]
    X_val_raw, y_val_raw = X_raw[train_end:val_end], y_raw[train_end:val_end]
    X_test_raw, y_test_raw = X_raw[val_end:], y_raw[val_end:]

    # --- Scaling (fit only on training) ---
    scaler_X = MinMaxScaler()
    scaler_y = MinMaxScaler()

    X_train = scaler_X.fit_transform(X_train_raw)
    y_train = scaler_y.fit_transform(y_train_raw)

    X_val = scaler_X.transform(X_val_raw)
    y_val = scaler_y.transform(y_val_raw)

    X_test = scaler_X.transform(X_test_raw)
    y_test = scaler_y.transform(y_test_raw)

    # --- Windowing ---
    Xw_train, yw_train = make_supervised_windows(X_train, y_train, LOOKBACK_DAYS)
    if len(Xw_train) == 0:
        raise ValueError(
            f"Not enough training data for LOOKBACK_DAYS={LOOKBACK_DAYS}. "
            f"Train rows={len(X_train)}. Reduce LOOKBACK_DAYS or add more history."
        )

    # Validation windows (only if enough data)
    Xw_val, yw_val = (None, None)
    if len(X_val) > LOOKBACK_DAYS:
        Xw_val, yw_val = make_supervised_windows(X_val, y_val, LOOKBACK_DAYS)
        if len(Xw_val) == 0:
            Xw_val, yw_val = (None, None)

    # Test windows (only if enough data)
    Xw_test, yw_test = (None, None)
    if len(X_test) > LOOKBACK_DAYS:
        Xw_test, yw_test = make_supervised_windows(X_test, y_test, LOOKBACK_DAYS)
        if len(Xw_test) == 0:
            Xw_test, yw_test = (None, None)

    n_features = Xw_train.shape[-1]
    n_targets = yw_train.shape[-1]

    model = build_model(LOOKBACK_DAYS, n_features, n_targets)

    # Callbacks: if no validation set, monitor training loss instead
    monitor_metric = "val_loss" if Xw_val is not None else "loss"
    cbs = [
        callbacks.EarlyStopping(monitor=monitor_metric, patience=10, restore_best_weights=True),
        callbacks.ReduceLROnPlateau(monitor=monitor_metric, patience=5, factor=0.5, min_lr=1e-6)
    ]

    fit_kwargs = dict(
        x=Xw_train,
        y=yw_train,
        epochs=150,
        batch_size=16,
        callbacks=cbs,
        verbose=1
    )

    if Xw_val is not None:
        fit_kwargs["validation_data"] = (Xw_val, yw_val)

    history = model.fit(**fit_kwargs)

    test_loss = None
    if Xw_test is not None:
        test_loss = float(model.evaluate(Xw_test, yw_test, verbose=0))
        print("Test MSE (scaled):", test_loss)
    else:
        print("Test set too small for windowing — skipping test evaluation.")

    # Save artifacts
    model.save(MODEL_PATH)
    dump(scaler_X, SCALER_X_PATH)
    dump(scaler_y, SCALER_Y_PATH)

    meta = {
        "lookback_days": LOOKBACK_DAYS,
        "feature_cols": feature_cols,
        "fuel_cols": fuel_cols,
        "time_cols": time_cols,
        "train_end_date": str(df["Date"].iloc[train_end - 1].date()),
        "val_end_date": str(df["Date"].iloc[val_end - 1].date()) if val_end > train_end else None,
        "test_start_date": str(df["Date"].iloc[val_end].date()) if val_end < len(df) else None,
        "final_val_loss": float(min(history.history.get("val_loss", history.history["loss"]))),
        "test_mse_scaled": test_loss,
    }

    with open(MODEL_META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)

    print(f"Saved model:  {MODEL_PATH}")
    print(f"Saved meta:   {MODEL_META_PATH}")
    print(f"Fuel targets: {len(fuel_cols)}")
    print(f"Features:     {len(feature_cols)} (fuel={len(fuel_cols)} + time={len(time_cols)})")


if __name__ == "__main__":
    main()
