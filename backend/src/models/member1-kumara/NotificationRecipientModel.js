const mongoose = require("mongoose");

const NotificationRecipientSchema = new mongoose.Schema(
  {
    station_id: { type: String, required: true, index: true },
    role: {
      type: String,
      required: true,
      enum: ["SUPERVISOR", "MANAGER", "SENIOR_MANAGER"],
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    is_active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// prevent duplicates
NotificationRecipientSchema.index(
  { station_id: 1, role: 1, email: 1 },
  { unique: true }
);

module.exports = mongoose.model("NotificationRecipient", NotificationRecipientSchema);