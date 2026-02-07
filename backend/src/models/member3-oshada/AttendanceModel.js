const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },
    checkInTime: {
        type: Date,
        required: true
    },
    checkOutTime: {
        type: Date
    },
    stationId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['Present', 'Completed'],
        default: 'Present'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
