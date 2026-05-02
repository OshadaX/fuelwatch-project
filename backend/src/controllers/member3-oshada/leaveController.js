const LeaveRequest = require('../../models/member3-oshada/LeaveRequestModel');

// Submit a new leave request
exports.submitLeaveRequest = async (req, res) => {
    try {
        const { employeeId, startDate, endDate, reason } = req.body;
        const newRequest = new LeaveRequest({ employeeId, startDate, endDate, reason });
        await newRequest.save();
        res.status(201).json({ message: 'Leave request submitted successfully', request: newRequest });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting leave request', error: error.message });
    }
};

// Get leave requests for a specific employee
exports.getEmployeeLeaveRequests = async (req, res) => {
    try {
        const requests = await LeaveRequest.find({ employeeId: req.params.employeeId }).sort({ createdAt: -1 });
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leave requests', error: error.message });
    }
};

// Get all leave requests (for manager view)
exports.getAllLeaveRequests = async (req, res) => {
    try {
        const requests = await LeaveRequest.find()
            .populate('employeeId', 'name employeeId role')
            .sort({ createdAt: -1 });
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching all leave requests', error: error.message });
    }
};

// Update leave request status (Manager approve/reject)
exports.updateLeaveStatus = async (req, res) => {
    try {
        const { status, managerNotes } = req.body;
        const request = await LeaveRequest.findByIdAndUpdate(
            req.params.id,
            { status, managerNotes },
            { new: true }
        );
        if (!request) return res.status(404).json({ message: 'Leave request not found' });
        res.status(200).json({ message: `Leave request ${status}`, request });
    } catch (error) {
        res.status(500).json({ message: 'Error updating leave request', error: error.message });
    }
};
