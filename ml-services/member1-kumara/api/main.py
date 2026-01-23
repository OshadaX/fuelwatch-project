# api/main.py

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import shutil
import subprocess
import sys
import json
import pandas as pd

from utils.config import PROCESSED_DAILY_CSV
from utils.predictor import FuelDemandPredictor

app = FastAPI(title="FuelWatch ML Service")

# ===============================
# BASE DIRECTORY (PROJECT ROOT)
# ===============================
BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "data" / "raw"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ===============================
# CORS CONFIG
# ===============================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change later for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===============================
# LOAD MODEL ON STARTUP
# ===============================
try:
    predictor = FuelDemandPredictor()
except Exception as e:
    predictor = None
    print("⚠️ ML model not loaded:", e)


# ===============================
# HEALTH CHECK
# ===============================
@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": predictor is not None,
        "base_dir": str(BASE_DIR),
    }


# ==========================================================
# ✅ SINGLE ENDPOINT: UPLOAD PDF (optional) + PREDICT
# ==========================================================
@app.post("/forecast")
async def forecast(
    mode: str = Form(...),                  # weekly | monthly | annual
    file: UploadFile = File(None)           # optional PDF
):
    """
    ONE endpoint:
    - If file is provided (PDF): ingest it (parse -> update raw -> rebuild processed)
    - Then run prediction for given mode and return results
    """

    if predictor is None:
        raise HTTPException(status_code=500, detail="ML model not loaded. Train model first.")

    mode = (mode or "").strip().lower()
    if mode not in {"weekly", "monthly", "annual"}:
        raise HTTPException(status_code=400, detail="mode must be weekly, monthly, or annual")

    ingest_result = {
        "ingested": False,
        "pdf_saved_as": None,
        "stdout": None,
        "stderr": None,
    }

    # ---------------------------
    # 1) If PDF is sent -> ingest
    # ---------------------------
    if file is not None:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")

        pdf_path = UPLOAD_DIR / file.filename

        # Save uploaded PDF
        with open(pdf_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Run parse script
        result = subprocess.run(
            [sys.executable, "-m", "scripts.parse_report_pdf", str(pdf_path)],
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True
        )

        ingest_result["pdf_saved_as"] = str(pdf_path)
        ingest_result["stdout"] = result.stdout
        ingest_result["stderr"] = result.stderr

        if result.returncode != 0:
            # Stop here: ingest failed
            return {
                "ok": False,
                "message": "PDF ingest failed. Forecast not generated.",
                "ingest": ingest_result
            }

        ingest_result["ingested"] = True

        # OPTIONAL: rebuild processed dataset automatically after ingest
        # (if your parse_report_pdf already triggers prepare_data, you can remove this)
        prep = subprocess.run(
            [sys.executable, "-m", "scripts.prepare_data"],
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True
        )
        if prep.returncode != 0:
            return {
                "ok": False,
                "message": "prepare_data failed after ingest. Forecast not generated.",
                "ingest": ingest_result,
                "prepare_data_stdout": prep.stdout,
                "prepare_data_stderr": prep.stderr,
            }

    # ---------------------------
    # 2) Predict using processed CSV
    # ---------------------------
    if not PROCESSED_DAILY_CSV.exists():
        raise HTTPException(status_code=400, detail="Processed dataset not found. Run prepare_data first.")

    hist = pd.read_csv(PROCESSED_DAILY_CSV)
    forecast_result = predictor.predict_mode(hist, mode)

    return {
        "ok": True,
        "message": "Forecast generated successfully",
        "mode": mode,
        "ingest": ingest_result,            # tells manager if pdf was used or not
        "forecast": forecast_result         # totals + daily breakdown
    }
