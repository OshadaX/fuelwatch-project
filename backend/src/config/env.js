const toBool = (v, def = false) => {
  if (v === undefined) return def;
  return String(v).toLowerCase() === "true";
};

const toInt = (v, def) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
};

module.exports = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
  REPORT_STRICT_MODE: toBool(process.env.REPORT_STRICT_MODE, true),
  REPORT_USE_AI_MAPPING: toBool(process.env.REPORT_USE_AI_MAPPING, true),
  REPORT_MAX_UPLOAD_MB: toInt(process.env.REPORT_MAX_UPLOAD_MB, 10),
};