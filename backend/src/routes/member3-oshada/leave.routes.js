const express = require('express');
const router = express.Router();
const leaveController = require('../../controllers/member3-oshada/leaveController');

router.post('/', leaveController.submitLeaveRequest);
router.get('/employee/:employeeId', leaveController.getEmployeeLeaveRequests);
router.get('/all', leaveController.getAllLeaveRequests);
router.put('/:id/status', leaveController.updateLeaveStatus);

module.exports = router;
