// src/pages/Anomaly.jsx - ✅ MONGODB + CRITICAL ALERTS + BACK BUTTON
import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TablePagination,
  Drawer,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Switch,
  Snackbar,
  Collapse
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack"; // ✅ BACK BUTTON
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";

const LIVE_API = "http://localhost:8081/api/anomalies?isLive=true";
const SAMPLE_API = "http://localhost:8081/api/anomalies";
const RESOLVE_API = "http://localhost:8081/api/anomalies/resolve";

const transformMongoData = (mongoData) => {
  return mongoData.map((doc) => ({
    id: doc.id || doc._id?.toString() || Math.random().toString(36).substr(2, 9),
    date: new Date(doc.readingtime || doc.timestamp).toLocaleString("sv-SE", {
      timeZone: "Asia/Colombo"
    }),
    stationId: doc.stationId || "ST001",
    stationName: doc.stationname || "Ceypetco - Colombo 7",
    fuelType: doc.fueltype || "Petrol 92",
    volume: (() => {
      const vol = doc.fuelvolumel || doc['fuelvolumel'] || doc.fuel_volume_l || doc.volume || 1000;
      const numericVol = parseFloat(vol) || 0;
      return numericVol.toLocaleString() + 'L';
    })(),
    numericVolume: parseFloat(doc.fuelvolumel || doc['fuelvolumel'] || doc.fuel_volume_l || doc.volume || 0),
    score: parseFloat(doc.anomalyscores || doc.score || 0),
    status: doc.status === "Resolved" ? 
            "Resolved" :
            doc.anomalytypes === "Sudden Drop" ? "Critical" :
            doc.anomalytypes === "Unusual small change" ? "Warning" :
            doc.anomalytypes === "Unexpected refill" ? "Warning" :
            "Info",
    reason: `${doc.anomalytypes || "Anomaly"}: ${doc.volumediff || 0}L (${(doc.anomalyscores * 100 || 0).toFixed(1)}%)`,
    raw: doc
  }));
};

// ✅ SAMPLE DATA
const SAMPLE_ANOMALIES = [
  {
    id: "CRIT001",
    date: "2026-01-06 11:35 AM",
    stationId: "ST001",
    stationName: "Ceypetco - Colombo 7",
    fuelType: "Petrol 92",
    volume: "-1,250L",
    numericVolume: -1250,
    score: 0.945,
    status: "Critical",
    reason: "🚨 SUDDEN DROP: 1250L lost in 15min - THEFT/LEAK SUSPECTED"
  },
  {
    id: "CRIT002",
    date: "2026-01-06 11:37 AM",
    stationId: "ST001",
    stationName: "Ceypetco - Colombo 7",
    fuelType: "Diesel",
    volume: "-950L",
    numericVolume: -950,
    score: 0.923,
    status: "Critical",
    reason: "🚨 MAJOR DROP: 950L vanished - IMMEDIATE INSPECTION REQUIRED"
  },
  {
    id: "WARN001",
    date: "2026-01-06 11:20 AM",
    stationId: "ST001",
    stationName: "Ceypetco - Colombo 7",
    fuelType: "Auto Diesel",
    volume: "450L",
    numericVolume: 450,
    score: 0.823,
    status: "Warning",
    reason: "⚠️ Unexpected refill of 450L during peak hours"
  },
  {
    id: "CRIT003",
    date: "2026-01-06 11:39 AM",
    stationId: "ST002",
    stationName: "Ceypetco - Maharagama",
    fuelType: "Petrol 95",
    volume: "-2,100L",
    numericVolume: -2100,
    score: 0.978,
    status: "Critical",
    reason: "🚨 CRITICAL: 2100L tank drained - FUEL THEFT CONFIRMED"
  }
];

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}

function getComparator(order, orderBy) {
  return order === "desc"
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

// ✅ CRITICAL ALERT OVERLAY (unchanged)
const CriticalAlertOverlay = ({ alerts, onDismiss, onResolve }) => {
  if (!alerts.length) return null;

  return (
    <>
      <Box sx={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0,
        zIndex: 1400,
        bgcolor: 'error.main',
        color: 'white',
        py: 1,
        px: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 4px 20px rgba(211,47,47,0.5)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ErrorOutlineIcon />
          <Typography variant="h6" fontWeight="bold">
            🚨 {alerts.length} CRITICAL ALERT{alerts.length > 1 ? 'S' : ''} ACTIVE
          </Typography>
        </Box>
        <Button 
          size="small" 
          variant="outlined" 
          onClick={() => alerts.forEach(a => onDismiss(a.id))}
          sx={{ color: 'white', borderColor: 'white', '&:hover': { borderColor: 'white' } }}
        >
          Dismiss All
        </Button>
      </Box>

      <Box sx={{ 
        position: 'fixed', 
        top: 80, 
        left: 20, 
        zIndex: 1300,
        maxWidth: 450,
        maxHeight: '70vh',
        overflowY: 'auto'
      }}>
        {alerts.slice(0, 5).map((alert, index) => (
          <Collapse key={alert.id} in={true} timeout={400 + index * 100} sx={{ mb: 1 }}>
            <Paper
              elevation={20}
              sx={{
                bgcolor: 'error.main',
                color: 'white',
                p: 2.5,
                borderRadius: 2,
                borderLeft: '5px solid #FF1744',
                boxShadow: '0 12px 40px rgba(211,47,47,0.6)',
                transform: 'scale(1)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ErrorOutlineIcon sx={{ fontSize: 28, color: '#FFEBEE' }} />
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">#{alert.id}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.9 }}>{alert.stationName}</Typography>
                  </Box>
                </Box>
                <IconButton onClick={() => onDismiss(alert.id)} size="small" sx={{ color: 'white', ml: 1 }}>
                  <CloseIcon />
                </IconButton>
              </Box>
              <Typography variant="body2" fontWeight="500" sx={{ mb: 1.5 }}>{alert.reason}</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Chip label={alert.fuelType} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
                <Chip label={`${alert.numericVolume}L`} size="small" color="error" variant="outlined" />
                <Chip label={`${(alert.score * 100).toFixed(0)}%`} size="small" sx={{ bgcolor: 'rgba(255,235,238,0.3)', color: 'error.light' }} />
              </Box>
              <Button size="small" variant="contained" onClick={() => onResolve(alert)} sx={{ flex: 1, bgcolor: 'white', color: 'error.main', fontWeight: 600, '&:hover': { bgcolor: '#FFEBEE' } }}>
                RESOLVE
              </Button>
            </Paper>
          </Collapse>
        ))}
      </Box>
    </>
  );
};

function Anomaly() {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const prevCriticalCountRef = useRef(0);

  // Filters & pagination
  const [fuelFilter, setFuelFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchId, setSearchId] = useState("");
  const [order, setOrder] = useState("desc");
  const [orderBy, setOrderBy] = useState("score");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Drawer
  const [selected, setSelected] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // ✅ BACK BUTTON HANDLER
  const handleBack = () => {
    // Navigate back in browser history
    window.history.back();
    // OR use React Router: useNavigate(-1) if you have react-router-dom
  };

  // handleMarkResolved, fetchAnomalies (unchanged)
  const handleMarkResolved = async (anomalyId) => {
    if (!isLive) {
      setAnomalies(prev => prev.map(anomaly => anomaly.id === anomalyId ? { ...anomaly, status: "Resolved" } : anomaly));
      setSnackbar({ open: true, message: '✅ Marked as resolved (sample)', severity: 'success' });
      setDrawerOpen(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${RESOLVE_API}/${anomalyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Resolved', resolvedAt: new Date().toISOString() })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      await fetchAnomalies();
      setSnackbar({ open: true, message: `✅ #${anomalyId} RESOLVED in MongoDB!`, severity: 'success' });
      setDrawerOpen(false);
    } catch (err) {
      setSnackbar({ open: true, message: `❌ Resolve failed: ${err.message}`, severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAnomalies = async () => {
    setLoading(true);
    setError(null);
    const apiUrl = isLive ? LIVE_API : SAMPLE_API;
    
    try {
      const response = await fetch(apiUrl, { headers: { 'Content-Type': 'application/json' } });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const data = await response.json();
      const transformed = transformMongoData(Array.isArray(data) ? data : []);
      setAnomalies(transformed);
    } catch (err) {
      console.error("API Error:", err);
      setError(isLive ? "🔄 MongoDB down - using samples" : "Backend error");
      setAnomalies(SAMPLE_ANOMALIES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();
  }, [isLive]);

  // CRITICAL ALERTS LOGIC (unchanged)
  useEffect(() => {
    const criticals = anomalies.filter(a => a.status === "Critical");
    const prevCount = prevCriticalCountRef.current;
    
    if (criticals.length > prevCount) {
      const newCriticals = criticals.slice(-Math.abs(criticals.length - prevCount));
      newCriticals.forEach(alert => {
        setCriticalAlerts(prev => {
          if (prev.some(a => a.id === alert.id)) return prev;
          return [{ ...alert, createdAt: Date.now() }, ...prev.slice(0, 9)];
        });
      });
    }
    
    prevCriticalCountRef.current = criticals.length;
    setCriticalAlerts(prev => prev.filter(alert => criticals.some(c => c.id === alert.id)));
  }, [anomalies]);

  const handleDismissAlert = (alertId) => {
    setCriticalAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const handleResolveFromAlert = async (alert) => {
    await handleMarkResolved(alert.id);
    handleDismissAlert(alert.id);
  };

  // Rest of hooks unchanged...
  const fuelTypes = useMemo(() => ["All", ...new Set(anomalies.map(a => a.fuelType))], [anomalies]);
  const filtered = useMemo(() => 
    anomalies.filter(a => {
      const fuelMatch = fuelFilter === "All" || a.fuelType === fuelFilter;
      const statusMatch = statusFilter === "All" || a.status === statusFilter;
      const searchMatch = !searchId || a.id.toString().includes(searchId);
      return fuelMatch && statusMatch && searchMatch;
    }), [anomalies, fuelFilter, statusFilter, searchId]
  );
  const sorted = useMemo(() => [...filtered].sort(getComparator(order, orderBy)), [filtered, order, orderBy]);
  const paginated = useMemo(() => sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage), [sorted, page, rowsPerPage]);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const openDetails = (row) => {
    setSelected(row);
    setDrawerOpen(true);
  };

  const handleSnackbarClose = () => setSnackbar({ ...snackbar, open: false });

  const StatusChip = ({ status }) => {
    const icons = {
      Critical: <ErrorOutlineIcon fontSize="small" />,
      Warning: <WarningAmberIcon fontSize="small" />,
      Resolved: <CheckCircleOutlineIcon fontSize="small" />,
      Info: <InfoOutlinedIcon fontSize="small" />
    };
    const colors = { Critical: "error", Warning: "warning", Resolved: "success", Info: "info" };
    return <Chip label={status} color={colors[status] || "default"} size="small" icon={icons[status]} />;
  };

  const total = anomalies.length;
  const critical = anomalies.filter(a => a.status === "Critical").length;
  const warnings = anomalies.filter(a => a.status === "Warning").length;
  const resolved = anomalies.filter(a => a.status === "Resolved").length;

  if (loading && anomalies.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
        <Typography ml={2}>Loading {isLive ? "LIVE MongoDB" : "samples"}...</Typography>
      </Box>
    );
  }

  return (
    <>
      <CriticalAlertOverlay alerts={criticalAlerts} onDismiss={handleDismissAlert} onResolve={handleResolveFromAlert} />

      <Box sx={{ p: 3, maxWidth: 1400, pt: criticalAlerts.length > 0 ? 80 : 0 }}>
        {/* ✅ HEADER WITH BACK BUTTON */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          {/* BACK BUTTON */}
          <Tooltip title="Go Back">
            <IconButton 
              onClick={handleBack}
              sx={{ 
                bgcolor: '#F5F5F5', 
                color: '#666', 
                '&:hover': { bgcolor: '#E0E0E0' },
                mr: 1
              }}
              size="large"
            >
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>

          {/* PAGE TITLE */}
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" fontWeight="bold" color="#351B65" gutterBottom>
              Fuel Anomaly Detection
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {isLive ? `🟢 LIVE MongoDB: ${total} anomalies` : `📊 Samples: ${total}`}
              {criticalAlerts.length > 0 && ` | 🚨 ${criticalAlerts.length} CRITICAL ALERTS`}
            </Typography>
          </Box>

          {/* CONTROLS */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: '#F5F5F5', p: 1, borderRadius: 1 }}>
              <Switch checked={isLive} onChange={(e) => setIsLive(e.target.checked)} color="primary" />
              <Typography variant="body2" fontWeight="medium" ml={0.5}>
                {isLive ? "LIVE" : "Samples"}
              </Typography>
            </Box>
            <IconButton onClick={fetchAnomalies} disabled={loading} sx={{ bgcolor: '#ECEAF7', '&:hover': { bgcolor: '#D4C9FF' } }}>
              <RefreshIcon />
            </IconButton>
          </Box>
        </Box>

        {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

        {/* KPIs */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, borderLeft: '4px solid #351B65' }}>
              <Typography variant="body2" color="text.secondary">Total</Typography>
              <Typography variant="h4" fontWeight="bold">{total}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, borderLeft: '4px solid #D32F2F' }}>
              <Typography variant="body2" color="text.secondary">
                Critical {criticalAlerts.length > 0 && `(${criticalAlerts.length})`}
              </Typography>
              <Typography variant="h4" color="error">{critical}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, borderLeft: '4px solid #ED6C02' }}>
              <Typography variant="body2" color="text.secondary">Warnings</Typography>
              <Typography variant="h4" color="warning.main">{warnings}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper sx={{ p: 2, borderLeft: '4px solid #2E7D32' }}>
              <Typography variant="body2" color="text.secondary">Resolved</Typography>
              <Typography variant="h6" color="success.main">{resolved}</Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Filters, Table, Drawer (EXACTLY SAME - unchanged) */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField fullWidth size="small" label="Search ID" value={searchId} onChange={(e) => setSearchId(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth size="small" label="Fuel Type" value={fuelFilter} onChange={(e) => setFuelFilter(e.target.value)}>
                {fuelTypes.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField select fullWidth size="small" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <MenuItem value="All">All Status</MenuItem>
                <MenuItem value="Critical">Critical</MenuItem>
                <MenuItem value="Warning">Warning</MenuItem>
                <MenuItem value="Resolved">Resolved</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Paper>

        {filtered.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">No anomalies match filters</Typography>
          </Paper>
        ) : (
          <>
            <Paper sx={{ overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell><TableSortLabel active={orderBy === 'id'} direction={orderBy === 'id' ? order : 'asc'} onClick={() => handleRequestSort('id')}>ID</TableSortLabel></TableCell>
                      <TableCell>Date/Time</TableCell>
                      <TableCell>Station</TableCell>
                      <TableCell>Fuel Type</TableCell>
                      <TableCell>Volume (L)</TableCell>
                      <TableCell><TableSortLabel active={orderBy === 'score'} direction={orderBy === 'score' ? order : 'desc'} onClick={() => handleRequestSort('score')}>Score</TableSortLabel></TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginated.map((row) => (
                      <TableRow key={row.id} hover sx={{ cursor: 'pointer' }} onClick={() => openDetails(row)}>
                        <TableCell>{row.id}</TableCell>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.stationName}</TableCell>
                        <TableCell>{row.fuelType}</TableCell>
                        <TableCell sx={{ color: row.numericVolume < 0 ? 'error.main' : 'success.main' }}>{row.volume}</TableCell>
                        <TableCell>{row.score.toFixed(3)}</TableCell>
                        <TableCell><StatusChip status={row.status} /></TableCell>
                        <TableCell align="right">
                          <Button size="small" onClick={(e) => { e.stopPropagation(); openDetails(row); }} disabled={row.status === "Resolved"}>
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={filtered.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25]}
              />
            </Paper>
          </>
        )}

        {/* Drawer (unchanged) */}
        <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)} ModalProps={{ keepMounted: true }} PaperProps={{ sx: { width: 380 } }}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>Anomaly Details #{selected?.id}</Typography>
            {selected && (
              <>
                <Divider sx={{ mb: 2 }} />
                <Grid container spacing={2}>
                  <Grid item xs={6}><Typography variant="subtitle2" color="text.secondary">Station</Typography><Typography fontWeight="medium">{selected.stationName}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="subtitle2" color="text.secondary">Fuel</Typography><Typography>{selected.fuelType}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="subtitle2" color="text.secondary">Time</Typography><Typography>{selected.date}</Typography></Grid>
                  <Grid item xs={6}><Typography variant="subtitle2" color="text.secondary">Volume</Typography><Typography sx={{ color: selected.numericVolume < 0 ? 'error.main' : 'success.main' }}>{selected.numericVolume > 0 ? '+' : ''}{selected.numericVolume}L</Typography></Grid>
                  <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary" gutterBottom>Score</Typography><Typography fontWeight="bold">{selected.score.toFixed(3)}</Typography></Grid>
                  <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary" gutterBottom>Status</Typography><StatusChip status={selected.status} /></Grid>
                  <Grid item xs={12}><Typography variant="subtitle2" color="text.secondary" gutterBottom>Reason</Typography><Typography variant="body2" sx={{ bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>{selected.reason}</Typography></Grid>
                </Grid>
                <Button fullWidth variant="contained" size="large" sx={{ mt: 3, bgcolor: selected?.status === "Resolved" ? "success.main" : '#351B65', '&:hover': { bgcolor: selected?.status === "Resolved" ? "success.dark" : '#2A1661' } }} onClick={() => handleMarkResolved(selected.id)} disabled={loading || selected?.status === "Resolved"}>
                  {loading ? <CircularProgress size={24} color="inherit" /> : selected?.status === "Resolved" ? "✅ RESOLVED" : "Mark Resolved"}
                </Button>
              </>
            )}
          </Box>
        </Drawer>

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleSnackbarClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </>
  );
}

export default Anomaly;
