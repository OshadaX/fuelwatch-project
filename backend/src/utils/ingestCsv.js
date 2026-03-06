const { parse } = require("csv-parse/sync");

/**
 * Ingest CSV buffer -> rows as objects + headers list.
 * Strict parsing; supports quoted fields, commas inside quotes, etc.
 */
function ingestCsvBuffer(csvBuffer) {
  const text = csvBuffer.toString("utf8");

  // Parse into records with columns from header line.
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: false,
    relax_column_count: false,
  });

  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  return { headers, records };
}

module.exports = { ingestCsvBuffer };