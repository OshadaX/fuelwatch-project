const express = require("express");
const nodemailer = require("nodemailer");

const Station = require("../../models/member1-kumara/StationModel");
const NotificationRecipient = require("../../models/member1-kumara/NotificationRecipientModel");
const Notification = require("../../models/member1-kumara/NotificationModel");
const { sendEmail } = require("../../utils/mailer");

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
    const { station_id, severity, message } = req.body;

    if (!station_id || station_id === "UNKNOWN") {
      return res.status(400).json({ error: "Station ID is required (not UNKNOWN)" });
    }

    // 1) get station
    const station = await Station.findOne({ Id: station_id.trim().toUpperCase() });
    if (!station) {
      return res.status(404).json({ error: "Station not found for this station_id" });
    }

    // 2) get email from station contacts
    const toEmail = (station?.person?.PersonEmail || "").trim().toLowerCase();
    if (!toEmail) {
      return res.status(400).json({
      error: "Contact person email (person.PersonEmail) not found for this station",
      });
    }

    // 3) send email
    await sendEmail({
      to: toEmail,
      subject: `FuelWatch Alert — ${severity || "Warning"} — ${station_id}`,
      html: `
        <h3>FuelWatch Alert</h3>
        <p><b>Station:</b> ${station_id}</p>
        <p><b>Severity:</b> ${severity || "Warning"}</p>
        <p><b>Message:</b> ${message || "-"}</p>
      `,
    });

    // 4) save notification
    await Notification.create({
      station_id,
      severity: severity || "Warning",
      channel: "email",
      recipient_email: toEmail,
      message: message || "",
      triggered_by: "manager",
      created_at: new Date(),
    });

    return res.json({
      status: "sent",
      message: `Email sent to manager: ${toEmail}`,
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to send alert" });
  }
});

module.exports = router;