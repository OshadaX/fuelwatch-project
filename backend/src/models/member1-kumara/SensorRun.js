// src/models/SensorRun.js
const mongoose = require("mongoose");

const SensorRunSchema = new mongoose.Schema(
  {
    stationId: { type: String, required: true, index: true },
    tankCapacity: { type: Number, required: true },

    // You can store raw samples for research reproducibility
    raw: {
      sampleCount: { type: Number, default: 0 },
      samples: { type: [Number], default: [] }
    },

    // Health features per run
    health: {
      sampleCount: Number,
      validCount: Number,
      invalidCount: Number,
      invalidRatio: Number,

      medianDistance: Number,
      mad: Number,
      outlierRatio: Number,

      trimmedStd: Number,
      sigmaEstimate: Number,

      maxJump: Number,
      nearMinRatio: Number,
      nearMaxRatio: Number
    },

    // Final outputs (optional)
    reading: { type: Number, default: 0 },     // distance cm
    fuelLevel: { type: Number, default: 0 },   // liters

    status: { type: String, enum: ["OK", "FAILED"], default: "OK" },
    message: { type: String, default: "" },

    timestamp: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model("SensorRun", SensorRunSchema);