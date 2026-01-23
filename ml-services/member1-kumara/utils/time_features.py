# utils/time_features.py
import pandas as pd

def add_time_features(df: pd.DataFrame, date_col: str = "Date") -> pd.DataFrame:
    """
    Adds calendar/time features based on date column.
    """
    d = df.copy()
    dt = pd.to_datetime(d[date_col])
    d["dow"] = dt.dt.dayofweek            # 0=Mon
    d["month"] = dt.dt.month              # 1..12
    d["weekofyear"] = dt.dt.isocalendar().week.astype(int)
    d["year"] = dt.dt.year
    d["is_weekend"] = (d["dow"] >= 5).astype(int)
    return d

def make_time_features_for_date(date: pd.Timestamp) -> dict:
    """
    Used during recursive forecasting (creating time features for future dates).
    """
    return {
        "dow": int(date.dayofweek),
        "month": int(date.month),
        "weekofyear": int(date.isocalendar().week),
        "year": int(date.year),
        "is_weekend": int(date.dayofweek >= 5),
    }
