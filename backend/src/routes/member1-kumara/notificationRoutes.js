const express = require("express");
const router = express.Router();

const {
  notifyFromScan,
  listNotifications,
  getRecipients,
  sendManualNotification,
} = require("../../controllers/member1-kumara/notificationController");

// existing
router.post("/from-scan", notifyFromScan);
router.get("/", listNotifications);

// ✅ new
router.get("/recipients", getRecipients);
router.post("/send-manual", sendManualNotification);

module.exports = router;
