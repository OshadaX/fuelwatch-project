const Station = require("../../models/member1-kumara/StationModel");

// ================================
// CREATE
// POST /api/station
// ================================
const createStation = async (req, res) => {
  try {
    const payload = req.body || {};

    // ✅ Get manager email from frontend (logged-in user)
    if (!payload.manager_email) {
      return res.status(400).json({
        ok: false,
        message: "manager_email is required",
      });
    }

    payload.manager_email = String(payload.manager_email).toLowerCase().trim();

    // Basic validations
    if (!payload.Id) return res.status(400).json({ ok: false, message: "Id is required" });
    if (!payload.Name) return res.status(400).json({ ok: false, message: "Name is required" });
    if (!payload.Location) return res.status(400).json({ ok: false, message: "Location is required" });
    if (!payload.person) return res.status(400).json({ ok: false, message: "person is required" });

    const created = await Station.create(payload);

    return res.status(201).json({
      ok: true,
      station: created,
      message: "Station created",
    });

  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        ok: false,
        message: "Duplicate key error",
        details: err.keyValue,
      });
    }

    return res.status(500).json({
      ok: false,
      message: err.message || "Server error",
    });
  }
};

// ================================
// LIST
// GET /api/station
// ================================
const listStations = async (_req, res) => {
  try {
    const stations = await Station.find().sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, stations });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
};

// ================================
// GET ONE
// GET /api/station/:id
// Here :id refers to Station "Id" (not Mongo _id)
// ================================
const getStation = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim().toUpperCase();

    const station = await Station.findOne({ Id: id }).lean();
    if (!station) {
      return res.status(404).json({ ok: false, message: "Station not found" });
    }

    return res.json({ ok: true, station });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
};

// ================================
// UPDATE
// PUT /api/station/:id
// ================================
const updateStation = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim().toUpperCase();
    const updates = req.body || {};

    // Never allow changing primary station Id accidentally
    delete updates.Id;

    if (updates.manager_email) {
      updates.manager_email = String(updates.manager_email).toLowerCase().trim();
    }

    const updated = await Station.findOneAndUpdate(
      { Id: id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ ok: false, message: "Station not found" });
    }

    return res.json({ ok: true, station: updated, message: "Station updated" });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({
        ok: false,
        message: "Duplicate key error",
        details: err.keyValue,
      });
    }

    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
};

// ================================
// DELETE
// DELETE /api/station/:id
// ================================
const deleteStation = async (req, res) => {
  try {
    const id = String(req.params.id || "").trim().toUpperCase();

    const deleted = await Station.findOneAndDelete({ Id: id });
    if (!deleted) {
      return res.status(404).json({ ok: false, message: "Station not found" });
    }

    return res.json({ ok: true, message: "Station deleted" });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
};

// ================================
// ✅ GET STATION BY MANAGER EMAIL
// GET /api/station/by-manager/:email
// ================================
const getStationByManagerEmail = async (req, res) => {
  try {
    const email = String(req.params.email || "").toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ ok: false, message: "email param is required" });
    }

    const station = await Station.findOne({ manager_email: email }).lean();
    if (!station) {
      return res.status(404).json({
        ok: false,
        message: "No station registered under this manager email",
      });
    }

    return res.json({
      ok: true,
      station,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: err.message || "Server error" });
  }
};

module.exports = {
  createStation,
  listStations,
  getStation,
  updateStation,
  deleteStation,
  getStationByManagerEmail,
};

