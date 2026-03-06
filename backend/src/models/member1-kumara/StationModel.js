const mongoose = require("mongoose");

/* ===============================
   Tank Schema
================================ */
const TankSchema = new mongoose.Schema(
  {
    stationId: String,
    fuel_type: { type: String, required: true },
    number_of_tanks: { type: Number, required: true },
    tank_index: { type: Number, required: true },
    tank_capacity: { type: Number, required: true },
  },
  { _id: false }
);

/* ===============================
   Person Schema
================================ */
const PersonSchema = new mongoose.Schema(
  {
    Id: { type: String, required: true },
    PersonName: { type: String, required: true },
    PersonDesignation: { type: String, required: true },
    PersonEmail: { type: String, required: true },
    ContactNumber: { type: String, required: true },
    StartTime: { type: String, required: true },
    EndTime: { type: String, required: true },
  },
  { _id: false }
);

/* ===============================
   Station Schema
================================ */
const StationSchema = new mongoose.Schema(
  {
    // Station ID (Unique)
    Id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true, // ST-001 == st-001 == St-001
    },

    Name: { type: String, required: true },

    Location: { type: String, required: true },

    // 🔐 Manager who registered this station
    // Used later to automatically determine station during notifications
    manager_email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Station responsible person
    person: { type: PersonSchema, required: true },

    // Tank configuration
    tanks: { type: [TankSchema], default: [] },
  },
  { timestamps: true }
);

/* ===============================
   Indexes
================================ */

// Unique Station ID
StationSchema.index({ Id: 1 }, { unique: true });

// Unique Person NIC (VERY IMPORTANT)
StationSchema.index({ "person.Id": 1 }, { unique: true });

// Manager email index for fast lookup
StationSchema.index({ manager_email: 1 });

/* ===============================
   Export Model
================================ */
module.exports = mongoose.model("Station", StationSchema);