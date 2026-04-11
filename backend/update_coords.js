const mongoose = require('mongoose');
const Station = require('./src/models/member1-kumara/StationModel');
require('dotenv').config();

async function updateStations() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fuelwatch');
        console.log('Connected to MongoDB');

        const stations = await Station.find();
        console.log(`Found ${stations.length} stations`);

        const coords = [
            { lat: 6.9271, lng: 79.8612 }, // Colombo
            { lat: 7.2906, lng: 80.6337 }, // Kandy
            { lat: 6.0535, lng: 80.2210 }, // Galle
            { lat: 8.3114, lng: 80.4037 }, // Anuradhapura
        ];

        if (stations.length === 0) {
            console.log('No stations found to update.');
        }

        for (let i = 0; i < stations.length; i++) {
            const coord = coords[i % coords.length];
            // Use findOneAndUpdate to avoid schema validation errors if any
            await Station.findByIdAndUpdate(stations[i]._id, {
                latitude: coord.lat,
                longitude: coord.lng
            });
            console.log(`Updated station ${stations[i].Name} with coords ${coord.lat}, ${coord.lng}`);
        }

        mongoose.connection.close();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateStations();
