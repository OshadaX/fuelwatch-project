import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  MenuItem,
  Snackbar,
  Alert,
  CircularProgress,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Stack,
  Tabs,
  Tab,
  InputAdornment,
  LinearProgress,
  Switch,
  FormControlLabel,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  ListItemText,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import WhatshotRoundedIcon from "@mui/icons-material/WhatshotRounded";

const ML_API = "http://127.0.0.1:8090/ml/score-report";
const BACKEND = "http://localhost:8081"; // ✅ your node backend

// ==============================
// Small utilities
// ==============================
function safeFixed(v, d = 3) {
  const n = Number(v);
  if (!Number.isFinite(n)) return (0).toFixed(d);
  return n.toFixed(d);
}

function downloadJSON(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(filename, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return;

  const keys = Object.keys(rows[0] || {});
  const escape = (val) => {
    const s = val == null ? "" : String(val);
    const needsQuotes = /[",\n]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };

  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r?.[k])).join(","))].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ==============================
// Enterprise surfaces + stats
// (UI-only; NO logic changes)
// Uses normal fonts (Arial / system)
// ==============================
function EnterpriseCard({ children, sx }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 10 / 4,
        border: `1px solid ${alpha(
          isDark ? theme.palette.common.white : theme.palette.common.black,
          isDark ? 0.10 : 0.08
        )}`,
        backgroundColor: isDark ? alpha("#0b1220", 0.75) : "#ffffff",
        boxShadow: isDark ? "0 8px 28px rgba(0,0,0,0.35)" : "0 10px 30px rgba(16, 24, 40, 0.06)",
        fontFamily: "Arial, Helvetica, sans-serif",
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

function StatCard({ label, value, sub, tone = "primary", icon, sx }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const palette =
    tone === "danger"
      ? theme.palette.error
      : tone === "success"
      ? theme.palette.success
      : tone === "warning"
      ? theme.palette.warning
      : theme.palette.primary;

  return (
    <EnterpriseCard sx={{ p: 2, ...sx }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(palette.main, isDark ? 0.20 : 0.12),
            border: `1px solid ${alpha(palette.main, isDark ? 0.35 : 0.18)}`,
            color: palette.main,
          }}
        >
          {icon}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 800,
              letterSpacing: 0.2,
              textTransform: "uppercase",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {label}
          </Typography>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 900,
              lineHeight: 1.1,
              mt: 0.25,
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {value}
          </Typography>

          {sub ? (
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                mt: 0.25,
                fontFamily: "Arial, Helvetica, sans-serif",
              }}
            >
              {sub}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </EnterpriseCard>
  );
}

function SeverityChip({ pred }) {
  const flagged = pred === 1 || pred === true;

  return (
    <Chip
      label={flagged ? "FLAGGED" : "OK"}
      size="small"
      icon={flagged ? <WarningAmberRoundedIcon /> : <CheckCircleRoundedIcon />}
      variant="outlined"
      sx={{
        fontWeight: 900,
        borderRadius: 999,
        fontFamily: "Arial, Helvetica, sans-serif",
        ...(flagged
          ? {
              color: "error.main",
              borderColor: (t) => alpha(t.palette.error.main, 0.35),
              bgcolor: (t) => alpha(t.palette.error.main, t.palette.mode === "dark" ? 0.12 : 0.06),
            }
          : {
              color: "success.main",
              borderColor: (t) => alpha(t.palette.success.main, 0.30),
              bgcolor: (t) => alpha(t.palette.success.main, t.palette.mode === "dark" ? 0.12 : 0.06),
            }),
      }}
    />
  );
}

export default function Anomaly() {
  const theme = useTheme();

  // -----------------------------
  // UI State
  // -----------------------------
  const [file, setFile] = useState(null);
  const [decisionThreshold, setDecisionThreshold] = useState(0.65);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // -----------------------------
  // Result State
  // -----------------------------
  const [scoredDays, setScoredDays] = useState([]);
  const [events, setEvents] = useState([]);

  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState("");
  const [showOnlyFlagged, setShowOnlyFlagged] = useState(false);
  const [dense, setDense] = useState(false);

  const lastFileNameRef = useRef(null);

  // -----------------------------
  // ✅ Notification Form State
  // -----------------------------
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyStation, setNotifyStation] = useState("UNKNOWN");
  const [notifySeverity, setNotifySeverity] = useState("Warning"); // Advisory/Warning/Critical
  const [notifyChannel, setNotifyChannel] = useState("email");
  const [notifyRoles, setNotifyRoles] = useState(["SUPERVISOR", "MANAGER"]); // default
  const [notifyMessage, setNotifyMessage] = useState("");
  const [recipientOptions, setRecipientOptions] = useState([]);
  const [notifySending, setNotifySending] = useState(false);

  const openSnack = (message, severity = "success") => setSnackbar({ open: true, message, severity });
  const closeSnack = () => setSnackbar((s) => ({ ...s, open: false }));

  const flaggedDays = useMemo(() => {
    return scoredDays.filter((r) => {
      const pred = r.pred ?? r.pred_label ?? r.label_pred ?? r.is_flagged ?? 0;
      return pred === 1 || pred === true;
    });
  }, [scoredDays]);

  const avgScore = useMemo(() => {
    if (!scoredDays.length) return 0;
    const sum = scoredDays.reduce((acc, r) => {
      const score = r.prob ?? r.prob_irregular ?? r.score ?? r.irregularity_score ?? 0;
      return acc + (Number(score) || 0);
    }, 0);
    return sum / scoredDays.length;
  }, [scoredDays]);

  const maxScoreRow = useMemo(() => {
    if (!scoredDays.length) return null;
    let best = null;
    for (const r of scoredDays) {
      const s = Number(r.prob ?? r.prob_irregular ?? r.score ?? r.irregularity_score ?? 0) || 0;
      if (!best || s > best._score) best = { ...r, _score: s };
    }
    return best;
  }, [scoredDays]);

  const filteredScoredDays = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoredDays.filter((r) => {
      const day = String(r.day || r.date || r.timestamp || "").toLowerCase();
      const station = String(
        r.station_name ||
          r.stationName ||
          r.site_name ||
          r.site ||
          r.tank_name ||
          r.tankName ||
          r.station_id ||
          r.stationId ||
          ""
      ).toLowerCase();
      const fuel = String(r.fuel_type || r.fuelType || r.item || "").toLowerCase();
      const pred = r.pred ?? r.pred_label ?? r.label_pred ?? r.is_flagged ?? 0;

      const matchesQuery = !q || day.includes(q) || station.includes(q) || fuel.includes(q);
      const matchesFlag = !showOnlyFlagged || pred === 1 || pred === true;
      return matchesQuery && matchesFlag;
    });
  }, [scoredDays, search, showOnlyFlagged]);

  // -----------------------------
  // ✅ RUN ML SCAN
  // -----------------------------
  const handleRunScan = useCallback(async () => {
    if (!file) {
      openSnack("Please choose a CSV/XLSX file first.", "warning");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", file);

      const url = `${ML_API}?threshold=${decisionThreshold}`;
      const res = await fetch(url, { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        const msg = data?.detail?.message || data?.detail || "Scan failed";
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }

      const scored =
        data?.scored_days ||
        data?.scoredDays ||
        data?.rows ||
        data?.results ||
        data?.data?.scored_days ||
        data?.data?.rows ||
        [];

      const grouped =
        data?.events ||
        data?.grouped_events ||
        data?.groupedEvents ||
        data?.data?.events ||
        data?.data?.grouped_events ||
        [];

      setScoredDays(Array.isArray(scored) ? scored : []);
      setEvents(Array.isArray(grouped) ? grouped : []);

      lastFileNameRef.current = file?.name || null;
      openSnack("✅ ML Scan Completed Successfully", "success");
      setTab(0);
    } catch (e) {
      const msg = e?.message || "Unknown error";
      setError(msg);
      setScoredDays([]);
      setEvents([]);
      openSnack(`❌ ${msg}`, "error");
    } finally {
      setLoading(false);
    }
  }, [file, decisionThreshold]);

  useEffect(() => {
    if (!file) return;
    if (lastFileNameRef.current === file.name) {
      const t = setTimeout(() => handleRunScan(), 350);
      return () => clearTimeout(t);
    }
  }, [decisionThreshold, file, handleRunScan]);

  const onPickFile = (f) => {
    setFile(f);
    setError("");
    setScoredDays([]);
    setEvents([]);
    setSearch("");
    setShowOnlyFlagged(false);
    lastFileNameRef.current = null;
  };

  const onReset = () => {
    onPickFile(null);
    openSnack("Reset completed", "info");
  };

  // -----------------------------
  // Row mapper
  // -----------------------------
  const mapRow = (r) => {
    const day = r.day || r.date || r.timestamp || "-";
    const station =
      r.station_name ||
      r.stationName ||
      r.site_name ||
      r.site ||
      r.tank_name ||
      r.tankName ||
      r.station_id ||
      r.stationId ||
      "-";
    const fuel = r.fuel_type || r.fuelType || r.item || "-";
    const score = r.prob ?? r.prob_irregular ?? r.score ?? r.irregularity_score ?? 0;
    const pred = r.pred ?? r.pred_label ?? r.label_pred ?? r.is_flagged ?? 0;
    const reason = r.reason || r.modelReason || r.note || "";
    return { day, station, fuel, score, pred, reason };
  };

  // -----------------------------
  // ✅ Open notify form
  // -----------------------------
  const openNotifyForm = async () => {
    // try best station
    const stationGuess =
      maxScoreRow?.stationId ||
      maxScoreRow?.station_id ||
      maxScoreRow?.station_name ||
      maxScoreRow?.site ||
      "UNKNOWN";

    setNotifyStation(String(stationGuess || "UNKNOWN"));
    setNotifyMessage(
      maxScoreRow?.reason
        ? `Detected anomaly: ${String(maxScoreRow.reason).slice(0, 180)}`
        : "Please review the detected anomalies and take action."
    );
    setNotifyOpen(true);

    // load recipient options
    try {
      const url = `${BACKEND}/api/notifications/recipients?station_id=${encodeURIComponent(String(stationGuess || ""))}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data?.ok) {
        setRecipientOptions(Array.isArray(data.recipients) ? data.recipients : []);
      }
    } catch {
      // ignore - UI still works
    }
  };

  // -----------------------------
  // ✅ Send manual notification
  // -----------------------------
  const handleSendManual = async () => {
    if (!notifyRoles.length) {
      openSnack("Select at least one role.", "warning");
      return;
    }

    setNotifySending(true);
    try {
      const payload = {
        station_id: notifyStation,
        severity: notifySeverity, // Advisory/Warning/Critical
        channel: notifyChannel, // email
        roles: notifyRoles, // ["SUPERVISOR","MANAGER"]
        message: notifyMessage,
        
        manager_email: JSON.parse(localStorage.getItem("user"))?.email || "unknown",
        // attach scan context (for audit + email preview)
        threshold: decisionThreshold,
        file_name: file?.name || "",
        rows: scoredDays,
        events: events,

        
      };

      const res = await fetch(`${BACKEND}/api/notifications/send-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send alert");
      }

      openSnack(data?.message || "Alert sent", data?.status === "sent" ? "success" : "warning");
      setNotifyOpen(false);
    } catch (e) {
      openSnack(`❌ ${e?.message || "Error"}`, "error");
    } finally {
      setNotifySending(false);
    }
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        maxWidth: 1500,
        mx: "auto",
        bgcolor: (t) => (t.palette.mode === "dark" ? "transparent" : "#f5f7fb"),
        minHeight: "100vh",
        borderRadius: 2,
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      {/* Header */}
      <EnterpriseCard sx={{ mb: 2 }}>
        <Box sx={{ p: { xs: 2.25, md: 3 } }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ md: "center" }}
            justifyContent="space-between"
          >
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.10),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                    color: "primary.main",
                  }}
                >
                  <InsightsRoundedIcon />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="overline"
                    sx={{
                      letterSpacing: 0.8,
                      fontWeight: 900,
                      color: "text.secondary",
                      display: "block",
                      lineHeight: 1.2,
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}
                  >
                    FuelWatch
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 950, lineHeight: 1.15, fontFamily: "Arial, Helvetica, sans-serif" }}>
                    Fuel Dispensing Irregularities Monitoring
                  </Typography>
                </Box>
              </Stack>

              
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Tooltip title="Export current results (JSON)">
                <span>
                  <IconButton
                    onClick={() => downloadJSON("anomaly_results.json", { scoredDays, events, threshold: decisionThreshold })}
                    disabled={!scoredDays.length && !events.length}
                    sx={{
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.18 : 0.08)}`,
                      bgcolor: (t) => (t.palette.mode === "dark" ? alpha("#0b1220", 0.35) : "#ffffff"),
                    }}
                  >
                    <DownloadRoundedIcon />
                  </IconButton>
                </span>
              </Tooltip>

              <Tooltip title="Reset page state">
                <IconButton
                  onClick={onReset}
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.common.black, theme.palette.mode === "dark" ? 0.18 : 0.08)}`,
                    bgcolor: (t) => (t.palette.mode === "dark" ? alpha("#0b1220", 0.35) : "#ffffff"),
                  }}
                >
                  <RestartAltRoundedIcon />
                </IconButton>
              </Tooltip>

              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PlayArrowRoundedIcon />}
                onClick={handleRunScan}
                disabled={loading || !file}
                sx={{
                  borderRadius: 2,
                  px: 2.2,
                  py: 1.05,
                  fontWeight: 900,
                  textTransform: "none",
                  boxShadow: "none",
                  fontFamily: "Arial, Helvetica, sans-serif",
                }}
              >
                {loading ? "Scanning…" : "Proceed"}
              </Button>
            </Stack>
          </Stack>

          {loading ? (
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                sx={{
                  height: 10,
                  borderRadius: 999,
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.10),
                  "& .MuiLinearProgress-bar": { borderRadius: 999 },
                }}
              />
              <Typography variant="caption" sx={{ display: "block", mt: 0.8, color: "text.secondary", fontFamily: "Arial, Helvetica, sans-serif" }}>
                Process in progress…
              </Typography>
            </Box>
          ) : null}
        </Box>
      </EnterpriseCard>

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontFamily: "Arial, Helvetica, sans-serif" }}>
          {error}
        </Alert>
      ) : null}

      {/* Controls */}
      <EnterpriseCard sx={{ mb: 2 }}>
        <Box sx={{ p: { xs: 2.25, md: 3 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Button
                variant="outlined"
                fullWidth
                component="label"
                startIcon={<UploadFileRoundedIcon />}
                sx={{
                  borderRadius: 2,
                  py: 1.25,
                  fontWeight: 900,
                  textTransform: "none",
                  borderColor: alpha(theme.palette.primary.main, 0.25),
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.10 : 0.05),
                  "&:hover": {
                    borderColor: alpha(theme.palette.primary.main, 0.40),
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.14 : 0.07),
                  },
                  fontFamily: "Arial, Helvetica, sans-serif",
                }}
              >
                {file ? `Selected: ${file.name}` : "Upload CSV / XLSX"}
                <input hidden type="file" accept=".csv,.xlsx,.xls" onChange={(e) => onPickFile(e.target.files?.[0] || null)} />
              </Button>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "Arial, Helvetica, sans-serif" }}>
                  Important: Upload only CSV reports
                </Typography>
              </Stack>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                select
                label="Decision Threshold"
                size="medium"
                fullWidth
                value={decisionThreshold}
                onChange={(e) => setDecisionThreshold(parseFloat(e.target.value))}
                helperText={file && lastFileNameRef.current === file.name ? "Auto updates after scan" : "Run scan after change"}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TuneRoundedIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    bgcolor: (t) => (t.palette.mode === "dark" ? alpha("#0b1220", 0.35) : "#ffffff"),
                    fontFamily: "Arial, Helvetica, sans-serif",
                  },
                  "& .MuiFormHelperText-root": { fontFamily: "Arial, Helvetica, sans-serif" },
                  "& .MuiInputLabel-root": { fontFamily: "Arial, Helvetica, sans-serif" },
                }}
              >
                {[0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85].map((v) => (
                  <MenuItem key={v} value={v} sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={3}>
              <Stack spacing={1}>
                <TextField
                  label="Search (day / station / fuel)"
                  size="medium"
                  fullWidth
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchRoundedIcon />
                      </InputAdornment>
                    ),
                    endAdornment: search ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearch("")}>
                          <RestartAltRoundedIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                      bgcolor: (t) => (t.palette.mode === "dark" ? alpha("#0b1220", 0.35) : "#ffffff"),
                      fontFamily: "Arial, Helvetica, sans-serif",
                    },
                    "& .MuiInputLabel-root": { fontFamily: "Arial, Helvetica, sans-serif" },
                  }}
                />

                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <FormControlLabel
                    control={<Switch checked={showOnlyFlagged} onChange={(e) => setShowOnlyFlagged(e.target.checked)} />}
                    label="Only flagged"
                    sx={{
                      ".MuiFormControlLabel-label": {
                        fontWeight: 800,
                        fontSize: 13,
                        fontFamily: "Arial, Helvetica, sans-serif",
                      },
                    }}
                  />
                  <FormControlLabel
                    control={<Switch checked={dense} onChange={(e) => setDense(e.target.checked)} />}
                    label="Dense"
                    sx={{
                      ".MuiFormControlLabel-label": {
                        fontWeight: 800,
                        fontSize: 13,
                        fontFamily: "Arial, Helvetica, sans-serif",
                      },
                    }}
                  />
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </EnterpriseCard>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Scored Days" value={scoredDays.length} sub="Processed count" tone="primary" icon={<TableChartRoundedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Flagged Days" value={flaggedDays.length} sub="Predicted irregularities" tone="danger" icon={<WarningAmberRoundedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard label="Threshold" value={decisionThreshold} sub={file && lastFileNameRef.current === file.name ? "Auto rerun enabled" : "Set threshold"} tone="success" icon={<TuneRoundedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            label="Avg Score"
            value={safeFixed(avgScore)}
            sub={maxScoreRow ? `Max: ${safeFixed(maxScoreRow._score)} (${String(maxScoreRow.day || maxScoreRow.date || "").slice(0, 10)})` : "Predicted average"}
            tone="warning"
            icon={<WhatshotRoundedIcon />}
          />
        </Grid>
      </Grid>

      {/* Tabs + Content */}
      <EnterpriseCard sx={{ mb: 2 }}>
        <Box sx={{ px: 2, pt: 1.5 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              px: 1,
              fontFamily: "Arial, Helvetica, sans-serif",
              "& .MuiTab-root": {
                fontWeight: 900,
                textTransform: "none",
                minHeight: 48,
                borderRadius: 1.5,
                mx: 0.5,
                fontFamily: "Arial, Helvetica, sans-serif",
              },
              "& .MuiTabs-indicator": { height: 3, borderRadius: 999 },
            }}
          >
            <Tab
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <InsightsRoundedIcon fontSize="small" />
                  <span>Overview</span>
                </Stack>
              }
            />
            <Tab
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Badge color="error" badgeContent={events.length} max={999}>
                    <WarningAmberRoundedIcon fontSize="small" />
                  </Badge>
                  <span>Events</span>
                </Stack>
              }
            />
            <Tab
              label={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Badge color="primary" badgeContent={filteredScoredDays.length} max={9999}>
                    <TableChartRoundedIcon fontSize="small" />
                  </Badge>
                  <span>Scored Days</span>
                </Stack>
              }
            />
          </Tabs>
        </Box>

        <Divider sx={{ opacity: 0.8 }} />

        {tab === 0 ? (
          <Box sx={{ p: { xs: 2.25, md: 3 } }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={7}>
                <EnterpriseCard sx={{ p: 2.25 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <InsightsRoundedIcon color="primary" />
                    <Typography variant="h6" fontWeight={950} sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                      General Outputs
                    </Typography>
                  </Stack>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
                    <Chip
                      icon={<TuneRoundedIcon />}
                      label={`Threshold: ${decisionThreshold}`}
                      variant="outlined"
                      sx={{
                        fontWeight: 900,
                        borderColor: alpha(theme.palette.primary.main, 0.25),
                        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.06),
                        fontFamily: "Arial, Helvetica, sans-serif",
                      }}
                    />
                    <Chip
                      icon={<WarningAmberRoundedIcon />}
                      label={`Flagged: ${flaggedDays.length}`}
                      color="error"
                      variant="outlined"
                      sx={{ fontWeight: 900, fontFamily: "Arial, Helvetica, sans-serif" }}
                    />
                    <Chip
                      icon={<TableChartRoundedIcon />}
                      label={`Scored: ${scoredDays.length}`}
                      color="primary"
                      variant="outlined"
                      sx={{ fontWeight: 900, fontFamily: "Arial, Helvetica, sans-serif" }}
                    />
                  </Stack>

                  <Divider sx={{ my: 2, opacity: 0.8 }} />

                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Button
                      variant="outlined"
                      startIcon={<DownloadRoundedIcon />}
                      disabled={!filteredScoredDays.length}
                      onClick={() => downloadCSV("scored_days_filtered.csv", filteredScoredDays.map(mapRow))}
                      sx={{ borderRadius: 2, fontWeight: 900, textTransform: "none", fontFamily: "Arial, Helvetica, sans-serif" }}
                    >
                      Export filtered scored days 
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<DownloadRoundedIcon />}
                      disabled={!events.length}
                      onClick={() => downloadCSV("events.csv", events)}
                      sx={{ borderRadius: 2, fontWeight: 900, textTransform: "none", fontFamily: "Arial, Helvetica, sans-serif" }}
                    >
                      Export events 
                    </Button>

                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<WarningAmberRoundedIcon />}
                      disabled={!scoredDays.length}
                      onClick={openNotifyForm}
                      sx={{
                        borderRadius: 2,
                        fontWeight: 900,
                        textTransform: "none",
                        boxShadow: "none",
                        fontFamily: "Arial, Helvetica, sans-serif",
                      }}
                    >
                      Notify Responsible Staff
                    </Button>
                  </Stack>
                </EnterpriseCard>
              </Grid>

              <Grid item xs={12} md={5}>
                <EnterpriseCard sx={{ p: 2.25 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <WarningAmberRoundedIcon color="error" />
                    <Typography variant="h6" fontWeight={950} sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                      Highest score snapshot
                    </Typography>
                  </Stack>

                  {!maxScoreRow ? (
                    <Typography color="text.secondary" sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                      No data yet. Upload a report and run scan.
                    </Typography>
                  ) : (
                    (() => {
                      const row = mapRow(maxScoreRow);
                      return (
                        <Stack spacing={1.2}>
                          <Chip
                            icon={<WhatshotRoundedIcon />}
                            label={`Max score: ${safeFixed(row.score)} `}
                            variant="outlined"
                            sx={{
                              width: "fit-content",
                              fontWeight: 900,
                              borderColor: alpha(theme.palette.warning.main, 0.25),
                              bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.12 : 0.06),
                              fontFamily: "Arial, Helvetica, sans-serif",
                            }}
                          />
                          <Typography variant="body2" sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                            <b>Day:</b> {String(row.day)}
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                            <b>Station:</b> {String(row.station)}
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                            <b>Fuel:</b> {String(row.fuel)}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ fontWeight: 900, fontFamily: "Arial, Helvetica, sans-serif" }}>
                              Prediction:
                            </Typography>
                            <SeverityChip pred={row.pred} />
                          </Stack>
                          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                            {row.reason ? String(row.reason).slice(0, 180) : "—"}
                          </Typography>
                        </Stack>
                      );
                    })()
                  )}
                </EnterpriseCard>
              </Grid>
            </Grid>
          </Box>
        ) : null}

        {/* Events tab */}
        {tab === 1 ? (
          <Box sx={{ p: { xs: 2.25, md: 3 } }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <WarningAmberRoundedIcon color="error" />
              <Typography variant="h6" fontWeight={950} sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                Top Events (Grouped)
              </Typography>
              <Chip
                label={`${events.length} total`}
                size="small"
                variant="outlined"
                sx={{
                  ml: 1,
                  fontWeight: 900,
                  borderColor: alpha(theme.palette.error.main, 0.25),
                  bgcolor: alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.12 : 0.06),
                  fontFamily: "Arial, Helvetica, sans-serif",
                }}
              />
            </Stack>

            <Divider sx={{ mb: 2, opacity: 0.8 }} />

            {events.length === 0 ? (
              <Typography color="text.secondary" sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                No events yet. Upload a report and run scan.
              </Typography>
            ) : (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  borderRadius: 2.25,
                  border: (t) => `1px solid ${alpha(t.palette.common.black, t.palette.mode === "dark" ? 0.15 : 0.08)}`,
                  bgcolor: (t) => (t.palette.mode === "dark" ? alpha("#0b1220", 0.35) : "#ffffff"),
                }}
              >
                <Table size={dense ? "small" : "medium"}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 950, fontFamily: "Arial, Helvetica, sans-serif" }}>Event</TableCell>
                      <TableCell sx={{ fontWeight: 950, fontFamily: "Arial, Helvetica, sans-serif" }}>Start Day</TableCell>
                      <TableCell sx={{ fontWeight: 950, fontFamily: "Arial, Helvetica, sans-serif" }}>End Day</TableCell>
                      <TableCell sx={{ fontWeight: 950, fontFamily: "Arial, Helvetica, sans-serif" }}>Days</TableCell>
                      <TableCell sx={{ fontWeight: 950, fontFamily: "Arial, Helvetica, sans-serif" }}>Max Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.slice(0, 20).map((ev, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 900, fontFamily: "Arial, Helvetica, sans-serif" }}>#{idx + 1}</TableCell>
                        <TableCell sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{ev.start_day || ev.start || ev.startDay || "-"}</TableCell>
                        <TableCell sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{ev.end_day || ev.end || ev.endDay || "-"}</TableCell>
                        <TableCell sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{ev.days || ev.length || "-"}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={String(ev.max_score ?? ev.maxScore ?? ev.score ?? "-")}
                            sx={{
                              fontWeight: 900,
                              borderColor: alpha(theme.palette.primary.main, 0.25),
                              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.06),
                              fontFamily: "Arial, Helvetica, sans-serif",
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ) : null}

        {/* Scored days tab */}
        {tab === 2 ? (
          <Box sx={{ p: { xs: 2.25, md: 3 } }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <TableChartRoundedIcon color="primary" />
              <Typography variant="h6" fontWeight={950} sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                Scored Days
              </Typography>

              <Chip
                label={`${filteredScoredDays.length} shown`}
                size="small"
                variant="outlined"
                sx={{
                  ml: 1,
                  fontWeight: 900,
                  borderColor: alpha(theme.palette.primary.main, 0.25),
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.06),
                  fontFamily: "Arial, Helvetica, sans-serif",
                }}
              />
            </Stack>

            <Divider sx={{ mb: 2, opacity: 0.8 }} />

            {filteredScoredDays.length === 0 ? (
              <Typography color="text.secondary" sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                No scored days yet. Upload a report and run scan.
              </Typography>
            ) : (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  maxHeight: 560,
                  borderRadius: 2.25,
                  border: (t) => `1px solid ${alpha(t.palette.common.black, t.palette.mode === "dark" ? 0.15 : 0.08)}`,
                  bgcolor: (t) => (t.palette.mode === "dark" ? alpha("#0b1220", 0.35) : "#ffffff"),
                }}
              >
                <Table stickyHeader size={dense ? "small" : "medium"}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 950, fontFamily: "Arial, Helvetica, sans-serif" }}>Day</TableCell>
                      <TableCell sx={{ fontWeight: 950, fontFamily: "Arial, Helvetica, sans-serif" }}>Station</TableCell>
                      <TableCell sx={{ fontWeight: 950, fontFamily: "Arial, Helvetica, sans-serif" }}>Fuel</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 950, fontFamily: "Arial, Helvetica, sans-serif" }}>
                        Score
                      </TableCell>
                      <TableCell sx={{ fontWeight: 950, fontFamily: "Arial, Helvetica, sans-serif" }}>Pred</TableCell>
                      <TableCell sx={{ fontWeight: 950, fontFamily: "Arial, Helvetica, sans-serif" }}>Reason</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {filteredScoredDays.slice(0, 500).map((r, idx) => {
                      const row = mapRow(r);
                      return (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ whiteSpace: "nowrap", fontFamily: "Arial, Helvetica, sans-serif" }}>{String(row.day)}</TableCell>
                          <TableCell sx={{ maxWidth: 280 }}>
                            <Typography noWrap fontWeight={800} sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                              {String(row.station)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={String(row.fuel)}
                              size="small"
                              variant="outlined"
                              sx={{
                                fontWeight: 900,
                                borderColor: alpha(theme.palette.secondary.main, 0.22),
                                bgcolor: alpha(theme.palette.secondary.main, theme.palette.mode === "dark" ? 0.10 : 0.06),
                                fontFamily: "Arial, Helvetica, sans-serif",
                              }}
                            />
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontFamily: "Arial, Helvetica, sans-serif",
                              fontWeight: 900,
                            }}
                          >
                            {safeFixed(row.score)}
                          </TableCell>
                          <TableCell>
                            <SeverityChip pred={row.pred} />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 520 }}>
                            <Typography variant="body2" sx={{ color: "text.secondary", fontFamily: "Arial, Helvetica, sans-serif" }}>
                              {String(row.reason || "").slice(0, 220) || "—"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ) : null}
      </EnterpriseCard>

      {/* ✅ Notification Form Dialog */}
      <Dialog open={notifyOpen} onClose={() => setNotifyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 950, fontFamily: "Arial, Helvetica, sans-serif" }}>Send Notification to Responsible Staff</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Station ID"
              value={notifyStation}
              onChange={(e) => setNotifyStation(e.target.value)}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: (t) => (t.palette.mode === "dark" ? alpha("#0b1220", 0.35) : "#ffffff"),
                  fontFamily: "Arial, Helvetica, sans-serif",
                },
                "& .MuiInputLabel-root": { fontFamily: "Arial, Helvetica, sans-serif" },
              }}
            />

            <TextField
              select
              label="Severity"
              value={notifySeverity}
              onChange={(e) => setNotifySeverity(e.target.value)}
              fullWidth
              helperText="Severity controls escalation + cooldown."
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: (t) => (t.palette.mode === "dark" ? alpha("#0b1220", 0.35) : "#ffffff"),
                  fontFamily: "Arial, Helvetica, sans-serif",
                },
                "& .MuiFormHelperText-root": { fontFamily: "Arial, Helvetica, sans-serif" },
                "& .MuiInputLabel-root": { fontFamily: "Arial, Helvetica, sans-serif" },
              }}
            >
              <MenuItem value="Advisory" sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                Advisory
              </MenuItem>
              <MenuItem value="Warning" sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                Warning
              </MenuItem>
              <MenuItem value="Critical" sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                Critical
              </MenuItem>
            </TextField>

            <TextField
              select
              label="Channel"
              value={notifyChannel}
              onChange={(e) => setNotifyChannel(e.target.value)}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: (t) => (t.palette.mode === "dark" ? alpha("#0b1220", 0.35) : "#ffffff"),
                  fontFamily: "Arial, Helvetica, sans-serif",
                },
                "& .MuiInputLabel-root": { fontFamily: "Arial, Helvetica, sans-serif" },
              }}
            >
              <MenuItem value="email" sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                Email
              </MenuItem>
            </TextField>

            <TextField
              select
              label="Recipient Roles"
              fullWidth
              SelectProps={{
                multiple: true,
                renderValue: (selected) => selected.join(", "),
              }}
              value={notifyRoles}
              onChange={(e) => setNotifyRoles(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)}
              helperText="Choose which roles should receive the alert."
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: (t) => (t.palette.mode === "dark" ? alpha("#0b1220", 0.35) : "#ffffff"),
                  fontFamily: "Arial, Helvetica, sans-serif",
                },
                "& .MuiFormHelperText-root": { fontFamily: "Arial, Helvetica, sans-serif" },
                "& .MuiInputLabel-root": { fontFamily: "Arial, Helvetica, sans-serif" },
              }}
            >
              {["SUPERVISOR", "MANAGER", "SENIOR_MANAGER"].map((role) => (
                <MenuItem key={role} value={role} sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                  <Checkbox checked={notifyRoles.indexOf(role) > -1} />
                  <ListItemText primary={role} />
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Message"
              value={notifyMessage}
              onChange={(e) => setNotifyMessage(e.target.value)}
              fullWidth
              multiline
              minRows={4}
              placeholder="Explain what was detected and what action is required."
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: (t) => (t.palette.mode === "dark" ? alpha("#0b1220", 0.35) : "#ffffff"),
                  fontFamily: "Arial, Helvetica, sans-serif",
                },
                "& .MuiInputLabel-root": { fontFamily: "Arial, Helvetica, sans-serif" },
              }}
            />

            <EnterpriseCard sx={{ p: 1.5 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "Arial, Helvetica, sans-serif" }}>
                Recipients available in DB for this station:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, fontFamily: "Arial, Helvetica, sans-serif" }}>
                {recipientOptions.length
                  ? recipientOptions.map((u) => `${u.role}: ${u.email}`).join(" • ")
                  : "No recipients loaded (seed users first)."}
              </Typography>
            </EnterpriseCard>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setNotifyOpen(false)} sx={{ borderRadius: 2, fontWeight: 900, textTransform: "none", fontFamily: "Arial, Helvetica, sans-serif" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSendManual}
            disabled={notifySending}
            startIcon={notifySending ? <CircularProgress size={18} color="inherit" /> : <WarningAmberRoundedIcon />}
            sx={{ borderRadius: 2, fontWeight: 900, textTransform: "none", boxShadow: "none", fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            {notifySending ? "Sending…" : "Send Alert"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={3500} onClose={closeSnack} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={closeSnack} severity={snackbar.severity} sx={{ width: "100%", borderRadius: 2, fontFamily: "Arial, Helvetica, sans-serif" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}