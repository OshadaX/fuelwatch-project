const { REPORT_STRICT_MODE } = require("../../config/env");
const FuelPrediction = require("../../models/member1-kumara/FuelPredictionModel");

const { ingestCsvBuffer } = require("../../utils/ingestCsv");
const { inferMappingFree, inferMappingDeterministic } = require("../../utils/aiMapper");
const { normalizeRows } = require("../../utils/normalizeRows");
const { validateReport } = require("../../utils/validateReport");
const { computeReportModel } = require("../../utils/computeReportModel");
const { renderPdfBuffer } = require("../../utils/renderPdf");
const { sha256, makeAudit } = require("../../utils/audit");

function badRequest(res, payload, status = 422) {
  return res.status(status).json(payload);
}

async function generateReport(req, res) {
  try {
    const file = req.file;
    if (!file) {
      return badRequest(
        res,
        { error: "No file uploaded. Expected CSV file field name 'file'." },
        400
      );
    }

    const { from, to } = req.body || {};

    if (!from || !to) {
      return badRequest(res, { error: "Missing 'from' and/or 'to' in request body." }, 400);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return badRequest(res, { error: "from/to must be YYYY-MM-DD." }, 400);
    }

    const inputHash = sha256(file.buffer);

    /* =========================
       1) INGEST CSV
    ========================== */
    const { headers, records } = ingestCsvBuffer(file.buffer);

    if (!headers || headers.length === 0) {
      return badRequest(res, { error: "CSV has no headers or is empty." }, 400);
    }

    /* =========================
       2) FREE "AI-LIKE" MAPPING
       (NO OPENAI)
    ========================== */
    const aiAllowed = false; // force free mode (no OpenAI)

    let mappingResp = inferMappingFree(headers);

    // If free mapping fails, try exact deterministic match
    if (!mappingResp.ok) {
      const det = inferMappingDeterministic(headers);
      if (!det.ok) {
        return badRequest(
          res,
          {
            error: "Mapping failed.",
            details: mappingResp,
            hint: "Rename CSV headers or extend SYNONYMS in src/utils/aiMapper.js",
          },
          422
        );
      }
      mappingResp = det;
    }

    const mapping = mappingResp.mapping;

    // Guardrail: refuse very low confidence mappings (optional)
    if (mapping.confidence !== undefined && mapping.confidence < 0.45) {
      return badRequest(
        res,
        {
          error: "Mapping confidence too low.",
          mapping,
          hint: "Rename CSV headers or add synonyms in src/utils/aiMapper.js",
        },
        422
      );
    }

    /* =========================
       3) NORMALIZE
    ========================== */
    const norm = normalizeRows({ records, mapping });

    if (REPORT_STRICT_MODE && norm.errors.length) {
      return badRequest(res, {
        error: "Normalization failed (strict mode).",
        rowErrors: norm.errors,
        mappingUsed: mapping,
      });
    }

    /* =========================
       4) VALIDATE
    ========================== */
    const valErrors = validateReport({ rows: norm.rows, from, to });
    if (valErrors.length) {
      return badRequest(
        res,
        { error: "Validation failed.", validationErrors: valErrors, mappingUsed: mapping },
        422
      );
    }

    /* =========================
       5) COMPUTE MODEL
    ========================== */
    const reportModel = computeReportModel({
      rows: norm.rows,
      mapping,
      titleFrom: from,
      titleTo: to,
    });

    /* =========================
       6) RENDER PDF
    ========================== */
    const pdfBuffer = await renderPdfBuffer(reportModel);

    /* =========================
       7) AUDIT + DOWNLOAD
    ========================== */
    const audit = makeAudit({
      inputHash,
      mapping,
      warnings: norm.warnings,
      metrics: {
        inputRows: records.length,
        validRows: norm.rows.length,
        sections: reportModel.sections.length,
        grandAmount: reportModel.grandTotals.Amount,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sale-by-site-${from}-to-${to}.pdf"`
    );

    // Audit in header (base64). Useful for debugging & traceability.
    res.setHeader("X-Report-Audit", Buffer.from(JSON.stringify(audit)).toString("base64"));

    return res.status(200).send(pdfBuffer);
  } catch (err) {
    console.error("Server Error:", err);
    return res.status(500).json({
      error: "Server error while generating report.",
      details: String(err?.message || err),
    });
  }
}

async function saveFuelPrediction(req, res) {
  try {
    const { stationId, mode, predictions } = req.body;

    if (!stationId || !mode || !predictions) {
      return res.status(400).json({ ok: false, message: "Missing required fields: stationId, mode, predictions" });
    }

    const newPrediction = await FuelPrediction.create({
      stationId,
      mode,
      predictions,
    });

    return res.status(201).json({
      ok: true,
      message: "Fuel prediction saved successfully",
      data: newPrediction,
    });
  } catch (err) {
    console.error("Error saving fuel prediction:", err);
    return res.status(500).json({ ok: false, message: "Server error while saving fuel prediction", details: err.message });
  }
}

async function getLatestFuelPrediction(req, res) {
  try {
    const { stationId } = req.query;

    const query = stationId ? { stationId } : {};

    const latest = await FuelPrediction.findOne(query)
      .sort({ createdAt: -1 })
      .lean();

    if (!latest) {
      return res.status(404).json({ ok: false, message: "No fuel predictions found" });
    }

    return res.json({ ok: true, data: latest });
  } catch (err) {
    console.error("Error fetching fuel prediction:", err);
    return res.status(500).json({ ok: false, message: "Server error while fetching fuel prediction", details: err.message });
  }
}

module.exports = { generateReport, saveFuelPrediction, getLatestFuelPrediction };