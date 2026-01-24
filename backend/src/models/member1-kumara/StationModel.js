const mongoose = require("mongoose");

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

const StationSchema = new mongoose.Schema(
  {
    Id: {
      type: String,
      required: true,
      unique: true,     // 🔒 DATABASE GUARANTEE
      trim: true,
      uppercase: true, // ST-001 == st-001 == St-001
    },
    Name: { type: String, required: true },
    Location: { type: String, required: true },
    person: { type: PersonSchema, required: true },
    tanks: { type: [TankSchema], default: [] },
  },
  { timestamps: true }
);

// Extra safety index (recommended)
StationSchema.index({ Id: 1 }, { unique: true });

module.exports = mongoose.model("Station", StationSchema);
