const Notification = require("../../models/member1-kumara/Notification");
const User = require("../../models/member1-kumara/User");
const { sendEmail } = require("../../utils/mailer");
const {
  severityLabel,
  pickStationId,
  countsFromRows,
  decideAlertLevel,
  cooldownMinutes,
  buildDedupeKey,
} = require("../../utils/alertPolicy");

function topFlagged(rows, n = 10) {
  return (rows || [])
    .filter((r) => Number(r?.pred ?? 0) === 1)
    .sort((a, b) => (Number(b?.prob) || 0) - (Number(a?.prob) || 0))
    .slice(0, n);
}

function topEvents(events, n = 5) {
  return Array.isArray(events) ? events.slice(0, n) : [];
}

function buildEmail({ stationId, fileName, threshold, level, counts, anomalies, events }) {
  const sev = severityLabel(level);

  const subject =
    level === 3
      ? `CRITICAL: Potential Fuel Misbehavior (Station ${stationId || "N/A"})`
      : level === 2
      ? `WARNING: Potential Fuel Misbehavior (Station ${stationId || "N/A"})`
      : `Advisory: Fuel Report Needs Review (Station ${stationId || "N/A"})`;

  const textLines = [
    `Alert Level: ${level} (${sev})`,
    `Station: ${stationId || "N/A"}`,
    `Report File: ${fileName || "N/A"}`,
    `Threshold: ${threshold ?? "N/A"}`,
    `Flagged: ${counts.flagged} (Critical: ${counts.critical}, Warning: ${counts.warning})`,
    ``,
    `Top anomalies (potential):`,
    ...anomalies.map(
      (a, i) =>
        `${i + 1}) ${a.day} | ${a.fuelType} | ${a.severity} | prob=${Number(a.prob).toFixed(3)} | ${a.anomalyType} | ${String(
          a.reason || ""
        ).slice(0, 140)}`
    ),
    ``,
    `Events:`,
    ...events.map(
      (e, i) => `${i + 1}) ${e.start_day} → ${e.end_day} | days=${e.days} | max=${e.max_score} | ${e.fuelType}`
    ),
    ``,
    `Note: This is an automated detection signal and should be verified before taking action.`,
  ];

  const html = `
  <div style="font-family:Arial,sans-serif;line-height:1.5">
    <h2 style="margin:0 0 8px 0;">FuelWatch Alert</h2>
    <p>
      <b>Alert Level:</b> ${level} (${sev})<br/>
      <b>Station:</b> ${stationId || "N/A"}<br/>
      <b>Report File:</b> ${fileName || "N/A"}<br/>
      <b>Threshold:</b> ${threshold ?? "N/A"}<br/>
      <b>Flagged:</b> ${counts.flagged} (Critical: ${counts.critical}, Warning: ${counts.warning})
    </p>

    <h3>Top anomalies (potential)</h3>
    <ol>
      ${anomalies
        .map(
          (a) => `
        <li>
          <b>${a.day}</b> | ${a.fuelType} | <b>${a.severity}</b> | prob=${Number(a.prob).toFixed(3)} | ${a.anomalyType}<br/>
          <span style="color:#555">${String(a.reason || "").slice(0, 240)}</span>
        </li>`
        )
        .join("")}
    </ol>

    <h3>Events</h3>
    <ol>
      ${events
        .map(
          (e) => `
        <li><b>${e.start_day}</b> → <b>${e.end_day}</b> | days=${e.days} | max=${e.max_score} | ${e.fuelType}</li>`
        )
        .join("")}
    </ol>

    <p style="color:#777;font-size:12px">
      Note: This is an automated detection signal and should be verified before taking action.
    </p>
  </div>`;

  return { subject, text: textLines.join("\n"), html };
}

async function findRecipients(level) {
  // Safe role-based recipients
  const roles =
    level === 3
      ? ["SUPERVISOR", "MANAGER", "SENIOR_MANAGER"]
      : level === 2
      ? ["SUPERVISOR", "MANAGER"]
      : ["SUPERVISOR"]; // level 1

  const users = await User.find({ role: { $in: roles } }).select("_id email role").lean();
  return users.filter((u) => u.email);
}

// POST /api/notifications/from-scan
exports.notifyFromScan = async (req, res) => {
  try {
    const { triggeredBy = "manual", fileName = "", threshold = null, params = {}, rows = [], events = [] } = req.body || {};

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ ok: false, message: "rows[] is required" });
    }

    const stationId = pickStationId(rows);
    const level = decideAlertLevel({ rows, events, threshold: Number(threshold ?? 0.85) });
    const severity = severityLabel(level);
    const counts = countsFromRows(rows);

    // Level 0 => do nothing (no harm)
    if (level === 0) {
      return res.json({ ok: true, message: "No flagged anomalies. No notification sent.", level: 0 });
    }

    const anomaliesTop = topFlagged(rows, 10);
    const eventsTop = topEvents(events, 5);

    const dedupeKey = buildDedupeKey({ stationId, fileName, anomaliesTop });

    // Cooldown (no-harm anti spam)
    const cdMin = cooldownMinutes(level);
    if (cdMin > 0) {
      const since = new Date(Date.now() - cdMin * 60 * 1000);
      const existing = await Notification.findOne({ dedupe_key: dedupeKey, createdAt: { $gte: since } }).lean();
      if (existing) {
        return res.json({ ok: true, message: `Suppressed by cooldown (${cdMin} min).`, level, suppressed: true });
      }
    }

    const recipients = await findRecipients(level);

    // Log first (queued)
    const doc = await Notification.create({
      dedupe_key: dedupeKey,
      triggered_by: triggeredBy,
      file_name: fileName,
      threshold,
      params,
      station_id: stationId,
      alert_level: level,
      severity,
      counts,
      anomalies: anomaliesTop,
      events: eventsTop,
      recipients: recipients.map((r) => ({ user_id: r._id, email: r.email, role: r.role })),
      channel: "email",
      status: recipients.length ? "queued" : "failed",
      error: recipients.length ? "" : "No recipients found. Add users with roles SUPERVISOR/MANAGER/SENIOR_MANAGER.",
    });

    if (!recipients.length) {
      return res.status(404).json({
        ok: false,
        message: "No recipients found in DB. Add users with roles SUPERVISOR/MANAGER/SENIOR_MANAGER.",
      });
    }

    const { subject, text, html } = buildEmail({
      stationId,
      fileName,
      threshold,
      level,
      counts,
      anomalies: anomaliesTop,
      events: eventsTop,
    });

    const to = recipients.map((r) => r.email).join(",");

    try {
      await sendEmail({ to, subject, text, html });
      doc.status = "sent";
      doc.sent_at = new Date();
      await doc.save();

      return res.json({ ok: true, message: "Notification sent safely.", level, notificationId: doc._id });
    } catch (mailErr) {
      doc.status = "failed";
      doc.error = String(mailErr?.message || mailErr);
      await doc.save();

      return res.status(500).json({ ok: false, message: "Email sending failed.", error: doc.error });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, message: "notifyFromScan failed", error: String(e?.message || e) });
  }
};

// GET /api/notifications?limit=50
exports.listNotifications = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const items = await Notification.find({}).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ ok: true, items });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
};
