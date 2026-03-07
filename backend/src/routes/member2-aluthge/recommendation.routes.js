const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/member2-aluthge/recommendation.controller');

// GET /api/recommendations         — list all logs (query: ?type=EV Charging&status=Resolved&date=2026-03-07)
router.get('/', ctrl.getAll);

// GET /api/recommendations/stats   — summary counts & success rate
router.get('/stats', ctrl.getStats);

// POST /api/recommendations        — save a new recommendation log
router.post('/', ctrl.create);

// DELETE /api/recommendations/bulk — delete many by logId[]
router.delete('/bulk', ctrl.bulkDelete);

// DELETE /api/recommendations/:id  — delete single by MongoDB _id
router.delete('/:id', ctrl.remove);

module.exports = router;
