// backend/src/utils/aiMapper.js
const levenshtein = require("fast-levenshtein");

const REQUIRED_CANONICAL = ["Site", "Type", "Date", "Number", "Class", "Item", "Qty", "Amount"];

// Synonyms / common variations (extend anytime)
const SYNONYMS = {
  Site: ["site", "station", "tank", "location", "fs", "filling station", "outlet"],
  Type: ["type", "txn type", "transaction", "doc type", "mode"],
  Date: ["date", "txn date", "transaction date", "invoice date", "day"],
  Number: ["number", "no", "invoice", "invoice no", "doc no", "reference", "ref"],
  Class: ["class", "category", "group", "grade"],
  Item: ["item", "product", "fuel", "fuel type", "description"],
  Qty: ["qty", "quantity", "volume", "liters", "litres", "ltrs", "amount(l)"],
  Amount: ["amount", "value", "total", "net", "sales", "price", "cost"],
};

function normalizeHeader(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[_\-]/g, " ")
    .replace(/[^\w\s]/g, "");
}

function similarity(a, b) {
  // Simple normalized Levenshtein similarity
  const A = normalizeHeader(a);
  const B = normalizeHeader(b);
  if (!A || !B) return 0;
  const dist = levenshtein.get(A, B);
  const maxLen = Math.max(A.length, B.length);
  return maxLen === 0 ? 1 : 1 - dist / maxLen;
}

function bestMatch(canonKey, headers) {
  const candidates = [canonKey, ...(SYNONYMS[canonKey] || [])];

  let best = { header: null, score: 0 };

  for (const h of headers) {
    for (const c of candidates) {
      const s = similarity(c, h);
      if (s > best.score) best = { header: h, score: s };
    }
  }
  return best;
}

/**
 * FREE "AI-like" inference:
 * - fuzzy header matching with synonyms
 * - confidence score = average match score across required fields
 */
function inferMappingFree(headers) {
  const columns = {};
  const notes = [];
  let sum = 0;

  for (const k of REQUIRED_CANONICAL) {
    const { header, score } = bestMatch(k, headers);
    if (!header || score < 0.45) {
      return {
        ok: false,
        error: `Could not reliably map canonical column '${k}'.`,
        hint: `Add a synonym for '${k}' or rename CSV header to match.`,
        debug: { bestHeader: header, score },
      };
    }
    columns[k] = header;
    sum += score;
    if (score < 0.65) notes.push(`Low-confidence mapping: ${k} -> '${header}' (score ${score.toFixed(2)})`);
  }

  const confidence = sum / REQUIRED_CANONICAL.length;

  // groupBy: prefer a header that matches "tank/site/station"
  const groupByGuess = columns.Site || "Site";

  return {
    ok: true,
    mapping: {
      confidence,
      groupBy: "Site",              // canonical grouping
      sortBy: ["Date", "Number"],   // deterministic
      columns,
      notes,
    },
  };
}

// Keep deterministic exact-header matcher too
function inferMappingDeterministic(headers) {
  const set = new Set(headers);
  const exact = {};
  for (const k of REQUIRED_CANONICAL) {
    if (!set.has(k)) {
      return { ok: false, error: `Missing required column '${k}' and free mapping could not be used.` };
    }
    exact[k] = k;
  }
  return {
    ok: true,
    mapping: {
      confidence: 1,
      groupBy: "Site",
      sortBy: ["Date", "Number"],
      columns: exact,
      notes: ["Deterministic exact-header mapping used."],
    },
  };
}

module.exports = { inferMappingFree, inferMappingDeterministic, REQUIRED_CANONICAL };