# utils/pdf_parser.py

import re
import pdfplumber

# Example patterns (adjust to your PDF format)
# These are common examples: "Petrol 92  1200" or "Diesel: 4500"
FUEL_LINE_REGEX = re.compile(
    r"(petrol\s*92|petrol\s*95|diesel|auto\s*diesel)\s*[:\-]?\s*([0-9,]+(?:\.[0-9]+)?)",
    re.IGNORECASE
)

def extract_fuel_data_from_pdf(pdf_path: str):
    """
    Returns a list of dicts like:
    [
      {"fuel_type": "Petrol 92", "quantity": 1200.0},
      ...
    ]
    """
    results = []

    with pdfplumber.open(pdf_path) as pdf:
        # -------------------------
        # 1) TRY TABLE EXTRACTION
        # -------------------------
        for page_index, page in enumerate(pdf.pages):
            tables = page.extract_tables() or []
            for table in tables:
                if not table or len(table) < 2:
                    continue

                # Normalize rows: remove empty rows
                rows = [r for r in table if r and any(c and str(c).strip() for c in r)]

                for row in rows:
                    row_text = " ".join([str(c).strip() for c in row if c is not None])
                    if not row_text.strip():
                        continue

                    # Try match fuel + number inside row
                    m = FUEL_LINE_REGEX.search(row_text)
                    if m:
                        fuel = m.group(1).strip().title()
                        qty = float(m.group(2).replace(",", ""))
                        results.append({"fuel_type": fuel, "quantity": qty})

        if results:
            return results

        # -------------------------
        # 2) FALLBACK: TEXT + REGEX
        # -------------------------
        for page_index, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            if not text.strip():
                continue

            for match in FUEL_LINE_REGEX.finditer(text):
                fuel = match.group(1).strip().title()
                qty = float(match.group(2).replace(",", ""))
                results.append({"fuel_type": fuel, "quantity": qty})

        # -------------------------
        # 3) IF STILL EMPTY: DEBUG
        # -------------------------
        if not results:
            # Print first-page preview to help you tune regex/table logic
            first_text = (pdf.pages[0].extract_text() or "")[:1000]
            print("⚠️ No fuel data found. First page text preview:")
            print(first_text)

        return results
