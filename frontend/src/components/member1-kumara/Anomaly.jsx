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
// Styled “premium” card
// ==============================
function GlassCard({ children, sx }) {
  const theme = useTheme();
  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.common.white, 0.08)}`,
        background:
          theme.palette.mode === "dark"
            ? `linear-gradient(180deg, ${alpha("#0b1220", 0.9)}, ${alpha("#0b1220", 0.6)})`
            : `linear-gradient(180deg, ${alpha("#ffffff", 0.9)}, ${alpha("#ffffff", 0.65)})`,
        backdropFilter: "blur(14px)",
        boxShadow:
          theme.palette.mode === "dark"
            ? "0 18px 55px -35px rgba(0,0,0,0.9)"
            : "0 18px 55px -35px rgba(0,0,0,0.35)",
        ...sx,
      }}
    >
      <Box
        sx={{
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          opacity: theme.palette.mode === "dark" ? 0.5 : 0.7,
          background:
            "radial-gradient(900px 220px at 10% 0%, rgba(37,99,235,0.20), transparent 60%)," +
            "radial-gradient(700px 220px at 80% 10%, rgba(16,185,129,0.16), transparent 60%)," +
            "radial-gradient(800px 300px at 55% 110%, rgba(139,92,246,0.14), transparent 55%)",
        }}
      />
      <Box sx={{ position: "relative" }}>{children}</Box>
    </Paper>
  );
}

function MetricCard({ label, value, sub, tone = "primary", icon, sx }) {
  const theme = useTheme();
  const palette =
    tone === "danger"
      ? theme.palette.error
      : tone === "success"
      ? theme.palette.success
      : tone === "warning"
      ? theme.palette.warning
      : theme.palette.primary;

  return (
    <GlassCard sx={{ p: 2, ...sx }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            color: palette.contrastText,
            background: `linear-gradient(135deg, ${palette.main}, ${alpha(palette.main, 0.65)})`,
            boxShadow: `0 10px 30px -18px ${alpha(palette.main, 0.7)}`,
          }}
        >
          {icon}
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800, letterSpacing: 0.5 }}>
            {label}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
            {value}
          </Typography>
          {sub ? (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {sub}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </GlassCard>
  );
}

function SeverityChip({ pred }) {
  const flagged = pred === 1 || pred === true;
  return flagged ? (
    <Chip
      label="FLAG"
      size="small"
      icon={<WarningAmberRoundedIcon />}
      sx={{
        fontWeight: 900,
        bgcolor: (t) => alpha(t.palette.error.main, t.palette.mode === "dark" ? 0.22 : 0.12),
        color: "error.main",
        border: (t) => `1px solid ${alpha(t.palette.error.main, 0.3)}`,
      }}
    />
  ) : (
    <Chip
      label="OK"
      size="small"
      icon={<CheckCircleRoundedIcon />}
      sx={{
        fontWeight: 900,
        bgcolor: (t) => alpha(t.palette.success.main, t.palette.mode === "dark" ? 0.22 : 0.12),
        color: "success.main",
        border: (t) => `1px solid ${alpha(t.palette.success.main, 0.25)}`,
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
      const station = String(r.station_name || r.stationName || r.site_name || r.site || r.tank_name || r.tankName || r.station_id || r.stationId || "").toLowerCase();
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
    const station = r.station_name || r.stationName || r.site_name || r.site || r.tank_name || r.tankName || r.station_id || r.stationId || "-";
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
        channel: notifyChannel,   // email
        roles: notifyRoles,       // ["SUPERVISOR","MANAGER"]
        message: notifyMessage,

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
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1500, mx: "auto" }}>
      <GlassCard sx={{ mb: 2 }}>
        <Box sx={{ p: { xs: 2.25, md: 3 } }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2.5,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.08),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                  }}
                >
                  <InsightsRoundedIcon sx={{ color: "primary.main" }} />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="overline" sx={{ letterSpacing: 0.8, fontWeight: 900, color: "text.secondary" }}>
                    FuelWatch • Anomaly Detection
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 950, lineHeight: 1.15 }}>
                    Fuel Dispensing Irregularities
                  </Typography>
                </Box>
              </Stack>

              <Typography variant="body2" sx={{ mt: 1, color: "text.secondary", maxWidth: 860 }}>
                Upload monthly report → run ML scan → review scored days + grouped events. Adjust threshold to see results update automatically for the same file.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Tooltip title="Export current results (JSON)">
                <span>
                  <IconButton
                    onClick={() => downloadJSON("anomaly_results.json", { scoredDays, events, threshold: decisionThreshold })}
                    disabled={!scoredDays.length && !events.length}
                    sx={{
                      borderRadius: 2,
                      border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
                      bgcolor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.04 : 0.55),
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
                    border: `1px solid ${alpha(theme.palette.common.white, 0.12)}`,
                    bgcolor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.04 : 0.55),
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
                  fontWeight: 950,
                  textTransform: "none",
                  boxShadow: `0 18px 45px -30px ${alpha(theme.palette.primary.main, 0.85)}`,
                }}
              >
                {loading ? "Scanning…" : "Run ML Scan"}
              </Button>
            </Stack>
          </Stack>

          {loading ? (
            <Box sx={{ mt: 2 }}>
              <LinearProgress
                sx={{
                  height: 10,
                  borderRadius: 999,
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.08),
                  "& .MuiLinearProgress-bar": { borderRadius: 999 },
                }}
              />
              <Typography variant="caption" sx={{ display: "block", mt: 0.8, color: "text.secondary" }}>
                Upload parsing + model scoring in progress…
              </Typography>
            </Box>
          ) : null}
        </Box>
      </GlassCard>

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      <GlassCard sx={{ mb: 2 }}>
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
                  borderColor: alpha(theme.palette.primary.main, 0.35),
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.08 : 0.03),
                  "&:hover": {
                    borderColor: alpha(theme.palette.primary.main, 0.55),
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.05),
                  },
                }}
              >
                {file ? `Selected: ${file.name}` : "Upload CSV / XLSX"}
                <input hidden type="file" accept=".csv,.xlsx,.xls" onChange={(e) => onPickFile(e.target.files?.[0] || null)} />
              </Button>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Tip: Use clean monthly exports; threshold changes auto-rerun after first scan.
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
                    bgcolor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.04 : 0.55),
                  },
                }}
              >
                {[0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85].map((v) => (
                  <MenuItem key={v} value={v}>
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
                      bgcolor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.04 : 0.55),
                    },
                  }}
                />
                <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                  <FormControlLabel
                    control={<Switch checked={showOnlyFlagged} onChange={(e) => setShowOnlyFlagged(e.target.checked)} />}
                    label="Only flagged"
                    sx={{ ".MuiFormControlLabel-label": { fontWeight: 800, fontSize: 13 } }}
                  />
                  <FormControlLabel
                    control={<Switch checked={dense} onChange={(e) => setDense(e.target.checked)} />}
                    label="Dense"
                    sx={{ ".MuiFormControlLabel-label": { fontWeight: 800, fontSize: 13 } }}
                  />
                </Stack>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </GlassCard>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard label="Scored Days" value={scoredDays.length} sub="Rows processed by model" tone="primary" icon={<TableChartRoundedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard label="Flagged Days" value={flaggedDays.length} sub="Predicted irregularities" tone="danger" icon={<WarningAmberRoundedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard label="Threshold" value={decisionThreshold} sub={file && lastFileNameRef.current === file.name ? "Auto rerun enabled" : "Set then scan"} tone="success" icon={<TuneRoundedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            label="Avg Score"
            value={safeFixed(avgScore)}
            sub={maxScoreRow ? `Max: ${safeFixed(maxScoreRow._score)} (${String(maxScoreRow.day || maxScoreRow.date || "").slice(0, 10)})` : "No data yet"}
            tone="warning"
            icon={<WhatshotRoundedIcon />}
          />
        </Grid>
      </Grid>

      <GlassCard sx={{ mb: 2 }}>
        <Box sx={{ px: 2, pt: 1.5 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": { fontWeight: 950, textTransform: "none" },
              "& .MuiTabs-indicator": { height: 4, borderRadius: 999 },
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

        <Divider sx={{ opacity: 0.6 }} />

        {tab === 0 ? (
          <Box sx={{ p: { xs: 2.25, md: 3 } }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={7}>
                <GlassCard sx={{ p: 2.25 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <InsightsRoundedIcon color="primary" />
                    <Typography variant="h6" fontWeight={950}>
                      What you’re seeing
                    </Typography>
                  </Stack>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    This scanner flags days that look abnormal based on the uploaded station report. Increase the threshold to reduce false positives; decrease it to catch more anomalies.
                  </Typography>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
                    <Chip
                      icon={<TuneRoundedIcon />}
                      label={`Threshold: ${decisionThreshold}`}
                      sx={{
                        fontWeight: 900,
                        bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.08),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                      }}
                    />
                    <Chip icon={<WarningAmberRoundedIcon />} label={`Flagged: ${flaggedDays.length}`} color="error" variant="outlined" sx={{ fontWeight: 900 }} />
                    <Chip icon={<TableChartRoundedIcon />} label={`Scored: ${scoredDays.length}`} color="primary" variant="outlined" sx={{ fontWeight: 900 }} />
                  </Stack>

                  <Divider sx={{ my: 2, opacity: 0.6 }} />

                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                    <Button
                      variant="outlined"
                      startIcon={<DownloadRoundedIcon />}
                      disabled={!filteredScoredDays.length}
                      onClick={() => downloadCSV("scored_days_filtered.csv", filteredScoredDays.map(mapRow))}
                      sx={{ borderRadius: 2, fontWeight: 950, textTransform: "none" }}
                    >
                      Export filtered scored days (CSV)
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<DownloadRoundedIcon />}
                      disabled={!events.length}
                      onClick={() => downloadCSV("events.csv", events)}
                      sx={{ borderRadius: 2, fontWeight: 950, textTransform: "none" }}
                    >
                      Export events (CSV)
                    </Button>

                    {/* ✅ NEW: open form */}
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<WarningAmberRoundedIcon />}
                      disabled={!scoredDays.length}
                      onClick={openNotifyForm}
                      sx={{ borderRadius: 2, fontWeight: 950, textTransform: "none" }}
                    >
                      Notify Responsible Staff
                    </Button>
                  </Stack>

                  <Typography variant="caption" sx={{ display: "block", mt: 1.2, color: "text.secondary" }}>
                    Safety: Notifications are deduplicated + cooldown-controlled by the backend policy.
                  </Typography>
                </GlassCard>
              </Grid>

              <Grid item xs={12} md={5}>
                <GlassCard sx={{ p: 2.25 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <WarningAmberRoundedIcon color="error" />
                    <Typography variant="h6" fontWeight={950}>
                      Highest score snapshot
                    </Typography>
                  </Stack>

                  {!maxScoreRow ? (
                    <Typography color="text.secondary">No data yet. Upload a report and run scan.</Typography>
                  ) : (
                    (() => {
                      const row = mapRow(maxScoreRow);
                      return (
                        <Stack spacing={1.2}>
                          <Chip
                            icon={<WhatshotRoundedIcon />}
                            label={`Max score: ${safeFixed(row.score)} `}
                            sx={{
                              width: "fit-content",
                              fontWeight: 900,
                              bgcolor: alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.2 : 0.12),
                              border: `1px solid ${alpha(theme.palette.warning.main, 0.25)}`,
                            }}
                          />
                          <Typography variant="body2">
                            <b>Day:</b> {String(row.day)}
                          </Typography>
                          <Typography variant="body2">
                            <b>Station:</b> {String(row.station)}
                          </Typography>
                          <Typography variant="body2">
                            <b>Fuel:</b> {String(row.fuel)}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" sx={{ fontWeight: 900 }}>
                              Prediction:
                            </Typography>
                            <SeverityChip pred={row.pred} />
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {row.reason ? String(row.reason).slice(0, 180) : "—"}
                          </Typography>
                        </Stack>
                      );
                    })()
                  )}
                </GlassCard>
              </Grid>
            </Grid>
          </Box>
        ) : null}

        {/* Events tab */}
        {tab === 1 ? (
          <Box sx={{ p: { xs: 2.25, md: 3 } }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <WarningAmberRoundedIcon color="error" />
              <Typography variant="h6" fontWeight={950}>
                Top Events (Grouped)
              </Typography>
              <Chip
                label={`${events.length} total`}
                size="small"
                sx={{
                  ml: 1,
                  fontWeight: 900,
                  bgcolor: alpha(theme.palette.error.main, theme.palette.mode === "dark" ? 0.2 : 0.12),
                  border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
                }}
              />
            </Stack>

            <Divider sx={{ mb: 2, opacity: 0.6 }} />

            {events.length === 0 ? (
              <Typography color="text.secondary">No events yet. Upload a report and run scan.</Typography>
            ) : (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
                  bgcolor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.03 : 0.65),
                }}
              >
                <Table size={dense ? "small" : "medium"}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 950 }}>Event</TableCell>
                      <TableCell sx={{ fontWeight: 950 }}>Start Day</TableCell>
                      <TableCell sx={{ fontWeight: 950 }}>End Day</TableCell>
                      <TableCell sx={{ fontWeight: 950 }}>Days</TableCell>
                      <TableCell sx={{ fontWeight: 950 }}>Max Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {events.slice(0, 20).map((ev, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell sx={{ fontWeight: 900 }}>#{idx + 1}</TableCell>
                        <TableCell>{ev.start_day || ev.start || ev.startDay || "-"}</TableCell>
                        <TableCell>{ev.end_day || ev.end || ev.endDay || "-"}</TableCell>
                        <TableCell>{ev.days || ev.length || "-"}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={String(ev.max_score ?? ev.maxScore ?? ev.score ?? "-")}
                            sx={{
                              fontWeight: 900,
                              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.10),
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
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
              <Typography variant="h6" fontWeight={950}>
                Scored Days
              </Typography>

              <Chip
                label={`${filteredScoredDays.length} shown`}
                size="small"
                sx={{
                  ml: 1,
                  fontWeight: 900,
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.18 : 0.10),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                }}
              />
            </Stack>

            <Divider sx={{ mb: 2, opacity: 0.6 }} />

            {filteredScoredDays.length === 0 ? (
              <Typography color="text.secondary">No scored days yet. Upload a report and run scan.</Typography>
            ) : (
              <TableContainer
                component={Paper}
                elevation={0}
                sx={{
                  maxHeight: 560,
                  borderRadius: 3,
                  border: `1px solid ${alpha(theme.palette.common.white, 0.10)}`,
                  bgcolor: alpha(theme.palette.common.white, theme.palette.mode === "dark" ? 0.03 : 0.65),
                }}
              >
                <Table stickyHeader size={dense ? "small" : "medium"}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 950 }}>Day</TableCell>
                      <TableCell sx={{ fontWeight: 950 }}>Station</TableCell>
                      <TableCell sx={{ fontWeight: 950 }}>Fuel</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 950 }}>
                        Score
                      </TableCell>
                      <TableCell sx={{ fontWeight: 950 }}>Pred</TableCell>
                      <TableCell sx={{ fontWeight: 950 }}>Reason</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {filteredScoredDays.slice(0, 500).map((r, idx) => {
                      const row = mapRow(r);
                      return (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>{String(row.day)}</TableCell>
                          <TableCell sx={{ maxWidth: 280 }}>
                            <Typography noWrap fontWeight={800}>
                              {String(row.station)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={String(row.fuel)}
                              size="small"
                              sx={{
                                fontWeight: 900,
                                bgcolor: alpha(theme.palette.secondary.main, theme.palette.mode === "dark" ? 0.16 : 0.10),
                                border: `1px solid ${alpha(theme.palette.secondary.main, 0.18)}`,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 900 }}>
                            {safeFixed(row.score)}
                          </TableCell>
                          <TableCell>
                            <SeverityChip pred={row.pred} />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 520 }}>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>
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
      </GlassCard>

      {/* ✅ Notification Form Dialog */}
      <Dialog open={notifyOpen} onClose={() => setNotifyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>
          Send Notification to Responsible Staff
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Station ID"
              value={notifyStation}
              onChange={(e) => setNotifyStation(e.target.value)}
              fullWidth
            />

            <TextField
              select
              label="Severity"
              value={notifySeverity}
              onChange={(e) => setNotifySeverity(e.target.value)}
              fullWidth
              helperText="Severity controls escalation + cooldown."
            >
              <MenuItem value="Advisory">Advisory</MenuItem>
              <MenuItem value="Warning">Warning</MenuItem>
              <MenuItem value="Critical">Critical</MenuItem>
            </TextField>

            <TextField
              select
              label="Channel"
              value={notifyChannel}
              onChange={(e) => setNotifyChannel(e.target.value)}
              fullWidth
            >
              <MenuItem value="email">Email</MenuItem>
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
            >
              {["SUPERVISOR", "MANAGER", "SENIOR_MANAGER"].map((role) => (
                <MenuItem key={role} value={role}>
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
            />

            <GlassCard sx={{ p: 1.5 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Recipients available in DB for this station:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                {recipientOptions.length
                  ? recipientOptions.map((u) => `${u.role}: ${u.email}`).join(" • ")
                  : "No recipients loaded (seed users first)."}
              </Typography>
            </GlassCard>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setNotifyOpen(false)} sx={{ borderRadius: 2, fontWeight: 900 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleSendManual}
            disabled={notifySending}
            startIcon={notifySending ? <CircularProgress size={18} color="inherit" /> : <WarningAmberRoundedIcon />}
            sx={{ borderRadius: 2, fontWeight: 950, textTransform: "none" }}
          >
            {notifySending ? "Sending…" : "Send Alert"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={3500} onClose={closeSnack} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
        <Alert onClose={closeSnack} severity={snackbar.severity} sx={{ width: "100%", borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
