const express = require('express');
const router = express.Router();
const {
    clockIn,
    clockOut,
    getEmployeeAttendance,
    getClockStatus,
    getActiveCheckIns
} = require('../../controllers/member3-oshada/attendanceController');

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/active', getActiveCheckIns);
router.get('/history/:employeeId', getEmployeeAttendance);
router.get('/status/:employeeId', getClockStatus);

module.exports = router;
