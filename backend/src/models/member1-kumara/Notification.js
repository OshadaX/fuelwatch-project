import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    type: { type: String, default: "ANOMALY_ALERT" },

    station_id: { type: String, required: true, index: true },
    severity: { type: String, required: true, enum: ["Advisory", "Warning", "Critical"], index: true },
    channel: { type: String, default: "email", enum: ["email"] },
    roles: [{ type: String, enum: ["SUPERVISOR", "MANAGER", "SENIOR_MANAGER"] }],

    recipients: [
      {
        role: String,
        email: String
      }
    ],

    subject: { type: String },
    message: { type: String, required: true },

    // Store only summary context (recommended)
    context: {
      threshold: Number,
      file_name: String,
      scored_days: Number,
      flagged_days: Number,
      events_count: Number,
      max_score: Number,
      max_score_day: String
    },

    // manager who clicked send (frontend should send manager_email)
    created_by: {
      role: { type: String, default: "MANAGER" },
      email: { type: String, default: "unknown" }
    },

    status: { type: String, default: "queued", enum: ["queued", "sent", "failed", "suppressed"], index: true },
    provider: { type: Object },
    error: { type: String },
    sentAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("Notification", NotificationSchema);