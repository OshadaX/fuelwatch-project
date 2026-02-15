const mongoose = require("mongoose");

const RecipientSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, default: "" },
    role: { type: String, default: "" },
  },
  { _id: false }
);

const NotificationSchema = new mongoose.Schema(
  {
    source: { type: String, default: "misbehavior_scan", index: true },

    // Deduplication key so same alert doesn't spam
    dedupe_key: { type: String, required: true, unique: true, index: true },

    // Trigger metadata
    triggered_by: { type: String, default: "manual" }, // manual | auto
    file_name: { type: String, default: "" },
    threshold: { type: Number, default: null },
    params: { type: Object, default: {} },

    station_id: { type: String, default: "" },

    // Alert levels (no-harm)
    alert_level: { type: Number, enum: [0, 1, 2, 3], required: true, index: true },
    severity: { type: String, enum: ["Normal", "Advisory", "Warning", "Critical"], required: true, index: true },

    counts: {
      flagged: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
      warning: { type: Number, default: 0 },
    },

    // Keep only top N to avoid huge docs
    anomalies: { type: Array, default: [] }, // top flagged rows
    events: { type: Array, default: [] }, // top grouped events

    channel: { type: String, enum: ["email"], default: "email" },
    recipients: { type: [RecipientSchema], default: [] },

    // Delivery status
    status: { type: String, enum: ["suppressed", "queued", "sent", "failed"], default: "queued", index: true },
    sent_at: { type: Date, default: null },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
