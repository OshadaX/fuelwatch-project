// src/pages/SensorTest.jsx - ✅ STANDALONE + MONGODB LOGGING
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
  Snackbar,
  Alert,
  Grid,
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
  Select
} from "@mui/material";

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import HistoryIcon from "@mui/icons-material/History";
import SensorOccupiedIcon from "@mui/icons-material/SensorOccupied";

const API_BASE = "http://localhost:8081";

function SensorTest() {
  const [testResult, setTestResult] = useState(null);
  const [testLogs, setTestLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stationId, setStationId] = useState("ST001");
  const [tankCapacity, setTankCapacity] = useState(32);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info"
  });

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const stations = [
    { id: "ST001", name: "Ceypetco - Colombo 7", capacity: 32 },
    { id: "ST002", name: "Ceypetco - Maharagama", capacity: 32 },
    { id: "ST003", name: "LIOC - Borella", capacity: 45 }
  ];

  // Trigger sensor test
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

  // Load test logs
  const loadTestLogs = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/sensor/logs`);
      if (response.ok) {
        const logs = await response.json();
        setTestLogs(logs);
      }
    } catch (error) {
      console.error("Failed to load logs:", error);
    }
  }, []);

  useEffect(() => {
    loadTestLogs();
    const interval = setInterval(loadTestLogs, 5000);
    return () => clearInterval(interval);
  }, [loadTestLogs]);

  const paginatedLogs = testLogs.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box sx={{ p: 4, maxWidth: 1400 }}>
      {/* HEADER */}
      <Paper elevation={8} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="h3" fontWeight="bold" color="#1976D2">
              <SensorOccupiedIcon
                sx={{ fontSize: 48, mr: 2, verticalAlign: "middle" }}
              />
              Ultrasonic Sensor Test
            </Typography>
            <Typography variant="h6" color="text.secondary">
              JSN-SR04T Fuel Level Sensor – MongoDB Logging
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }} textAlign="center">
            <Fab
              size="large"
              color="primary"
              onClick={runSensorTest}
              disabled={loading}
              sx={{ width: 100, height: 100 }}
            >
              {loading ? (
                <CircularProgress size={44} />
              ) : (
                <PlayArrowIcon sx={{ fontSize: 36 }} />
              )}
            </Fab>
            <Typography variant="h6" mt={1} fontWeight="bold">
              RUN TEST
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      {/* CONFIG */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          Test Configuration
        </Typography>

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <FormControl fullWidth>
              <InputLabel>Station</InputLabel>
              <Select
                value={stationId}
                label="Station"
                onChange={(e) => {
                  const station = stations.find(
                    (s) => s.id === e.target.value
                  );
                  setStationId(e.target.value);
                  if (station) setTankCapacity(station.capacity);
                }}
              >
                {stations.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name} ({s.capacity}L)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              label="Tank Capacity"
              type="number"
              value={tankCapacity}
              onChange={(e) =>
                setTankCapacity(parseFloat(e.target.value) || 32)
              }
              helperText="Liters"
            />
          </Grid>

          <Grid size={{ xs: 12, md: 4 }} alignSelf="center">
            <Chip
              label={`Tank: ${tankCapacity}L`}
              color="primary"
              size="large"
            />
          </Grid>
        </Grid>
      </Paper>

      {/* HISTORY */}
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" fontWeight="bold" mb={3}>
          <HistoryIcon sx={{ mr: 1, verticalAlign: "middle" }} />
          Test History
        </Typography>

        <TableContainer sx={{ maxHeight: 500 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Station</TableCell>
                <TableCell>Distance</TableCell>
                <TableCell>Fuel Level</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedLogs.map((log) => (
                <TableRow key={log._id || log.id}>
                  <TableCell>
                    {new Date(log.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip label={log.stationId} size="small" />
                  </TableCell>
                  <TableCell>{log.reading?.toFixed(1)} cm</TableCell>
                  <TableCell>{log.fuelLevel?.toFixed(1)} L</TableCell>
                  <TableCell>
                    <Chip
                      label={log.status}
                      color={log.status === "FAILED" ? "error" : "success"}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={testLogs.length}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ open: false })}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}

export default SensorTest;
