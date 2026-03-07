const mongoose = require('mongoose');

const RecommendationLogSchema = new mongoose.Schema(
    {
        logId: { type: String, required: true, unique: true }, // e.g. REC-2026-1234
        type: {
            type: String,
            enum: ['EV Charging', 'Fuel'],
            required: true
        },
        currentLocation: { type: String, default: '' },        // human-readable place name
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        preference: { type: String, default: 'Any' },
        recommendedStation: { type: String, default: '' },
        stationAddress: { type: String, default: '' },
        distanceKm: { type: Number, default: null },
        brand: { type: String, default: '' },
        status: {
            type: String,
            enum: ['Resolved', 'No Stations', 'Pending'],
            default: 'Pending'
        },
        submissionDate: { type: String, default: '' },         // YYYY-MM-DD
        submissionTime: { type: String, default: '' },         // HH:MM
    },
    { timestamps: true }
);

module.exports = mongoose.model('RecommendationLog', RecommendationLogSchema);
