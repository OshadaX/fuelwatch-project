const Sensor = require('../models/Sensor.model');
const { calculateVolumeLitres } = require('../utils/volumeCalculator');

exports.createSensorReading = async (req, res) => {
  const { reading } = req.body;
  const volume = calculateVolumeLitres(reading);

  const sensor = await Sensor.create({
    reading,
    volume,
    sensor_type: 'JSN-SR04T-V3',
    location: 'Tank-1-Octane-92'
  });

  res.json(sensor);
};

exports.getLatestReadings = async (_, res) => {
  const readings = await Sensor.find()
    .sort({ reading_time: -1 })
    .limit(10);
  res.json(readings);
};
