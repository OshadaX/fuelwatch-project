// src/pages/SensorTest.jsx - Fuelwatch-style UI + MongoDB Logging (NO Grid2)
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
  Fab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Avatar
} from "@mui/material";

import Grid from "@mui/material/Grid";
import { ThemeProvider, createTheme, alpha } from "@mui/material/styles";

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import HistoryIcon from "@mui/icons-material/History";
import SensorOccupiedIcon from "@mui/icons-material/SensorOccupied";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ErrorRoundedIcon from "@mui/icons-material/ErrorRounded";
import CloudDownloadRoundedIcon from "@mui/icons-material/CloudDownloadRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import StraightenRoundedIcon from "@mui/icons-material/StraightenRounded";
import LocalGasStationRoundedIcon from "@mui/icons-material/LocalGasStationRounded";
import ArticleRoundedIcon from "@mui/icons-material/ArticleRounded";

const API_BASE = "http://localhost:8081";

function SensorTest() {
  // ===== Theme (local dark toggle, Fuelwatch-like) =====
  const [dark, setDark] = useState(false);

  const theme = useMemo(() => {
    return createTheme({
      palette: {
        mode: dark ? "dark" : "light",
        primary: { main: "#2F6BFF" },
        secondary: { main: "#6C63FF" },
        background: {
          default: dark ? "#0B1020" : "#F6F8FF",
          paper: dark ? "#0F1730" : "#FFFFFF"
        }
      },
      shape: { borderRadius: 16 },
      typography: {
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Apple Color Emoji","Segoe UI Emoji"',
        h3: { fontWeight: 800, letterSpacing: -0.6 },
        h5: { fontWeight: 800, letterSpacing: -0.3 }
      }
    });
  }, [dark]);

  // ===== State =====
  const [testResult, setTestResult] = useState(null);
  const [testLogs, setTestLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [stationId, setStationId] = useState("ST001");
  const [tankCapacity, setTankCapacity] = useState(32);

  const [serviceStatus, setServiceStatus] = useState("Not checked"); // "OK" | "Down" | "Not checked"
  const [checkingService, setCheckingService] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info"
  });

  // Table controls
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | OK | FAILED

  const stations = useMemo(
    () => [
      { id: "ST001", name: "Ceypetco - Colombo 7", capacity: 32 },
      { id: "ST002", name: "Ceypetco - Maharagama", capacity: 32 },
      { id: "ST003", name: "LIOC - Borella", capacity: 45 }
    ],
    []
  );

  const selectedStation = useMemo(
    () => stations.find((s) => s.id === stationId),
    [stations, stationId]
  );

  // ===== API =====
  const loadTestLogs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sensor/logs`);
      if (response.ok) {
        const logs = await response.json();
        const sorted = Array.isArray(logs)
          ? [...logs].sort(
              (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
            )
          : [];
        setTestLogs(sorted);
      }
    } catch (error) {
      console.error("Failed to load logs:", error);
    }
  }, []);

  const runSensorTest = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/sensor/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationId, tankCapacity })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      setTestResult(data);

      setSnackbar({
        open: true,
        message: data.message || "✅ Test completed!",
        severity: "success"
      });

      loadTestLogs();
    } catch (error) {
      setSnackbar({
        open: true,
        message: `❌ ${error.message}`,
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkService = async () => {
    setCheckingService(true);
    try {
      const res = await fetch(`${API_BASE}/api/sensor/logs`, { method: "GET" });
      if (!res.ok) throw new Error("Service responded with error");
      setServiceStatus("OK");
      setSnackbar({
        open: true,
        message: "✅ Service is reachable",
        severity: "success"
      });
    } catch (e) {
      setServiceStatus("Down");
      setSnackbar({
        open: true,
        message: "❌ Service is not reachable",
        severity: "error"
      });
    } finally {
      setCheckingService(false);
    }
  };

  // ===== Effects =====
  useEffect(() => {
    loadTestLogs();
    const interval = setInterval(loadTestLogs, 5000);
    return () => clearInterval(interval);
  }, [loadTestLogs]);

  // ===== Derived stats =====
  const lastLog = useMemo(() => (testLogs.length ? testLogs[0] : null), [testLogs]);

  const totals = useMemo(() => {
    const ok = testLogs.filter((l) => l.status !== "FAILED").length;
    const failed = testLogs.filter((l) => l.status === "FAILED").length;
    return { ok, failed, total: testLogs.length };
  }, [testLogs]);

  // ===== Filters + pagination =====
  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return testLogs.filter((log) => {
      const matchesText =
        !q ||
        String(log.stationId || "").toLowerCase().includes(q) ||
        String(log.status || "").toLowerCase().includes(q) ||
        String(log.reading ?? "").toLowerCase().includes(q) ||
        String(log.fuelLevel ?? "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "FAILED"
          ? log.status === "FAILED"
          : log.status !== "FAILED";

      return matchesText && matchesStatus;
    });
  }, [testLogs, query, statusFilter]);

  const paginatedLogs = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredLogs.slice(start, start + rowsPerPage);
  }, [filteredLogs, page, rowsPerPage]);

  useEffect(() => {
    setPage(0);
  }, [query, statusFilter]);

  // ===== Export CSV =====
  const exportCSV = () => {
    const rows = filteredLogs.map((l) => ({
      timestamp: l.timestamp,
      stationId: l.stationId,
      reading_cm: l.reading,
      fuelLevel_l: l.fuelLevel,
      status: l.status
    }));

    const header = Object.keys(rows[0] || {}).join(",");
    const lines = rows.map((r) =>
      Object.values(r)
        .map((v) => {
          const s = v == null ? "" : String(v);
          const escaped = s.replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(",")
    );

    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `sensor_logs_${stationId}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);

    setSnackbar({
      open: true,
      message: "⬇️ Exported CSV",
      severity: "success"
    });
  };

  // ===== UI helpers =====
  const glassCardSx = (tone = "primary") => ({
    borderRadius: 4,
    overflow: "hidden",
    border: `1px solid ${alpha(theme.palette[tone].main, dark ? 0.22 : 0.14)}`,
    background: dark
      ? `linear-gradient(135deg,
          ${alpha(theme.palette[tone].main, 0.18)},
          ${alpha("#000000", 0.35)})`
      : `linear-gradient(135deg,
          ${alpha(theme.palette[tone].main, 0.12)},
          ${alpha("#FFFFFF", 0.92)})`,
    boxShadow: dark
      ? `0 18px 55px ${alpha("#000", 0.35)}`
      : `0 18px 55px ${alpha("#2F6BFF", 0.12)}`
  });

  const topBarSx = {
    position: "sticky",
    top: 0,
    zIndex: 10,
    marginBottom: 24,
    borderRadius: 4,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 12,
    paddingBottom: 12,
    border: `1px solid ${alpha(theme.palette.primary.main, dark ? 0.25 : 0.14)}`,
    backdropFilter: "blur(10px)",
    backgroundColor: alpha(
      dark ? theme.palette.background.paper : "#FFFFFF",
      dark ? 0.75 : 0.75
    )
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: "100vh",
          px: { xs: 2, md: 4 },
          py: 3,
          background: dark
            ? `radial-gradient(1200px 600px at 20% 0%, ${alpha(
                theme.palette.primary.main,
                0.25
              )}, transparent 55%),
               radial-gradient(900px 500px at 90% 20%, ${alpha(
                 theme.palette.secondary.main,
                 0.18
               )}, transparent 60%),
               ${theme.palette.background.default}`
            : `radial-gradient(1200px 600px at 20% 0%, ${alpha(
                theme.palette.primary.main,
                0.18
              )}, transparent 55%),
               radial-gradient(900px 500px at 90% 20%, ${alpha(
                 theme.palette.secondary.main,
                 0.12
               )}, transparent 60%),
               ${theme.palette.background.default}`
        }}
      >
        {/* TOP BAR */}
        <Paper elevation={0} sx={topBarSx}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  variant="rounded"
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    color: theme.palette.primary.main,
                    width: 42,
                    height: 42,
                    borderRadius: 3
                  }}
                >
                  <SensorOccupiedIcon />
                </Avatar>

                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      FUELWATCH
                    </Typography>
                    <Chip
                      label="Sensor Diagnostics"
                      size="small"
                      sx={{
                        borderRadius: 999,
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.main,
                        fontWeight: 800
                      }}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Test • Log • Analyze • Export
                  </Typography>
                </Box>
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                justifyContent="flex-end"
                alignItems={{ xs: "stretch", sm: "center" }}
              >
                <Button
                  variant="outlined"
                  startIcon={dark ? <LightModeIcon /> : <DarkModeIcon />}
                  onClick={() => setDark((v) => !v)}
                  sx={{ borderRadius: 999, textTransform: "none", fontWeight: 800 }}
                >
                  {dark ? "Light" : "Dark"}
                </Button>

                <Button
                  variant="outlined"
                  startIcon={
                    checkingService ? (
                      <AutorenewRoundedIcon className="spin" />
                    ) : (
                      <CheckCircleRoundedIcon />
                    )
                  }
                  onClick={checkService}
                  disabled={checkingService}
                  sx={{ borderRadius: 999, textTransform: "none", fontWeight: 800 }}
                >
                  Check Service
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<CloudDownloadRoundedIcon />}
                  onClick={exportCSV}
                  sx={{ borderRadius: 999, textTransform: "none", fontWeight: 800 }}
                >
                  Export
                </Button>

                <Button
                  variant="contained"
                  onClick={runSensorTest}
                  disabled={loading}
                  startIcon={
                    loading ? <CircularProgress size={18} /> : <PlayArrowIcon />
                  }
                  sx={{
                    borderRadius: 999,
                    textTransform: "none",
                    fontWeight: 900,
                    px: 2.2,
                    boxShadow: `0 18px 45px ${alpha(
                      theme.palette.primary.main,
                      0.25
                    )}`
                  }}
                >
                  Run Test
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {/* PAGE TITLE */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="h3" sx={{ mb: 0.6 }}>
            Ultrasonic Sensor Test
          </Typography>
          <Typography variant="body1" color="text.secondary">
            JSN-SR04T fuel level sensor • MongoDB logging • Station-aware testing
          </Typography>
        </Box>

        {/* SUMMARY CARDS */}
        <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2.2, ...glassCardSx("primary") }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  variant="rounded"
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.18),
                    color: theme.palette.primary.main
                  }}
                >
                  <LocationOnRoundedIcon />
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">
                    Station
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 900, lineHeight: 1.15 }}
                    noWrap
                  >
                    {selectedStation?.name || stationId}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {stationId} • Tank {tankCapacity}L
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2.2, ...glassCardSx("secondary") }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  variant="rounded"
                  sx={{
                    bgcolor: alpha(theme.palette.secondary.main, 0.18),
                    color: theme.palette.secondary.main
                  }}
                >
                  {serviceStatus === "Down" ? (
                    <ErrorRoundedIcon />
                  ) : (
                    <CheckCircleRoundedIcon />
                  )}
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Service
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="h6" sx={{ fontWeight: 900 }}>
                      {serviceStatus}
                    </Typography>
                    <Chip
                      size="small"
                      label={
                        serviceStatus === "OK"
                          ? "Online"
                          : serviceStatus === "Down"
                          ? "Offline"
                          : "Pending"
                      }
                      color={
                        serviceStatus === "OK"
                          ? "success"
                          : serviceStatus === "Down"
                          ? "error"
                          : "default"
                      }
                      sx={{ borderRadius: 999, fontWeight: 800 }}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    API: {API_BASE}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2.2, ...glassCardSx("primary") }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  variant="rounded"
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.18),
                    color: theme.palette.primary.main
                  }}
                >
                  <StraightenRoundedIcon />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Last Distance
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {lastLog?.reading != null
                      ? `${Number(lastLog.reading).toFixed(1)} cm`
                      : "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {lastLog?.timestamp
                      ? new Date(lastLog.timestamp).toLocaleString()
                      : "No data yet"}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2.2, ...glassCardSx("secondary") }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar
                  variant="rounded"
                  sx={{
                    bgcolor: alpha(theme.palette.secondary.main, 0.18),
                    color: theme.palette.secondary.main
                  }}
                >
                  <LocalGasStationRoundedIcon />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Last Fuel Level
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900 }}>
                    {lastLog?.fuelLevel != null
                      ? `${Number(lastLog.fuelLevel).toFixed(1)} L`
                      : "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Logs: {totals.total} • OK: {totals.ok} • Failed: {totals.failed}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* MAIN */}
        <Grid container spacing={2.5}>
          {/* LEFT */}
          <Grid item xs={12} lg={4}>
            <Paper sx={{ p: 2.6, borderRadius: 4 }}>
              <Stack spacing={2}>
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <Avatar
                    variant="rounded"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: theme.palette.primary.main
                    }}
                  >
                    <ArticleRoundedIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h5">Test Configuration</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Choose station & capacity, then run a test
                    </Typography>
                  </Box>
                </Stack>

                <Divider />

                <FormControl fullWidth>
                  <InputLabel>Station</InputLabel>
                  <Select
                    value={stationId}
                    label="Station"
                    onChange={(e) => {
                      const station = stations.find((s) => s.id === e.target.value);
                      setStationId(e.target.value);
                      if (station) setTankCapacity(station.capacity);
                    }}
                    sx={{ borderRadius: 3 }}
                  >
                    {stations.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name} ({s.capacity}L)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  label="Tank Capacity"
                  type="number"
                  value={tankCapacity}
                  onChange={(e) => setTankCapacity(parseFloat(e.target.value) || 32)}
                  helperText="Liters"
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                />

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  <Chip label={`Station: ${stationId}`} size="small" />
                  <Chip label={`Tank: ${tankCapacity}L`} size="small" />
                </Stack>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 4,
                    border: `1px dashed ${alpha(theme.palette.primary.main, 0.25)}`,
                    background: alpha(theme.palette.primary.main, 0.04)
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography sx={{ fontWeight: 900 }}>Quick Run</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Runs test and saves a log entry
                      </Typography>
                    </Box>

                    <Tooltip title="Run Test">
                      <span>
                        <Fab
                          color="primary"
                          onClick={runSensorTest}
                          disabled={loading}
                          sx={{ width: 72, height: 72 }}
                        >
                          {loading ? (
                            <CircularProgress size={32} />
                          ) : (
                            <PlayArrowIcon sx={{ fontSize: 34 }} />
                          )}
                        </Fab>
                      </span>
                    </Tooltip>
                  </Stack>
                </Paper>
              </Stack>
            </Paper>
          </Grid>

          {/* RIGHT */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ p: 2.6, borderRadius: 4 }}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1.5}
                  alignItems={{ xs: "stretch", md: "center" }}
                  justifyContent="space-between"
                >
                  <Stack direction="row" spacing={1.2} alignItems="center">
                    <HistoryIcon sx={{ color: theme.palette.primary.main }} />
                    <Box>
                      <Typography variant="h5">Test History</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Live updates every 5 seconds
                      </Typography>
                    </Box>
                  </Stack>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                    <TextField
                      size="small"
                      placeholder="Search..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <TextField
                      size="small"
                      select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <MenuItem value="ALL">All</MenuItem>
                      <MenuItem value="OK">OK</MenuItem>
                      <MenuItem value="FAILED">Failed</MenuItem>
                    </TextField>
                    <IconButton onClick={loadTestLogs}>
                      <AutorenewRoundedIcon />
                    </IconButton>
                  </Stack>
                </Stack>

                <Divider />

                <TableContainer sx={{ maxHeight: 520 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 900 }}>Time</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Station</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Distance</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Fuel Level</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {paginatedLogs.map((log) => (
                        <TableRow
                          key={log._id || log.id || `${log.stationId}_${log.timestamp}`}
                          hover
                        >
                          <TableCell>
                            {log.timestamp
                              ? new Date(log.timestamp).toLocaleString()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Chip label={log.stationId} size="small" />
                          </TableCell>
                          <TableCell>
                            {log.reading != null
                              ? `${Number(log.reading).toFixed(1)} cm`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {log.fuelLevel != null
                              ? `${Number(log.fuelLevel).toFixed(1)} L`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={log.status || "OK"}
                              color={log.status === "FAILED" ? "error" : "success"}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}

                      {paginatedLogs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <Box sx={{ py: 6, textAlign: "center" }}>
                              <Typography sx={{ fontWeight: 900, mb: 0.5 }}>
                                No logs found
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Run a new test to generate logs.
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  component="div"
                  count={filteredLogs.length}
                  page={page}
                  onPageChange={(e, newPage) => setPage(newPage)}
                  rowsPerPage={rowsPerPage}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  rowsPerPageOptions={[5, 10, 25, 50]}
                />
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={5500}
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            sx={{ borderRadius: 3, fontWeight: 700 }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        <style>
          {`
            .spin { animation: spin 1s linear infinite; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}
        </style>
      </Box>
    </ThemeProvider>
  );
}

export default SensorTest;