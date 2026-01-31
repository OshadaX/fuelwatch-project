const mongoose = require('mongoose');

const FsContactSchema = new mongoose.Schema({
  Id: String,
  PersonName: String,
  PersonDesignation: String,
  PersonEmail: String,
  ContactNumber: String,
  StartTime: String,
  EndTime: String
});

module.exports = mongoose.model('FsContact', FsContactSchema);
