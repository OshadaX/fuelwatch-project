const express = require('express');
const router = express.Router();
const sensorController = require('../../controllers/member1-kumara/sensor.controller');

router.get('/', sensorController.getLatestReadings);
router.post('/', sensorController.createSensorReading);

router.get('/test', (req, res) => {
  res.json({ message: 'Sensor routes working ✅' });
});

module.exports = router;
