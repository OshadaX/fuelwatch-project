import React, { useMemo, useState } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

// npm i sweetalert2 sweetalert2-react-content
const MySwal = withReactContent(Swal);

export default function ReportsGenerator() {
  const [file, setFile] = useState(null);
  const [from, setFrom] = useState("2025-11-01");
  const [to, setTo] = useState("2025-11-30");
  const [useAI, setUseAI] = useState(true);

  const [loading, setLoading] = useState(false);
  const [audit, setAudit] = useState(null);

  const canSubmit = useMemo(() => {
    return (
      !!file &&
      /^\d{4}-\d{2}-\d{2}$/.test(from) &&
      /^\d{4}-\d{2}-\d{2}$/.test(to)
    );
  }, [file, from, to]);

  // ---------- SweetAlert helpers ----------
  const toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 2400,
    timerProgressBar: true,
    didOpen: (t) => {
      t.onmouseenter = Swal.stopTimer;
      t.onmouseleave = Swal.resumeTimer;
    },
  });

  const showError = async (title, html) => {
    await MySwal.fire({
      icon: "error",
      title,
      html,
      confirmButtonText: "OK",
    });
  };

  const showInfo = async (title, html) => {
    await MySwal.fire({
      icon: "info",
      title,
      html,
      confirmButtonText: "OK",
    });
  };

  const showWarn = async (title, html) => {
    await MySwal.fire({
      icon: "warning",
      title,
      html,
      confirmButtonText: "OK",
    });
  };

  const showSuccess = async (title, html) => {
    await MySwal.fire({
      icon: "success",
      title,
      html,
      confirmButtonText: "OK",
    });
  };

  const showAuditModal = async (auditObj) => {
    await MySwal.fire({
      icon: "info",
      title: "Audit (traceability)",
      html: `<pre style="
        margin:0;
        text-align:left;
        white-space:pre-wrap;
        word-break:break-word;
        background:rgba(2,6,23,0.04);
        border:1px solid rgba(15,23,42,0.08);
        padding:12px;
        border-radius:14px;
        max-height:360px;
        overflow:auto;
        font-size:12px;
        line-height:1.45;
      ">${escapeHtml(JSON.stringify(auditObj, null, 2))}</pre>`,
      width: 720,
      confirmButtonText: "Close",
    });
  };

  const showValidationErrors = async (validationErrors) => {
    const items = validationErrors.slice(0, 50).map((e) => {
      const prefix = e?.rowIndex ? `<b>Row ${e.rowIndex}:</b> ` : "";
      return `<li style="margin:6px 0;">${prefix}${escapeHtml(String(e?.error ?? e))}</li>`;
    });

    const more =
      validationErrors.length > 50
        ? `<div style="margin-top:10px;color:#64748b;font-size:12px;">Showing first 50…</div>`
        : "";

    await MySwal.fire({
      icon: "warning",
      title: "Validation Errors",
      html: `
        <div style="text-align:left">
          <ul style="padding-left:18px;margin:0;">
            ${items.join("")}
          </ul>
          ${more}
        </div>
      `,
      width: 760,
      confirmButtonText: "OK",
    });
  };

  const showRowErrors = async (rowErrors) => {
    const items = rowErrors.slice(0, 20).map((re) => {
      const errs = (re?.errors || [])
        .slice(0, 50)
        .map((x) => `<li style="margin:6px 0;">${escapeHtml(String(x))}</li>`)
        .join("");

      return `
        <li style="margin:12px 0;">
          <div style="font-weight:900;margin-bottom:6px;">Row ${escapeHtml(
            String(re?.rowIndex ?? "")
          )}</div>
          <ul style="padding-left:18px;margin:0;">
            ${errs}
          </ul>
        </li>
      `;
    });

    const more =
      rowErrors.length > 20
        ? `<div style="margin-top:10px;color:#64748b;font-size:12px;">Showing first 20 rows…</div>`
        : "";

    await MySwal.fire({
      icon: "error",
      title: "Row Normalization Errors (Strict Mode)",
      html: `
        <div style="text-align:left">
          <ul style="padding-left:18px;margin:0;">
            ${items.join("")}
          </ul>
          ${more}
        </div>
      `,
      width: 820,
      confirmButtonText: "OK",
    });
  };

  const showGeneratingModal = () => {
    MySwal.fire({
      title: "Generating report…",
      html: "Please wait while we prepare your PDF.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  };

  const closeModal = () => {
    Swal.close();
  };

  async function handleGenerate() {
    setAudit(null);

    if (!canSubmit) {
      await showWarn(
        "Missing inputs",
        "Please select a CSV file and enter valid <b>From</b>/<b>To</b> dates (YYYY-MM-DD)."
      );
      return;
    }

    setLoading(true);
    showGeneratingModal();

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("from", from);
      form.append("to", to);
      form.append("useAI", String(useAI));

      const resp = await fetch("http://localhost:8081/api/reports/generate", {
        method: "POST",
        body: form,
      });

      const contentType = resp.headers.get("content-type") || "";

      if (!resp.ok) {
        // Prefer JSON error payloads
        if (contentType.includes("application/json")) {
          const data = await resp.json().catch(() => ({}));

          closeModal();
          const msg = data?.error || `Report generation failed (HTTP ${resp.status}).`;
          await showError("Generation failed", escapeHtml(String(msg)));

          if (Array.isArray(data?.validationErrors) && data.validationErrors.length) {
            await showValidationErrors(data.validationErrors);
          }
          if (Array.isArray(data?.rowErrors) && data.rowErrors.length) {
            await showRowErrors(data.rowErrors);
          }
          return;
        } else {
          closeModal();
          await showError(
            "Generation failed",
            `Report generation failed (HTTP ${resp.status}).`
          );
          return;
        }
      }

      const blob = await resp.blob();

      // Audit (base64 JSON in header)
      const auditHeader = resp.headers.get("X-Report-Audit");
      if (auditHeader) {
        try {
          const json = JSON.parse(atob(auditHeader));
          setAudit(json);

          // optional: show audit toast + button in modal
          toast.fire({
            icon: "info",
            title: "Audit captured",
          });
        } catch {
          // ignore
        }
      }

      // Download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sale-by-site-${from}-to-${to}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      closeModal();
      await showSuccess(
        "Done!",
        `Your report has been generated and downloaded as <b>${escapeHtml(
          `sale-by-site-${from}-to-${to}.pdf`
        )}</b>.`
      );

      // If audit exists, offer to view it
      if (auditHeader) {
        const res = await MySwal.fire({
          icon: "question",
          title: "View audit details?",
          html: "An audit trace was returned by the server. Do you want to open it now?",
          showCancelButton: true,
          confirmButtonText: "Open audit",
          cancelButtonText: "Not now",
        });
        if (res.isConfirmed && audit) {
          await showAuditModal(audit);
        }
      }
    } catch (e) {
      closeModal();
      await showError("Unexpected error", escapeHtml(String(e?.message || e)));
    } finally {
      setLoading(false);
      closeModal();
    }
  }

  // ---------- UI-only styles ----------
  const styles = {
    page: {
      minHeight: "100vh",
      background:
        "radial-gradient(1200px 600px at 15% 10%, #eef5ff 0%, rgba(238,245,255,0) 55%), radial-gradient(900px 500px at 85% 0%, #f7f0ff 0%, rgba(247,240,255,0) 60%), linear-gradient(180deg, #fbfcff 0%, #f6f7fb 100%)",
      padding: 24,
      color: "#0f172a",
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
    },
    shell: {
      maxWidth: 980,
      margin: "0 auto",
    },
    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      marginBottom: 16,
    },
    brand: { display: "flex", alignItems: "center", gap: 12 },
    logo: {
      width: 44,
      height: 44,
      borderRadius: 12,
      background:
        "linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #06b6d4 100%)",
      boxShadow: "0 8px 24px rgba(37, 99, 235, 0.25)",
    },
    titleWrap: { display: "flex", flexDirection: "column" },
    h1: {
      margin: 0,
      fontSize: 18,
      fontWeight: 800,
      letterSpacing: "-0.02em",
    },
    sub: {
      margin: "4px 0 0 0",
      fontSize: 13,
      color: "#475569",
      lineHeight: 1.35,
    },
    badge: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 10px",
      borderRadius: 999,
      border: "1px solid rgba(15, 23, 42, 0.08)",
      background: "rgba(255,255,255,0.7)",
      backdropFilter: "blur(8px)",
      boxShadow: "0 6px 20px rgba(15,23,42,0.06)",
      fontSize: 12,
      color: "#334155",
      whiteSpace: "nowrap",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1.2fr 0.8fr",
      gap: 16,
    },
    card: {
      borderRadius: 16,
      border: "1px solid rgba(15, 23, 42, 0.08)",
      background: "rgba(255,255,255,0.78)",
      backdropFilter: "blur(10px)",
      boxShadow:
        "0 16px 40px rgba(2, 6, 23, 0.08), 0 1px 0 rgba(255,255,255,0.7) inset",
      overflow: "hidden",
    },
    cardHeader: {
      padding: "14px 16px",
      borderBottom: "1px solid rgba(15, 23, 42, 0.06)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.6) 100%)",
    },
    cardTitle: { margin: 0, fontSize: 14, fontWeight: 800, color: "#0f172a" },
    cardBody: { padding: 16 },
    help: { fontSize: 12, color: "#64748b", marginTop: 6, lineHeight: 1.45 },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12,
      marginTop: 12,
    },
    field: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 12, fontWeight: 800, color: "#0f172a" },
    input: {
      height: 40,
      borderRadius: 12,
      border: "1px solid rgba(15, 23, 42, 0.14)",
      padding: "0 12px",
      outline: "none",
      background: "rgba(255,255,255,0.95)",
      boxShadow: "0 1px 0 rgba(2,6,23,0.03) inset",
      fontSize: 14,
    },
    fileWrap: {
      borderRadius: 14,
      border: "1px dashed rgba(15, 23, 42, 0.18)",
      padding: 12,
      background: "rgba(255,255,255,0.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    fileMeta: { display: "flex", flexDirection: "column", gap: 2 },
    fileName: { fontSize: 13, fontWeight: 700, color: "#0f172a" },
    fileHint: { fontSize: 12, color: "#64748b" },
    checkboxRow: {
      marginTop: 12,
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      padding: 12,
      borderRadius: 14,
      border: "1px solid rgba(15, 23, 42, 0.08)",
      background: "rgba(248,250,252,0.75)",
    },
    checkbox: { marginTop: 2, width: 16, height: 16 },
    checkboxText: { display: "flex", flexDirection: "column", gap: 3 },
    checkboxTitle: { fontWeight: 800, fontSize: 13, color: "#0f172a" },
    checkboxDesc: { fontSize: 12, color: "#64748b", lineHeight: 1.45 },
    actions: {
      marginTop: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      flexWrap: "wrap",
    },
    primaryBtn: {
      height: 44,
      padding: "0 14px",
      borderRadius: 12,
      border: "1px solid rgba(15, 23, 42, 0.14)",
      background: loading
        ? "linear-gradient(180deg, rgba(248,250,252,0.9) 0%, rgba(241,245,249,0.9) 100%)"
        : "linear-gradient(135deg, #2563eb 0%, #7c3aed 60%, #06b6d4 120%)",
      color: loading ? "#334155" : "#ffffff",
      cursor: loading || !canSubmit ? "not-allowed" : "pointer",
      fontWeight: 900,
      letterSpacing: "0.01em",
      boxShadow: loading
        ? "none"
        : "0 18px 40px rgba(37, 99, 235, 0.25)",
      opacity: !canSubmit ? 0.6 : 1,
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
    },
    secondaryText: { fontSize: 12, color: "#64748b" },
    footer: {
      marginTop: 14,
      fontSize: 12,
      color: "#64748b",
      textAlign: "center",
    },
  };

  return (
    <div style={styles.page}>
      {/* Keyframes (UI-only) */}
      <style>{`
        @media (max-width: 980px) {
          .rg-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={styles.shell}>
        <div style={styles.topBar}>
          <div style={styles.brand}>
            <div style={styles.logo} />
            <div style={styles.titleWrap}>
              <h1 style={styles.h1}>AI-based Report Generator</h1>
              <p style={styles.sub}>
                Fuelwatch - Report Generator for Fuel Quantity Forecasting
              </p>
            </div>
          </div>

          <div style={styles.badge} title="Environment">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: loading ? "#f59e0b" : "#22c55e",
                boxShadow: loading
                  ? "0 0 0 4px rgba(245,158,11,0.15)"
                  : "0 0 0 4px rgba(34,197,94,0.15)",
              }}
            />
            {loading ? "Generating…" : "Ready"}
          </div>
        </div>

        <div className="rg-grid" style={styles.grid}>
          {/* LEFT: Form */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Generate report</h3>
              <div style={{ fontSize: 12, color: "#64748b" }}>PDF download</div>
            </div>

            <div style={styles.cardBody}>
              {/* File */}
              <div style={styles.field}>
                <div style={styles.label}>CSV File</div>

                <div style={styles.fileWrap}>
                  <div style={styles.fileMeta}>
                    <div style={styles.fileName}>
                      {file ? file.name : "No file selected"}
                    </div>
                    <div style={styles.fileHint}>Accepted: .csv (text/csv)</div>
                  </div>

                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(15, 23, 42, 0.14)",
                      background: "rgba(255,255,255,0.9)",
                      cursor: "pointer",
                      fontWeight: 800,
                      fontSize: 13,
                      color: "#0f172a",
                      boxShadow: "0 10px 24px rgba(2, 6, 23, 0.06)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Choose file
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      style={{ display: "none" }}
                      onChange={async (e) => {
                        const f = e.target.files?.[0] || null;
                        setFile(f);
                        if (f) {
                          toast.fire({
                            icon: "success",
                            title: "File selected",
                            text: f.name,
                          });
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Dates */}
              <div style={styles.formGrid}>
                <div style={styles.field}>
                  <label style={styles.label}>From (YYYY-MM-DD)</label>
                  <input
                    style={styles.input}
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    inputMode="numeric"
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>To (YYYY-MM-DD)</label>
                  <input
                    style={styles.input}
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* AI toggle */}
              <div style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={useAI}
                  onChange={(e) => {
                    const v = e.target.checked;
                    setUseAI(v);
                    toast.fire({
                      icon: "info",
                      title: v ? "AI mapping enabled" : "AI mapping disabled",
                    });
                  }}
                />
                <div style={styles.checkboxText}>
                  <div style={styles.checkboxTitle}>
                    Use AI for column mapping
                  </div>
                  <div style={styles.checkboxDesc}>
                    Recommended if your CSV headers differ. Only mapping uses AI;
                    computation and PDF rendering remain deterministic.
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={styles.actions}>
                <button
                  onClick={handleGenerate}
                  disabled={!canSubmit || loading}
                  style={styles.primaryBtn}
                >
                  {loading ? "Generating…" : "Generate & Download PDF →"}
                </button>

                <div style={styles.secondaryText}>
                  {canSubmit
                    ? "All inputs look good."
                    : "Select a CSV and enter valid dates to enable generation."}
                </div>
              </div>

              <div style={styles.help}>
                Tip: If your server returns structured errors (422/400), they
                will be shown as SweetAlerts for faster triage.
              </div>

              {audit && (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={() => showAuditModal(audit)}
                    style={{
                      height: 40,
                      padding: "0 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(15, 23, 42, 0.14)",
                      background: "rgba(255,255,255,0.9)",
                      cursor: "pointer",
                      fontWeight: 900,
                    }}
                  >
                    View last audit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Status panel replaced with a friendly info card */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Notifications</h3>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                SweetAlerts enabled
              </div>
            </div>
            <div style={styles.cardBody}>
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(15, 23, 42, 0.08)",
                  padding: 12,
                  background:
                    "linear-gradient(180deg, rgba(239, 246, 255, 0.9) 0%, rgba(255,255,255,0.7) 100%)",
                  boxShadow: "0 10px 24px rgba(2, 6, 23, 0.06)",
                }}
              >
                <div style={{ fontWeight: 900, marginBottom: 6, fontSize: 13 }}>
                  How it works now
                </div>
                <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.45 }}>
                  All errors, validations, row-normalization issues, progress,
                  and audit output are shown via SweetAlert modals/toasts. Use
                  the “View last audit” button after a run if you want to re-open
                  it.
                </div>
              </div>

              <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
                • File select → toast<br />
                • Generate progress → loading modal<br />
                • Success/Failure → modal<br />
                • Validation + Row errors → modal lists<br />
                • Audit → modal (optional)
              </div>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          © {new Date().getFullYear()} • Reports Service • Enterprise UI shell
        </div>
      </div>
    </div>
  );
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}