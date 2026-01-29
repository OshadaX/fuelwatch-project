const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'on-break', 'offline'],
        default: 'active'
    },
    shift: {
        type: String,
        required: true
    },
    joinDate: {
        type: String,
        required: true
    },
    color: {
        type: String,
        default: '#3b82f6'
    },
    avatar: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Employee', EmployeeSchema);
