const express = require("express");
const nodemailer = require("nodemailer");

const NotificationRecipient = require("../../models/member1-kumara/NotificationRecipientModel");
const Notification = require("../../models/member1-kumara/NotificationModel");

const router = express.Router();

/* -------------------------
   Mail Transport (Gmail)
-------------------------- */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASS,
  },
});

/* -------------------------
   Helpers
-------------------------- */
function normalizeStationId(station_id) {
  const s = String(station_id || "").trim();
  if (!s || s.toUpperCase() === "UNKNOWN") return null;
  return s;
}

function computeSummary(rows, events) {
  const scored = Array.isArray(rows) ? rows : [];
  const evs = Array.isArray(events) ? events : [];

  let flagged = 0;
  let maxScore = 0;
  let maxDay = "";

  for (const r of scored) {
    const pred = r.pred ?? r.pred_label ?? r.label_pred ?? r.is_flagged ?? 0;
    const score = Number(r.prob ?? r.prob_irregular ?? r.score ?? r.irregularity_score ?? 0) || 0;
    const day = String(r.day || r.date || r.timestamp || "").slice(0, 10);

    if (pred === 1 || pred === true) flagged += 1;
    if (score > maxScore) {
      maxScore = score;
      maxDay = day;
    }
  }

  return {
    scored_days: scored.length,
    flagged_days: flagged,
    events_count: evs.length,
    max_score: maxScore,
    max_score_day: maxDay,
  };
}

/* =========================================================
   GET /api/notifications/recipients?station_id=...
   - Used when dialog opens
========================================================= */
router.get("/recipients", async (req, res) => {
  try {
    const station_id = normalizeStationId(req.query.station_id);
    if (!station_id) {
      return res.status(400).json({ ok: false, error: "Invalid station_id (UNKNOWN not allowed)" });
    }

    const recipients = await NotificationRecipient.find({
      station_id,
      is_active: true,
    }).sort({ role: 1 });

    return res.json({ ok: true, recipients });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || "Failed to load recipients" });
  }
});

/* =========================================================
   POST /api/notifications/send-manual
   - Sends email
   - Saves notification record in MongoDB Atlas
========================================================= */
router.post("/send-manual", async (req, res) => {
  try {
    const {
      station_id,
      severity,
      channel,
      roles,
      message,
      threshold,
      file_name,
      rows,
      events,
      manager_email, // frontend should send logged in manager email
    } = req.body;

    const station = normalizeStationId(station_id);
    if (!station) return res.status(400).json({ error: "Station ID is required (not UNKNOWN)" });
    if (!severity) return res.status(400).json({ error: "Severity is required" });
    if (!Array.isArray(roles) || roles.length === 0) return res.status(400).json({ error: "Select at least one role" });
    if (!message || !String(message).trim()) return res.status(400).json({ error: "Message is required" });

    // 1) Resolve recipients from YOUR mapping collection
    const recDocs = await NotificationRecipient.find({
      station_id: station,
      role: { $in: roles },
      is_active: true,
    });

    if (!recDocs.length) {
      return res.status(404).json({ error: "No recipients configured for this station & selected roles" });
    }

    // Deduplicate by email
    const seen = new Set();
    const recipients = [];
    for (const r of recDocs) {
      const email = String(r.email || "").trim().toLowerCase();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      recipients.push({ role: r.role, email });
    }

    const subject = `FuelWatch Alert — ${severity} — ${station}`;

    // 2) Build and store summary context (don’t store huge rows unless you need it)
    const summary = computeSummary(rows, events);
    const context = {
      threshold: Number(threshold),
      file_name: String(file_name || ""),
      ...summary,
    };

    // 3) Save record FIRST (queued)
    const notification = await Notification.create({
      station_id: station,
      severity,
      channel: channel || "email",
      roles,
      recipients,
      subject,
      message,
      context,
      created_by: {
        role: "MANAGER",
        email: manager_email ? String(manager_email).toLowerCase() : "unknown",
      },
      status: "queued",
    });

    // 4) Send email
    const toList = recipients.map((r) => r.email).join(",");

    const mailResp = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: toList,
      subject,
      text: message,
    });

    // 5) Update record after send
    notification.status = "sent";
    notification.sentAt = new Date();
    notification.provider = { name: "gmail", messageId: mailResp.messageId };
    notification.error = null;
    await notification.save();

    return res.json({
      message: `Alert sent to ${recipients.length} recipient(s)`,
      status: "sent",
      notification_id: notification._id,
    });
  } catch (err) {
    // Optional: if send fails and you created a record, update it to failed (advanced)
    return res.status(500).json({ error: err.message || "Failed to send alert" });
  }
});

module.exports = router;