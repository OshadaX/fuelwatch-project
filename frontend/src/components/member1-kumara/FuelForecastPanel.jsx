import React, { useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { forecastFuel, healthCheck } from "../../services/mlService";
import { downloadCsv } from "../../utils/downloadCsv";

const MODE_OPTIONS = [
  { value: "weekly", label: "Weekly (Next 7 Days)" },
  { value: "monthly", label: "Monthly (Next 30 Days)" },
  { value: "annual", label: "Annual (Next 365 Days)" },
];

export default function FuelForecastPanel() {
  const [mode, setMode] = useState("weekly");
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const totals = useMemo(
    () => result?.forecast?.totals || result?.totals || null,
    [result]
  );
  const daily = useMemo(
    () => result?.forecast?.daily || result?.daily || [],
    [result]
  );

  const fileError =
    !file
      ? "Please upload a PDF report to generate a forecast."
      : file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")
      ? "Only PDF files are allowed."
      : file.size > 25 * 1024 * 1024
      ? "PDF is too large (max 25MB)."
      : "";

  async function onCheckHealth() {
    try {
      setError("");
      const data = await healthCheck();
      setHealth(data);
      toast.success("Service is reachable");
    } catch (e) {
      setHealth(null);
      setError(e?.response?.data?.detail || e.message || "Health check failed");
      toast.error("Health check failed");
    }
  }

  async function onGenerate() {
    // ✅ HARD BLOCK: must upload a PDF
    if (fileError) {
      setError(fileError);
      toast.error(fileError);
      return;
    }

    try {
      setError("");
      setResult(null);
      setLoading(true);

      const data = await forecastFuel({ mode, file });

      if (!data?.ok) {
        setError(data?.message || "Forecast failed");
        setResult(data);
        toast.error(data?.message || "Forecast failed");
      } else {
        setResult(data);
        toast.success("Forecast generated");
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Forecast request failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  function onDownloadDaily() {
    if (!daily || daily.length === 0) return;
    downloadCsv(`fuel_forecast_${mode}_daily.csv`, daily);
  }

  function onDownloadTotals() {
    if (!totals) return;
    const rows = Object.entries(totals).map(([fuel, qty]) => ({
      fuel,
      predicted_total: qty,
      mode,
      from: result?.forecast?.from || result?.from_date || result?.from,
      to: result?.forecast?.to || result?.to_date || result?.to,
    }));
    downloadCsv(`fuel_forecast_${mode}_totals.csv`, rows);
  }

  return (
    <div style={styles.container}>
      <Toaster position="top-right" />

      <div style={styles.header}>
        <h2 style={styles.title}>Fuel Demand Forecast</h2>
        <p style={styles.subtitle}>
          Upload a report PDF (required) and generate weekly / monthly / annual predicted fuel quantities.
        </p>
      </div>

      <div style={styles.card}>
        <div style={styles.row}>
          <div style={styles.field}>
            <label style={styles.label}>Forecast Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={styles.select}
              disabled={loading}
            >
              {MODE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>PDF Report (Required)</label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setResult(null);
                setHealth(null);
                setError("");
                setFile(f);
              }}
              style={{
                ...styles.input,
                border: fileError ? "1px solid #ff7a7a" : styles.input.border,
              }}
              disabled={loading}
            />
            <div style={styles.hint}>
              {file ? `Selected: ${file.name}` : "No file selected."}
            </div>

            {fileError ? <div style={styles.inlineError}>{fileError}</div> : null}
          </div>
        </div>

        <div style={styles.actions}>
          <button onClick={onCheckHealth} style={styles.secondaryBtn} disabled={loading}>
            Check Service
          </button>

          <button
            onClick={onGenerate}
            style={{
              ...styles.primaryBtn,
              opacity: loading || !!fileError ? 0.55 : 1,
              cursor: loading || !!fileError ? "not-allowed" : "pointer",
            }}
            disabled={loading || !!fileError}
            title={fileError ? fileError : "Generate forecast"}
          >
            {loading ? "Generating..." : "Generate Forecast"}
          </button>
        </div>

        {health && (
          <div style={styles.healthBox}>
            <strong>Service:</strong> {health.status || "ok"} &nbsp; | &nbsp;
            <strong>Model Loaded:</strong> {String(health.model_loaded)}
          </div>
        )}

        {error && <div style={styles.errorBox}>{error}</div>}
      </div>

      {/* Results */}
      {result && (
        <div style={styles.results}>
          <div style={styles.card}>
            <h3 style={styles.sectionTitle}>Forecast Summary</h3>

            <div style={styles.metaRow}>
              <div>
                <strong>Mode:</strong> {result.mode || mode}
              </div>
              <div>
                <strong>From:</strong> {result.forecast?.from || result.from_date || result.from || "-"}
              </div>
              <div>
                <strong>To:</strong> {result.forecast?.to || result.to_date || result.to || "-"}
              </div>
              <div>
                <strong>PDF Ingested:</strong> {String(result.ingest?.ingested ?? false)}
              </div>
            </div>

            {totals && (
              <>
                <div style={styles.downloadRow}>
                  <button onClick={onDownloadTotals} style={styles.secondaryBtn}>
                    Download Totals CSV
                  </button>
                  <button onClick={onDownloadDaily} style={styles.secondaryBtn} disabled={!daily.length}>
                    Download Daily CSV
                  </button>
                </div>

                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Fuel Type</th>
                        <th style={styles.th}>Predicted Total (Liters)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(totals).map(([fuel, qty]) => (
                        <tr key={fuel}>
                          <td style={styles.td}>{fuel}</td>
                          <td style={styles.td}>{Number(qty).toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {daily && daily.length > 0 && (
              <>
                <h3 style={{ ...styles.sectionTitle, marginTop: 18 }}>Daily Breakdown</h3>
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {Object.keys(daily[0]).map((k) => (
                          <th key={k} style={styles.th}>
                            {k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {daily.slice(0, 60).map((row, idx) => (
                        <tr key={idx}>
                          {Object.keys(daily[0]).map((k) => (
                            <td key={k} style={styles.td}>
                              {typeof row[k] === "number" ? row[k].toFixed(3) : String(row[k])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {daily.length > 60 && (
                  <div style={styles.hint}>Showing first 60 days only. Download CSV to view full data.</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: 20, maxWidth: 1100, margin: "0 auto", fontFamily: "Arial, sans-serif" },
  header: { marginBottom: 10 },
  title: { margin: 0 },
  subtitle: { marginTop: 6, color: "#555" },

  card: {
    background: "#fff",
    border: "1px solid #e5e5e5",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    marginTop: 12,
  },
  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontWeight: 700, fontSize: 13 },
  select: { padding: 10, borderRadius: 8, border: "1px solid #ccc" },
  input: { padding: 10, borderRadius: 8, border: "1px solid #ccc" },
  hint: { fontSize: 12, color: "#666", marginTop: 4 },

  inlineError: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#9a1c1c",
  },

  actions: { display: "flex", gap: 10, marginTop: 14, alignItems: "center" },
  primaryBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "none",
    background: "#111",
    color: "white",
    fontWeight: 700,
  },
  secondaryBtn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: "1px solid #bbb",
    cursor: "pointer",
    background: "white",
    fontWeight: 700,
  },

  healthBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    background: "#f3f7ff",
    border: "1px solid #dbe7ff",
    color: "#1d3b8b",
  },
  errorBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    background: "#fff1f1",
    border: "1px solid #ffd0d0",
    color: "#9a1c1c",
  },

  results: { marginTop: 12 },
  sectionTitle: { margin: 0, marginBottom: 10 },
  metaRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    marginBottom: 12,
    fontSize: 13,
  },

  downloadRow: { display: "flex", gap: 10, marginBottom: 12 },

  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: 10, borderBottom: "1px solid #ddd", background: "#fafafa" },
  td: { padding: 10, borderBottom: "1px solid #eee" },
};
