const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ message: 'Sensor routes working ✅' });
});

module.exports = router;
