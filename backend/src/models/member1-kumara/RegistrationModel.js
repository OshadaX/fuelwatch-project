const mongoose = require('mongoose');

const RegistrationSchema = new mongoose.Schema({
  uniqueid: { type: String, required: true, unique: true, uppercase: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  role: { type: String, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Registration = mongoose.model('Registration', RegistrationSchema);

module.exports = Registration;
