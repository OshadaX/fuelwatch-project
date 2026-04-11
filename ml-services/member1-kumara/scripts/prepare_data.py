# scripts/prepare_data.py
import json
from pathlib import Path

import pandas as pd
from utils.config import DATA_RAW_DIR, PROCESSED_DAILY_CSV, DATA_PROCESSED_DIR
from utils.time_features import add_time_features

RAW_FILE = DATA_RAW_DIR / "fuel_dispenses.csv"  


def _load_trained_fuels() -> list[str]:
    """
    Read trained fuel column names from models/model_meta.json
    If not available, return empty list (no enforcement).
    """
    base_dir = Path(__file__).resolve().parents[1] 
    meta_path = base_dir / "models" / "model_meta.json"

    if not meta_path.exists():
        return []

    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        fuels = meta.get("fuel_cols", [])
        fuels = [str(f).strip() for f in fuels if str(f).strip()]
        return fuels
    except Exception:
        return []


def main():
    DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(RAW_FILE)

  
    # CSV columns: Date, Item, Qty
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df["Qty"] = pd.to_numeric(df["Qty"], errors="coerce").fillna(0.0)

    # Drop rows with missing Date or Item
    df = df.dropna(subset=["Date", "Item"])

   
    daily = (
        df.groupby(["Date", "Item"], as_index=False)["Qty"]
        .sum()
        .sort_values("Date")
    )


    pivot = (
        daily.pivot_table(index="Date", columns="Item", values="Qty", aggfunc="sum")
        .fillna(0.0)
        .sort_index()
    )

    full_idx = pd.date_range(pivot.index.min(), pivot.index.max(), freq="D")
    pivot = pivot.reindex(full_idx, fill_value=0.0)
    pivot.index.name = "Date"
    
    # Ensure ALL trained fuel columns exist
    trained_fuels = _load_trained_fuels()

    if trained_fuels:
        # Add any missing trained fuel columns as zeros
        for f in trained_fuels:
            if f not in pivot.columns:
                pivot[f] = 0.0

        # Keep column order stable: trained fuels first
        pivot = pivot[trained_fuels]
    else:
        
        trained_fuels = list(pivot.columns)

    # --- Add time features ---
    out = pivot.reset_index()
    out = add_time_features(out, "Date")

    # Save
    out.to_csv(PROCESSED_DAILY_CSV, index=False)

    time_cols = ["dow", "month", "weekofyear", "year", "is_weekend"]
    fuel_cols = [c for c in out.columns if c not in ["Date"] + time_cols]

    print(f"Saved processed dataset: {PROCESSED_DAILY_CSV}")
    print(f"Shape: {out.shape}")
    print("Fuel columns:", fuel_cols)


if __name__ == "__main__":
    main()
