const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load env first
dotenv.config();

const connectDB = require("./src/config/db");

// Routes
const authRoutes = require("./src/routes/member1-kumara/auth.routes");
const stationRoutes = require("./src/routes/member1-kumara/station.routes");
const fuelRoutes = require("./src/routes/member1-kumara/fuel.routes");
const sensorRoutes = require("./src/routes/member1-kumara/sensor.routes");
const anomalyRoutes = require("./src/routes/member1-kumara/anomaly.routes");
const uploadRoutes = require("./src/routes/member1-kumara/upload.routes");
const employeeRoutes = require("./src/routes/member3-oshada/employee.routes");
const attendanceRoutes = require("./src/routes/member3-oshada/attendance.routes");

// (Optional) Models: only needed if you rely on auto-index creation or model side-effects.
// Safe to keep.
require("./src/models/member1-kumara/RegistrationModel");
require("./src/models/member1-kumara/SensorModel");
require("./src/models/member1-kumara/SensorTestModel");
require("./src/models/member1-kumara/FsGeneralModel");
require("./src/models/member1-kumara/FsContactModel");
require("./src/models/member1-kumara/FsFuelModel");
require("./src/models/member1-kumara/AnomalyModel");

const app = express();

/* ===========================
   Middleware
=========================== */
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "*",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ===========================
   Database
=========================== */
connectDB();

/* ===========================
   API Routes
=========================== */
app.use("/api/auth", authRoutes);
app.use("/api/station", stationRoutes);
app.use("/api/fuel", fuelRoutes);
app.use("/api/sensor", sensorRoutes);
app.use("/api/anomaly", anomalyRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);

/* ===========================
   Health + Root
=========================== */
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "FuelWatch API",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.json({ status: "FuelWatch API running 🚀" });
});

/* ===========================
   404 + Error handler
=========================== */
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

/* ===========================
   Start
=========================== */
const PORT = process.env.PORT || 8081;

app.listen(PORT, () => {
  console.log(`🚀 FuelWatch server running on port ${PORT}`);
  console.log(`✅ Health: http://localhost:${PORT}/api/health`);
  console.log(`✅ Station base: http://localhost:${PORT}/api/station`);
});
