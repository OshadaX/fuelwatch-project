const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./src/config/db');

const authRoutes = require('./src/routes/member1-kumara/auth.routes');
const stationRoutes = require('./src/routes/member1-kumara/station.routes');
const fuelRoutes = require('./src/routes/member1-kumara/fuel.routes');
const sensorRoutes = require('./src/routes/member1-kumara/sensor.routes');
const anomalyRoutes = require('./src/routes/member1-kumara/anomaly.routes');
const uploadRoutes = require('./src/routes/member1-kumara/upload.routes');

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
