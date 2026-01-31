const express = require('express');
const router = express.Router();
const {
    clockIn,
    clockOut,
    getEmployeeAttendance,
    getClockStatus
} = require('../../controllers/member3-oshada/attendanceController');

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/history/:employeeId', getEmployeeAttendance);
router.get('/status/:employeeId', getClockStatus);

module.exports = router;
