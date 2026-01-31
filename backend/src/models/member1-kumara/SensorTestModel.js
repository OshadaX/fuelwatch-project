const mongoose = require('mongoose');

const SensorTestSchema = new mongoose.Schema({
  stationId: String,
  tankCapacity: Number,
  reading: Number,
  fuelLevel: Number,
  status: String,
  rawData: Object,
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  testDurationMs: Number,
  error: String
});

SensorTestSchema.virtual('fuelPercent').get(function () {
  return ((this.fuelLevel || 0) / (this.tankCapacity || 1) * 100).toFixed(1);
});

module.exports = mongoose.model('SensorTest', SensorTestSchema);
