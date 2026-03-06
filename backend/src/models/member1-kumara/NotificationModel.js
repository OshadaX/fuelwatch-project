const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    type: { type: String, default: "ANOMALY_ALERT" },

    station_id: { type: String, required: true, index: true },
    severity: {
      type: String,
      required: true,
      enum: ["Advisory", "Warning", "Critical"],
      index: true,
    },
    channel: { type: String, default: "email", enum: ["email"] },
    roles: [{ type: String, enum: ["SUPERVISOR", "MANAGER", "SENIOR_MANAGER"] }],

    recipients: [{ role: String, email: String }],

    subject: String,
    message: { type: String, required: true },

    context: {
      threshold: Number,
      file_name: String,
      scored_days: Number,
      flagged_days: Number,
      events_count: Number,
      max_score: Number,
      max_score_day: String,
    },

    created_by: {
      role: { type: String, default: "MANAGER" },
      email: { type: String, default: "unknown" },
    },

    status: {
      type: String,
      enum: ["queued", "sent", "failed", "suppressed"],
      default: "queued",
      index: true,
    },

    provider: Object,
    error: String,
    sentAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);