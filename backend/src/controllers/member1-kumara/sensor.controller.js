// src/controllers/member1-kumara/sensor.controller.js
const SensorTest = require("../../models/member1-kumara/SensorTestModel");
const { computeHealthFeatures } = require("../../utils/healthFeatures");

// Simple distance -> fuel (keep for now)
function distanceToFuel(distanceCm, tankCapacityL) {
  const tankHeightCm = 30;
  const filledRatio = Math.max(
    0,
    Math.min(1, (tankHeightCm - distanceCm) / tankHeightCm)
  );
  return Number((filledRatio * tankCapacityL).toFixed(1));
}

// POST /api/sensor/test
exports.runSensorTest = async (req, res) => {
  try {
    const { stationId, tankCapacity, samples, reading } = req.body;

    if (!stationId || !tankCapacity) {
      return res.status(400).json({
        message: "stationId and tankCapacity required"
      });
    }

    // Accept burst samples (ESP32) OR single reading
    let burst = [];
    if (Array.isArray(samples) && samples.length > 0) {
      burst = samples.map((v) => Number(v));
    } else if (Number.isFinite(reading)) {
      burst = [Number(reading)];
    } else {
      return res.status(400).json({
        message: "Provide samples[] or reading"
      });
    }

    // Health features
    const health = computeHealthFeatures(burst);

    const status = health.validCount < 5 ? "FAILED" : "OK";
    const message =
      status === "OK"
        ? "✅ Test completed (health features computed)"
        : "❌ Test failed (too few valid samples)";

    const distance = health.medianDistance ?? 0;
    const fuelLevel = status === "OK" ? distanceToFuel(distance, tankCapacity) : 0;

    const doc = await SensorTest.create({
      stationId,
      tankCapacity,
      raw: { sampleCount: burst.length, samples: burst },
      health,
      reading: distance,
      fuelLevel,
      status,
      message,
      timestamp: new Date()
    });

    return res.json({
      message: doc.message,
      status: doc.status,
      stationId: doc.stationId,
      tankCapacity: doc.tankCapacity,
      reading: doc.reading,
      fuelLevel: doc.fuelLevel,
      health: doc.health,
      timestamp: doc.timestamp
    });
  } catch (err) {
    console.error("runSensorTest error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/sensor/logs
exports.getSensorLogs = async (req, res) => {
  try {
    const readings = await Sensor.find()
      .sort({ reading_time: -1 })
      .limit(40);
    res.json(readings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};