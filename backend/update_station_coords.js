const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Station = require('./src/models/member1-kumara/StationModel');

dotenv.config();

const coordinates = [
    { id: "PUCSL/PRL/0001/2026", lat: 7.2906, lng: 80.6337 }, // Kandy
    { id: "PUCSL/PRL/0002/2026", lat: 7.4863, lng: 80.3647 }, // Kurunegala
    { id: "PUCSL/PRL/0003/2026", lat: 8.3114, lng: 80.4037 }, // Anuradhapura
    { id: "PUCSL/PRL/0004/2026", lat: 6.1248, lng: 81.1212 }, // Hambantota
    { id: "PUCSL/PRL/0005/2026", lat: 6.5854, lng: 79.9607 }, // Kalutara
    { id: "PUCSL/PRL/0006/2026", lat: 6.0535, lng: 80.2210 }, // Galle
    { id: "PUCSL/PRL/0007/2026", lat: 6.9271, lng: 79.8612 }, // Colombo
    { id: "PUCSL/PRL/0008/2026", lat: 7.2513, lng: 80.3464 }, // Kegalle
    { id: "PUCSL/PRL/0009/2026", lat: 6.1429, lng: 81.1212 }, // Hambantota 2
    { id: "PUCSL/PRL/0010/2026", lat: 6.9319, lng: 79.8478 }, // Colombo 2
    { id: "PUCSL/PRL/0012/2026", lat: 9.3988, lng: 80.3947 }, // Kilinochchi
];

async function updateCoordinates() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const item of coordinates) {
            const result = await Station.updateOne(
                { Id: item.id },
                { $set: { latitude: item.lat, longitude: item.lng } }
            );
            console.log(`Updated ${item.id}: ${result.modifiedCount} document(s)`);
        }

        console.log('All coordinates updated successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error updating coordinates:', error);
        process.exit(1);
    }
}

updateCoordinates();
