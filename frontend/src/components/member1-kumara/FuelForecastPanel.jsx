// FuelForecastPanel.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Activity,
  AlertCircle,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CloudUpload,
  Download,
  FileText,
  Filter,
  Gauge,
  Info,
  LayoutDashboard,
  LineChart as LineChartIcon,
  Loader2,
  Moon,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import { forecastFuel, healthCheck } from "../../services/mlService";
import { downloadCsv } from "../../utils/downloadCsv";

const MODE_OPTIONS = [
  { value: "weekly", label: "Weekly", hint: "Weekly Planning", badge: "7d" },
  { value: "monthly", label: "Monthly", hint: "Monthly Planning", badge: "30d" },
  { value: "annual", label: "Annual", hint: "Annually Planning", badge: "365d" },
];

// Color theme (FuelWatch vibe) — rich + consistent
const BRAND = {
  primary: "#2563eb",
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

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
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

function GlassCard({ children, className }) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/70 shadow-[0_18px_40px_-22px_rgba(0,0,0,0.45)] backdrop-blur-xl",
        "dark:bg-zinc-950/50 dark:border-white/10",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/70 via-white/10 to-transparent dark:from-white/6 dark:via-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}

function SoftDivider() {
  return <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent dark:via-white/10" />;
}

function NeonButton({ icon: Icon, children, onClick, disabled, variant = "primary", title }) {
  const base =
    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
  const variants = {
    primary:
      "bg-zinc-900 text-white hover:opacity-95 dark:bg-white dark:text-zinc-900",
    ghost:
      "border border-white/10 bg-white/70 text-zinc-900 hover:bg-white dark:bg-zinc-950/40 dark:text-zinc-50 dark:hover:bg-white/5",
    subtle:
      "border border-white/10 bg-white/60 text-zinc-900 hover:bg-white/80 dark:bg-zinc-950/30 dark:text-zinc-50 dark:hover:bg-white/5",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(base, variants[variant])}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function StatPill({ icon: Icon, label, value, sub, tone = "default" }) {
  const toneMap = {
    default:
      "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900",
    success: "bg-emerald-600 text-white",
    danger: "bg-rose-600 text-white",
    info: "bg-blue-600 text-white",
    warn: "bg-amber-500 text-white",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/70 p-4 shadow-sm dark:bg-zinc-950/40">
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-blue-600/10 via-emerald-500/10 to-purple-600/10 blur-2xl dark:from-blue-500/10 dark:via-emerald-400/10 dark:to-purple-500/10" />
      <div className="relative flex items-center gap-3">
        <div className={cx("grid h-10 w-10 place-items-center rounded-xl", toneMap[tone] || toneMap.default)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
            {label}
          </div>
          <div className="truncate text-lg font-black text-zinc-900 dark:text-zinc-50">{value}</div>
          {sub ? <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{sub}</div> : null}
        </div>
      </div>
    </div>
  );
}

function Segmented({ value, onChange, options, disabled }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/60 p-2 dark:bg-zinc-950/40">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            disabled={disabled}
            className={cx(
              "group relative overflow-hidden rounded-xl px-4 py-2 text-sm font-extrabold transition",
              "disabled:cursor-not-allowed disabled:opacity-60",
              active
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-700 hover:bg-white/80 dark:text-zinc-200 dark:hover:bg-white/5"
            )}
            title={o.hint}
            type="button"
          >
            <span className="relative z-10">{o.label}</span>
            <span
              className={cx(
                "relative z-10 ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black",
                active
                  ? "bg-white/20 text-white dark:bg-zinc-900/10 dark:text-zinc-900"
                  : "bg-zinc-900/5 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
              )}
            >
              {o.badge}
            </span>
            {active ? (
              <span className="pointer-events-none absolute inset-0 opacity-100">
                <span className="absolute -left-6 -top-6 h-20 w-20 rounded-full bg-blue-600/20 blur-2xl dark:bg-blue-500/20" />
                <span className="absolute -right-6 -bottom-6 h-20 w-20 rounded-full bg-emerald-500/15 blur-2xl dark:bg-emerald-400/15" />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={cx("animate-pulse rounded-xl bg-zinc-900/10 dark:bg-white/10", className)} />;
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
          "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/70 px-3 py-2 text-sm font-extrabold shadow-sm transition hover:bg-white",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "dark:bg-zinc-950/40 dark:hover:bg-white/5"
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
            className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-white/90 shadow-[0_22px_60px_-30px_rgba(0,0,0,0.5)] backdrop-blur-xl dark:bg-zinc-950/80"
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
                className={cx(
                  "flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold transition",
                  "hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-white/5"
                )}
              >
                {it.icon ? <it.icon className="h-4 w-4" /> : null}
                <span className="flex-1">{it.label}</span>
                {it.hint ? <span className="text-xs text-zinc-500 dark:text-zinc-400">{it.hint}</span> : null}
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
      <div className="flex flex-col gap-3 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/60 dark:bg-zinc-950/40">
            {Icon ? <Icon className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-lg font-black tracking-tight text-zinc-900 dark:text-zinc-50">{title}</div>
            {subtitle ? <div className="text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</div> : null}
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
        className="rounded-xl border border-white/10 bg-white/60 px-3 py-1.5 text-xs font-black text-zinc-700 hover:bg-white dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-white/5"
      >
        All
      </button>
      <button
        type="button"
        onClick={onNone}
        className="rounded-xl border border-white/10 bg-white/60 px-3 py-1.5 text-xs font-black text-zinc-700 hover:bg-white dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-white/5"
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
              active
                ? "border-white/10 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "border-white/10 bg-white/60 text-zinc-700 hover:bg-white dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-white/5"
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
  const reduceMotion = useReducedMotion();

  const [mode, setMode] = useState("weekly");
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // UI controls
  const [dark, setDark] = useState(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("fuel_forecast_dark") : null;
    return saved ? saved === "1" : true;
  });

  const [activeTab, setActiveTab] = useState("charts"); // charts | tables
  const [chartStyle, setChartStyle] = useState("modern"); // modern | classic
  const [showGrid, setShowGrid] = useState(true);
  const [tableLimit, setTableLimit] = useState(60);
  const [fuelSearch, setFuelSearch] = useState("");
  const [compactTables, setCompactTables] = useState(false);

  const [selectedFuels, setSelectedFuels] = useState(() => new Set());

  // apply theme class
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
    window.localStorage.setItem("fuel_forecast_dark", dark ? "1" : "0");
  }, [dark]);

  const forecastObj = useMemo(() => result?.forecast || result || null, [result]);
  const totals = useMemo(() => forecastObj?.totals || null, [forecastObj]);
  const daily = useMemo(() => forecastObj?.daily || [], [forecastObj]);
  const monthly = useMemo(() => forecastObj?.monthly || [], [forecastObj]);
  const isAnnual = mode === "annual";

  const headerFrom = forecastObj?.from || result?.from_date || result?.from || "-";
  const headerTo = forecastObj?.to || result?.to_date || result?.to || "-";
  const ingested = String(result?.ingest?.ingested ?? false);

  const fileError = useMemo(() => {
    if (!file) return "Please upload a PDF report to generate a forecast.";
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) return "Only PDF files are allowed.";
    if (file.size > MAX_FILE_MB * 1024 * 1024) return `PDF is too large (max ${MAX_FILE_MB}MB).`;
    return "";
  }, [file]);

  // data transforms
  const totalsChartData = useMemo(() => {
    if (!totals) return [];
    return Object.entries(totals)
      .map(([fuel, value]) => ({ fuel, value: Number(value) || 0 }))
      .sort((a, b) => b.value - a.value);
  }, [totals]);

  const dailyChartData = useMemo(() => {
    if (!daily?.length) return [];
    return daily.map((row) => {
      const d = row.Date || row.date || row.DATE;
      return { ...row, DateLabel: d ? String(d).split("T")[0] : "" };
    });
  }, [daily]);

  const monthlyChartData = useMemo(() => {
    if (!monthly?.length) return [];
    return monthly.map((row) => ({ ...row }));
  }, [monthly]);

  const fuelKeys = useMemo(() => {
    if (!totals) return [];
    return Object.keys(totals);
  }, [totals]);

  const filteredFuelKeys = useMemo(() => {
    const q = fuelSearch.trim().toLowerCase();
    if (!q) return fuelKeys;
    return fuelKeys.filter((k) => k.toLowerCase().includes(q));
  }, [fuelKeys, fuelSearch]);

  // initialize selected fuels when results arrive
  useEffect(() => {
    if (!fuelKeys.length) return;
    setSelectedFuels((prev) => {
      if (prev.size) return prev; // keep user selection
      return new Set(fuelKeys); // default: show all
    });
  }, [fuelKeys]);

  const grandTotal = useMemo(() => {
    if (!totals) return 0;
    return Object.values(totals).reduce((acc, v) => acc + (Number(v) || 0), 0);
  }, [totals]);

  const topFuel = useMemo(() => {
    if (!totalsChartData.length) return null;
    return totalsChartData[0];
  }, [totalsChartData]);

  // actions
  async function onCheckHealth() {
    try {
      setError("");
      const data = await healthCheck();
      setHealth(data);
      toast.success("Service is reachable");
    } catch (e) {
      setHealth(null);
      const msg = e?.response?.data?.detail || e.message || "Health check failed";
      setError(msg);
      toast.error("Health check failed");
    }
  }

  async function onGenerate() {
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

  function onClearFile() {
    setFile(null);
    setResult(null);
    setHealth(null);
    setError("");
    setFuelSearch("");
    setSelectedFuels(new Set());
  }

  function onDownloadDaily() {
    if (!daily?.length) return;
    downloadCsv(`fuel_forecast_${mode}_daily.csv`, daily);
  }

  function onDownloadMonthly() {
    if (!monthly?.length) return;
    downloadCsv(`fuel_forecast_${mode}_monthly.csv`, monthly);
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
  }

  // drag drop
  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    setResult(null);
    setHealth(null);
    setError("");
    setFile(f);
  }

  // fuel selection toggles
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

  // chart options (slightly different visual vibe)
  const gridDash = chartStyle === "modern" ? "2 10" : "3 3";
  const lineWidth = chartStyle === "modern" ? 3.25 : 2.75;

  // ===== Render =====
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50 px-4 py-6 text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-950 dark:text-zinc-50">
      <Toaster position="top-right" />

      {/* Animated background aura (subtle + brand) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -top-28 left-1/2 h-[420px] w-[780px] -translate-x-1/2 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, rgba(37,99,235,0.22), transparent 55%), radial-gradient(circle at 80% 30%, rgba(16,185,129,0.18), transparent 55%), radial-gradient(circle at 50% 80%, rgba(139,92,246,0.18), transparent 58%)",
          }}
        />
        {!reduceMotion ? (
          <>
            <motion.div
              aria-hidden
              className="absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full blur-3xl"
              style={{ background: "rgba(6,182,212,0.14)" }}
              animate={{ y: [0, -18, 0], x: [0, 14, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="absolute -top-40 -right-48 h-[560px] w-[560px] rounded-full blur-3xl"
              style={{ background: "rgba(245,158,11,0.10)" }}
              animate={{ y: [0, 14, 0], x: [0, -14, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        ) : null}
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        {/* Top bar */}
        <div className="sticky top-3 z-40 mb-6">
          <GlassCard className="px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black tracking-tight">FuelWatch</span>
                    <span className="rounded-full border border-white/10 bg-white/60 px-2 py-0.5 text-[10px] font-black text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-200">
                      Fuel Demand Forecasting Console
                    </span>
                    {result?.ok ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:text-emerald-200">
                        <BadgeCheck className="h-3.5 w-3.5" /> Ready
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                    Upload → Generate → Analyze → Export
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <NeonButton
                  variant="ghost"
                  icon={dark ? Moon : Sun}
                  onClick={() => setDark((v) => !v)}
                  title="Toggle theme"
                >
                  {dark ? "Dark" : "Light"}
                </NeonButton>

                <NeonButton
                  variant="subtle"
                  icon={RefreshCw}
                  onClick={onCheckHealth}
                  disabled={loading}
                  title="Check ML service"
                >
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

                <NeonButton
                  icon={TrendingUp}
                  onClick={onGenerate}
                  disabled={loading || !!fileError}
                  title={fileError ? fileError : "Generate forecast"}
                >
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

        {/* Main header */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/70 px-3 py-1 text-xs font-black text-zinc-700 shadow-sm dark:bg-zinc-950/40 dark:text-zinc-200">
            <Activity className="h-4 w-4" />
            Forecasting • Charts • Exports
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Fuelwatch - Fuel Quantity Predictions
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Weekly | Monthly | Annually Fuel Demand Analyzer With The Premium Enginnering Features
          </p>
        </div>

        {/* KPI Row */}
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

        {/* Controls / Upload */}
        <GlassCard>
          <div className="p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              {/* Mode */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-black text-zinc-900 dark:text-zinc-50">Forecast Mode</div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/60 px-2 py-0.5 text-[10px] font-black text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-200">
                    <CalendarDays className="h-3.5 w-3.5" /> Choose horizon
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

                <SoftDivider />

                {/* Chart controls */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/50 p-4 dark:bg-zinc-950/30">
                    <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                      <Settings2 className="h-4 w-4" /> Chart style
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setChartStyle("modern")}
                        className={cx(
                          "flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-black transition",
                          chartStyle === "modern"
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                            : "bg-white/60 text-zinc-700 hover:bg-white dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-white/5"
                        )}
                      >
                        Modern
                      </button>
                      <button
                        type="button"
                        onClick={() => setChartStyle("classic")}
                        className={cx(
                          "flex-1 rounded-xl border border-white/10 px-3 py-2 text-xs font-black transition",
                          chartStyle === "classic"
                            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                            : "bg-white/60 text-zinc-700 hover:bg-white dark:bg-zinc-950/30 dark:text-zinc-200 dark:hover:bg-white/5"
                        )}
                      >
                        Classic
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                      <span>Grid</span>
                      <button
                        type="button"
                        onClick={() => setShowGrid((v) => !v)}
                        className={cx(
                          "rounded-full border border-white/10 px-3 py-1 font-black transition",
                          showGrid
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
                            : "bg-white/60 text-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-200"
                        )}
                      >
                        {showGrid ? "On" : "Off"}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/50 p-4 dark:bg-zinc-950/30">
                    <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                      <Filter className="h-4 w-4" /> Table view
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-zinc-700 dark:text-zinc-200">Rows</span>
                      <input
                        type="range"
                        min={20}
                        max={200}
                        value={tableLimit}
                        onChange={(e) => setTableLimit(Number(e.target.value))}
                        className="w-full"
                      />
                      <span className="w-12 text-right text-xs font-black text-zinc-700 dark:text-zinc-200">
                        {tableLimit}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                      <span>Compact</span>
                      <button
                        type="button"
                        onClick={() => setCompactTables((v) => !v)}
                        className={cx(
                          "rounded-full border border-white/10 px-3 py-1 font-black transition",
                          compactTables
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-200"
                            : "bg-white/60 text-zinc-700 dark:bg-zinc-950/30 dark:text-zinc-200"
                        )}
                      >
                        {compactTables ? "Yes" : "No"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-sm font-black text-zinc-900 dark:text-zinc-50">PDF Report (Required)</div>
                  {file ? (
                    <NeonButton variant="subtle" icon={Trash2} onClick={onClearFile} title="Remove selected file">
                      Clear
                    </NeonButton>
                  ) : null}
                </div>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={handleDrop}
                  className={cx(
                    "group relative flex min-h-[170px] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-4 transition",
                    fileError
                      ? "border-rose-400/70 bg-rose-50/50 dark:bg-rose-500/10"
                      : "border-zinc-300/70 bg-white/40 hover:bg-white/70 dark:border-white/15 dark:bg-zinc-950/30 dark:hover:bg-zinc-950/40"
                  )}
                  onClick={() => document.getElementById("fuel-forecast-file")?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/12 via-emerald-500/8 to-purple-600/12 dark:from-blue-500/10 dark:via-emerald-400/7 dark:to-purple-500/10" />
                  </div>

                  <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-600/10 blur-3xl dark:bg-blue-500/10" />
                  <div className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-400/10" />

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
                      setFile(f);
                    }}
                  />

                  <div className="relative flex items-center gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-900 text-white shadow-sm dark:bg-white dark:text-zinc-900">
                      <CloudUpload className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black">{file ? "PDF selected" : "Drag & drop a PDF here"}</div>
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {file ? (
                          <>
                            <span className="font-black">{file.name}</span>
                            {" • "}
                            {niceBytes(file.size)}
                          </>
                        ) : (
                          <>
                            Or click to browse. Max size{" "}
                            <span className="font-black">{MAX_FILE_MB}MB</span>.
                          </>
                        )}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/60 px-3 py-1 text-[10px] font-black text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-200">
                        <Info className="h-3.5 w-3.5" />
                        Better PDF = better forecast (clean station data pages)
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
                      className="mt-3 flex items-start gap-2 rounded-xl border border-rose-300/60 bg-rose-50/70 p-3 text-sm font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200"
                    >
                      <AlertCircle className="mt-0.5 h-5 w-5" />
                      <div>{fileError}</div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            {/* Status banners */}
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
              <AnimatePresence>
                {health ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-start gap-2 rounded-2xl border border-emerald-300/50 bg-emerald-50/60 p-4 text-sm text-emerald-800 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-100"
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
                  <div className="rounded-2xl border border-white/10 bg-white/50 p-4 text-sm text-zinc-600 dark:bg-zinc-950/30 dark:text-zinc-300">
                    Tip: Click <span className="font-black">Check Service</span> to verify your ML API before generating.
                  </div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {error ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="flex items-start gap-2 rounded-2xl border border-rose-300/60 bg-rose-50/70 p-4 text-sm text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-100"
                  >
                    <AlertCircle className="mt-0.5 h-5 w-5" />
                    <div>
                      <div className="font-black">Request failed</div>
                      <div className="mt-1 text-xs opacity-90">{error}</div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/50 p-4 text-sm text-zinc-600 dark:bg-zinc-950/30 dark:text-zinc-300">
                    Upload a PDF and click <span className="font-black">Generate</span> to view charts & tables.
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </GlassCard>

        {/* Results */}
        <AnimatePresence>
          {forecastObj && totals ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-6 space-y-5"
            >
              {/* Summary strip + Tabs */}
              <GlassCard>
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-zinc-700 dark:text-zinc-200" />
                        <div className="text-lg font-black tracking-tight">Forecast Summary</div>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-zinc-700 dark:text-zinc-200 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-white/10 bg-white/50 p-3 dark:bg-zinc-950/30">
                          <div className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-400">Mode</div>
                          <div className="mt-1 font-black">{forecastObj?.mode || mode}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/50 p-3 dark:bg-zinc-950/30">
                          <div className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-400">From</div>
                          <div className="mt-1 font-black">{shortDate(headerFrom)}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/50 p-3 dark:bg-zinc-950/30">
                          <div className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-400">To</div>
                          <div className="mt-1 font-black">{shortDate(headerTo)}</div>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/50 p-3 dark:bg-zinc-950/30">
                          <div className="text-xs font-black uppercase text-zinc-500 dark:text-zinc-400">PDF Ingested</div>
                          <div className="mt-1 font-black">{ingested}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Tabs */}
                      <div className="flex overflow-hidden rounded-2xl border border-white/10 bg-white/60 p-1 dark:bg-zinc-950/40">
                        <button
                          type="button"
                          onClick={() => setActiveTab("charts")}
                          className={cx(
                            "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition",
                            activeTab === "charts"
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                              : "text-zinc-700 hover:bg-white/80 dark:text-zinc-200 dark:hover:bg-white/5"
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
                            activeTab === "tables"
                              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                              : "text-zinc-700 hover:bg-white/80 dark:text-zinc-200 dark:hover:bg-white/5"
                          )}
                        >
                          <FileText className="h-4 w-4" />
                          Tables
                        </button>
                      </div>

                      {/* Quick actions */}
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
                            toast.success("Filters reset");
                          }}
                        >
                          Reset filters
                        </NeonButton>
                      </div>
                    </div>
                  </div>

                  {/* Fuel filters */}
                  <SoftDivider />
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/50 px-3 py-2 dark:bg-zinc-950/30">
                      <Search className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
                      <input
                        value={fuelSearch}
                        onChange={(e) => setFuelSearch(e.target.value)}
                        placeholder="Search fuel type…"
                        className="w-64 bg-transparent text-sm font-bold text-zinc-900 outline-none placeholder:text-zinc-500 dark:text-zinc-50 dark:placeholder:text-zinc-400"
                      />
                      {fuelSearch ? (
                        <button
                          type="button"
                          onClick={() => setFuelSearch("")}
                          className="rounded-lg p-1 hover:bg-black/5 dark:hover:bg-white/5"
                          title="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    <FuelLegendChips
                      fuelKeys={filteredFuelKeys}
                      selected={selectedFuels}
                      onToggle={toggleFuel}
                      onAll={selectAllFuels}
                      onNone={selectNoFuels}
                    />
                  </div>
                </div>
              </GlassCard>

              {/* CHARTS */}
              {activeTab === "charts" ? (
                <>
                  {/* Chart 1: Totals */}
                  <ChartCard
                    icon={BarChart3}
                    title="Totals by Fuel Type"
                    subtitle="Predicted aggregate quantities per fuel type (sorted by total)."
                    actions={
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/60 px-3 py-2 text-xs font-black text-zinc-600 dark:bg-zinc-950/30 dark:text-zinc-300">
                          <TrendingUp className="h-4 w-4" />
                          Grand total: {formatNumber(grandTotal)} L
                        </span>
                        {topFuel ? (
                          <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/60 px-3 py-2 text-xs font-black text-zinc-600 dark:bg-zinc-950/30 dark:text-zinc-300">
                            <Sparkles className="h-4 w-4" />
                            Top: {topFuel.fuel}
                          </span>
                        ) : null}
                      </div>
                    }
                  >
                    <div className="h-[360px] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/50 p-3 dark:bg-zinc-950/30">
                      <div className="pointer-events-none absolute inset-0 opacity-100" />
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={totalsChartData}>
                          {showGrid ? <CartesianGrid strokeDasharray={gridDash} /> : null}
                          <XAxis dataKey="fuel" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar
                            dataKey="value"
                            name="Predicted Total (L)"
                            fill={BRAND.primary}
                            radius={[12, 12, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  {/* Chart 2: Daily trend */}
                  {!isAnnual ? (
                    <ChartCard
                      icon={LineChartIcon}
                      title="Daily Forecast Trend"
                      subtitle="Fuel-wise day-to-day predictions (use chips to show/hide series)."
                      actions={
                        <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/60 px-3 py-2 text-xs font-black text-zinc-600 dark:bg-zinc-950/30 dark:text-zinc-300">
                          <Info className="h-4 w-4" />
                          Showing: {selectedFuels.size}/{fuelKeys.length}
                        </span>
                      }
                    >
                      <div className="h-[380px] w-full rounded-2xl border border-white/10 bg-white/50 p-3 dark:bg-zinc-950/30">
                        {dailyChartData.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyChartData}>
                              {showGrid ? <CartesianGrid strokeDasharray={gridDash} /> : null}
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
                          <div className="grid h-full place-items-center text-sm text-zinc-600 dark:text-zinc-300">
                            No daily forecast data available for this run.
                          </div>
                        )}
                      </div>
                    </ChartCard>
                  ) : null}

                  {/* Chart 3: Monthly bars (annual) */}
                  {isAnnual ? (
                    <ChartCard
                      icon={BarChart3}
                      title="Month-wise Forecast (Jan–Dec)"
                      subtitle="Annual plan view with fuel-wise monthly predictions."
                      actions={
                        <span className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/60 px-3 py-2 text-xs font-black text-zinc-600 dark:bg-zinc-950/30 dark:text-zinc-300">
                          <Info className="h-4 w-4" />
                          Toggle fuels in chips
                        </span>
                      }
                    >
                      <div className="h-[400px] w-full rounded-2xl border border-white/10 bg-white/50 p-3 dark:bg-zinc-950/30">
                        {monthlyChartData.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyChartData}>
                              {showGrid ? <CartesianGrid strokeDasharray={gridDash} /> : null}
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
                          <div className="grid h-full place-items-center text-sm text-zinc-600 dark:text-zinc-300">
                            No monthly forecast data available for this run.
                          </div>
                        )}
                      </div>
                    </ChartCard>
                  ) : null}
                </>
              ) : null}

              {/* TABLES */}
              {activeTab === "tables" ? (
                <div className="grid gap-5 lg:grid-cols-2">
                  {/* Totals table */}
                  <GlassCard>
                    <div className="p-5 sm:p-6">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-black tracking-tight">Totals Table</div>
                        <span className="rounded-full border border-white/10 bg-white/60 px-3 py-1 text-[10px] font-black text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-200">
                          Sorted by total
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/40 dark:bg-zinc-950/30">
                        <table className={cx("w-full border-collapse text-sm", compactTables ? "text-xs" : "")}>
                          <thead>
                            <tr className="bg-white/60 text-left text-xs font-black uppercase tracking-wide text-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-300">
                              <th className={cx("px-4 py-3", compactTables ? "py-2" : "")}>Fuel Type</th>
                              <th className={cx("px-4 py-3", compactTables ? "py-2" : "")}>Predicted Total (L)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {totalsChartData.map((row, idx) => (
                              <tr
                                key={row.fuel}
                                className={cx(
                                  "border-t border-white/10",
                                  idx % 2 === 0 ? "bg-white/30 dark:bg-white/5" : "bg-transparent"
                                )}
                              >
                                <td className={cx("px-4 py-3 font-black", compactTables ? "py-2" : "")}>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="h-2.5 w-2.5 rounded-full"
                                      style={{ background: FUEL_COLORS[idx % FUEL_COLORS.length] }}
                                    />
                                    {row.fuel}
                                  </div>
                                </td>
                                <td className={cx("px-4 py-3 tabular-nums", compactTables ? "py-2" : "")}>
                                  {formatNumber(row.value)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
                        Tip: Use <span className="font-black">Export → Totals CSV</span> for reporting.
                      </div>
                    </div>
                  </GlassCard>

                  {/* Daily/Monthly table */}
                  <GlassCard>
                    <div className="p-5 sm:p-6">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-black tracking-tight">
                          {isAnnual ? "Month-wise Table (Annual)" : "Daily Breakdown"}
                        </div>
                        <span className="rounded-full border border-white/10 bg-white/60 px-3 py-1 text-[10px] font-black text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-200">
                          Showing up to {tableLimit} rows
                        </span>
                      </div>

                      {!isAnnual ? (
                        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/40 dark:bg-zinc-950/30">
                          {daily?.length ? (
                            <table className={cx("w-full border-collapse text-sm", compactTables ? "text-xs" : "")}>
                              <thead>
                                <tr className="bg-white/60 text-left text-xs font-black uppercase tracking-wide text-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-300">
                                  {Object.keys(daily[0]).map((k) => (
                                    <th key={k} className={cx("px-4 py-3", compactTables ? "py-2" : "")}>
                                      {k}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {daily.slice(0, tableLimit).map((row, idx) => (
                                  <tr
                                    key={idx}
                                    className={cx(
                                      "border-t border-white/10",
                                      idx % 2 === 0 ? "bg-white/30 dark:bg-white/5" : "bg-transparent"
                                    )}
                                  >
                                    {Object.keys(daily[0]).map((k) => (
                                      <td key={k} className={cx("px-4 py-3 tabular-nums", compactTables ? "py-2" : "")}>
                                        {k === "Date"
                                          ? shortDate(row[k])
                                          : typeof row[k] === "number"
                                          ? formatNumber(row[k])
                                          : String(row[k])}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="grid h-[260px] place-items-center text-sm text-zinc-600 dark:text-zinc-300">
                              No daily breakdown for this mode/run.
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/40 dark:bg-zinc-950/30">
                          {monthly?.length ? (
                            <table className={cx("w-full border-collapse text-sm", compactTables ? "text-xs" : "")}>
                              <thead>
                                <tr className="bg-white/60 text-left text-xs font-black uppercase tracking-wide text-zinc-600 dark:bg-zinc-950/40 dark:text-zinc-300">
                                  {Object.keys(monthly[0]).map((k) => (
                                    <th key={k} className={cx("px-4 py-3", compactTables ? "py-2" : "")}>
                                      {k}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {monthly.slice(0, tableLimit).map((row, idx) => (
                                  <tr
                                    key={idx}
                                    className={cx(
                                      "border-t border-white/10",
                                      idx % 2 === 0 ? "bg-white/30 dark:bg-white/5" : "bg-transparent"
                                    )}
                                  >
                                    {Object.keys(monthly[0]).map((k) => (
                                      <td key={k} className={cx("px-4 py-3 tabular-nums", compactTables ? "py-2" : "")}>
                                        {typeof row[k] === "number" ? formatNumber(row[k]) : String(row[k])}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <div className="grid h-[260px] place-items-center text-sm text-zinc-600 dark:text-zinc-300">
                              No month-wise breakdown for this annual run.
                            </div>
                          )}
                        </div>
                      )}

                      {!isAnnual && daily?.length > tableLimit ? (
                        <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
                          Showing first <span className="font-black">{tableLimit}</span> rows only. Export CSV for full data.
                        </div>
                      ) : null}
                    </div>
                  </GlassCard>
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Loading skeleton */}
        <AnimatePresence>
          {loading ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-6 grid gap-5"
            >
              <GlassCard>
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <div className="text-sm font-black">Generating forecast…</div>
                    <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/60 px-3 py-1 text-[10px] font-black text-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-200">
                      <Sparkles className="h-3.5 w-3.5" />
                      Analyzing PDF + Running model
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

        <div className="mt-10 text-center text-xs text-zinc-500 dark:text-zinc-400">
          FuelWatch Forecast UI • Enhanced premium dashboard view
        </div>
      </div>
    </div>
  );
}
