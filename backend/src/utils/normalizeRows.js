function parseISODate(value) {
  const raw = String(value || "").trim();

  if (!raw) {
    return { ok: false, error: "Date is empty." };
  }

  // Case 1: Already ISO (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { ok: true, value: raw };
  }

  // Case 2: M/D/YYYY or MM/DD/YYYY  (your CSV uses this: 12/1/2025)
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
    const [month, day, year] = raw.split("/").map(Number);

    if (year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return { ok: true, value: `${year}-${mm}-${dd}` };
    }
  }

  // Case 3: DD-MM-YYYY (optional)
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(raw)) {
    const [day, month, year] = raw.split("-").map(Number);

    if (year >= 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return { ok: true, value: `${year}-${mm}-${dd}` };
    }
  }

  return {
    ok: false,
    error: `Invalid date format '${raw}'. Expected YYYY-MM-DD or MM/DD/YYYY.`,
  };
}

function parseNumber(value, fieldName) {
  const raw = String(value ?? "").trim();
  if (raw === "") return { ok: false, error: `Missing numeric value for ${fieldName}.` };

  const cleaned = raw.replace(/,/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return { ok: false, error: `Invalid number '${raw}' for ${fieldName}.` };
  return { ok: true, value: n };
}

/**
 * Map source CSV records -> canonical rows.
 * Canonical keys: Site, Type, Date, Number, Class, Item, Qty, Amount
 */
function normalizeRows({ records, mapping }) {
  const errors = [];
  const warnings = [];

  const rows = records.map((r, idx) => {
    const pick = (canon) => r[mapping.columns[canon]];

    // 1) Skip completely empty CSV rows (Excel export noise)
    const allValues = Object.values(r).map((v) => String(v ?? "").trim());
    if (allValues.every((v) => v === "")) return null;

    // Pull mapped identity fields
    const siteRaw = String(pick("Site") ?? "").trim();
    const typeRaw = String(pick("Type") ?? "").trim();
    const dateRaw = String(pick("Date") ?? "").trim();
    const numberRaw = String(pick("Number") ?? "").trim();
    const classRaw = String(pick("Class") ?? "").trim();
    const itemRaw = String(pick("Item") ?? "").trim();

    const qtyRaw = String(pick("Qty") ?? "").trim();
    const amtRaw = String(pick("Amount") ?? "").trim();

    // 2) Skip footer/total rows:
    //    In your CSV, rows like: Site="",Type="",Date=""... but Qty/Amount are filled.
    const allIdentityEmpty = !siteRaw && !typeRaw && !dateRaw && !numberRaw && !classRaw && !itemRaw;

    if (allIdentityEmpty) {
      // if Qty/Amount also empty -> blank separator, skip silently
      if (!qtyRaw && !amtRaw) return null;

      // Qty/Amount present but identity empty -> treat as footer total row, skip with warning
      warnings.push({
        rowIndex: idx + 1,
        warning: "Skipped footer/total row (Qty/Amount present but identity fields empty).",
        qty: qtyRaw,
        amount: amtRaw,
      });
      return null;
    }

    // 3) Normal row validation
    const site = siteRaw;
    const type = typeRaw;
    const number = numberRaw;
    const cls = classRaw;
    const item = itemRaw;

    const d = parseISODate(dateRaw);
    const qty = parseNumber(qtyRaw, "Qty");
    const amt = parseNumber(amtRaw, "Amount");

    const rowErrors = [];
    if (!site) rowErrors.push("Site is empty.");
    if (!type) rowErrors.push("Type is empty.");
    if (!number) rowErrors.push("Number is empty.");
    if (!cls) rowErrors.push("Class is empty.");
    if (!item) rowErrors.push("Item is empty.");
    if (!d.ok) rowErrors.push(d.error);
    if (!qty.ok) rowErrors.push(qty.error);
    if (!amt.ok) rowErrors.push(amt.error);

    if (rowErrors.length) {
      errors.push({ rowIndex: idx + 1, errors: rowErrors });
      return null;
    }

    return {
      Site: site,
      Type: type,
      Date: d.value,
      Number: number,
      Class: cls,
      Item: item,
      Qty: qty.value,
      Amount: amt.value,
    };
  });

  return { rows: rows.filter(Boolean), errors, warnings };
}

module.exports = { normalizeRows };