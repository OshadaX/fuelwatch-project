// FuelForecastPanel.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  Download,
  FileText,
  Gauge,
  Info,
  LayoutDashboard,
  LineChart as LineChartIcon,
  Loader2,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  UploadCloud,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { forecastFuel, healthCheck } from "../../services/mlService";
import { downloadCsv } from "../../utils/downloadCsv";

// API Base URL for backend
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8081/api";

const MODE_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

const BRAND = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  primarySoft: "#dbeafe",
  success: "#10b981",
  warn: "#f59e0b",
  danger: "#ef4444",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
  ink: "#0f172a",
  muted: "#475569",
  border: "#dbe2ea",
  surface: "#ffffff",
  surfaceAlt: "#f8fafc",
};

const FUEL_COLORS = [BRAND.primary, BRAND.success, BRAND.warn, BRAND.danger, BRAND.violet, BRAND.cyan];
const MAX_FILE_MB = 25;

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.000";
  return n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function shortDate(v) {
  if (!v) return "-";
  try {
    return String(v).split("T")[0];
  } catch {
    return "-";
  }
}

function niceBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let b = bytes;
  let i = 0;
  while (b >= 1024 && i < units.length - 1) {
    b /= 1024;
    i++;
  }
  return `${b.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function showAlert({ icon = "success", title = "", text = "", timer = 1800, confirm = false }) {
  const isConfirm = confirm || icon === "error" || icon === "warning";
  return Swal.fire({
    icon,
    title,
    text,
    timer: isConfirm ? undefined : timer,
    showConfirmButton: isConfirm,
    confirmButtonText: "OK",
    confirmButtonColor: BRAND.primary,
    timerProgressBar: !isConfirm,
    background: "#ffffff",
    color: "#0f172a",
    backdrop: "rgba(15, 23, 42, 0.35)",
    customClass: {
      popup: "rounded-[24px]",
      title: "font-black",
      confirmButton: "rounded-xl px-5 py-2 font-black",
    },
  });
}

function showLoading({ title = "Processing...", text = "Please wait while generating the forecast" }) {
  return Swal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
    background: "#ffffff",
    color: "#0f172a",
    confirmButtonColor: BRAND.primary,
    backdrop: "rgba(15, 23, 42, 0.35)",
    customClass: {
      popup: "rounded-[24px]",
      title: "font-black",
    },
  });
}

function SurfaceCard({ children, className }) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-[28px] border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_-18px_rgba(15,23,42,0.16)]",
        className
      )}
      style={{ borderColor: BRAND.border }}
    >
      {children}
    </div>
  );
}

function SectionCard({ children, className }) {
  return (
    <div
      className={cx(
        "rounded-3xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03),0_10px_28px_-18px_rgba(15,23,42,0.12)]",
        className
      )}
      style={{ borderColor: BRAND.border }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px w-full bg-slate-200/80" />;
}

function PrimaryButton({ icon: Icon, children, onClick, disabled, variant = "primary", title }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary:
      "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-400 focus:ring-offset-white shadow-[0_10px_20px_-12px_rgba(15,23,42,0.5)]",
    subtle:
      "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300 focus:ring-offset-white",
    blue:
      "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400 focus:ring-offset-white shadow-[0_10px_24px_-14px_rgba(37,99,235,0.55)]",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-400 focus:ring-offset-white",
  };

  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={cx(base, variants[variant])}>
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function KpiCard({ icon: Icon, label, value, sub, tone = "default" }) {
  const tones = {
    default: {
      ring: "bg-slate-900",
      border: "border-slate-200",
    },
    success: {
      ring: "bg-emerald-600",
      border: "border-emerald-200",
    },
    danger: {
      ring: "bg-rose-600",
      border: "border-rose-200",
    },
    info: {
      ring: "bg-blue-600",
      border: "border-blue-200",
    },
    warn: {
      ring: "bg-amber-500",
      border: "border-amber-200",
    },
  };

  const toneStyle = tones[tone] || tones.default;

  return (
    <div className={cx("rounded-3xl border p-4", toneStyle.border)} style={{ background: "#fff" }}>
      <div className="flex items-start gap-4">
        <div className={cx("grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm", toneStyle.ring)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</div>
          <div className="mt-1 truncate text-xl font-black tracking-tight text-slate-900">{value}</div>
          {sub ? <div className="mt-1 truncate text-xs font-medium text-slate-500">{sub}</div> : null}
        </div>
      </div>
    </div>
  );
}

function ModeSegmented({ value, onChange, options, disabled }) {
  return (
    <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-2 shadow-inner">
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(o.value)}
              title={o.hint}
              className={cx(
                "group relative inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-offset-2",
                active
                  ? "bg-blue-600 text-white shadow-[0_10px_24px_-14px_rgba(37,99,235,0.6)] focus:ring-blue-400 focus:ring-offset-white"
                  : "bg-transparent text-slate-600 hover:bg-white hover:text-slate-900 focus:ring-slate-300 focus:ring-offset-white",
                "disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              <span>{o.label}</span>
              <span
                className={cx(
                  "rounded-full px-2 py-0.5 text-[10px] font-black",
                  active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                )}
              >
                {o.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={cx("animate-pulse rounded-2xl bg-slate-200/70", className)} />;
}

const styles = {
  sectionTitle: {
    fontSize: "1.25rem",
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: "1rem",
  },
};

function DataTable({ rows = [], emptyText = "No data available." }) {
  if (!rows.length) {
    return (
      <div className="grid h-40 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
        {emptyText}
      </div>
    );
  }

  const columns = Object.keys(rows[0]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-zinc-950">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-600 dark:bg-white/5 dark:text-zinc-300">
            {columns.map((c) => (
              <th key={c} className="px-4 py-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className={cx(
                "border-t border-slate-200 dark:border-white/10",
                idx % 2 === 0 ? "bg-white dark:bg-zinc-950" : "bg-slate-50/60 dark:bg-white/5"
              )}
            >
              {columns.map((c) => (
                <td key={c} className="px-4 py-3 tabular-nums">
                  {typeof row[c] === "number" ? row[c].toLocaleString() : String(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dropdown({ label, icon: Icon, items = [], disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cx(
          "inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-extrabold transition",
          "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 focus:ring-offset-white"
        )}
      >
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {label}
        <ChevronDown className={cx("h-4 w-4 transition", open ? "rotate-180" : "")} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.25)]"
          >
            {items.map((it, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setOpen(false);
                  it.onClick?.();
                }}
                disabled={it.disabled}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {it.icon ? <it.icon className="h-4 w-4" /> : null}
                <span className="flex-1">{it.label}</span>
                {it.hint ? <span className="text-xs text-slate-400">{it.hint}</span> : null}
              </button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ChartCard({ title, subtitle, actions, children, icon: Icon }) {
  return (
    <SectionCard className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-slate-50">
            {Icon ? <Icon className="h-5 w-5 text-slate-700" /> : <Sparkles className="h-5 w-5 text-slate-700" />}
          </div>
          <div>
            <div className="text-lg font-black tracking-tight text-slate-900">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="p-6">{children}</div>
    </SectionCard>
  );
}

function FuelLegendChips({ fuelKeys, selected, onToggle, onAll, onNone }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onAll}
        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
      >
        All
      </button>
      <button
        type="button"
        onClick={onNone}
        className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
      >
        None
      </button>

      {fuelKeys.map((fuel, idx) => {
        const active = selected.has(fuel);
        const dot = FUEL_COLORS[idx % FUEL_COLORS.length];
        return (
          <button
            key={fuel}
            type="button"
            onClick={() => onToggle(fuel)}
            className={cx(
              "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black transition",
              active ? "border-blue-200 bg-blue-600 text-white hover:bg-blue-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
            title={active ? "Hide series" : "Show series"}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: dot }} />
            {fuel}
          </button>
        );
      })}
    </div>
  );
}

function Banner({ tone = "neutral", icon: Icon, title, text }) {
  const styles = {
    neutral: "border-slate-200 bg-white text-slate-600",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    danger: "border-rose-200 bg-rose-50 text-rose-800",
  };

  return (
    <div className={cx("rounded-3xl border px-5 py-4", styles[tone] || styles.neutral)}>
      <div className="flex items-start gap-3">
        {Icon ? <Icon className="mt-0.5 h-5 w-5 shrink-0" /> : null}
        <div>
          {title ? <div className="font-black">{title}</div> : null}
          <div className={cx("text-sm", title ? "mt-1" : "")}>{text}</div>
        </div>
      </div>
    </div>
  );
}

export default function FuelForecastPanel() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("weekly");
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [savingForecast, setSavingForecast] = useState(false);

  const [activeTab, setActiveTab] = useState("charts");
  const [fuelSearch, setFuelSearch] = useState("");
  const [selectedFuels, setSelectedFuels] = useState(() => new Set());
  const [reduceMotion] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false
  );

  const forecastObj = useMemo(() => result?.forecast || result || null, [result]);
  const totals = useMemo(() => forecastObj?.totals || null, [forecastObj]);
  const daily = useMemo(() => forecastObj?.daily || [], [forecastObj]);
  const monthly = useMemo(() => forecastObj?.monthly || [], [forecastObj]);
  const isAnnual = mode === "annual";

  const fuelKeys = useMemo(() => (totals ? Object.keys(totals) : []), [totals]);

  const filteredFuelKeys = useMemo(() => {
    if (!fuelSearch) return fuelKeys;
    const q = fuelSearch.toLowerCase();
    return fuelKeys.filter((k) => k.toLowerCase().includes(q));
  }, [fuelKeys, fuelSearch]);

  const grandTotal = useMemo(() => {
    if (!totals) return 0;
    return Object.values(totals).reduce((a, b) => a + (Number(b) || 0), 0);
  }, [totals]);

  const topFuel = useMemo(() => {
    if (!totals || fuelKeys.length === 0) return null;
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    return { fuel: sorted[0][0], value: sorted[0][1] };
  }, [totals, fuelKeys]);

  const totalsChartData = useMemo(() => {
    if (!totals) return [];
    return Object.entries(totals)
      .map(([fuel, value]) => ({ fuel, value }))
      .sort((a, b) => b.value - a.value);
  }, [totals]);

  const dailyChartData = useMemo(() => {
    if (!daily?.length) return [];
    return daily.map((row) => ({
      ...row,
      DateLabel: shortDate(row.Date || row.date),
    }));
  }, [daily]);

  const monthlyChartData = useMemo(() => {
    if (!monthly?.length) return [];
    return monthly;
  }, [monthly]);

  const headerFrom = useMemo(() => result?.from_date || result?.from || forecastObj?.from || null, [result, forecastObj]);
  const headerTo = useMemo(() => result?.to_date || result?.to || forecastObj?.to || null, [result, forecastObj]);
  const ingested = useMemo(() => result?.metadata?.filename || result?.filename || "Report PDF", [result]);

  const fileError =
    !file
      ? "Please upload a PDF report to generate a forecast."
      : file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")
        ? "Only PDF files are allowed."
        : file.size > 25 * 1024 * 1024
          ? "PDF is too large (max 25MB)."
          : "";

  async function saveForecastToDb(payload) {
    const response = await axios.post(`${API_BASE_URL}/api/forecast/save`, payload);
    return response.data;
  }

  async function onCheckHealth() {
    try {
      setError("");
      const data = await healthCheck();
      setHealth(data);

      showAlert({
        icon: "success",
        title: "Service Status - Online",
        text: "Service is reachable",
      });
    } catch (e) {
      setHealth(null);
      const msg = e?.response?.data?.detail || e.message || "Health check - Failed";
      setError(msg);

      showAlert({
        icon: "error",
        title: "Service Error",
        text: msg,
        confirm: true,
      });
    }
  }

  async function onGenerate() {
    if (fileError) {
      setError(fileError);
      showAlert({
        icon: "warning",
        title: "Missing PDF",
        text: fileError,
        confirm: true,
      });
      return;
    }

    try {
      setError("");
      setResult(null);
      setLoading(true);

      showLoading({
        title: "Generating Forecast",
        text: "Please Wait. Forecast generation in progress !",
      });

      const data = await forecastFuel({ mode, file });

      Swal.close();

      if (!data?.ok) {
        setError(data?.message || "Forecast failed");
        setResult(data);

        showAlert({
          icon: "error",
          title: "Forecast Failed",
          text: data?.message || "Forecast failed",
          confirm: true,
        });
      } else {
        setResult(data);
        showAlert({
          icon: "success",
          title: "Forecast Generated",
          text: "Fuel quantity prediction completed successfully",
        });
      }
    } catch (e) {
      Swal.close();
      const msg = e?.response?.data?.detail || e.message || "Forecast request failed";
      setError(msg);

      showAlert({
        icon: "error",
        title: "Request Failed",
        text: msg,
        confirm: true,
      });
    } finally {
      setLoading(false);
    }
  }

  async function onSaveForecast() {
    if (!forecastObj || !totals) {
      showAlert({
        icon: "warning",
        title: "No Forecast",
        text: "Generate a forecast before saving.",
        confirm: true,
      });
      return;
    }

    try {
      setSavingForecast(true);

      showLoading({
        title: "Saving Forecast",
        text: "Please wait",
      });

      const payload = {
        mode,
        from: forecastObj?.from || result?.from_date || result?.from || null,
        to: forecastObj?.to || result?.to_date || result?.to || null,
        totals: forecastObj?.totals || {},
        daily: forecastObj?.daily || [],
        monthly: forecastObj?.monthly || [],
        ingest: result?.ingest || null,
        sourceFileName: file?.name || null,
        savedAt: new Date().toISOString(),
      };

      await saveForecastToDb(payload);

      Swal.close();
      showAlert({
        icon: "success",
        title: "Saved",
        text: "Forecast saved successfully.",
      });
    } catch (e) {
      Swal.close();
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e.message ||
        "Failed to save forecast";

      showAlert({
        icon: "error",
        title: "Save Failed",
        text: msg,
        confirm: true,
      });
    } finally {
      setSavingForecast(false);
    }
  }

  function onClearFile() {
    setFile(null);
    setResult(null);
    setHealth(null);
    setError("");
    setFuelSearch("");
    setSelectedFuels(new Set());
    showAlert({
      icon: "success",
      title: "Cleared",
      text: "PDF and results cleared successfully",
    });
  }

  function onDownloadDaily() {
    if (!daily?.length) return;
    downloadCsv(`fuel_forecast_${mode}_daily.csv`, daily);
    showAlert({ icon: "success", title: "Downloaded", text: "Daily CSV downloaded" });
  }

  function onDownloadMonthly() {
    if (!monthly?.length) return;
    downloadCsv(`fuel_forecast_${mode}_monthly.csv`, monthly);
    showAlert({ icon: "success", title: "Downloaded", text: "Monthly CSV downloaded" });
  }

  function onDownloadTotals() {
    if (!totals) return;
    const rows = Object.entries(totals).map(([fuel, qty]) => ({
      fuel,
      predicted_total: qty,
      mode,
      from: forecastObj?.from || result?.from_date || result?.from,
      to: forecastObj?.to || result?.to_date || result?.to,
    }));
    downloadCsv(`fuel_forecast_${mode}_totals.csv`, rows);
    showAlert({ icon: "success", title: "Downloaded", text: "Totals CSV downloaded" });
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0] || null;

    setResult(null);
    setHealth(null);
    setError("");

    if (!f) return;

    const isPdfByMime = f.type === "application/pdf";
    const isPdfByExt = f.name.toLowerCase().endsWith(".pdf");

    if (!isPdfByMime && !isPdfByExt) {
      setFile(null);
      const msg = "Only PDF files are allowed. Please upload a .pdf file.";
      setError(msg);
      showAlert({ icon: "error", title: "Invalid File", text: msg, confirm: true });
      return;
    }

    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setFile(null);
      const msg = `PDF is too large (max ${MAX_FILE_MB}MB).`;
      setError(msg);
      showAlert({ icon: "error", title: "File Too Large", text: msg, confirm: true });
      return;
    }

    setFile(f);
    showAlert({ icon: "success", title: "PDF Selected", text: "File selected successfully" });
  }

  function toggleFuel(fuel) {
    setSelectedFuels((prev) => {
      const next = new Set(prev);
      if (next.has(fuel)) next.delete(fuel);
      else next.add(fuel);
      return next;
    });
  }

  function selectAllFuels() {
    setSelectedFuels(new Set(fuelKeys));
  }

  function selectNoFuels() {
    setSelectedFuels(new Set());
  }

  const gridDash = "3 5";
  const lineWidth = 3;

  return (
    <div className="min-h-screen bg-[#f4f7fb] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute left-1/2 top-0 h-[320px] w-[900px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(37,99,235,0.10), transparent 58%), radial-gradient(circle at 25% 30%, rgba(14,165,233,0.06), transparent 40%), radial-gradient(circle at 75% 30%, rgba(16,185,129,0.05), transparent 38%)",
          }}
        />
        {!reduceMotion ? (
          <>
            <motion.div
              aria-hidden
              className="absolute -left-24 top-32 h-[360px] w-[360px] rounded-full blur-3xl"
              style={{ background: "rgba(37,99,235,0.06)" }}
              animate={{ y: [0, 10, 0], x: [0, 10, 0] }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="absolute -right-24 bottom-12 h-[360px] w-[360px] rounded-full blur-3xl"
              style={{ background: "rgba(16,185,129,0.05)" }}
              animate={{ y: [0, -12, 0], x: [0, -10, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        ) : null}
      </div>

      <div className="relative mx-auto max-w-7xl">
        <SurfaceCard className="mb-6 px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-white shadow-[0_10px_24px_-14px_rgba(15,23,42,0.55)]">
                <LayoutDashboard className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-black tracking-tight text-slate-900">Fuelwatch</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
                    Upcoming Fuel Quantity Predictions
                  </span>
                  {result?.ok ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                      <BadgeCheck className="h-3.5 w-3.5" />
                      Ready
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PrimaryButton variant="subtle" icon={RefreshCw} onClick={onCheckHealth} disabled={loading || savingForecast} title="Check service">
                Check Service
              </PrimaryButton>

              <Dropdown
                label="Export"
                icon={Download}
                disabled={!forecastObj || !totals || loading || savingForecast}
                items={[
                  { label: "Totals CSV", icon: Download, onClick: onDownloadTotals },
                  {
                    label: isAnnual ? "Monthly CSV" : "Daily CSV",
                    icon: Download,
                    onClick: isAnnual ? onDownloadMonthly : onDownloadDaily,
                    disabled: isAnnual ? !monthly?.length : !daily?.length,
                    hint: isAnnual ? "Annual" : "W/M",
                  },
                ]}
              />
              
              <PrimaryButton
                variant="blue"
                icon={TrendingUp}
                onClick={onGenerate}
                disabled={loading || savingForecast || !!fileError}
                title={fileError ? fileError : "Generate forecast"}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : (
                  "Generate Forecast"
                )}
              </PrimaryButton>
            </div>
          </div>
        </SurfaceCard>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={Gauge}
            label="Forecast Mode"
            value={(forecastObj?.mode || mode || "").toUpperCase()}
            sub={MODE_OPTIONS.find((m) => m.value === mode)?.hint}
            tone="info"
          />
          <KpiCard
            icon={FileText}
            label="Document Status"
            value={file ? "Ready" : "Missing"}
            sub={file ? `${file.name} • ${niceBytes(file.size)}` : "Upload a PDF file"}
            tone={file ? "success" : "danger"}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Service Health"
            value={health?.status || "Not checked"}
            sub={health ? `Model loaded: ${String(health.model_loaded)}` : "Use Check Service to verify"}
            tone={health ? "success" : "default"}
          />
          <KpiCard
            icon={TrendingUp}
            label="Grand Total (L)"
            value={totals ? formatNumber(grandTotal) : "—"}
            sub={
              totals
                ? topFuel
                  ? `Top: ${topFuel.fuel} (${formatNumber(topFuel.value)} L)`
                  : `Fuel types: ${fuelKeys.length}`
                : "General forecast"
            }
            tone={totals ? "default" : "warn"}
          />
        </div>

        <SectionCard className="overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="border-b border-slate-200 p-6 lg:border-b-0 lg:border-r">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-black tracking-tight text-slate-900">Forecast Mode</div>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600">
                  <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
                  Choose forecasting mode
                </div>
              </div>

              <ModeSegmented
                value={mode}
                onChange={(v) => {
                  setMode(v);
                  setResult(null);
                  setError("");
                  setActiveTab("charts");
                }}
                options={MODE_OPTIONS}
                disabled={loading || savingForecast}
              />

              <div className="mt-10">
                <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-5">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-white">
                          <RefreshCw className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-900">Service Verification</div>
                          <div className="mt-4">
                            <PrimaryButton variant="subtle" icon={RefreshCw} onClick={onCheckHealth} disabled={loading || savingForecast}>
                              Check Service
                            </PrimaryButton>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-5">
                      <div className="flex items-start gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white">
                          <TrendingUp className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-900">Forecast Execution</div>
                          <div className="mt-4">
                            <PrimaryButton
                              variant="blue"
                              icon={TrendingUp}
                              onClick={onGenerate}
                              disabled={loading || savingForecast || !!fileError}
                              title={fileError ? fileError : "Generate forecast"}
                            >
                              {loading ? "Processing…" : "Generate Forecast"}
                            </PrimaryButton>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="text-sm font-black text-slate-900">Workflow Guidance</div>
                    <div className="mt-2 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        <span className="font-black text-slate-900">1.</span> Upload PDF report.
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        <span className="font-black text-slate-900">2.</span> Verify service status.
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        <span className="font-black text-slate-900">3.</span> Review analytics.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-black tracking-tight text-slate-900">PDF Report</div>
                </div>

                {file ? (
                  <PrimaryButton variant="subtle" icon={Trash2} onClick={onClearFile} title="Remove selected file" disabled={loading || savingForecast}>
                    Clear
                  </PrimaryButton>
                ) : null}
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={handleDrop}
                className={cx(
                  "group relative min-h-[300px] cursor-pointer overflow-hidden rounded-[30px] border-2 border-dashed p-6 transition",
                  fileError ? "border-rose-300 bg-rose-50/60" : "border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40"
                )}
                onClick={() => {
                  if (!loading && !savingForecast) {
                    document.getElementById("fuel-forecast-file")?.click();
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="pointer-events-none absolute inset-0 opacity-100">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.06),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.04),transparent_32%)]" />
                </div>

                <input
                  id="fuel-forecast-file"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  disabled={loading || savingForecast}
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;

                    setResult(null);
                    setHealth(null);
                    setError("");
                    setFuelSearch("");
                    setSelectedFuels(new Set());

                    if (!f) {
                      setFile(null);
                      return;
                    }

                    const isPdfByMime = f.type === "application/pdf";
                    const isPdfByExt = f.name.toLowerCase().endsWith(".pdf");

                    if (!isPdfByMime && !isPdfByExt) {
                      setFile(null);
                      e.target.value = "";
                      const msg = "Only PDF files are allowed. Please upload a .pdf report.";
                      setError(msg);
                      showAlert({ icon: "error", title: "Invalid File", text: msg, confirm: true });
                      return;
                    }

                    if (f.size > MAX_FILE_MB * 1024 * 1024) {
                      setFile(null);
                      e.target.value = "";
                      const msg = `PDF is too large (max ${MAX_FILE_MB}MB).`;
                      setError(msg);
                      showAlert({ icon: "error", title: "File Too Large", text: msg, confirm: true });
                      return;
                    }

                    setFile(f);
                    showAlert({ icon: "success", title: "PDF Selected", text: "File selected successfully" });
                  }}
                />

                <div className="relative flex h-full flex-col items-center justify-center text-center">
                  <div className="grid h-20 w-20 place-items-center rounded-[24px] bg-blue-600 text-white shadow-[0_16px_40px_-18px_rgba(37,99,235,0.65)]">
                    {file ? <FileText className="h-9 w-9" /> : <UploadCloud className="h-9 w-9" />}
                  </div>

                  <div className="mt-6 text-2xl font-black tracking-tight text-slate-900">
                    {file ? "PDF selected successfully" : "Drag & drop a PDF report"}
                  </div>

                  <div className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                    {file ? (
                      <>
                        <span className="font-black text-slate-900">{file.name}</span>
                        <span className="mx-2 text-slate-300">•</span>
                        {niceBytes(file.size)}
                      </>
                    ) : (
                      <>click to browse from your device. Maximum file size is {MAX_FILE_MB}MB.</>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-wide text-slate-600 shadow-sm">
                      <CloudUpload className="h-3.5 w-3.5 text-blue-600" />
                      Secure Upload
                    </span>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {fileError ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} className="mt-4">
                    <Banner tone="danger" icon={AlertCircle} text={fileError} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <Divider />

          <div className="grid gap-4 p-6 md:grid-cols-2">
            <AnimatePresence>
              {health ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                  <Banner
                    tone="success"
                    icon={CheckCircle2}
                    title="Service OK"
                    text={
                      <>
                        Status: <span className="font-black">{health.status || "ok"}</span> • Process loaded:{" "}
                        <span className="font-black">{String(health.model_loaded)}</span>
                      </>
                    }
                  />
                </motion.div>
              ) : (
                <Banner tone="neutral" icon={Info} text={<><span className="font-black">Tip:</span> Click <span className="font-black">Check Service</span> regularly.</>} />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                  <Banner tone="danger" icon={AlertCircle} title="Request failed" text={error} />
                </motion.div>
              ) : (
                <Banner
                  tone="neutral"
                  icon={Sparkles}
                  text={
                    <>
                      Upload a PDF and click <span className="font-black">Generate Forecast</span> to review details.
                    </>
                  }
                />
              )}
            </AnimatePresence>
          </div>
        </SectionCard>

        <AnimatePresence>
          {forecastObj && totals ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="mt-6 space-y-6">
              <SectionCard>
                <div className="p-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 text-white">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-lg font-black tracking-tight text-slate-900">Forecast Summary</div>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Mode</div>
                          <div className="mt-2 text-base font-black text-slate-900">{forecastObj?.mode || mode}</div>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">From</div>
                          <div className="mt-2 text-base font-black text-slate-900">{shortDate(headerFrom)}</div>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">To</div>
                          <div className="mt-2 text-base font-black text-slate-900">{shortDate(headerTo)}</div>
                        </div>
                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">PDF Ingested</div>
                          <div className="mt-2 text-base font-black text-slate-900">{ingested}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveTab("charts")}
                          className={cx(
                            "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition",
                            activeTab === "charts" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          <BarChart3 className="h-4 w-4" />
                          Charts
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("tables")}
                          className={cx(
                            "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-black transition",
                            activeTab === "tables" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          <FileText className="h-4 w-4" />
                          Tables
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Dropdown
                          label="Export"
                          icon={Download}
                          disabled={savingForecast}
                          items={[
                            { label: "Totals CSV", icon: Download, onClick: onDownloadTotals },
                            {
                              label: isAnnual ? "Monthly CSV" : "Daily CSV",
                              icon: Download,
                              onClick: isAnnual ? onDownloadMonthly : onDownloadDaily,
                              disabled: isAnnual ? !monthly?.length : !daily?.length,
                              hint: isAnnual ? "Annual" : "W/M",
                            },
                          ]}
                        />
                        <PrimaryButton
                          variant="subtle"
                          icon={RefreshCw}
                          onClick={() => {
                            setFuelSearch("");
                            setSelectedFuels(new Set(fuelKeys));
                            showAlert({ icon: "success", title: "Filters Reset", text: "All filters restored" });
                          }}
                        >
                          Reset Filters
                        </PrimaryButton>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 xl:grid-cols-[320px_1fr]">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <Search className="h-4 w-4 text-slate-500" />
                      <input
                        value={fuelSearch}
                        onChange={(e) => setFuelSearch(e.target.value)}
                        placeholder="Search fuel type..."
                        className="w-full bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
                      />
                      {fuelSearch ? (
                        <button type="button" onClick={() => setFuelSearch("")} className="rounded-lg p-1 transition hover:bg-slate-50" title="Clear search">
                          <X className="h-4 w-4 text-slate-500" />
                        </button>
                      ) : null}
                    </div>

                    <FuelLegendChips fuelKeys={filteredFuelKeys} selected={selectedFuels} onToggle={toggleFuel} onAll={selectAllFuels} onNone={selectNoFuels} />
                  </div>
                </div>
              </SectionCard>

              {activeTab === "charts" ? (
                <>
                  <ChartCard
                    icon={BarChart3}
                    title="Totals by Fuel Type"
                    subtitle="Predicted quantities per fuel type, sorted by total volume."
                    actions={
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          Grand total: {formatNumber(grandTotal)} L
                        </span>
                        {topFuel ? (
                          <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            Top: {topFuel.fuel}
                          </span>
                        ) : null}
                      </div>
                    }
                  >
                    <div className="h-[380px] rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={totalsChartData}>
                          <CartesianGrid strokeDasharray={gridDash} stroke="#dbe2ea" />
                          <XAxis dataKey="fuel" tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" name="Predicted Total (L)" fill={BRAND.primary} radius={[10, 10, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  {!isAnnual ? (
                    <ChartCard
                      icon={LineChartIcon}
                      title="Daily Forecast Trend"
                      subtitle="Fuel-wise daily prediction trend. Toggle series using the fuel chips."
                      actions={
                        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                          <Info className="h-4 w-4 text-blue-600" />
                          Showing: {selectedFuels.size}/{fuelKeys.length}
                        </span>
                      }
                    >
                      <div className="h-[400px] rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                        {dailyChartData.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyChartData}>
                              <CartesianGrid strokeDasharray={gridDash} stroke="#dbe2ea" />
                              <XAxis dataKey="DateLabel" tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <Tooltip />
                              <Legend />
                              {fuelKeys.map((fuel, idx) => {
                                if (!selectedFuels.has(fuel)) return null;
                                return (
                                  <Line
                                    key={fuel}
                                    type="monotone"
                                    dataKey={fuel}
                                    name={fuel}
                                    stroke={FUEL_COLORS[idx % FUEL_COLORS.length]}
                                    strokeWidth={lineWidth}
                                    dot={false}
                                  />
                                );
                              })}
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="grid h-full place-items-center text-sm text-slate-600">No daily forecast data available for this run.</div>
                        )}
                      </div>
                    </ChartCard>
                  ) : null}

                  {isAnnual ? (
                    <ChartCard
                      icon={BarChart3}
                      title="Month-wise Forecast (Jan–Dec)"
                      subtitle="Annual planning view with monthly fuel predictions."
                      actions={
                        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                          <Info className="h-4 w-4 text-blue-600" />
                          Toggle fuels in chips
                        </span>
                      }
                    >
                      <div className="h-[420px] rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                        {monthlyChartData.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyChartData}>
                              <CartesianGrid strokeDasharray={gridDash} stroke="#dbe2ea" />
                              <XAxis dataKey="Month" tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: "#475569", fontSize: 12 }} axisLine={false} tickLine={false} />
                              <Tooltip />
                              <Legend />
                              {fuelKeys.map((fuel, idx) => {
                                if (!selectedFuels.has(fuel)) return null;
                                return (
                                  <Bar
                                    key={fuel}
                                    dataKey={fuel}
                                    name={fuel}
                                    fill={FUEL_COLORS[idx % FUEL_COLORS.length]}
                                    radius={[10, 10, 0, 0]}
                                  />
                                );
                              })}
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="grid h-full place-items-center text-sm text-slate-600">No monthly forecast data available for this run.</div>
                        )}
                      </div>
                    </ChartCard>
                  ) : null}
                </>
              ) : null}

              {activeTab === "tables" ? (
                <div className="grid gap-6 xl:grid-cols-2">
                  <SectionCard className="overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                      <div>
                        <div className="text-lg font-black tracking-tight text-slate-900">Totals Table</div>
                        <div className="mt-1 text-sm text-slate-500">Sorted by predicted total volume.</div>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-600">
                        Totals
                      </span>
                    </div>

                    <div className="overflow-x-auto p-6">
                      <div className="overflow-hidden rounded-[24px] border border-slate-200">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                              <th className="px-4 py-3.5">Fuel Type</th>
                              <th className="px-4 py-3.5">Predicted Total (L)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {totalsChartData.map((row, idx) => (
                              <tr key={row.fuel} className={cx("border-t border-slate-200", idx % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                                <td className="px-4 py-3.5 font-black text-slate-900">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: FUEL_COLORS[idx % FUEL_COLORS.length] }} />
                                    {row.fuel}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 tabular-nums text-slate-700">{formatNumber(row.value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-3 text-xs text-slate-500">
                        Tip: Use <span className="font-black text-slate-700">Export | Totals CSV</span> for reporting.
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard className="overflow-hidden">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                      <div>
                        <div className="text-lg font-black tracking-tight text-slate-900">
                          {isAnnual ? "Month-wise Table (Annual)" : "Daily Breakdown"}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {isAnnual ? "Monthly breakdown for annual planning." : "Daily level forecast output."}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto p-6">
                      {!isAnnual ? (
                        <div className="overflow-hidden rounded-[24px] border border-slate-200">
                          {daily?.length ? (
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                  {Object.keys(daily[0]).map((k) => (
                                    <th key={k} className="px-4 py-3.5">
                                      {k}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {daily.map((row, idx) => (
                                  <tr key={idx} className={cx("border-t border-slate-200", idx % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                                    {Object.keys(daily[0]).map((k) => (
                                      <td key={k} className="px-4 py-3.5 tabular-nums text-slate-700">
                                        {k === "Date" ? shortDate(row[k]) : typeof row[k] === "number" ? formatNumber(row[k]) : String(row[k])}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="grid h-[260px] place-items-center text-sm text-slate-600">No daily breakdown for this mode/run.</div>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-hidden rounded-[24px] border border-slate-200">
                          {monthly?.length ? (
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                                  {Object.keys(monthly[0]).map((k) => (
                                    <th key={k} className="px-4 py-3.5">
                                      {k}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {monthly.map((row, idx) => (
                                  <tr key={idx} className={cx("border-t border-slate-200", idx % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                                    {Object.keys(monthly[0]).map((k) => (
                                      <td key={k} className="px-4 py-3.5 tabular-nums text-slate-700">
                                        {typeof row[k] === "number" ? formatNumber(row[k]) : String(row[k])}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="grid h-[260px] place-items-center text-sm text-slate-600">No month-wise breakdown for this annual run.</div>
                          )}
                        </div>
                      )}
                    </div>
                  </SectionCard>
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {loading ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} className="mt-6">
              <SectionCard>
                <div className="p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <div className="text-sm font-black text-slate-900">Generating forecast…</div>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-600 sm:ml-auto">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                      Forecast generation in progress
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                    <Skeleton className="h-24" />
                  </div>

                  <div className="mt-5">
                    <Skeleton className="h-80" />
                  </div>
                </div>
              </SectionCard>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="mt-8 text-center text-xs font-medium text-slate-400">
          Upcoming Fuel Quantity Predictions • Fuelwatch
        </div>
      </div>
    </div>
  );
}