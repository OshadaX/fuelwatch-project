const express = require("express");
const router = express.Router();

const sensorController = require("../../controllers/member1-kumara/sensor.controller");

router.post("/test", sensorController.runSensorTest);
router.get("/logs", sensorController.getSensorLogs);

module.exports = router;