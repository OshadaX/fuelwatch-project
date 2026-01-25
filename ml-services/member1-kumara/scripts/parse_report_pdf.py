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
      "saved_csv": "...\data\raw\pdf_extracted_20260122_104500.csv"
    }
"""

import sys
import json
import re
from pathlib import Path
from datetime import datetime
import pandas as pd

# pdfplumber is best for report PDFs
import pdfplumber


# -----------------------------
# Project paths
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent.parent  # member1-kumara/
RAW_DIR = BASE_DIR / "data" / "raw"
RAW_DIR.mkdir(parents=True, exist_ok=True)

MODEL_META_PATH = BASE_DIR / "models" / "model_meta.json"


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
    t = text.lower()
    detected = set()
    for fuel in known_fuels:
        f = fuel.lower()
        # whole-ish word match (not perfect but safe)
        if f in t:
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
    # 2026-01-22
    r"(?P<date>\d{4}-\d{2}-\d{2})",
    # 22/01/2026 or 22-01-2026
    r"(?P<date>\d{2}[/-]\d{2}[/-]\d{4})",
]

# Quantity like: 1234, 1234.56, 1,234.56
QTY_PATTERN = r"(?P<qty>\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)"


def parse_date_str(s: str):
    s = s.strip()
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
    """
    rows = []
    lines = [normalize_spaces(x) for x in text.splitlines() if normalize_spaces(x)]
    fuel_regexes = [(fuel, re.compile(re.escape(fuel), re.IGNORECASE)) for fuel in known_fuels]

    # Precompile date regex
    date_res = [re.compile(p) for p in DATE_PATTERNS]
    qty_re = re.compile(QTY_PATTERN)

    last_seen_date = None

    for line in lines:
        # update last_seen_date if line contains a date
        found_date = None
        for dr in date_res:
            m = dr.search(line)
            if m:
                found_date = parse_date_str(m.group("date"))
                if found_date:
                    last_seen_date = found_date
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
            # sometimes qty may be at end or separated; skip if none
            continue

        qty_str = qm.group("qty").replace(",", "")
        try:
            qty_val = float(qty_str)
        except Exception:
            continue

        # decide date for this row
        row_date = last_seen_date
        # if this line had its own date, use it
        if found_date:
            row_date = found_date

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
# Main
# -----------------------------
def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "ok": False,
            "error": "Missing argument. Usage: python -m scripts.parse_report_pdf <pdf_path>"
        }))
        sys.exit(1)

    pdf_path = Path(sys.argv[1]).expanduser().resolve()
    if not pdf_path.exists():
        print(json.dumps({"ok": False, "error": f"PDF not found: {str(pdf_path)}"}))
        sys.exit(1)

    known_fuels = load_known_fuels()

    try:
        text = extract_pdf_text(pdf_path)
        detected_fuels = sorted(list(match_fuel_names(text, known_fuels)))

        rows = extract_rows_from_text(text, known_fuels)
        saved_csv = save_rows_csv(rows)

        # IMPORTANT: print JSON ONLY (FastAPI expects stdout JSON)
        print(json.dumps({
            "ok": True,
            "pdf_path": str(pdf_path),
            "fuel_types": detected_fuels,                 # ✅ THIS IS WHAT YOUR API USES
            "rows_extracted": len(rows),
            "saved_csv": str(saved_csv) if saved_csv else None
        }))

    except Exception as e:
        print(json.dumps({
            "ok": False,
            "pdf_path": str(pdf_path),
            "error": str(e)
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
