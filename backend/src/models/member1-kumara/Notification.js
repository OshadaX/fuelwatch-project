const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    source: { type: String, default: "misbehavior_scan" },
    triggered_by: { type: String, default: "manual" },

    station_id: { type: String, default: "UNKNOWN", index: true },

    alert_level: { type: Number, default: 0 }, // 0..3
    severity: { type: String, default: "NORMAL" },

    channel: { type: String, default: "email" }, // email/system
    recipients: { type: [String], default: [] },

    dedupe_key: { type: String, default: "" },

    status: { type: String, default: "sent" }, // sent/suppressed/failed
    error: { type: String, default: "" },
    sent_at: { type: Date, default: null },

    payload: { type: Object, default: {} },
    mail_result: { type: Object, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
