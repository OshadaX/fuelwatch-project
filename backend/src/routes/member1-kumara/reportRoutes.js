const express = require("express");
const multer = require("multer");
const { REPORT_MAX_UPLOAD_MB } = require("../../config/env");
const { generateReport, saveFuelPrediction, getLatestFuelPrediction } = require("../../controllers/member1-kumara/reportController");

const router = express.Router();

// Use memory storage (research-grade: avoid filesystem races; hash is computed on buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: REPORT_MAX_UPLOAD_MB * 1024 * 1024 },
});

router.post("/generate", upload.single("file"), generateReport);

// Fuel Prediction Persistence
router.post("/fuel-prediction", saveFuelPrediction);
router.get("/fuel-prediction/latest", getLatestFuelPrediction);

module.exports = router;