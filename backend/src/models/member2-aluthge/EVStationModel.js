const mongoose = require('mongoose');

const EVStationSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        location: { type: String, required: true, trim: true },
        lat: { type: Number, default: null },
        lng: { type: Number, default: null },
        connectorTypes: { type: [String], default: [] },
        power: { type: Number, default: null },          // kW
        status: {
            type: String,
            enum: ['Active', 'Maintenance', 'Offline'],
            default: 'Active'
        },
        operator: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('EVStation', EVStationSchema);
