const PDFDocument = require("pdfkit");

/**
 * Deterministic number formatting.
 */
function fmt2(n) {
  const x = Number(n);
  return (Math.round(x * 100) / 100).toFixed(2);
}

function drawTableHeader(doc, x, y, colDefs, rowH) {
  doc.fontSize(9).font("Helvetica-Bold");
  let cx = x;
  for (const c of colDefs) {
    doc.rect(cx, y, c.w, rowH).stroke();
    doc.text(c.label, cx + 2, y + 3, { width: c.w - 4, align: c.align || "left" });
    cx += c.w;
  }
  doc.font("Helvetica");
}

function drawRow(doc, x, y, colDefs, rowH, row) {
  doc.fontSize(9).font("Helvetica");
  let cx = x;
  for (const c of colDefs) {
    doc.rect(cx, y, c.w, rowH).stroke();
    const text = row[c.key] ?? "";
    doc.text(String(text), cx + 2, y + 3, { width: c.w - 4, align: c.align || "left" });
    cx += c.w;
  }
}

/**
 * Render PDF in a deterministic layout (A4 portrait).
 * Header block removed (as you requested). Only title + sections + table.
 */
function renderPdfBuffer(reportModel) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "portrait",
      margins: { top: 36, bottom: 36, left: 24, right: 24 },
      // Keep metadata stable (avoid current time in PDF metadata for reproducibility)
      info: {
        Title: "Sale by Site Detail",
        Author: "Report Generator",
        Producer: "report-gen/v1",
      },
    });

    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width;
    const m = doc.page.margins;
    const usableW = pageW - m.left - m.right;

    // Column definition (fits A4 width)
    // Columns in order: Site | Type | Date | Number | Class | Site | Item | Qty | Amount | Balance
    // Note: PDF sample had two "Site" columns; we keep only one canonical Site column here.
    // If you truly need duplicate "Site" columns exactly, tell me and I’ll mirror it.
    const colDefs = [
      { key: "Site", label: "Site", w: 70, align: "left" },
      { key: "Type", label: "Type", w: 45, align: "left" },
      { key: "Date", label: "Date", w: 65, align: "left" },
      { key: "Number", label: "Number", w: 55, align: "left" },
      { key: "Class", label: "Class", w: 50, align: "left" },
      { key: "Item", label: "Item", w: 120, align: "left" },
      { key: "Qty", label: "Qty", w: 45, align: "right" },
      { key: "Amount", label: "Amount", w: 60, align: "right" },
      { key: "Balance", label: "Balance", w: 60, align: "right" },
    ];

    // Adjust widths to fit exactly usable width (deterministic)
    const totalW = colDefs.reduce((s, c) => s + c.w, 0);
    const scale = usableW / totalW;
    for (const c of colDefs) c.w = Math.floor(c.w * scale);

    const rowH = 16;

    // Title (centered) - header block removed
    doc.font("Helvetica-Bold").fontSize(12);
    doc.text(reportModel.title, m.left, m.top, { width: usableW, align: "center" });

    let y = m.top + 24;

    for (const section of reportModel.sections) {
      // Section label
      doc.font("Helvetica-Bold").fontSize(10);
      doc.text(section.sectionName, m.left, y);
      y += 14;

      // Table header
      drawTableHeader(doc, m.left, y, colDefs, rowH);
      y += rowH;

      // Rows
      doc.font("Helvetica").fontSize(9);

      for (const r of section.rows) {
        // Page break if needed
        if (y + rowH + 40 > doc.page.height - m.bottom) {
          doc.addPage();
          y = m.top;

          // Repeat title on each page (optional but useful)
          doc.font("Helvetica-Bold").fontSize(12);
          doc.text(reportModel.title, m.left, y, { width: usableW, align: "center" });
          y += 24;

          // Repeat section name + header
          doc.font("Helvetica-Bold").fontSize(10);
          doc.text(section.sectionName, m.left, y);
          y += 14;
          drawTableHeader(doc, m.left, y, colDefs, rowH);
          y += rowH;
          doc.font("Helvetica").fontSize(9);
        }

        const row = {
          ...r,
          Qty: fmt2(r.Qty),
          Amount: fmt2(r.Amount),
          Balance: fmt2(r.Balance),
        };
        drawRow(doc, m.left, y, colDefs, rowH, row);
        y += rowH;
      }

      // Section totals
      y += 6;
      doc.font("Helvetica-Bold").fontSize(9);
      doc.text(
        `Total ${section.sectionName}   Qty: ${fmt2(section.totals.Qty)}   Amount: ${fmt2(section.totals.Amount)}   Final Balance: ${fmt2(section.totals.FinalBalance)}`,
        m.left,
        y,
        { width: usableW, align: "left" }
      );
      doc.font("Helvetica").fontSize(9);
      y += 18;

      // Add a little spacing between sections
      y += 6;

      // Page break between sections if cramped
      if (y + 80 > doc.page.height - m.bottom) {
        doc.addPage();
        y = m.top;

        doc.font("Helvetica-Bold").fontSize(12);
        doc.text(reportModel.title, m.left, y, { width: usableW, align: "center" });
        y += 24;
      }
    }

    // Grand total at end
    doc.font("Helvetica-Bold").fontSize(10);
    doc.text(
      `Grand Total   Qty: ${fmt2(reportModel.grandTotals.Qty)}   Amount: ${fmt2(reportModel.grandTotals.Amount)}`,
      m.left,
      doc.page.height - m.bottom - 20,
      { width: usableW, align: "left" }
    );

    doc.end();
  });
}

module.exports = { renderPdfBuffer };