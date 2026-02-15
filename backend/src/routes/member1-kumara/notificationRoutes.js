const express = require("express");
const router = express.Router();

// ✅ correct path from routes/member1-kumara -> controllers/member1-kumara
const {
  notifyFromScan,
  listNotifications,
} = require("../../controllers/member1-kumara/notificationController");

router.post("/from-scan", notifyFromScan);
router.get("/", listNotifications);

module.exports = router;
