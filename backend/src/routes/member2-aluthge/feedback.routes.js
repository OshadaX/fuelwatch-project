const express = require('express');
const router = express.Router();
const ctrl = require('../../controllers/member2-aluthge/feedback.controller');

router.get('/', ctrl.getAll);
router.get('/downvoted', ctrl.getDownvotedStations);
router.post('/', ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;
