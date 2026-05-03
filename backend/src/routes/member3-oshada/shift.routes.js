const express = require('express');
const router = express.Router();
const {
    createShift,
    getShiftsByDate,
    getShiftsByStation,
    getShiftsByEmployee,
    updateShift,
    deleteShift
} = require('../../controllers/member3-oshada/shiftController');

// POST   /api/shifts              — Assign employee to a date
router.post('/', createShift);

// GET    /api/shifts?date=&stationId=  — Get shifts for a day/station
router.get('/', getShiftsByDate);

// GET    /api/shifts/station/:stationId — Get 7-day shifts for a station
router.get('/station/:stationId', getShiftsByStation);

// GET    /api/shifts/employee/:employeeId — Get upcoming shifts for an employee
router.get('/employee/:employeeId', getShiftsByEmployee);

// PATCH  /api/shifts/:id          — Update status / shiftType
router.patch('/:id', updateShift);

// DELETE /api/shifts/:id          — Remove an assignment
router.delete('/:id', deleteShift);

// SWAP ROUTES
// POST /api/shifts/:id/request-swap — Employee requests a swap
router.post('/:id/request-swap', require('../../controllers/member3-oshada/shiftController').requestSwap);

// POST /api/shifts/:id/offer-cover — Another employee offers to cover
router.post('/:id/offer-cover', require('../../controllers/member3-oshada/shiftController').offerCover);

// POST /api/shifts/:id/approve-swap — Manager approves swap
router.post('/:id/approve-swap', require('../../controllers/member3-oshada/shiftController').approveSwap);

// GET /api/shifts/swaps/available — Get all shifts requesting swap
router.get('/swaps/available', require('../../controllers/member3-oshada/shiftController').getAvailableSwaps);

module.exports = router;
