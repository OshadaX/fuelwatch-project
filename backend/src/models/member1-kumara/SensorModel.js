const mongoose = require('mongoose');

const SensorSchema = new mongoose.Schema({
  reading: Number,
  volume: Number,
  sensor_type: String,
  location: String,
  reading_time: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Sensor', SensorSchema);
