# scripts/parse_report_pdf.py
"""
Parse a fuel report PDF and output detected fuel types in JSON.

Usage:
    python -m scripts.parse_report_pdf "path/to/report.pdf"

Outputs (stdout):
    JSON string ONLY, for FastAPI to parse, e.g.
    {
      "ok": true,
      "pdf_path": "...",
      "fuel_types": ["Lanka Auto Diesel"],
      "rows_extracted": 25,
      "positive_qty_rows": 25,
      "dated_rows": 25,
      "saved_csv": "...\data\raw\pdf_extracted_20260122_104500.csv",
      "reasons": []
    }

If the PDF is irrelevant / invalid for forecasting:
    - ok=false
    - reasons filled
    - exits with code 2
"""

import sys
import json
import re
from pathlib import Path
from datetime import datetime
import pandas as pd
import pdfplumber

# -----------------------------
# Project paths
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent  # member1-kumara/
RAW_DIR = BASE_DIR / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

MODEL_META_PATH = BASE_DIR / "models" / "model_meta.json"

# -----------------------------
# Validation thresholds
# -----------------------------
MIN_ROWS = 5                 # must extract at least this many rows
MIN_POSITIVE_ROWS = 3        # must have at least this many rows where Qty > 0

# -----------------------------
# Fuel name normalization
# -----------------------------
def load_known_fuels():
    """
    Try to load fuel names used in training (model_meta.json).
    If not found, use a default list.
    """
    if MODEL_META_PATH.exists():
        try:
            meta = json.loads(MODEL_META_PATH.read_text(encoding="utf-8"))
            fuels = meta.get("fuel_cols") or meta.get("fuel_types") or []
            fuels = [str(x).strip() for x in fuels if str(x).strip()]
            if fuels:
                return fuels
        except Exception:
            pass

    # fallback list (adjust if your project uses different names)
    return [
        "Lanka Auto Diesel",
        "Lanka Petrol 92 Octane",
        "Lanka Petrol 95 Octane",
        "Lanka Super Diesel",
        "Auto Diesel",
        "Petrol 92",
        "Petrol 95",
        "Super Diesel",
        "Diesel",
        "Petrol",
    ]


def normalize_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def match_fuel_names(text: str, known_fuels: list[str]) -> set[str]:
    """
    Detect fuel types in PDF by matching known names (case-insensitive).
    """
    t = (text or "").lower()
    detected = set()
    for fuel in known_fuels:
        f = fuel.lower()
        if f and f in t:
            detected.add(fuel)
    return detected


# -----------------------------
# Extract text from PDF
# -----------------------------
def extract_pdf_text(pdf_path: Path) -> str:
    parts = []
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page in pdf.pages:
            txt = page.extract_text() or ""
            if txt:
                parts.append(txt)
    return "\n".join(parts)


# -----------------------------
# Try to extract rows (date, fuel, qty) from text
# -----------------------------
DATE_PATTERNS = [
    r"(?P<date>\d{4}-\d{2}-\d{2})",         # 2026-01-22
    r"(?P<date>\d{2}[/-]\d{2}[/-]\d{4})",   # 22/01/2026 or 22-01-2026
]

# Quantity like: 1234, 1234.56, 1,234.56
QTY_PATTERN = r"(?P<qty>\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)"


def parse_date_str(s: str):
    s = (s or "").strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def extract_rows_from_text(text: str, known_fuels: list[str]) -> list[dict]:
    """
    Best-effort: find lines containing a fuel name and a quantity.
    Optionally also a date on the line.

    Important:
    - Uses last_seen_date to attach dates to subsequent lines.
    - Skips rows with qty <= 0? (NO: we keep them but validation checks positives)
    """
    rows = []
    lines = [normalize_spaces(x) for x in (text or "").splitlines() if normalize_spaces(x)]
    fuel_regexes = [(fuel, re.compile(re.escape(fuel), re.IGNORECASE)) for fuel in known_fuels]

    date_res = [re.compile(p) for p in DATE_PATTERNS]
    qty_re = re.compile(QTY_PATTERN)

    last_seen_date = None

    for line in lines:
        # update last_seen_date if line contains a date
        found_date = None
        for dr in date_res:
            m = dr.search(line)
            if m:
                maybe = parse_date_str(m.group("date"))
                if maybe:
                    found_date = maybe
                    last_seen_date = maybe
                    break

        # detect which fuel this line refers to
        matched_fuel = None
        for fuel, fre in fuel_regexes:
            if fre.search(line):
                matched_fuel = fuel
                break

        if not matched_fuel:
            continue

        # find a quantity in the line
        qm = qty_re.search(line)
        if not qm:
            continue

        qty_str = qm.group("qty").replace(",", "")
        try:
            qty_val = float(qty_str)
        except Exception:
            continue

        # decide date for this row
        row_date = found_date if found_date else last_seen_date

        rows.append({
            "Date": str(row_date) if row_date else None,
            "Item": matched_fuel,
            "Qty": qty_val,
            "Source": "PDF"
        })

    return rows


# -----------------------------
# Save extracted rows to CSV
# -----------------------------
def save_rows_csv(rows: list[dict]) -> Path | None:
    if not rows:
        return None

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = RAW_DIR / f"pdf_extracted_{ts}.csv"
    pd.DataFrame(rows).to_csv(out_path, index=False)
    return out_path


# -----------------------------
# Content validation
# -----------------------------
def validate_extraction(detected_fuels: list[str], rows: list[dict]) -> tuple[bool, list[str], dict]:
    reasons = []

    if not detected_fuels:
        reasons.append("No known fuel types were detected in this PDF (not a valid fuel report).")

    if not rows or len(rows) < MIN_ROWS:
        reasons.append(f"Not enough rows extracted (found {0 if not rows else len(rows)}, need at least {MIN_ROWS}).")

    positive_qty_rows = 0
    dated_rows = 0

    if rows:
        for r in rows:
            # date validity
            if r.get("Date"):
                dated_rows += 1

            # qty validity
            try:
                if float(r.get("Qty", 0)) > 0:
                    positive_qty_rows += 1
            except Exception:
                pass

    if positive_qty_rows < MIN_POSITIVE_ROWS:
        reasons.append(
            f"Not enough positive quantity rows (found {positive_qty_rows}, need at least {MIN_POSITIVE_ROWS})."
        )

    if dated_rows == 0:
        reasons.append("No valid dates detected in extracted records (cannot align time-series).")

    stats = {
        "rows_extracted": 0 if not rows else len(rows),
        "positive_qty_rows": positive_qty_rows,
        "dated_rows": dated_rows,
    }

    ok = len(reasons) == 0
    return ok, reasons, stats


# -----------------------------
# Main
# -----------------------------
def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "ok": False,
            "error": "Missing argument. Usage: python -m scripts.parse_report_pdf <pdf_path>",
            "reasons": ["Missing PDF file path."],
        }))
        sys.exit(1)

    pdf_path = Path(sys.argv[1]).expanduser().resolve()
    if not pdf_path.exists():
        print(json.dumps({
            "ok": False,
            "error": f"PDF not found: {str(pdf_path)}",
            "reasons": ["File does not exist."],
        }))
        sys.exit(1)

    known_fuels = load_known_fuels()

    try:
        text = extract_pdf_text(pdf_path)
        detected_fuels = sorted(list(match_fuel_names(text, known_fuels)))

        rows = extract_rows_from_text(text, known_fuels)

        ok, reasons, stats = validate_extraction(detected_fuels, rows)

        saved_csv = None
        if ok:
            # save only if valid (prevents poisoning your raw data with rubbish)
            saved_csv = save_rows_csv(rows)

        payload = {
            "ok": ok,
            "pdf_path": str(pdf_path),
            "fuel_types": detected_fuels,
            "rows_extracted": stats["rows_extracted"],
            "positive_qty_rows": stats["positive_qty_rows"],
            "dated_rows": stats["dated_rows"],
            "saved_csv": str(saved_csv) if saved_csv else None,
            "reasons": reasons,
        }

        print(json.dumps(payload))

        # Exit code:
        # 0 -> valid
        # 2 -> invalid/irrelevant for forecasting (expected case)
        sys.exit(0 if ok else 2)

    except Exception as e:
        print(json.dumps({
            "ok": False,
            "pdf_path": str(pdf_path),
            "error": str(e),
            "reasons": ["PDF parsing crashed unexpectedly."],
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
