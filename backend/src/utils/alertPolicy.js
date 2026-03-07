function safeNum(v, d = 0) {
  const n = Number(v);
  if (!Number.isFinite(n)) return d;
  return n;
}

function severityLabel(level) {
  if (level === 3) return "Critical";
  if (level === 2) return "Warning";
  if (level === 1) return "Advisory";
  return "Normal";
}

function pickStationId(rows) {
  const found = (rows || []).find((r) => r?.stationId);
  return found?.stationId ? String(found.stationId) : "";
}

function countsFromRows(rows) {
  let flagged = 0,
    critical = 0,
    warning = 0;

  for (const r of rows || []) {
    const pred = Number(r?.pred ?? 0);
    if (pred !== 1) continue;

    flagged++;
    const sev = String(r?.severity || "").toLowerCase();
    if (sev === "critical") critical++;
    else warning++;
  }

  return { flagged, critical, warning };
}

/**
 * Decide alert level (0..3)
 * No-harm: conservative escalation, no accusations.
 */
function decideAlertLevel({ rows = [], events = [], threshold = 0.85 }) {
  const flagged = rows.filter((r) => Number(r?.pred ?? 0) === 1);
  if (!flagged.length) return 0;

  let level = 1;

  for (const r of flagged) {
    const prob = safeNum(r?.prob, 0);
    const sev = String(r?.severity || "").toLowerCase();
    const type = String(r?.anomalyType || "").toUpperCase();

    // Strong type overrides
    if (type === "BALANCE_JUMP" || type === "DROP_WITHOUT_SALES") level = Math.max(level, 3);
    if (type === "SALES_NO_BALANCE_DROP") level = Math.max(level, 2);

    // Probability / severity bands
    if (prob >= 0.95 || sev === "critical") level = Math.max(level, 3);
    else if (prob >= Math.max(0.9, threshold) || sev === "warning") level = Math.max(level, 2);
    else level = Math.max(level, 1);
  }

  // Event-length escalation
  for (const ev of events || []) {
    const days = safeNum(ev?.days, 0);
    if (days >= 5) level = Math.max(level, 3);
    else if (days >= 3) level = Math.max(level, 2);
  }

  return level;
}

function cooldownMinutes(level) {
  const l1 = safeNum(process.env.COOLDOWN_MINUTES_L1, 60);
  const l2 = safeNum(process.env.COOLDOWN_MINUTES_L2, 30);
  const l3 = safeNum(process.env.COOLDOWN_MINUTES_L3, 10);

  if (level === 3) return l3;
  if (level === 2) return l2;
  if (level === 1) return l1;
  return 0;
}

/**
 * Dedupe key: station + file + top anomaly ids (stable)
 */
function buildDedupeKey({ stationId, fileName, anomaliesTop }) {
  const ids = (anomaliesTop || [])
    .map((a) => a?.id)
    .filter(Boolean)
    .slice(0, 12)
    .join(",");
  return `${stationId || "NA"}|${fileName || "NA"}|${ids || "NO_IDS"}`.slice(0, 240);
}

module.exports = {
  severityLabel,
  pickStationId,
  countsFromRows,
  decideAlertLevel,
  cooldownMinutes,
  buildDedupeKey,
};
