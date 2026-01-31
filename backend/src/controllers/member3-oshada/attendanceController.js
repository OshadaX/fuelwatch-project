const Attendance = require('../../models/member3-oshada/AttendanceModel');
const Employee = require('../../models/member3-oshada/EmployeeModel');

// Clock-in via QR scan
const clockIn = async (req, res) => {
    try {
        const { employeeId, stationId } = req.body;

        // Check if employee exists
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        // Check if already clocked in
        const existingRecord = await Attendance.findOne({
            employeeId,
            status: 'Present'
        });

        if (existingRecord) {
            return res.status(400).json({ message: 'Employee is already clocked in' });
        }

        const attendance = new Attendance({
            employeeId,
            stationId,
            checkInTime: new Date(),
            status: 'Present'
        });

        const savedRecord = await attendance.save();
        res.status(201).json(savedRecord);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Clock-out via button click
const clockOut = async (req, res) => {
    try {
        const { employeeId } = req.body;

        const record = await Attendance.findOne({
            employeeId,
            status: 'Present'
        });

        if (!record) {
            return res.status(404).json({ message: 'No active check-in found for this employee' });
        }

        record.checkOutTime = new Date();
        record.status = 'Completed';

        const updatedRecord = await record.save();
        res.status(200).json(updatedRecord);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Get attendance history for an employee
const getEmployeeAttendance = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const history = await Attendance.find({ employeeId }).sort({ createdAt: -1 });
        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Check current status
const getClockStatus = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const record = await Attendance.findOne({
            employeeId,
            status: 'Present'
        });
        res.status(200).json({ isClockedIn: !!record, record });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    clockIn,
    clockOut,
    getEmployeeAttendance,
    getClockStatus
};
