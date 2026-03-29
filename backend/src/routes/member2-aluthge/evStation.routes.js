const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/member2-aluthge/evStation.controller');

// GET /api/ev-stations            — list all (query: ?status=Active&search=...)
router.get('/', ctrl.getAll);

// GET /api/ev-stations/:id        — single station
router.get('/:id', ctrl.getById);

// POST /api/ev-stations           — register new station
router.post('/', ctrl.create);

// PUT /api/ev-stations/:id        — update station
router.put('/:id', ctrl.update);

// DELETE /api/ev-stations/:id     — remove station
router.delete('/:id', ctrl.remove);

module.exports = router;
