const express = require("express");
const router = express.Router();

const stationController = require("../../controllers/member1-kumara/stationController");

// Defensive check
if (!stationController || typeof stationController !== "object") {
  throw new Error("stationController export is invalid. Check controller module.exports.");
}

const {
  createStation,
  listStations,
  getStation,
  updateStation,
  deleteStation,
  getStationByManagerEmail, // ✅ NEW
} = stationController;

// Runtime verification
const mustBeFn = {
  createStation,
  listStations,
  getStation,
  updateStation,
  deleteStation,
  getStationByManagerEmail,
};

for (const [k, v] of Object.entries(mustBeFn)) {
  if (typeof v !== "function") {
    throw new Error(`stationController.${k} is not a function. Fix exports in stationController.js`);
  }
}

/* =========================
   Base: /api/station
========================= */

// ✅ IMPORTANT: keep this BEFORE "/:id"
router.get("/by-manager/:email", getStationByManagerEmail);

// Standard CRUD
router.get("/", listStations);
router.post("/", createStation);
router.get("/:id", getStation);
router.put("/:id", updateStation);
router.delete("/:id", deleteStation);

module.exports = router;