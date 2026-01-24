const express = require("express");
const router = express.Router();

const {
  createStation,
  listStations,
  getStation,
  updateStation,
  deleteStation,
} = require("../../controllers/member1-kumara/stationController");

// base: /api/station
router.get("/", listStations);
router.post("/", createStation);
router.get("/:id", getStation);
router.put("/:id", updateStation);
router.delete("/:id", deleteStation);

module.exports = router;
