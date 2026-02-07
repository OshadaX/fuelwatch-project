const Sensor = require('../../models/member1-kumara/SensorModel');
const { calculateVolumeLitres } = require('../../utils/volumeCalculator');

const createSensorReading = async (req, res) => {
  try {
    const { reading } = req.body;
    const volume = calculateVolumeLitres(reading);

    const sensor = await Sensor.create({
      reading,
      volume,
      sensor_type: 'JSN-SR04T-V3',
      location: 'Tank-1-Octane-92'
    });

    res.json(sensor);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLatestReadings = async (_, res) => {
  try {
    const readings = await Sensor.find()
      .sort({ reading_time: -1 })
      .limit(10);
    res.json(readings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createSensorReading,
  getLatestReadings
};
