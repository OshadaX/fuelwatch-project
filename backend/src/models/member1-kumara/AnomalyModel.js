const mongoose = require('mongoose');

const AnomalySchema = new mongoose.Schema({
  stationId: String,
  stationName: String,
  fuel_type: String,
  reading_time: Date,
  fuel_volume_l: Number,
  volume_diff: Number,
  anomaly_score: Number,
  anomalyflag_corrected: Number,
  anomalytypes: String,
  status: String,
  resolvedAt: Date
});

module.exports = mongoose.model('Anomaly', AnomalySchema);
