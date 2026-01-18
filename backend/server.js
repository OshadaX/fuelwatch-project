const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const stationRoutes = require('./routes/station.routes');
const fuelRoutes = require('./routes/fuel.routes');
const sensorRoutes = require('./routes/sensor.routes');
const anomalyRoutes = require('./routes/anomaly.routes');
const uploadRoutes = require('./routes/upload.routes');

const Registration = require('./src/models/member1-kumara/RegistrationModel');
const Sensor = require('./src/models/member1-kumara/SensorModel');
const SensorTest = require('./src/models/member1-kumara/SensorTestModel');
const FsGeneral = require('./src/models/member1-kumara/FsGeneralModel');
const FsContact = require('./src/models/member1-kumara/FsContactModel');
const FsFuel = require('./src/models/member1-kumara/FsFuelModel');
const Anomaly = require('./src/models/member1-kumara/AnomalyModel');

const app = express();
app.use(cors());
app.use(express.json());

// DB
connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/station', stationRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/sensor', sensorRoutes);
app.use('/api/anomaly', anomalyRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/', (_, res) => res.json({ status: 'FuelWatch API running' }));

const PORT = process.env.PORT || 8081;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
