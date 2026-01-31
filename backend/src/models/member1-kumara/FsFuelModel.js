const mongoose = require('mongoose');

const FsFuelSchema = new mongoose.Schema({
  stationId: String,
  fuel_type: String,
  number_of_tanks: Number,
  tank_index: Number,
  tank_capacity: Number
});

module.exports = mongoose.model('FsFuel', FsFuelSchema);
