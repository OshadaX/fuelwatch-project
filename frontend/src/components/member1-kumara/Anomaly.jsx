// src/components/member1-kumara/Anomaly.jsx
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
} from "@mui/material";

const ML_API = "http://127.0.0.1:8090/ml/score-report";

export default function Anomaly() {
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

  // Track last scanned file so threshold dropdown can rerun automatically
  const lastFileNameRef = useRef(null);

  // -----------------------------
  // Helpers
  // -----------------------------
  const openSnack = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnack = () => setSnackbar((s) => ({ ...s, open: false }));

  // KPI: flagged days detection (supports multiple backend field names)
  const flaggedDays = useMemo(() => {
    return scoredDays.filter((r) => {
      const pred = r.pred ?? r.pred_label ?? r.label_pred ?? r.is_flagged ?? 0;
      return pred === 1 || pred === true;
    });
  }, [scoredDays]);

  // -----------------------------
  // ✅ RUN ML SCAN (functional threshold)
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

      // IMPORTANT: threshold affects pred on backend
      const url = `${ML_API}?threshold=${decisionThreshold}`;
      const res = await fetch(url, { method: "POST", body: form });
      const data = await res.json();

      console.log("✅ ML RESPONSE:", data);

      if (!res.ok) {
        const msg = data?.detail?.message || data?.detail || "Scan failed";
        throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
      }

      // Defensive extraction (supports many backend response shapes)
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

      // mark last scanned file for threshold auto-rerun
      lastFileNameRef.current = file?.name || null;

      openSnack("✅ ML Scan Completed Successfully", "success");
    } catch (e) {
      console.error("❌ Scan error:", e);
      const msg = e?.message || "Unknown error";
      setError(msg);
      setScoredDays([]);
      setEvents([]);
      openSnack(`❌ ${msg}`, "error");
    } finally {
      setLoading(false);
    }
  }, [file, decisionThreshold]);

  // -----------------------------
  // ✅ AUTO re-run scan when threshold changes (if same file already scanned)
  // -----------------------------
  useEffect(() => {
    if (!file) return;

    // only auto rerun if this file was already scanned at least once
    if (lastFileNameRef.current === file.name) {
      const t = setTimeout(() => {
        handleRunScan();
      }, 350);
      return () => clearTimeout(t);
    }
  }, [decisionThreshold, file, handleRunScan]);

  // If user picks a new file, clear old results & allow a fresh scan
  const onPickFile = (f) => {
    setFile(f);
    setError("");
    setScoredDays([]);
    setEvents([]);
    lastFileNameRef.current = null; // new file not scanned yet
  };

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <Box sx={{ p: 3, maxWidth: 1400 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Fuel Dispensing Irregularities
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Upload monthly report → run ML scan → view scored days + grouped events (threshold dropdown updates results)
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Upload + Threshold */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <Button variant="outlined" component="label" fullWidth>
              {file ? `SELECTED: ${file.name}` : "UPLOAD CSV / XLSX"}
              <input
                hidden
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => onPickFile(e.target.files?.[0] || null)}
              />
            </Button>
          </Grid>

          <Grid item xs={12} md={2}>
            <TextField
              select
              label="Decision Threshold"
              size="small"
              fullWidth
              value={decisionThreshold}
              onChange={(e) => setDecisionThreshold(parseFloat(e.target.value))}
              helperText={file && lastFileNameRef.current === file.name ? "Auto updates" : "Run scan after change"}
            >
              {[0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85].map((v) => (
                <MenuItem key={v} value={v}>
                  {v}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleRunScan}
              disabled={loading}
              sx={{ height: 40 }}
            >
              {loading ? (
                <>
                  <CircularProgress size={18} sx={{ mr: 1 }} />
                  Scanning...
                </>
              ) : (
                "RUN ML SCAN"
              )}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, borderLeft: "5px solid #351B65" }}>
            <Typography variant="body2" color="text.secondary">
              Scored Days
            </Typography>
            <Typography variant="h4" fontWeight="bold">
              {scoredDays.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, borderLeft: "5px solid #D32F2F" }}>
            <Typography variant="body2" color="text.secondary">
              Flagged Days
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="error.main">
              {flaggedDays.length}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, borderLeft: "5px solid #2E7D32" }}>
            <Typography variant="body2" color="text.secondary">
              Threshold
            </Typography>
            <Typography variant="h4" fontWeight="bold" color="success.main">
              {decisionThreshold}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Top Events */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" fontWeight="bold">
          Top Events (Grouped)
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Consecutive flagged days grouped into events.
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {events.length === 0 ? (
          <Typography color="text.secondary">
            No events yet. Upload a report and run scan.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Event</TableCell>
                  <TableCell>Start Day</TableCell>
                  <TableCell>End Day</TableCell>
                  <TableCell>Days</TableCell>
                  <TableCell>Max Score</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.slice(0, 10).map((ev, idx) => (
                  <TableRow key={idx}>
                    <TableCell>#{idx + 1}</TableCell>
                    <TableCell>{ev.start_day || ev.start || ev.startDay || "-"}</TableCell>
                    <TableCell>{ev.end_day || ev.end || ev.endDay || "-"}</TableCell>
                    <TableCell>{ev.days || ev.length || "-"}</TableCell>
                    <TableCell>
                      {String(ev.max_score ?? ev.maxScore ?? ev.score ?? "-")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Scored Days Table */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Scored Days
        </Typography>

        {scoredDays.length === 0 ? (
          <Typography color="text.secondary">
            No scored days yet. Upload a report and run scan.
          </Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 500 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Day</TableCell>
                  <TableCell>Station</TableCell>
                  <TableCell>Fuel</TableCell>
                  <TableCell align="right">Score</TableCell>
                  <TableCell>Pred</TableCell>
                  <TableCell>Reason</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {scoredDays.slice(0, 300).map((r, idx) => {
                  const day = r.day || r.date || r.timestamp || "-";

                  // ✅ FIX nan station mapping: support many possible backend keys
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

                  // ✅ FIX score always 0.000: backend often returns "prob"
                  const score =
                    r.prob ??
                    r.prob_irregular ??
                    r.score ??
                    r.irregularity_score ??
                    0;

                  const pred = r.pred ?? r.pred_label ?? r.label_pred ?? r.is_flagged ?? 0;

                  // backend may return reason or not
                  const reason = r.reason || r.modelReason || r.note || "";

                  return (
                    <TableRow key={idx} hover>
                      <TableCell>{String(day)}</TableCell>
                      <TableCell>{String(station)}</TableCell>
                      <TableCell>{String(fuel)}</TableCell>
                      <TableCell align="right">{Number(score || 0).toFixed(3)}</TableCell>
                      <TableCell>
                        {pred === 1 || pred === true ? (
                          <Chip label="FLAG" color="error" size="small" />
                        ) : (
                          <Chip label="OK" color="success" size="small" />
                        )}
                      </TableCell>
                      <TableCell>{String(reason).slice(0, 180)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={closeSnack}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={closeSnack} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
