// FuelForecastPanel.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { AnimatePresence, motion } from "framer-motion";
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
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  UploadCloud,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { forecastFuel, healthCheck } from "../../services/mlService";
import { downloadCsv } from "../../utils/downloadCsv";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8081/api";

const MODE_OPTIONS = [
  { value: "weekly", label: "Weekly", badge: "7D", hint: "7-day demand forecast" },
  { value: "monthly", label: "Monthly", badge: "30D", hint: "30-day demand forecast" },
  { value: "annual", label: "Annual", badge: "12M", hint: "12-month demand forecast" },
];

const BRAND = {
  primary: "#2563eb",
  success: "#10b981",
  warn: "#f59e0b",
  danger: "#ef4444",
  violet: "#8b5cf6",
  cyan: "#06b6d4",
  border: "#dbe2ea",
};

const FUEL_COLORS = [BRAND.primary, BRAND.success, BRAND.warn, BRAND.danger, BRAND.violet, BRAND.cyan];
const MAX_FILE_MB = 25;

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.000";
  return n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function shortDate(value) {
  if (!value) return "-";
  return String(value).split("T")[0];
}

function niceBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
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

function showLoading({ title = "Processing...", text = "Please wait while we generate the forecast" }) {
  return Swal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading(),
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

function Card({ children, className = "" }) {
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

function SectionCard({ children, className = "" }) {
  return (
    <div className={cx("relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_24px_-18px_rgba(0,0,0,0.35)]", className)}>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50/70 via-transparent to-transparent" />
      <div className="relative">{children}</div>
    </div>
  );
}

function SoftDivider() {
  return <div className="my-4 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />;
}

function Button({ icon: Icon, children, onClick, disabled, variant = "primary", title }) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 focus:ring-offset-white",
    subtle: "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 focus:ring-slate-300 focus:ring-offset-white",
    danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 focus:ring-offset-white",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-extrabold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2",
        variants[variant] || variants.primary
      )}
    >
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
      <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-blue-600/10 blur-2xl" />
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
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            title={option.hint}
            className={cx(
              "group relative overflow-hidden rounded-xl px-4 py-2 text-sm font-extrabold transition disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2",
              active
                ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 focus:ring-offset-white"
                : "text-slate-700 hover:bg-slate-50 focus:ring-slate-300 focus:ring-offset-white"
            )}
          >
            <span className="relative z-10">{option.label}</span>
            <span className={cx("relative z-10 ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black", active ? "bg-white/20 text-white" : "bg-slate-900/5 text-slate-600")}>
              {option.badge}
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

function Skeleton({ className = "" }) {
  return <div className={cx("animate-pulse rounded-xl bg-slate-200/70", className)} />;
}

function Dropdown({ label, icon: Icon, items = [], disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(event) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2 focus:ring-offset-white"
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
            {items.map((item, index) => (
              <button
                key={`${item.label}-${index}`}
                type="button"
                onClick={() => {
                  setOpen(false);
                  item.onClick?.();
                }}
                disabled={item.disabled}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-bold transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {item.icon ? <item.icon className="h-4 w-4" /> : null}
                <span className="flex-1">{item.label}</span>
                {item.hint ? <span className="text-xs text-slate-500">{item.hint}</span> : null}
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
    <SectionCard className="p-0">
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
      <div className="p-6">{children}</div>
    </SectionCard>
  );
}

function FuelLegendChips({ fuelKeys, selected, onToggle, onAll, onNone }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={onAll} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50">
        All
      </button>
      <button type="button" onClick={onNone} className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50">
        None
      </button>

      {fuelKeys.map((fuel, index) => {
        const active = selected.has(fuel);
        const dot = FUEL_COLORS[index % FUEL_COLORS.length];
        return (
          <button
            key={fuel}
            type="button"
            onClick={() => onToggle(fuel)}
            className={cx(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-black transition",
              active ? "border-blue-600/20 bg-blue-600 text-white hover:bg-blue-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            )}
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
  const [reduceMotion] = useState(() => (typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false));

  const forecastObj = useMemo(() => result?.forecast || result || null, [result]);
  const totals = useMemo(() => forecastObj?.totals || null, [forecastObj]);
  const daily = useMemo(() => forecastObj?.daily || [], [forecastObj]);
  const monthly = useMemo(() => forecastObj?.monthly || [], [forecastObj]);
  const isAnnual = mode === "annual";
  const fuelKeys = useMemo(() => (totals ? Object.keys(totals) : []), [totals]);

  useEffect(() => {
    if (fuelKeys.length) setSelectedFuels(new Set(fuelKeys));
  }, [fuelKeys]);

  const filteredFuelKeys = useMemo(() => {
    if (!fuelSearch) return fuelKeys;
    const query = fuelSearch.toLowerCase();
    return fuelKeys.filter((key) => key.toLowerCase().includes(query));
  }, [fuelKeys, fuelSearch]);

  const grandTotal = useMemo(() => {
    if (!totals) return 0;
    return Object.values(totals).reduce((sum, value) => sum + (Number(value) || 0), 0);
  }, [totals]);

  const topFuel = useMemo(() => {
    if (!totals || !fuelKeys.length) return null;
    const sorted = Object.entries(totals).sort((a, b) => Number(b[1]) - Number(a[1]));
    return { fuel: sorted[0][0], value: sorted[0][1] };
  }, [totals, fuelKeys]);

  const totalsChartData = useMemo(() => {
    if (!totals) return [];
    return Object.entries(totals)
      .map(([fuel, value]) => ({ fuel, value: Number(value) || 0 }))
      .sort((a, b) => b.value - a.value);
  }, [totals]);

  const dailyChartData = useMemo(() => {
    if (!daily?.length) return [];
    return daily.map((row) => ({ ...row, DateLabel: shortDate(row.Date || row.date) }));
  }, [daily]);

  const monthlyChartData = useMemo(() => monthly || [], [monthly]);
  const headerFrom = result?.from_date || result?.from || forecastObj?.from || null;
  const headerTo = result?.to_date || result?.to || forecastObj?.to || null;
  const ingested = result?.metadata?.filename || result?.filename || file?.name || "Report PDF";

  const fileError = !file
    ? "Please upload a PDF report to generate a forecast."
    : file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")
      ? "Only PDF files are allowed."
      : file.size > MAX_FILE_MB * 1024 * 1024
        ? `PDF is too large (max ${MAX_FILE_MB}MB).`
        : "";

  async function saveForecastToDb(payload) {
    const response = await axios.post(`${API_BASE_URL}/forecast/save`, payload);
    return response.data;
  }

  async function onCheckHealth() {
    try {
      setError("");
      const data = await healthCheck();
      setHealth(data);
      showAlert({ icon: "success", title: "Service Status - Online", text: "Service is reachable" });
    } catch (err) {
      setHealth(null);
      const msg = err?.response?.data?.detail || err.message || "Health check failed";
      setError(msg);
      showAlert({ icon: "error", title: "Service Error", text: msg, confirm: true });
    }
  }

  async function onGenerate() {
    if (fileError) {
      setError(fileError);
      showAlert({ icon: "warning", title: "Missing PDF", text: fileError, confirm: true });
      return;
    }

    try {
      setError("");
      setResult(null);
      setLoading(true);
      showLoading({ title: "Generating Forecast", text: "Please wait. Forecast generation in progress!" });

      const data = await forecastFuel({ mode, file });
      Swal.close();

      if (!data?.ok) {
        setError(data?.message || "Forecast failed");
        setResult(data);
        showAlert({ icon: "error", title: "Forecast Failed", text: data?.message || "Forecast failed", confirm: true });
        return;
      }

      setResult(data);
      showAlert({ icon: "success", title: "Forecast Generated", text: "Fuel quantity prediction completed successfully" });
    } catch (err) {
      Swal.close();
      const msg = err?.response?.data?.detail || err.message || "Forecast request failed";
      setError(msg);
      showAlert({ icon: "error", title: "Request Failed", text: msg, confirm: true });
    } finally {
      setLoading(false);
    }
  }

  async function onSaveForecast() {
    if (!forecastObj || !totals) {
      showAlert({ icon: "warning", title: "No Forecast", text: "Generate a forecast before saving.", confirm: true });
      return;
    }

    try {
      setSavingForecast(true);
      showLoading({ title: "Saving Forecast", text: "Please wait" });

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
      showAlert({ icon: "success", title: "Saved", text: "Forecast saved successfully." });
    } catch (err) {
      Swal.close();
      const msg = err?.response?.data?.message || err?.response?.data?.error || err.message || "Failed to save forecast";
      showAlert({ icon: "error", title: "Save Failed", text: msg, confirm: true });
    } finally {
      setSavingForecast(false);
    }
  }

  function clearRunState() {
    setResult(null);
    setHealth(null);
    setError("");
    setFuelSearch("");
    setSelectedFuels(new Set());
  }

  function onClearFile() {
    setFile(null);
    clearRunState();
    showAlert({ icon: "success", title: "Cleared", text: "PDF and results cleared successfully" });
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

  function validateAndSetFile(selectedFile, inputElement) {
    clearRunState();
    if (!selectedFile) return;

    const isPdfByMime = selectedFile.type === "application/pdf";
    const isPdfByExt = selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdfByMime && !isPdfByExt) {
      setFile(null);
      if (inputElement) inputElement.value = "";
      const msg = "Only PDF files are allowed. Please upload a .pdf report.";
      setError(msg);
      showAlert({ icon: "error", title: "Invalid File", text: msg, confirm: true });
      return;
    }

    if (selectedFile.size > MAX_FILE_MB * 1024 * 1024) {
      setFile(null);
      if (inputElement) inputElement.value = "";
      const msg = `PDF is too large (max ${MAX_FILE_MB}MB).`;
      setError(msg);
      showAlert({ icon: "error", title: "File Too Large", text: msg, confirm: true });
      return;
    }

    setFile(selectedFile);
    showAlert({ icon: "success", title: "PDF Selected", text: "File selected successfully" });
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    validateAndSetFile(event.dataTransfer.files?.[0] || null);
  }

  function toggleFuel(fuel) {
    setSelectedFuels((previous) => {
      const next = new Set(previous);
      if (next.has(fuel)) next.delete(fuel);
      else next.add(fuel);
      return next;
    });
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
              className="absolute -left-24 top-32 h-[360px] w-[360px] rounded-full bg-blue-600/10 blur-3xl"
              animate={{ y: [0, 10, 0], x: [0, 10, 0] }}
              transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              aria-hidden
              className="absolute -right-24 bottom-12 h-[360px] w-[360px] rounded-full bg-emerald-500/10 blur-3xl"
              animate={{ y: [0, -12, 0], x: [0, -10, 0] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        ) : null}
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        <div className="sticky top-3 z-40 mb-6">
          <Card className="px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black tracking-tight text-blue-600">FUELWATCH</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-700">Fuel Demand Forecasting</span>
                    {result?.ok ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                        <BadgeCheck className="h-3.5 w-3.5" /> Ready
                      </span>
                    ) : null}
                  </div>
                  <div className="truncate text-xs text-slate-600">Upload PDF -> Generate -> Analyze -> Export</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="subtle" icon={RefreshCw} onClick={onCheckHealth} disabled={loading} title="Check ML service">
                  Check Service
                </Button>
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
                <Button icon={TrendingUp} onClick={onGenerate} disabled={loading || !!fileError} title={fileError || "Generate forecast"}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    "Generate"
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="mb-6">
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Fuelwatch - Fuel Quantity Predictions</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">Weekly, monthly, and annual fuel demand analyzer with premium engineering features.</p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatPill icon={Gauge} label="Forecast Mode" value={(forecastObj?.mode || mode || "").toUpperCase()} sub={MODE_OPTIONS.find((m) => m.value === mode)?.hint} tone="info" />
          <StatPill icon={FileText} label="Document Status" value={file ? "Ready" : "Missing"} sub={file ? `${file.name} • ${niceBytes(file.size)}` : "Upload a PDF file"} tone={file ? "success" : "danger"} />
          <StatPill icon={CheckCircle2} label="Service Health" value={health?.status || "Not checked"} sub={health ? `Model loaded: ${String(health.model_loaded)}` : "Use Check Service to verify"} tone={health ? "success" : "default"} />
          <StatPill
            icon={TrendingUp}
            label="Grand Total (L)"
            value={totals ? formatNumber(grandTotal) : "-"}
            sub={totals ? (topFuel ? `Top: ${topFuel.fuel} (${formatNumber(topFuel.value)} L)` : `Fuel types: ${fuelKeys.length}`) : "Generate forecast"}
            tone={totals ? "default" : "warn"}
          />
        </div>

        <Card>
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
                  onChange={(nextMode) => {
                    setMode(nextMode);
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
                  <div className="text-sm font-black text-slate-900">PDF Report (Required)</div>
                  {file ? (
                    <Button variant="subtle" icon={Trash2} onClick={onClearFile} title="Remove selected file">
                      Clear
                    </Button>
                  ) : null}
                </div>

                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
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
                  <input
                    id="fuel-forecast-file"
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    disabled={loading || savingForecast}
                    onChange={(event) => validateAndSetFile(event.target.files?.[0] || null, event.target)}
                  />

                  <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-emerald-500/5 to-purple-600/10" />
                  </div>
                  <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-600/10 blur-3xl" />
                  <div className="pointer-events-none absolute -left-16 -bottom-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

                  <div className="relative flex items-center gap-4 text-left">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm">
                      {file ? <FileText className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900">{file ? "PDF selected" : "Drag & drop a PDF here"}</div>
                      <div className="mt-1 text-xs text-slate-600">
                        {file ? (
                          <>
                            <span className="font-black">{file.name}</span> • {niceBytes(file.size)}
                          </>
                        ) : (
                          <>
                            Or click to browse. Max size <span className="font-black">{MAX_FILE_MB}MB</span>.
                          </>
                        )}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black text-slate-700 shadow-sm">
                        <Info className="h-3.5 w-3.5 text-blue-600" /> PDF
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
              {health ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 rounded-2xl border border-emerald-300/60 bg-emerald-50/70 p-4 text-sm text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5" />
                  <div>
                    <div className="font-black">Service OK</div>
                    <div className="mt-1 text-xs opacity-90">
                      Status: <span className="font-black">{health.status || "ok"}</span> • Model loaded: <span className="font-black">{String(health.model_loaded)}</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  Tip: Click <span className="font-black">Check Service</span> regularly.
                </div>
              )}

              {error ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 rounded-2xl border border-rose-300/70 bg-rose-50/80 p-4 text-sm text-rose-800">
                  <AlertCircle className="mt-0.5 h-5 w-5" />
                  <div>
                    <div className="font-black">Request failed</div>
                    <div className="mt-1 text-xs opacity-90">{error}</div>
                  </div>
                </motion.div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                  Upload a PDF and click <span className="font-black">Generate</span> to view charts and tables.
                </div>
              )}
            </div>
          </div>
        </Card>

        <AnimatePresence>
          {forecastObj && totals ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-6 space-y-5">
              <SectionCard>
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
                          <div className="mt-1 truncate font-black">{ingested}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white p-1">
                        <button
                          type="button"
                          onClick={() => setActiveTab("charts")}
                          className={cx("flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition", activeTab === "charts" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50")}
                        >
                          <BarChart3 className="h-4 w-4" /> Charts
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("tables")}
                          className={cx("flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition", activeTab === "tables" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50")}
                        >
                          <FileText className="h-4 w-4" /> Tables
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
                        <Button variant="subtle" icon={CloudUpload} onClick={onSaveForecast} disabled={savingForecast}>
                          Save
                        </Button>
                        <Button
                          variant="subtle"
                          icon={RefreshCw}
                          onClick={() => {
                            setFuelSearch("");
                            setSelectedFuels(new Set(fuelKeys));
                            showAlert({ icon: "success", title: "Filters Reset", text: "All filters restored" });
                          }}
                        >
                          Reset Filters
                        </Button>
                      </div>
                    </div>
                  </div>

                  <SoftDivider />

                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                      <Search className="h-4 w-4 text-slate-600" />
                      <input
                        value={fuelSearch}
                        onChange={(event) => setFuelSearch(event.target.value)}
                        placeholder="Search fuel type..."
                        className="w-64 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-500"
                      />
                      {fuelSearch ? (
                        <button type="button" onClick={() => setFuelSearch("")} className="rounded-lg p-1 hover:bg-slate-50" title="Clear search">
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>

                    <FuelLegendChips fuelKeys={filteredFuelKeys} selected={selectedFuels} onToggle={toggleFuel} onAll={() => setSelectedFuels(new Set(fuelKeys))} onNone={() => setSelectedFuels(new Set())} />
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
                        <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                          <TrendingUp className="h-4 w-4 text-blue-600" /> Grand total: {formatNumber(grandTotal)} L
                        </span>
                        {topFuel ? (
                          <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                            <Sparkles className="h-4 w-4 text-blue-600" /> Top: {topFuel.fuel}
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
                        <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                          <Info className="h-4 w-4 text-blue-600" /> Showing: {selectedFuels.size}/{fuelKeys.length}
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
                              {fuelKeys.map((fuel, index) => {
                                if (!selectedFuels.has(fuel)) return null;
                                return <Line key={fuel} type="monotone" dataKey={fuel} name={fuel} stroke={FUEL_COLORS[index % FUEL_COLORS.length]} strokeWidth={lineWidth} dot={false} />;
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
                    <ChartCard icon={BarChart3} title="Month-wise Forecast (Jan-Dec)" subtitle="Annual planning view with monthly fuel predictions.">
                      <div className="h-[400px] w-full rounded-2xl border border-slate-200 bg-white p-3">
                        {monthlyChartData.length ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyChartData}>
                              <CartesianGrid strokeDasharray={gridDash} />
                              <XAxis dataKey="Month" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              {fuelKeys.map((fuel, index) => {
                                if (!selectedFuels.has(fuel)) return null;
                                return <Bar key={fuel} dataKey={fuel} name={fuel} fill={FUEL_COLORS[index % FUEL_COLORS.length]} radius={[10, 10, 0, 0]} />;
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
                  <SectionCard>
                    <div className="p-5 sm:p-6">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-black tracking-tight">Totals Table</div>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-700">Sorted by total</span>
                      </div>
                      <div className="overflow-hidden rounded-[24px] border border-slate-200">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                              <th className="px-4 py-3.5">Fuel Type</th>
                              <th className="px-4 py-3.5">Predicted Total (L)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {totalsChartData.map((row, index) => (
                              <tr key={row.fuel} className={cx("border-t border-slate-200", index % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                                <td className="px-4 py-3.5 font-black text-slate-900">
                                  <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: FUEL_COLORS[index % FUEL_COLORS.length] }} />
                                    {row.fuel}
                                  </div>
                                </td>
                                <td className="px-4 py-3.5 tabular-nums text-slate-700">{formatNumber(row.value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </SectionCard>

                  <SectionCard>
                    <div className="p-5 sm:p-6">
                      <div className="mb-3 text-lg font-black tracking-tight">{isAnnual ? "Month-wise Table (Annual)" : "Daily Breakdown"}</div>
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                        {(isAnnual ? monthly : daily)?.length ? (
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr className="bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-600">
                                {Object.keys((isAnnual ? monthly : daily)[0]).map((key) => (
                                  <th key={key} className="px-4 py-3">
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(isAnnual ? monthly : daily).map((row, rowIndex) => (
                                <tr key={rowIndex} className={cx("border-t border-slate-200", rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                                  {Object.keys((isAnnual ? monthly : daily)[0]).map((key) => (
                                    <td key={key} className="px-4 py-3 tabular-nums">
                                      {key === "Date" ? shortDate(row[key]) : typeof row[key] === "number" ? formatNumber(row[key]) : String(row[key])}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="grid h-[260px] place-items-center text-sm text-slate-600">No breakdown data available for this run.</div>
                        )}
                      </div>
                    </div>
                  </SectionCard>
                </div>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {loading ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mt-6 grid gap-5">
              <SectionCard>
                <div className="p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <div className="text-sm font-black">Generating forecast...</div>
                    <span className="ml-auto inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black text-slate-700">
                      <Sparkles className="h-3.5 w-3.5 text-blue-600" /> Please wait
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

        <div className="mt-10 text-center text-xs text-slate-500">FuelWatch Fuel Quantity Predictions • Enhanced Premium Experience</div>
      </div>
    </div>
  );
}
