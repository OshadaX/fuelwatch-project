# scripts/parse_report_pdf.py
import sys
import json
from utils.pdf_parser import extract_fuel_data_from_pdf

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "No PDF path provided"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    data = extract_fuel_data_from_pdf(pdf_path)

    # Always print JSON so API can read it
    print(json.dumps({"ok": True, "count": len(data), "rows": data}, ensure_ascii=False))

if __name__ == "__main__":
    main()
