function validateAgainstDateRange(rows, from, to) {
  const errors = [];
  if (!from || !to) return errors;

  for (let i = 0; i < rows.length; i++) {
    const d = rows[i].Date;
    if (d < from || d > to) {
      errors.push({
        rowIndex: i + 1,
        error: `Date '${d}' out of range [${from}..${to}]`,
      });
    }
  }
  return errors;
}

function validateNonEmpty(rows) {
  if (!rows.length) return [{ error: "No valid rows after normalization." }];
  return [];
}

/**
 * Research-grade validations.
 */
function validateReport({ rows, from, to }) {
  const errors = [];
  errors.push(...validateNonEmpty(rows));
  errors.push(...validateAgainstDateRange(rows, from, to));
  return errors;
}

module.exports = { validateReport };