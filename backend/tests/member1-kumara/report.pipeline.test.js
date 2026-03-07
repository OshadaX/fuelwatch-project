const assert = require("assert");
const { ingestCsvBuffer } = require("../src/utils/ingestCsv");
const { inferMappingDeterministic } = require("../src/utils/aiMapper");
const { normalizeRows } = require("../src/utils/normalizeRows");
const { validateReport } = require("../src/utils/validateReport");
const { computeReportModel } = require("../src/utils/computeReportModel");

describe("report pipeline", () => {
  it("parses, normalizes, validates, computes", () => {
    const csv = Buffer.from(
      "Site,Type,Date,Number,Class,Item,Qty,Amount\n" +
      "Diesel Tank 01,SAL,2025-11-01,INV001,A,Super Diesel,10,1000\n" +
      "Diesel Tank 01,SAL,2025-11-02,INV002,A,Super Diesel,5,500\n"
    );

    const { headers, records } = ingestCsvBuffer(csv);
    const map = inferMappingDeterministic(headers);
    assert.equal(map.ok, true);

    const norm = normalizeRows({ records, mapping: map.mapping });
    assert.equal(norm.errors.length, 0);

    const val = validateReport({ rows: norm.rows, from: "2025-11-01", to: "2025-11-30" });
    assert.equal(val.length, 0);

    const model = computeReportModel({ rows: norm.rows, mapping: map.mapping, titleFrom: "2025-11-01", titleTo: "2025-11-30" });
    assert.equal(model.sections.length, 1);
    assert.equal(model.sections[0].rows[1].Balance, 1500);
  });
});