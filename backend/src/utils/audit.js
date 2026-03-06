const crypto = require("crypto");

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

/**
 * Research-grade audit artifact.
 * Store/return this JSON for traceability.
 */
function makeAudit({ inputHash, mapping, warnings, metrics }) {
  return {
    version: "report-gen/v1",
    generatedAt: nowIso(), // For strict determinism you can omit this from PDF metadata; keep for API logs.
    inputHash,
    mappingUsed: mapping,
    warnings: warnings || [],
    metrics: metrics || {},
  };
}

module.exports = { sha256, makeAudit };