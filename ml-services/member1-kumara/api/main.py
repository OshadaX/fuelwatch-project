# api/main.py
from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import shutil
import subprocess
import sys
import json
import io
import joblib
import pandas as pd
import numpy as np
import hashlib

from utils.config import PROCESSED_DAILY_CSV
from utils.predictor import FuelDemandPredictor

app = FastAPI(title="FuelWatch ML Service")

# ===============================
# BASE DIRECTORY (PROJECT ROOT)
# ===============================
BASE_DIR = Path(__file__).resolve().parent.parent  # member1-kumara/
UPLOAD_DIR = BASE_DIR / "data" / "raw"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ===============================
# CORS CONFIG
# ===============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================
# LOAD FORECAST MODEL
# ===============================
try:
    predictor = FuelDemandPredictor()
except Exception as e:
    predictor = None
    print("⚠️ Forecast model not loaded:", e)

# ===============================
# LOAD RF MISBEHAVIOR MODEL (optional)
# ===============================
RF_DIR = BASE_DIR / "rf_outputs"
RF_MODEL_PATH = RF_DIR / "rf_model.pkl"
RF_SCALER_PATH = RF_DIR / "scaler.pkl"
RF_FEATURES_PATH = RF_DIR / "model_features.json"

rf = None
scaler = None
MODEL_FEATURES = []
RF_LOAD_ERROR = None


def load_rf_artifacts():
    global rf, scaler, MODEL_FEATURES, RF_LOAD_ERROR
    try:
        if not RF_DIR.exists():
            raise FileNotFoundError(f"rf_outputs folder not found at: {RF_DIR}")
        if not RF_MODEL_PATH.exists():
            raise FileNotFoundError(f"Missing RF model: {RF_MODEL_PATH}")
        if not RF_SCALER_PATH.exists():
            raise FileNotFoundError(f"Missing scaler: {RF_SCALER_PATH}")
        if not RF_FEATURES_PATH.exists():
            raise FileNotFoundError(f"Missing features: {RF_FEATURES_PATH}")

        rf = joblib.load(RF_MODEL_PATH)
        scaler = joblib.load(RF_SCALER_PATH)
        with open(RF_FEATURES_PATH, "r", encoding="utf-8") as f:
            MODEL_FEATURES = json.load(f)

        RF_LOAD_ERROR = None
    except Exception as e:
        rf = None
        scaler = None
        MODEL_FEATURES = []
        RF_LOAD_ERROR = str(e)


load_rf_artifacts()

# ===============================
# RULE THRESHOLDS (STRICTER => fewer FLAGs)
# You can tune these defaults to get ~2-3 FLAGs.
# ===============================
DEFAULT_GAP_TOL = 800.0              # mismatch litres threshold (was too low at 50)
DEFAULT_RESET_TOL = 6000.0           # huge balance jump/reset litres (was too low at 3000)
DEFAULT_NO_SALES_DROP_TOL = 1500.0   # balance drop with 0 sales


# ===============================
# HEALTH
# ===============================
@app.get("/health")
def health():
    return {
        "status": "ok",
        "forecast_model_loaded": predictor is not None,
        "base_dir": str(BASE_DIR),
    }


@app.get("/ml/health")
def ml_health():
    return {
        "status": "ok",
        "rf_loaded": rf is not None,
        "scaler_loaded": scaler is not None,
        "features_loaded": bool(MODEL_FEATURES),
        "rf_dir": str(RF_DIR),
        "rf_model_path": str(RF_MODEL_PATH),
        "rf_scaler_path": str(RF_SCALER_PATH),
        "rf_features_path": str(RF_FEATURES_PATH),
        "features_count": len(MODEL_FEATURES) if MODEL_FEATURES else 0,
        "load_error": RF_LOAD_ERROR,
    }


# ===============================
# FORECAST ENDPOINT (UNCHANGED)
# ===============================
@app.post("/forecast")
async def forecast(
    mode: str = Form(...),
    file: UploadFile = File(None),
):
    if predictor is None:
        raise HTTPException(status_code=500, detail="Forecast model not loaded. Train model first.")

    mode = (mode or "").strip().lower()
    if mode not in {"weekly", "monthly", "annual"}:
        raise HTTPException(status_code=400, detail="mode must be weekly, monthly, or annual")

    ingest_result = {
        "ingested": False,
        "pdf_saved_as": None,
        "fuel_types_detected": None,
        "stdout": None,
        "stderr": None,
    }

    fuel_filter = None

    if file is not None:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        pdf_path = UPLOAD_DIR / file.filename
        with open(pdf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = subprocess.run(
            [sys.executable, "-m", "scripts.parse_report_pdf", str(pdf_path)],
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True,
        )

        ingest_result["pdf_saved_as"] = str(pdf_path)
        ingest_result["stdout"] = result.stdout
        ingest_result["stderr"] = result.stderr

        if result.returncode != 0:
            return {"ok": False, "message": "PDF ingest failed. Forecast not generated.", "ingest": ingest_result}

        ingest_result["ingested"] = True

        output_text = (result.stdout or "").strip()
        try:
            parsed_json = json.loads(output_text)
        except Exception:
            parsed_json = None

        if isinstance(parsed_json, dict):
            fuels = parsed_json.get("fuel_types") or parsed_json.get("fuel_cols") or parsed_json.get("items")
            if isinstance(fuels, list) and fuels:
                fuel_filter = fuels
                ingest_result["fuel_types_detected"] = fuels

        prep = subprocess.run(
            [sys.executable, "-m", "scripts.prepare_data"],
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True,
        )
        if prep.returncode != 0:
            return {
                "ok": False,
                "message": "prepare_data failed after ingest. Forecast not generated.",
                "ingest": ingest_result,
                "prepare_data_stdout": prep.stdout,
                "prepare_data_stderr": prep.stderr,
            }

    if not PROCESSED_DAILY_CSV.exists():
        raise HTTPException(status_code=400, detail="Processed dataset not found. Run prepare_data first.")

    hist = pd.read_csv(PROCESSED_DAILY_CSV)
    forecast_result = predictor.predict_mode(hist, mode, fuel_filter=fuel_filter)

    return {"ok": True, "message": "Forecast generated successfully", "mode": mode, "ingest": ingest_result, "forecast": forecast_result}


# ============================================================
#  MISBEHAVIOR SCORING: upload report -> convert -> score
# ============================================================

def _normalize_cols(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    return df


def _looks_like_header_row(row: pd.Series) -> bool:
    text = " ".join([str(x).lower() for x in row.values if pd.notna(x)])
    keywords = ["date", "qty", "quantity", "balance", "amount", "item", "site", "fuel"]
    return any(k in text for k in keywords)


def _fix_unnamed_header(df: pd.DataFrame) -> pd.DataFrame:
    cols = [c.lower() for c in df.columns.astype(str)]
    unnamed_ratio = np.mean([c.startswith("unnamed") for c in cols])
    if unnamed_ratio < 0.5:
        return df

    head = df.head(30).fillna("")
    header_idx = None
    for i in range(len(head)):
        if _looks_like_header_row(head.iloc[i]):
            header_idx = i
            break

    if header_idx is None:
        return df

    new_header = [str(x).strip() for x in df.iloc[header_idx].values]
    df2 = df.iloc[header_idx + 1 :].copy()
    df2.columns = new_header
    return df2.reset_index(drop=True)


def load_uploaded_report(file: UploadFile) -> pd.DataFrame:
    name = (file.filename or "").lower()
    data = file.file.read()

    try:
        if name.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(data))
        elif name.endswith(".xlsx") or name.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(data))
        else:
            raise HTTPException(status_code=400, detail="Upload CSV or Excel (.csv/.xlsx/.xls)")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {e}")

    df = _normalize_cols(df)
    df = _fix_unnamed_header(df)
    df = _normalize_cols(df)

    if df.shape[1] < 3:
        raise HTTPException(status_code=400, detail="Parsed file has too few columns. Check file format.")

    return df


def _pick_col(cols, candidates):
    cols_l = [c.strip().lower() for c in cols]
    for cand in candidates:
        cand = cand.lower()
        for i, c in enumerate(cols_l):
            if c == cand:
                return cols[i]
    return None


def to_transactions(df: pd.DataFrame) -> pd.DataFrame:
    """
    Supports your report format columns:
    Site, Type, Date, Number, Class, Site, Item, Qty, Amount, Balance
    (sometimes duplicated 'Site')
    """
    d = df.copy()
    d.columns = [c.strip() for c in d.columns]

    col_date = _pick_col(d.columns, ["date", "datetime", "timestamp", "readingtime"])
    col_qty = _pick_col(d.columns, ["qty", "quantity", "volume"])
    col_bal = _pick_col(d.columns, ["balance", "tank_balance", "stock_balance"])
    col_item = _pick_col(d.columns, ["item", "fuel", "fuel_type", "product"])

    # Site can appear twice: choose the LAST site-ish column
    site_candidates = []
    for c in d.columns:
        cl = c.strip().lower()
        if cl in ["site", "station", "station_id", "stationid"]:
            site_candidates.append(c)
    col_site = site_candidates[-1] if site_candidates else None

    missing = [k for k, v in {"site": col_site, "date": col_date, "item": col_item, "qty": col_qty, "balance": col_bal}.items() if v is None]
    if missing:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "Missing required columns in uploaded report.",
                "missing": missing,
                "found_columns": list(df.columns),
                "expected_hint": ["Site", "Date", "Item", "Qty", "Balance"],
            },
        )

    # IMPORTANT FIX: fillna BEFORE astype(str) to avoid 'nan' strings
    station_series = d[col_site].fillna("UNKNOWN").astype(str).str.strip()
    fuel_series = d[col_item].fillna("UNKNOWN").astype(str).str.strip()

    tx = pd.DataFrame(
        {
            "station_id": station_series,
            "fuel_type": fuel_series,
            "timestamp": d[col_date],
            "qty": pd.to_numeric(d[col_qty], errors="coerce"),
            "balance": pd.to_numeric(d[col_bal], errors="coerce"),
        }
    )

    tx["timestamp"] = pd.to_datetime(tx["timestamp"], errors="coerce")
    tx = tx.dropna(subset=["timestamp"]).copy()

    tx["qty"] = tx["qty"].fillna(0.0)

    # balance must be real; only forward-fill within each (station,fuel)
    tx = tx.sort_values(["station_id", "fuel_type", "timestamp"]).reset_index(drop=True)
    tx["balance"] = tx.groupby(["station_id", "fuel_type"])["balance"].ffill()

    # if balance still missing, those rows cannot be used for real detection
    tx = tx.dropna(subset=["balance"]).copy()

    tx["tank_id"] = "TANK_1"
    tx["day"] = tx["timestamp"].dt.date.astype(str)
    return tx


def build_daily_features(tx: pd.DataFrame) -> pd.DataFrame:
    gkeys = ["station_id", "tank_id", "fuel_type", "day"]

    daily = (
        tx.groupby(gkeys)
        .agg(
            total_qty=("qty", "sum"),
            txn_count=("qty", "count"),
            avg_txn=("qty", "mean"),
            std_txn=("qty", "std"),
            start_balance=("balance", "first"),
            end_balance=("balance", "last"),
        )
        .reset_index()
    )

    daily["std_txn"] = daily["std_txn"].fillna(0.0)
    daily["balance_delta"] = daily["end_balance"] - daily["start_balance"]

    # conservation check: total_qty ≈ -balance_delta  (if balance decreases with dispensing)
    daily["qty_vs_balance_gap"] = daily["total_qty"] + daily["balance_delta"]

    daily["day_dt"] = pd.to_datetime(daily["day"], errors="coerce")
    daily = daily.dropna(subset=["day_dt"]).copy()
    daily = daily.sort_values(["station_id", "tank_id", "fuel_type", "day_dt"]).reset_index(drop=True)

    daily["qty_change"] = daily.groupby(["station_id", "tank_id", "fuel_type"])["total_qty"].diff().fillna(0.0)

    daily["roll7_qty_mean"] = (
        daily.groupby(["station_id", "tank_id", "fuel_type"])["total_qty"]
        .rolling(window=7, min_periods=1)
        .mean()
        .reset_index(level=[0, 1, 2], drop=True)
    )
    daily["roll7_qty_std"] = (
        daily.groupby(["station_id", "tank_id", "fuel_type"])["total_qty"]
        .rolling(window=7, min_periods=1)
        .std()
        .reset_index(level=[0, 1, 2], drop=True)
        .fillna(0.0)
    )

    return daily


def make_anomaly_id(station_id, tank_id, fuel_type, day, anomaly_type):
    raw = f"{station_id}|{tank_id}|{fuel_type}|{day}|{anomaly_type}"
    return hashlib.sha1(raw.encode("utf-8")).hexdigest()[:16]


def rule_anomaly_reason(row, gap_tol: float, reset_tol: float, no_sales_drop_tol: float):
    """
    Returns: (rule_prob, reason_text, anomaly_type)

    This is genuine detection using ONLY (Qty, Balance) behavior.
    Tuning gap_tol/reset_tol reduces false flags.
    """
    total_qty = float(row["total_qty"])
    bal_delta = float(row["balance_delta"])
    gap = float(row["qty_vs_balance_gap"])

    reasons = []
    anomaly_type = "NORMAL"
    score = 0.0

    # 1) Balance drop without sales (strong)
    if total_qty <= 0.0001 and bal_delta < -no_sales_drop_tol:
        reasons.append(f"Balance dropped but no sales recorded (Δbalance={bal_delta:.1f})")
        anomaly_type = "DROP_WITHOUT_SALES"
        score = max(score, 0.92)

    # 2) Sales but balance did not drop (strong)
    if total_qty > gap_tol and abs(bal_delta) < gap_tol:
        reasons.append("Sales recorded but tank balance did not decrease")
        anomaly_type = "SALES_NO_BALANCE_DROP"
        score = max(score, 0.90)

    # 3) Conservation mismatch (medium -> make strict using gap_tol)
    if abs(gap) > gap_tol:
        reasons.append(f"Conservation mismatch (gap={gap:.1f})")
        anomaly_type = "CONSERVATION_GAP"
        score = max(score, 0.85)

    # 4) Suspected reset/refill/maintenance (very strong)
    if abs(bal_delta) > reset_tol:
        reasons.append(f"Large balance jump/reset (Δbalance={bal_delta:.1f})")
        anomaly_type = "BALANCE_JUMP"
        score = max(score, 0.95)

    if not reasons:
        return 0.0, "", "NORMAL"

    return score, "; ".join(reasons), anomaly_type


def group_events(rows):
    """
    Group consecutive flagged days into events.
    rows must be sorted by day_dt.
    """
    events = []
    cur = None

    def start_new(r):
        return {
            "start_day": r["day"],
            "end_day": r["day"],
            "days": 1,
            "max_score": r["prob"],
            "fuelType": r["fuelType"],
            "stationId": r["stationId"],
        }

    for r in rows:
        if r["pred"] != 1:
            continue

        if cur is None:
            cur = start_new(r)
            continue

        if r["stationId"] == cur["stationId"] and r["fuelType"] == cur["fuelType"]:
            prev = pd.to_datetime(cur["end_day"])
            now = pd.to_datetime(r["day"])
            if (now - prev).days == 1:
                cur["end_day"] = r["day"]
                cur["days"] += 1
                cur["max_score"] = max(cur["max_score"], r["prob"])
                continue

        events.append(cur)
        cur = start_new(r)

    if cur is not None:
        events.append(cur)

    return events


@app.post("/ml/score-report")
async def score_report(
    threshold: float = Query(0.85, ge=0.0, le=1.0),  # ✅ default higher => fewer FLAGS
    gap_tol: float = Query(DEFAULT_GAP_TOL, ge=0.0),
    reset_tol: float = Query(DEFAULT_RESET_TOL, ge=0.0),
    no_sales_drop_tol: float = Query(DEFAULT_NO_SALES_DROP_TOL, ge=0.0),
    file: UploadFile = File(...),
):
    df_raw = load_uploaded_report(file)
    tx = to_transactions(df_raw)
    daily = build_daily_features(tx)

    if len(daily) == 0:
        return {
            "ok": True,
            "threshold": threshold,
            "count_days": 0,
            "features_used": [],
            "rf_used": False,
            "rows": [],
            "events": [],
            "note": "No daily rows were produced. Check that Balance and Date exist and are parseable.",
        }

    # ---- RF score (if available) ----
    rf_prob = np.zeros(len(daily), dtype=float)
    rf_ok = bool(rf is not None and scaler is not None and MODEL_FEATURES)

    if rf_ok:
        missing = [c for c in MODEL_FEATURES if c not in daily.columns]
        if missing:
            rf_ok = False
        else:
            X = daily[MODEL_FEATURES].fillna(0.0).values
            Xs = scaler.transform(X)
            rf_prob = rf.predict_proba(Xs)[:, 1]

    # ---- Rule score (always available if balance exists) ----
    rule_prob = np.zeros(len(daily), dtype=float)
    reasons = [""] * len(daily)
    anomaly_types = ["NORMAL"] * len(daily)

    for i, (_, r) in enumerate(daily.iterrows()):
        p, txt, a_type = rule_anomaly_reason(
            r,
            gap_tol=float(gap_tol),
            reset_tol=float(reset_tol),
            no_sales_drop_tol=float(no_sales_drop_tol),
        )
        rule_prob[i] = p
        reasons[i] = txt
        anomaly_types[i] = a_type

    # FINAL probability = max(RF, RULE)
    prob = np.maximum(rf_prob, rule_prob)
    pred = (prob >= threshold).astype(int)

    scored = daily.copy()
    scored["rf_prob"] = rf_prob
    scored["rule_prob"] = rule_prob
    scored["prob_irregular"] = prob
    scored["pred"] = pred
    scored["reason"] = reasons
    scored["anomaly_type"] = anomaly_types

    def sev(p):
        if p >= 0.95:
            return "Critical"
        if p >= threshold:
            return "Warning"
        return "Normal"

    scored["severity"] = [sev(p) for p in prob]
    scored = scored.sort_values("day_dt").reset_index(drop=True)

    rows = []
    for _, r in scored.iterrows():
        anomaly_id = make_anomaly_id(
            r["station_id"],
            r["tank_id"],
            r["fuel_type"],
            r["day"],
            r["anomaly_type"],
        )

        reason_text = r["reason"]
        if not reason_text:
            reason_text = "RF score used" if rf_ok else "No anomaly pattern detected"

        rows.append(
            {
                "id": anomaly_id,                       # ✅ unique stable anomaly id
                "day": r["day"],
                "stationId": r["station_id"],
                "tankId": r["tank_id"],
                "fuelType": r["fuel_type"],
                "totalQty": float(r["total_qty"]),
                "balanceDelta": float(r["balance_delta"]),
                "gap": float(r["qty_vs_balance_gap"]),
                "qtyChange": float(r["qty_change"]),
                "prob": float(r["prob_irregular"]),     # frontend uses this
                "pred": int(r["pred"]),
                "severity": r["severity"],
                "reason": reason_text,
                "anomalyType": r["anomaly_type"],       # ✅ machine label
                "rfProb": float(r["rf_prob"]),
                "ruleProb": float(r["rule_prob"]),
            }
        )

    events = group_events(rows)

    return {
        "ok": True,
        "threshold": float(threshold),
        "params": {
            "gap_tol": float(gap_tol),
            "reset_tol": float(reset_tol),
            "no_sales_drop_tol": float(no_sales_drop_tol),
        },
        "count_days": len(rows),
        "features_used": MODEL_FEATURES if rf_ok else [],
        "rf_used": bool(rf_ok),
        "rows": rows,
        "events": events,
    }
