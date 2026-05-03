const ShiftSchedule = require('../../models/member3-oshada/ShiftScheduleModel');
const Employee = require('../../models/member3-oshada/EmployeeModel');

// POST /api/shifts — Assign an employee to a date
const createShift = async (req, res) => {
    try {
        const { date, stationId, employeeId, shiftType, assignedBy, recommendedHeadcount } = req.body;

        const shift = new ShiftSchedule({
            date,
            stationId,
            employeeId,
            shiftType: shiftType || 'Morning',
            assignedBy,
            status: 'planned',
            recommendedHeadcount
        });

        const saved = await shift.save();
        const populated = await ShiftSchedule.findById(saved._id).populate('employeeId', 'name avatar color employeeId role');
        res.status(201).json(populated);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'This employee is already assigned to a shift on this date.' });
        }
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

// GET /api/shifts?date=YYYY-MM-DD&stationId=XXX — Get all shifts for a given date + station
const getShiftsByDate = async (req, res) => {
    try {
        const { date, stationId } = req.query;
        const query = {};
        if (date) query.date = date;
        if (stationId) query.stationId = stationId;

        const shifts = await ShiftSchedule.find(query)
            .populate('employeeId', 'name avatar color employeeId role shift')
            .sort({ shiftType: 1 });

        res.status(200).json(shifts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/shifts/station/:stationId — Get all shifts for a station (from today onwards)
const getShiftsByStation = async (req, res) => {
    try {
        const { stationId } = req.params;
        const today = new Date().toISOString().split('T')[0];

        const shifts = await ShiftSchedule.find({
            stationId,
            date: { $gte: today } // Fetch all from today onwards
        })
            .populate('employeeId', 'name avatar color employeeId role')
            .sort({ date: 1, shiftType: 1 });

        res.status(200).json(shifts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/shifts/employee/:employeeId — Get upcoming shifts for an employee
const getShiftsByEmployee = async (req, res) => {
    try {
        const { employeeId } = req.params;

        // Include today + next 14 days
        const dates = [];
        for (let i = 0; i < 14; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            dates.push(d.toISOString().split('T')[0]);
        }

        const shifts = await ShiftSchedule.find({
            employeeId,
            date: { $in: dates },
            status: { $ne: 'cancelled' }
        })
            .populate('employeeId', 'name avatar color')
            .sort({ date: 1 });

        res.status(200).json(shifts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// PATCH /api/shifts/:id — Update a shift's status or type
const updateShift = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, shiftType } = req.body;

        const updated = await ShiftSchedule.findByIdAndUpdate(
            id,
            { ...(status && { status }), ...(shiftType && { shiftType }) },
            { new: true, runValidators: true }
        ).populate('employeeId', 'name avatar color employeeId role');

        if (!updated) return res.status(404).json({ message: 'Shift not found' });
        res.status(200).json(updated);
    } catch (error) {
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: error.message });
    }
};

// DELETE /api/shifts/:id — Remove an assignment
const deleteShift = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await ShiftSchedule.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: 'Shift not found' });
        res.status(200).json({ message: 'Shift removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// SWAP LOGIC

// POST /api/shifts/:id/request-swap
const requestSwap = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await ShiftSchedule.findByIdAndUpdate(
            id,
            { swapRequested: true, swapStatus: 'requested' },
            { new: true }
        ).populate('employeeId', 'name avatar color');
        if (!updated) return res.status(404).json({ message: 'Shift not found' });
        res.status(200).json({ message: 'Swap requested successfully', shift: updated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/shifts/:id/offer-cover
const offerCover = async (req, res) => {
    try {
        const { id } = req.params;
        const { employeeId } = req.body; // The ID of the employee offering to cover
        
        const shift = await ShiftSchedule.findById(id);
        if (!shift) return res.status(404).json({ message: 'Shift not found' });
        
        // Prevent covering own shift
        if (shift.employeeId.toString() === employeeId) {
            return res.status(400).json({ message: 'Cannot cover your own shift' });
        }

        const updated = await ShiftSchedule.findByIdAndUpdate(
            id,
            { swapCoveredBy: employeeId, swapStatus: 'offered' },
            { new: true }
        ).populate('employeeId', 'name avatar color').populate('swapCoveredBy', 'name avatar color');
        
        res.status(200).json({ message: 'Cover offered successfully', shift: updated });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// POST /api/shifts/:id/approve-swap
const approveSwap = async (req, res) => {
    try {
        const { id } = req.params;
        const { approve } = req.body; // boolean

        const shift = await ShiftSchedule.findById(id);
        if (!shift) return res.status(404).json({ message: 'Shift not found' });

        if (approve) {
            // Swap ownership
            const updated = await ShiftSchedule.findByIdAndUpdate(
                id,
                { 
                    employeeId: shift.swapCoveredBy,
                    swapRequested: false,
                    swapCoveredBy: null,
                    swapStatus: 'none'
                },
                { new: true }
            );
            return res.status(200).json({ message: 'Swap approved successfully', shift: updated });
        } else {
            // Reject offer, goes back to 'requested'
            const updated = await ShiftSchedule.findByIdAndUpdate(
                id,
                { swapCoveredBy: null, swapStatus: 'requested' },
                { new: true }
            );
            return res.status(200).json({ message: 'Swap offer rejected', shift: updated });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// GET /api/shifts/swaps/available
const getAvailableSwaps = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const shifts = await ShiftSchedule.find({
            date: { $gte: today },
            swapRequested: true,
            status: { $ne: 'cancelled' }
        })
        .populate('employeeId', 'name avatar color')
        .populate('swapCoveredBy', 'name avatar color')
        .sort({ date: 1 });
        
        res.status(200).json(shifts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createShift,
    getShiftsByDate,
    getShiftsByStation,
    getShiftsByEmployee,
    updateShift,
    deleteShift,
    requestSwap,
    offerCover,
    approveSwap,
    getAvailableSwaps
};
