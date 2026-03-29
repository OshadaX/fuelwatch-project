const mongoose = require('mongoose');

const ShiftScheduleSchema = new mongoose.Schema({
    date: {
        type: String, // YYYY-MM-DD
        required: true
    },
    stationId: {
        type: String,
        required: true
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    shiftType: {
        type: String,
        enum: ['Morning', 'Night'],
        default: 'Morning'
    },
    assignedBy: {
        type: String // admin name or ID
    },
    status: {
        type: String,
        enum: ['planned', 'confirmed', 'cancelled'],
        default: 'planned'
    },
    recommendedHeadcount: {
        type: Number // ML recommended count stored for reference
    }
}, {
    timestamps: true
});

// Prevent duplicate assignment of same employee on same date at same station
ShiftScheduleSchema.index({ date: 1, stationId: 1, employeeId: 1 }, { unique: true });

module.exports = mongoose.model('ShiftSchedule', ShiftScheduleSchema);
