import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  MenuItem,
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
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import WhatshotRoundedIcon from "@mui/icons-material/WhatshotRounded";

import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const currentUser = JSON.parse(localStorage.getItem("fuelwatch_user") || "null");
const managerEmail = currentUser?.email || "";
const MySwal = withReactContent(Swal);

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 4200,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener("mouseenter", Swal.stopTimer);
    toast.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

const ML_API = "http://127.0.0.1:8090/ml/score-report";
const BACKEND = "http://localhost:8081";
const DEFAULT_THRESHOLD = 0.65;


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
          isDark ? 0.1 : 0.08
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
            bgcolor: alpha(palette.main, isDark ? 0.2 : 0.12),
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
              borderColor: (t) => alpha(t.palette.success.main, 0.3),
              bgcolor: (t) => alpha(t.palette.success.main, t.palette.mode === "dark" ? 0.12 : 0.06),
            }),
      }}
    />
  );
}

export default function Anomaly() {
  const theme = useTheme();

  const [file, setFile] = useState(null);
  const decisionThreshold = DEFAULT_THRESHOLD;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [scoredDays, setScoredDays] = useState([]);
  const [events, setEvents] = useState([]);

  const [tab, setTab] = useState(0);

  const lastFileNameRef = useRef(null);

  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifySeverity, setNotifySeverity] = useState("Warning");
  const [notifyChannel, setNotifyChannel] = useState("email");
  const [notifyRoles, setNotifyRoles] = useState(["MANAGER"]);
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifySending, setNotifySending] = useState(false);

  const [stationPreviewLoading, setStationPreviewLoading] = useState(false);
  const [stationPreview, setStationPreview] = useState(null);
  const [stationPreviewError, setStationPreviewError] = useState("");

  const loaderOpenRef = useRef(false);

  const toast = (message, severity = "success") => {
    const icon =
      severity === "success"
        ? "success"
        : severity === "error"
        ? "error"
        : severity === "warning"
        ? "warning"
        : "info";
    Toast.fire({ icon, title: message });
  };

  const showBlockingLoading = (title = "Processing…", text = "Please wait") => {
    loaderOpenRef.current = true;
    MySwal.fire({
      title,
      text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
  };

  const closeBlockingLoading = () => {
    if (!loaderOpenRef.current) return;
    loaderOpenRef.current = false;
    Swal.close();
  };

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

  const filteredScoredDays = useMemo(() => scoredDays, [scoredDays]);

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

  //manager email
  const getManagerEmail = () => {
    try {
      const u = JSON.parse(localStorage.getItem("fuelwatch_user") || "null");
      const email = u?.email || "";
      return String(email).trim().toLowerCase();
    } catch {
      return "";
    }
  };

  //ML SCAN
  const handleRunScan = useCallback(async () => {
    if (!file) {
      toast("Please select only CSV file.", "warning");
      return;
    }

    setLoading(true);
    setError("");

    showBlockingLoading("Processing…", "Uploading file and scoring days");

    try {
      const form = new FormData();
      form.append("file", file);

      const url = `${ML_API}?threshold=${decisionThreshold}`;
      const res = await fetch(url, { method: "POST", body: form });

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        const msg = data?.detail?.message || data?.detail || data?.error || "Scan failed";
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

      closeBlockingLoading();
      toast("Completed Successfully", "success");
      setTab(0);

      await MySwal.fire({
        icon: "success",
        title: "Process completed",
        html: `
          <div style="text-align:left">
            <div><b>Scored days:</b> ${Array.isArray(scored) ? scored.length : 0}</div>
            <div><b>Events:</b> ${Array.isArray(grouped) ? grouped.length : 0}</div>
            <div><b>Threshold:</b> ${decisionThreshold}</div>
          </div>
        `,
        confirmButtonText: "OK",
      });
    } catch (e) {
      const msg = e?.message || "Unknown error";
      setError(msg);
      setScoredDays([]);
      setEvents([]);

      closeBlockingLoading();
      toast(`${msg}`, "error");

      await MySwal.fire({
        icon: "error",
        title: "Scan failed",
        text: msg,
        confirmButtonText: "Close",
      });
    } finally {
      closeBlockingLoading();
      setLoading(false);
    }
  }, [file, decisionThreshold]);

  const onPickFile = (f) => {
    setFile(f);
    setError("");
    setScoredDays([]);
    setEvents([]);
    lastFileNameRef.current = null;

    if (f) toast(`Selected: ${f.name}`, "info");
  };

  const onReset = async () => {
    const result = await MySwal.fire({
      icon: "warning",
      title: "Reset page state?",
      text: "This will clear the selected file and all results.",
      showCancelButton: true,
      confirmButtonText: "Yes, reset",
      cancelButtonText: "Cancel",
      confirmButtonColor: theme.palette.error.main,
    });

    if (!result.isConfirmed) return;

    onPickFile(null);
    toast("Reset completed", "info");
  };

  const openNotifyForm = async () => {
    if (!scoredDays.length) {
      toast("Run the process first to notify staff.", "warning");
      return;
    }

    const managerEmail = getManagerEmail();
    setStationPreview(null);
    setStationPreviewError("");
    setStationPreviewLoading(true);

    setNotifyMessage(
      maxScoreRow?.reason
        ? `Detected irregularity: ${String(maxScoreRow.reason).slice(0, 180)}`
        : "Please review the detected irregularity and take action."
    );

    setNotifyOpen(true);

    try {
      const res = await fetch(`${BACKEND}/api/station/by-manager/${encodeURIComponent(managerEmail)}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        const msg = data?.message || data?.error || "Cannot find station for this manager email";
        setStationPreviewError(msg);
        toast(msg, "error");
        return;
      }

      setStationPreview(data.station || null);
      toast("Station verified for this manager.", "success");
    } catch (e) {
      const msg = e?.message || "Station verification failed";
      setStationPreviewError(msg);
      toast(msg, "error");
    } finally {
      setStationPreviewLoading(false);
    }
  };

  //Send manual notification
  const handleSendManual = async () => {
    if (!notifyRoles.length) {
      toast("Select at least one role.", "warning");
      return;
    }

    if (!stationPreview?.Id) {
      toast("Station is not verified", "error");
      return;
    }

    const confirm = await MySwal.fire({
      icon: "question",
      title: "Send alert now?",
      html: `
        <div style="text-align:left">
          <div><b>Manager:</b> ${getManagerEmail()}</div>
          <div><b>Station:</b> ${stationPreview?.Id || "—"} (${stationPreview?.Name || "—"})</div>
          <div><b>Severity:</b> ${notifySeverity}</div>
          <div><b>Channel:</b> ${notifyChannel}</div>
          <div><b>Roles:</b> ${notifyRoles.join(", ")}</div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Send",
      cancelButtonText: "Cancel",
      confirmButtonColor: theme.palette.error.main,
    });

    if (!confirm.isConfirmed) return;

    setNotifySending(true);
    showBlockingLoading("Please Wait...", "Process in progress");

    try {
      const payload = {
        station_id: stationPreview?.Id,
        manager_email: getManagerEmail(),
        severity: notifySeverity,
        channel: notifyChannel,
        message: notifyMessage,
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

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Failed to send alert");
      }

      const ok = data?.status === "sent" || data?.ok === true;

      closeBlockingLoading();
      toast(data?.message || (ok ? "Alert sent" : "Alert processed"), ok ? "success" : "warning");

      await MySwal.fire({
        icon: ok ? "success" : "warning",
        title: ok ? "Alert sent" : "Alert processed",
        text: data?.message || "Done",
        confirmButtonText: "OK",
      });

      setNotifyOpen(false);
    } catch (e) {
      closeBlockingLoading();
      toast(`${e?.message || "Error"}`, "error");
      await MySwal.fire({
        icon: "error",
        title: "Failed to send alert",
        text: e?.message || "Unknown error",
        confirmButtonText: "Close",
      });
    } finally {
      closeBlockingLoading();
      setNotifySending(false);
    }
  };

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
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} justifyContent="space-between">
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.1),
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
                    onClick={() => {
                      downloadJSON("anomaly_results.json", { scoredDays, events, threshold: decisionThreshold });
                      toast("Exported JSON.", "success");
                    }}
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
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.1),
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
        <EnterpriseCard sx={{ mb: 2, p: 2 }}>
          <Typography sx={{ color: theme.palette.error.main, fontWeight: 900, fontFamily: "Arial, Helvetica, sans-serif" }}>
            {error}
          </Typography>
        </EnterpriseCard>
      ) : null}

      {/* Controls */}
      <EnterpriseCard sx={{ mb: 2 }}>
        <Box sx={{ p: { xs: 2.25, md: 3 } }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
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
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.1 : 0.05),
                  "&:hover": {
                    borderColor: alpha(theme.palette.primary.main, 0.4),
                    bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.14 : 0.07),
                  },
                  fontFamily: "Arial, Helvetica, sans-serif",
                }}
              >
                {file ? `Selected: ${file.name}` : "Upload CSV File"}
                <input hidden type="file" accept=".csv" onChange={(e) => onPickFile(e.target.files?.[0] || null)} />
              </Button>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "Arial, Helvetica, sans-serif" }}>
                  Important: Upload only CSV files
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </EnterpriseCard>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard label="Scored Days" value={scoredDays.length} sub="Processed count" tone="primary" icon={<TableChartRoundedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard label="Flagged Days" value={flaggedDays.length} sub="Predicted irregularities" tone="danger" icon={<WarningAmberRoundedIcon />} />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
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
                      onClick={() => {
                        downloadCSV("scored_days.csv", filteredScoredDays.map(mapRow));
                        toast("Exported scored days.", "success");
                      }}
                      sx={{ borderRadius: 2, fontWeight: 900, textTransform: "none", fontFamily: "Arial, Helvetica, sans-serif" }}
                    >
                      Export scored days
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<DownloadRoundedIcon />}
                      disabled={!events.length}
                      onClick={() => {
                        downloadCSV("events.csv", events);
                        toast("Exported events.", "success");
                      }}
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
                      Notify Responsible Person
                    </Button>
                  </Stack>
                </EnterpriseCard>
              </Grid>

              <Grid item xs={12} md={5}>
                <EnterpriseCard sx={{ p: 2.25 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <WarningAmberRoundedIcon color="error" />
                    <Typography variant="h6" fontWeight={950} sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                      Highest score - Recorded
                    </Typography>
                  </Stack>

                  {!maxScoreRow ? (
                    <Typography color="text.secondary" sx={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
                      No data yet. Upload a report.
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
                            <b>Station (from row):</b> {String(row.station)}
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
                Top Events
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
                No events yet. Upload a report.
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
                <Table size="medium">
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
                No scored days yet. Upload a report.
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
                <Table stickyHeader size="medium">
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
                                bgcolor: alpha(theme.palette.secondary.main, theme.palette.mode === "dark" ? 0.1 : 0.06),
                                fontFamily: "Arial, Helvetica, sans-serif",
                              }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontFamily: "Arial, Helvetica, sans-serif", fontWeight: 900 }}>
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

      {/* Notification Dialog */}
      <Dialog open={notifyOpen} onClose={() => setNotifyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 950, fontFamily: "Arial, Helvetica, sans-serif" }}>
          Fuelwatch - Notification Generating Portal
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Recipient Email"
              value={
                stationPreviewLoading
                  ? "Loading recipient..."
                  : stationPreview?.person?.PersonEmail || "Not available"
              }
              fullWidth
              InputProps={{ readOnly: true }}
            />

            <TextField
              label="Station"
              value={
                stationPreviewLoading
                  ? "Loading station..."
                  : stationPreview?.Id
                  ? `${stationPreview.Id} - ${stationPreview.Name || ""}`
                  : "Not verified"
              }
              fullWidth
              InputProps={{ readOnly: true }}
              helperText={
                stationPreviewError
                  ? stationPreviewError
                  : "Station selection - Automated"
              }
              error={!!stationPreviewError}
            />

            <TextField
              select
              label="Severity"
              value={notifySeverity}
              onChange={(e) => setNotifySeverity(e.target.value)}
              fullWidth
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
                Low-level
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
              label="Recipient Role"
              fullWidth
              SelectProps={{
                multiple: true,
                renderValue: (selected) => selected.join(", "),
              }}
              value={notifyRoles}
              onChange={(e) => setNotifyRoles(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: (t) => (t.palette.mode === "dark" ? alpha("#0b1220", 0.35) : "#ffffff"),
                  fontFamily: "Arial, Helvetica, sans-serif",
                },
                "& .MuiInputLabel-root": { fontFamily: "Arial, Helvetica, sans-serif" },
              }}
            >
              {["MANAGER"].map((role) => (
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
              placeholder="Subject - Based on the detected irregularity"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  bgcolor: (t) => (t.palette.mode === "dark" ? alpha("#0b1220", 0.35) : "#ffffff"),
                  fontFamily: "Arial, Helvetica, sans-serif",
                },
                "& .MuiInputLabel-root": { fontFamily: "Arial, Helvetica, sans-serif" },
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setNotifyOpen(false)}
            sx={{ borderRadius: 2, fontWeight: 900, textTransform: "none", fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleSendManual}
            disabled={notifySending || stationPreviewLoading || !stationPreview?.Id}
            startIcon={notifySending ? <CircularProgress size={18} color="inherit" /> : <WarningAmberRoundedIcon />}
            sx={{ borderRadius: 2, fontWeight: 900, textTransform: "none", boxShadow: "none", fontFamily: "Arial, Helvetica, sans-serif" }}
          >
            {notifySending ? "Sending…" : "Send Alert"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}