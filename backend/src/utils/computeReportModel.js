function sortRows(rows, sortKeys) {
  const keys = sortKeys && sortKeys.length ? sortKeys : ["Date", "Number"];
  return [...rows].sort((a, b) => {
    for (const k of keys) {
      const av = a[k];
      const bv = b[k];
      if (av < bv) return -1;
      if (av > bv) return 1;
    }
    return 0;
  });
}

/**
 * Groups rows by mapping.groupBy (source header in mapping), but we normalize using canonical schema,
 * so groupBy should be either a canonical key or mapped to one.
 * For simplicity: if groupBy matches canonical keys, use it; else default to Site.
 */
function groupRows(rows, groupBy) {
  const key = ["Site", "Type", "Date", "Number", "Class", "Item"].includes(groupBy) ? groupBy : "Site";
  const map = new Map();
  for (const r of rows) {
    const g = r[key] || "UNKNOWN";
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(r);
  }
  return { groupKey: key, groups: map };
}

/**
 * Compute running balance per group, plus totals.
 */
function computeReportModel({ rows, mapping, titleFrom, titleTo }) {
  const sortKeys = mapping.sortBy || ["Date", "Number"];
  const sorted = sortRows(rows, sortKeys);

  const { groupKey, groups } = groupRows(sorted, mapping.groupBy);

  const sections = [];
  let grandQty = 0;
  let grandAmount = 0;

  for (const [sectionName, sectionRows] of groups.entries()) {
    let running = 0;
    let sectionQty = 0;
    let sectionAmount = 0;

    const computedRows = sectionRows.map((r) => {
      running += r.Amount;
      sectionQty += r.Qty;
      sectionAmount += r.Amount;
      return { ...r, Balance: running };
    });

    grandQty += sectionQty;
    grandAmount += sectionAmount;

    sections.push({
      sectionName,
      rows: computedRows,
      totals: {
        Qty: sectionQty,
        Amount: sectionAmount,
        FinalBalance: computedRows.length ? computedRows[computedRows.length - 1].Balance : 0,
      },
    });
  }

  return {
    title: `Sale by Site Detail From - ${titleFrom} To - ${titleTo}`,
    groupKey,
    sections,
    grandTotals: {
      Qty: grandQty,
      Amount: grandAmount,
    },
  };
}

module.exports = { computeReportModel };