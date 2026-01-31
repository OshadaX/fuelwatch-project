# scripts/prepare_data.py
import pandas as pd
from utils.config import DATA_RAW_DIR, PROCESSED_DAILY_CSV, DATA_PROCESSED_DIR
from utils.time_features import add_time_features

RAW_FILE = DATA_RAW_DIR / "fuel_dispenses.csv"  # put your file here

def main():
    DATA_PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(RAW_FILE)

    # --- Clean columns we need ---
    # Your CSV columns: Date, Item, Qty (Qty is numeric)
    df["Date"] = pd.to_datetime(df["Date"])
    df["Qty"] = pd.to_numeric(df["Qty"], errors="coerce").fillna(0.0)

    # If there are NaN in Item, drop
    df = df.dropna(subset=["Item"])

    # --- Aggregate daily totals per fuel type ---
    daily = (
        df.groupby(["Date", "Item"], as_index=False)["Qty"]
        .sum()
        .sort_values("Date")
    )

    # --- Pivot to wide format: one row per date, columns = fuel types ---
    pivot = daily.pivot_table(index="Date", columns="Item", values="Qty", aggfunc="sum").fillna(0.0)
    pivot = pivot.sort_index()

    # --- Fill missing dates to make continuous daily series ---
    full_idx = pd.date_range(pivot.index.min(), pivot.index.max(), freq="D")
    pivot = pivot.reindex(full_idx, fill_value=0.0)
    pivot.index.name = "Date"

    # --- Add time features ---
    out = pivot.reset_index()
    out = add_time_features(out, "Date")

    # Save
    out.to_csv(PROCESSED_DAILY_CSV, index=False)
    print(f"Saved processed dataset: {PROCESSED_DAILY_CSV}")
    print(f"Shape: {out.shape}")
    print("Fuel columns:", [c for c in out.columns if c not in ["Date","dow","month","weekofyear","year","is_weekend"]])

if __name__ == "__main__":
    main()
