const router = require('express').Router();
const controller = require('../controllers/sensor.controller');

router.get('/', controller.getLatestReadings);
router.post('/', controller.createSensorReading);
router.get('/health', controller.getSensorHealth);

module.exports = router;
