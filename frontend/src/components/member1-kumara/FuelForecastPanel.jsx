import React, { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BadgeCheck,
  Moon,
  Sun,
  RefreshCw,
  Download,
  TrendingUp,
  Loader2,
  Activity,
  Gauge,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  CalendarDays,
  Settings2,
  Filter,
  Trash2,
  CloudUpload,
  Info,
  Search,
  X,
  ChevronDown,
  BarChart3,
  LineChart as LineChartIcon,
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
import axios from "axios";

// API Base URL for backend
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8081/api";

const MODE_OPTIONS = [
  { value: "weekly", label: "Weekly", hint: "Weekly Planning", badge: "7d" },
  { value: "monthly", label: "Monthly", hint: "Monthly Planning", badge: "30d" },
  { value: "annual", label: "Annual", hint: "Annually Planning", badge: "365d" },
];

const BRAND = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  success: "#10b981",
  warn: "#f59e0b",
  danger: "#ef4444",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
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
      popup: "rounded-2xl",
      title: "font-black",
      confirmButton: "rounded-xl px-5 py-2 font-black",
    },
  });
}

function showLoading({ title = "Processing...", text = "Please wait while we generate the forecast" }) {
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
      popup: "rounded-2xl",
      title: "font-black",
    },
  });
}

function GlassCard({ children, className }) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl border bg-white shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)]",
        "border-slate-200/80",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50/70 via-transparent to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}

function SoftDivider() {
  return <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />;
}

function NeonButton({ icon: Icon, children, onClick, disabled, variant = "primary", title }) {
  const base =
    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 focus:ring-offset-white",
    ghost: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus:ring-slate-300 focus:ring-offset-white",
    subtle: "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 focus:ring-slate-300 focus:ring-offset-white",
    danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 focus:ring-offset-white",
  };

  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={cx(base, variants[variant] || variants.primary)}>
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function StatPill({ icon: Icon, label, value, sub, tone = "default" }) {
  const toneMap = {
    default: "bg-slate-900 text-white",
    success: "bg-emerald-600 text-white",
    danger: "bg-rose-600 text-white",
    info: "bg-blue-600 text-white",
    warn: "bg-amber-500 text-white",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_10px_24px_-20px_rgba(0,0,0,0.35)]">
      <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-blue-600/8 blur-2xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-emerald-500/6 blur-2xl" />
      <div className="relative flex items-center gap-3">
        <div className={cx("grid h-10 w-10 place-items-center rounded-xl", toneMap[tone] || toneMap.default)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</div>
          <div className="truncate text-lg font-black text-slate-900">{value}</div>
          {sub ? <div className="truncate text-xs text-slate-500">{sub}</div> : null}
        </div>
      </div>
    </div>
  );
}

function Segmented({ value, onChange, options, disabled }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            disabled={disabled}
            className={cx(
              "group relative overflow-hidden rounded-xl px-4 py-2 text-sm font-extrabold transition",
              "disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2",
              active ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 focus:ring-offset-white" : "text-slate-700 hover:bg-slate-50 focus:ring-slate-300 focus:ring-offset-white"
            )}
            title={o.hint}
            type="button"
          >
            <span className="relative z-10">{o.label}</span>
            <span
              className={cx(
                "relative z-10 ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black",
                active ? "bg-white/20 text-white" : "bg-slate-900/5 text-slate-600"
              )}
            >
              {o.badge}
            </span>

            {active ? (
              <span className="pointer-events-none absolute inset-0 opacity-100">
                <span className="absolute -left-6 -top-6 h-20 w-20 rounded-full bg-white/15 blur-2xl" />
                <span className="absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-black/10 blur-2xl" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={cx("animate-pulse rounded-xl bg-slate-200/70", className)} />;
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
          "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-extrabold shadow-sm transition",
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
            className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_60px_-30px_rgba(0,0,0,0.45)]"
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
                className={cx("flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold transition", "hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60")}
              >
                {it.icon ? <it.icon className="h-4 w-4" /> : null}
                <span className="flex-1">{it.label}</span>
                {it.hint ? <span className="text-xs text-slate-500">{it.hint}</span> : null}
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
    <GlassCard className="p-0">
      <div className="flex flex-col gap-3 border-b border-slate-200/80 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-slate-200 bg-slate-50">
            {Icon ? <Icon className="h-5 w-5 text-slate-700" /> : <Sparkles className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-lg font-black tracking-tight text-slate-900">{title}</div>
            {subtitle ? <div className="text-sm text-slate-600">{subtitle}</div> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </GlassCard>
  );
}

function FuelLegendChips({ fuelKeys, selected, onToggle, onAll, onNone }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onAll}
        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50"
      >
        All
      </button>
      <button
        type="button"
        onClick={onNone}
        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50"
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
              "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-black transition",
              active ? "border-blue-600/20 bg-blue-600 text-white hover:bg-blue-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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

export default function FuelForecastPanel() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("weekly");
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

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

  async function onCheckHealth() {
    try {
      setError("");
      const data = await healthCheck();
      setHealth(data);

      showAlert({
        icon: "success",
        title: "Service Online",
        text: "Service is reachable",
      });
    } catch (e) {
      setHealth(null);
      const msg = e?.response?.data?.detail || e.message || "Health check failed";
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
          text: "Fuel prediction completed successfully",
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

  async function handleSyncToDatabase() {
    if (!result?.ok || !result?.forecast?.daily) return;

    try {
      const stationId = "STATION_001";
      await axios.post(`${API_BASE_URL}/reports/fuel-prediction`, {
        stationId,
        mode: "weekly",
        predictions: result.forecast.daily
      });
      showAlert({
        icon: "success",
        title: "Synced to Member 3",
        text: "Forecast successfully passed to the Staff Prediction module!",
        confirm: true,
      });
    } catch (saveErr) {
      console.error("Failed to sync forecast:", saveErr);
      showAlert({
        icon: "error",
        title: "Sync Failed",
        text: "Failed to sync to database",
        confirm: true,
      });
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
      const msg = "Only PDF files are allowed. Please upload a .pdf report.";
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

  const gridDash = "2 10";
  const lineWidth = 3.25;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -top-24 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 22% 30%, rgba(37,99,235,0.16), transparent 58%), radial-gradient(circle at 78% 30%, rgba(16,185,129,0.10), transparent 60%), radial-gradient(circle at 50% 80%, rgba(139,92,246,0.08), transparent 62%)",
          }}
        />
        {!reduceMotion ? (
          <>
            <motion.div
              aria-hidden
              className="absolute -bottom-44 -left-44 h-[560px] w-[560px] rounded-full blur-3xl"
              style={{ background: "rgba(37,99,235,0.08)" }}
              animate={{ y: [0, -14, 0], x: [0, 10, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="absolute -top-44 -right-52 h-[580px] w-[580px] rounded-full blur-3xl"
              style={{ background: "rgba(245,158,11,0.06)" }}
              animate={{ y: [0, 10, 0], x: [0, -10, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        ) : null}
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="sticky top-3 z-40 mb-6">
          <GlassCard className="px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-tight text-blue-600">FUELWATCH</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-700">
                      Fuel Demand Forecasting
                    </span>
                    {result?.ok ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                        <BadgeCheck className="h-3.5 w-3.5" /> Ready
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-slate-600">Upload PDF → Generate → Analyze → Export</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <NeonButton variant="subtle" icon={RefreshCw} onClick={onCheckHealth} disabled={loading} title="Check ML service">
                  Check Service
                </NeonButton>

                <Dropdown
                  label="Export"
                  icon={Download}
                  disabled={!forecastObj || !totals}
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

                <NeonButton icon={TrendingUp} onClick={onGenerate} disabled={loading || !!fileError} title={fileError ? fileError : "Generate forecast"}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing…
                    </>
                  ) : (
                    "Generate"
                  )}
                </NeonButton>
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="mb-6">
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Fuelwatch - Fuel Quantity Predictions</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Weekly | Monthly | Annually Fuel Demand Analyzer With The Premium Enginnering Features</p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatPill
            icon={Gauge}
            label="Mode"
            value={(forecastObj?.mode || mode || "").toUpperCase()}
            sub={MODE_OPTIONS.find((m) => m.value === mode)?.hint}
            tone="info"
          />
          <StatPill
            icon={FileText}
            label="PDF"
            value={file ? "Ready" : "Missing"}
            sub={file ? `${file.name} • ${niceBytes(file.size)}` : "Upload a PDF to continue"}
            tone={file ? "success" : "danger"}
          />
          <StatPill
            icon={CheckCircle2}
            label="Service"
            value={health?.status || "Not checked"}
            sub={health ? `Model loaded: ${String(health.model_loaded)}` : "Use “Check Service”"}
            tone={health ? "success" : "default"}
          />
          <StatPill
            icon={TrendingUp}
            label="Grand Total (L)"
            value={totals ? formatNumber(grandTotal) : "—"}
            sub={
              totals
                ? topFuel
                  ? `Top: ${topFuel.fuel} (${formatNumber(topFuel.value)} L)`
                  : `Fuel types: ${fuelKeys.length}`
                : "Generate forecast to view"
            }
            tone={totals ? "default" : "warn"}
          />
        </div>

        <GlassCard>
          <div className="p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-black text-slate-900">Forecast Mode</div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-700">
                    <CalendarDays className="h-3.5 w-3.5 text-blue-600" /> Choose horizon
                  </span>
                </div>

                <Segmented
                  value={mode}
                  onChange={(v) => {
                    setMode(v);
                    setResult(null);
                    setError("");
                    setActiveTab("charts");
                  }}
                  options={MODE_OPTIONS}
                  disabled={loading}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-black text-slate-900 dark:text-zinc-50">PDF Report (Required)</div>
                  <div className="flex gap-2">
                    {mode === "weekly" && result?.ok && result?.forecast?.daily && (
                      <NeonButton variant="primary" icon={CloudUpload} onClick={handleSyncToDatabase} title="Push 7-Day Forecast to Staff Prediction">
                        Sync to Member 3
                      </NeonButton>
                    )}
                    {file ? (
                      <NeonButton variant="subtle" icon={Trash2} onClick={onClearFile} title="Remove selected file">
                        Clear
                      </NeonButton>
                    ) : null}
                  </div>
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={handleDrop}
                  className={cx(
                    "group relative flex min-h-[170px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-4 transition",
                    fileError ? "border-rose-400/70 bg-rose-50/80" : "border-slate-300 bg-slate-50/70 hover:bg-white"
                  )}
                  onClick={() => document.getElementById("fuel-forecast-file")?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-emerald-500/5 to-purple-600/8" />
                  </div>

                  <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-600/8 blur-3xl" />
                  <div className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-emerald-500/7 blur-3xl" />

                  <input
                    id="fuel-forecast-file"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    disabled={loading}
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

                  <div className="relative flex items-center gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm">
                      <CloudUpload className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900">{file ? "PDF selected" : "Drag & drop a PDF here"}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {file ? (
                          <>
                            <span className="font-black">{file.name}</span>
                            {" • "}
                            {niceBytes(file.size)}
                          </>
                        ) : (
                          <>
                            Or click to browse. Max size <span className="font-black">{MAX_FILE_MB}MB</span>.
                          </>
                        )}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black text-slate-700 shadow-sm">
                        <Info className="h-3.5 w-3.5 text-blue-600" />
                        PDF
                      </div>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {fileError ? (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="mt-3 flex items-start gap-2 rounded-xl border border-rose-300/70 bg-rose-50/80 p-3 text-sm font-bold text-rose-700"
                    >
                      <AlertCircle className="mt-0.5 h-5 w-5" />
                      <div>{fileError}</div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <AnimatePresence>
                {health ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-start gap-2 rounded-2xl border border-emerald-300/60 bg-emerald-50/70 p-4 text-sm text-emerald-800"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5" />
                    <div>
                      <div className="font-black">Service OK</div>
                      <div className="mt-1 text-xs opacity-90">
                        Status: <span className="font-black">{health.status || "ok"}</span> • Model loaded:{" "}
                        <span className="font-black">{String(health.model_loaded)}</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    Tip: Click <span className="font-black">Check Service</span> regularly.
                  </div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-start gap-2 rounded-2xl border border-rose-300/70 bg-rose-50/80 p-4 text-sm text-rose-800"
                  >
                    <AlertCircle className="mt-0.5 h-5 w-5" />
                    <div>
                      <div className="font-black">Request failed</div>
                      <div className="mt-1 text-xs opacity-90">{error}</div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    Upload a PDF and click <span className="font-black">Generate</span> to view charts & tables.
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </GlassCard>

        <AnimatePresence>
          {forecastObj && totals ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-6 space-y-5">
              <GlassCard>
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-blue-600" />
                        <div className="text-lg font-black tracking-tight">Forecast Summary</div>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-xs font-black uppercase text-slate-500">Mode</div>
                          <div className="mt-1 font-black">{forecastObj?.mode || mode}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-xs font-black uppercase text-slate-500">From</div>
                          <div className="mt-1 font-black">{shortDate(headerFrom)}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-xs font-black uppercase text-slate-500">To</div>
                          <div className="mt-1 font-black">{shortDate(headerTo)}</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-xs font-black uppercase text-slate-500">PDF Ingested</div>
                          <div className="mt-1 font-black">{ingested}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white p-1">
                        <button
                          type="button"
                          onClick={() => setActiveTab("charts")}
                          className={cx(
                            "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition",
                            activeTab === "charts" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <BarChart3 className="h-4 w-4" />
                          Charts
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("tables")}
                          className={cx(
                            "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition",
                            activeTab === "tables" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"
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
                        <NeonButton
                          variant="subtle"
                          icon={RefreshCw}
                          onClick={() => {
                            setFuelSearch("");
                            setSelectedFuels(new Set(fuelKeys));
                            showAlert({ icon: "success", title: "Filters Reset", text: "All filters restored" });
                          }}
                        >
                          Reset filters
                        </NeonButton>
                      </div>
                    </div>
                  </div>

                  <SoftDivider />
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <Search className="h-4 w-4 text-slate-600" />
                      <input
                        value={fuelSearch}
                        onChange={(e) => setFuelSearch(e.target.value)}
                        placeholder="Search fuel type…"
                        className="w-64 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-500"
                      />
                      {fuelSearch ? (
                        <button type="button" onClick={() => setFuelSearch("")} className="rounded-lg p-1 hover:bg-slate-50" title="Clear search">
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    <FuelLegendChips fuelKeys={filteredFuelKeys} selected={selectedFuels} onToggle={toggleFuel} onAll={selectAllFuels} onNone={selectNoFuels} />
                  </div>
                </div>
              </GlassCard>

              {activeTab === "charts" ? (
                <>
                  <ChartCard
                    icon={BarChart3}
                    title="Totals by Fuel Type"
                    subtitle="Predicted aggregate quantities per fuel type (sorted by total)."
                    actions={
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                          <TrendingUp className="h-4 w-4 text-blue-600" />
                          Grand total: {formatNumber(grandTotal)} L
                        </span>
                        {topFuel ? (
                          <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                            <Sparkles className="h-4 w-4 text-blue-600" />
                            Top: {topFuel.fuel}
                          </span>
                        ) : null}
                      </div>
                    }
                  >
                    <div className="h-[360px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={totalsChartData}>
                          <CartesianGrid strokeDasharray={gridDash} />
                          <XAxis dataKey="fuel" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" name="Predicted Total (L)" fill={BRAND.primary} radius={[12, 12, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  {!isAnnual ? (
                    <ChartCard
                      icon={LineChartIcon}
                      title="Daily Forecast Trend"
                      subtitle="Fuel-wise day-to-day predictions (use chips to show/hide series)."
                      actions={
                        <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                          <Info className="h-4 w-4 text-blue-600" />
                          Showing: {selectedFuels.size}/{fuelKeys.length}
                        </span>
                      }
                    >
                      <div className="h-[380px] w-full rounded-2xl border border-slate-200 bg-white p-3">
                        {dailyChartData.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyChartData}>
                              <CartesianGrid strokeDasharray={gridDash} />
                              <XAxis dataKey="DateLabel" />
                              <YAxis />
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
                      subtitle="Annual plan view with fuel-wise monthly predictions."
                      actions={
                        <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                          <Info className="h-4 w-4 text-blue-600" />
                          Toggle fuels in chips
                        </span>
                      }
                    >
                      <div className="h-[400px] w-full rounded-2xl border border-slate-200 bg-white p-3">
                        {monthlyChartData.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyChartData}>
                              <CartesianGrid strokeDasharray={gridDash} />
                              <XAxis dataKey="Month" />
                              <YAxis />
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
                                    radius={[12, 12, 0, 0]}
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
                <div className="grid gap-5 lg:grid-cols-2">
                  <GlassCard>
                    <div className="p-5 sm:p-6">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-black tracking-tight">Totals Table</div>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-700">Sorted by total</span>
                      </div>

                      {/* ✅ Link to Member 3 Staff Prediction */}
                      {mode === "weekly" && daily && daily.length === 7 && (
                        <div
                          style={{
                            marginTop: 24,
                            padding: 20,
                            borderRadius: 16,
                            background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                            border: "1px solid #bfdbfe",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "between",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <h4 style={{ margin: 0, color: "#1e40af", fontSize: 16 }}>🔮 Staffing Insight</h4>
                            <p style={{ margin: "4px 0 0", color: "#3b82f6", fontSize: 13 }}>
                              Predict how many employees you'll need based on this fuel forecast.
                            </p>
                          </div>
                          <button
                            onClick={() => navigate("/staff-prediction", { state: { fuelForecast: daily } })}
                            style={{
                              backgroundColor: "#2563eb",
                              color: "white",
                              border: "none",
                              padding: "10px 20px",
                              borderRadius: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
                            }}
                          >
                            Predict Staffing Impact
                          </button>
                        </div>
                      )}

                      {/* ✅ Annual: Month-wise breakdown (Jan..Dec) */}
                      {isAnnual && monthly && monthly.length > 0 && (
                        <>
                          <h3 style={{ ...styles.sectionTitle, marginTop: 18 }}>Month-wise Breakdown (Annual)</h3>
                          <DataTable rows={monthly} emptyText="No month-wise data returned for annual forecast." />
                        </>
                      )}

                      <div className="mt-3 text-xs text-slate-600">
                        Tip: Use <span className="font-black">Export → Totals CSV</span> for reporting.
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard>
                    <div className="p-5 sm:p-6">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-black tracking-tight">{isAnnual ? "Month-wise Table (Annual)" : "Daily Breakdown"}</div>
                      </div>

                      {!isAnnual ? (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                          {daily?.length ? (
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-600">
                                  {Object.keys(daily[0]).map((k) => (
                                    <th key={k} className="px-4 py-3">
                                      {k}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {daily.map((row, idx) => (
                                  <tr key={idx} className={cx("border-t border-slate-200", idx % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                                    {Object.keys(daily[0]).map((k) => (
                                      <td key={k} className="px-4 py-3 tabular-nums">
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
                        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                          {monthly?.length ? (
                            <table className="w-full border-collapse text-sm">
                              <thead>
                                <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-600">
                                  {Object.keys(monthly[0]).map((k) => (
                                    <th key={k} className="px-4 py-3">
                                      {k}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {monthly.map((row, idx) => (
                                  <tr key={idx} className={cx("border-t border-slate-200", idx % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                                    {Object.keys(monthly[0]).map((k) => (
                                      <td key={k} className="px-4 py-3 tabular-nums">
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
                  </GlassCard>
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {loading ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-6 grid gap-5">
              <GlassCard>
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <div className="text-sm font-black">Generating forecast…</div>
                    <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-700">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                      Please Wait. Forecast generation in progress !
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </div>
                  <div className="mt-4">
                    <Skeleton className="h-72" />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="mt-10 text-center text-xs text-slate-500">FuelWatch Fuel Quantity Predictions • Enhanced Premium Experience</div>
      </div>
    </div>
  );
}