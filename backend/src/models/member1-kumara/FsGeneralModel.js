const mongoose = require('mongoose');

const FsGeneralSchema = new mongoose.Schema({
  Id: String,
  Name: String,
  Location: String
});

module.exports = mongoose.model('FsGeneral', FsGeneralSchema);
