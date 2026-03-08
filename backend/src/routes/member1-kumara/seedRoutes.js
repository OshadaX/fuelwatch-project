const express = require("express");
const router = express.Router();
const User = require("../../models/member1-kumara/User");

// POST /api/seed/users
router.post("/users", async (req, res) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ ok: false, message: "users[] required" });
    }

    const cleaned = users.map((u) => ({
      full_name: String(u.full_name || "Unknown").trim(),
      email: String(u.email || "").trim().toLowerCase(),
      role: String(u.role || "OPERATOR").trim(),
      phone: String(u.phone || "").trim(),
      station_id: String(u.station_id || "").trim(),
      is_active: true,
    }));

    const ops = cleaned.map((u) => ({
      updateOne: {
        filter: { email: u.email },
        update: { $set: u },
        upsert: true,
      },
    }));

    const result = await User.bulkWrite(ops);
    return res.json({ ok: true, message: "Users seeded/updated", result });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

module.exports = router;
