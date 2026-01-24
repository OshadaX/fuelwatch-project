const Station = require("../../models/member1-kumara/StationModel");

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");

async function createStation(req, res, next) {
  try {
    const { Id, Name, Location, person, tanks } = req.body;

    if (!Id || !Name || !Location) {
      return res.status(400).json({
        message: "Station Id, Name and Location are required",
      });
    }

    const stationId = Id.trim().toUpperCase();

    // ❗ Pre-check for better UX
    const exists = await Station.findOne({ Id: stationId });
    if (exists) {
      return res.status(409).json({
        message: `Station with ID ${stationId} already exists`,
      });
    }

    const station = await Station.create({
      Id: stationId,
      Name,
      Location,
      person,
      tanks: Array.isArray(tanks) ? tanks : [],
    });

    return res.status(201).json(station);
  } catch (err) {
    // 🔥 Handles race-condition duplicates
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Station ID must be unique",
      });
    }
    next(err);
  }
}

async function listStations(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
    const q = (req.query.q || "").trim();

    const filter = q
      ? {
          $or: [
            { Id: { $regex: q, $options: "i" } },
            { Name: { $regex: q, $options: "i" } },
            { Location: { $regex: q, $options: "i" } },
            { "person.PersonName": { $regex: q, $options: "i" } },
            { "person.PersonEmail": { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      Station.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Station.countDocuments(filter),
    ]);

    return res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

async function getStation(req, res, next) {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ message: "Station not found." });
    return res.json(station);
  } catch (err) {
    next(err);
  }
}

async function updateStation(req, res, next) {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) {
      return res.status(404).json({ message: "Station not found" });
    }

    const { Id, Name, Location, person, tanks } = req.body;

    if (Id && Id.trim().toUpperCase() !== station.Id) {
      const newId = Id.trim().toUpperCase();
      const exists = await Station.findOne({ Id: newId });
      if (exists) {
        return res.status(409).json({
          message: `Station ID ${newId} already exists`,
        });
      }
      station.Id = newId;
    }

    if (Name !== undefined) station.Name = Name;
    if (Location !== undefined) station.Location = Location;
    if (person !== undefined) station.person = person;
    if (tanks !== undefined) station.tanks = tanks;

    await station.save();
    return res.json(station);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Station ID must be unique",
      });
    }
    next(err);
  }
}

async function deleteStation(req, res, next) {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ message: "Station not found." });
    await station.deleteOne();
    return res.json({ message: "Deleted successfully." });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createStation,
  listStations,
  getStation,
  updateStation,
  deleteStation,
};
