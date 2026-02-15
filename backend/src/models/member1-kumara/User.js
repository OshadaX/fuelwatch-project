const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    full_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: "" },

    // If you already have auth in your system, keep this
    password: { type: String, default: "" },

    // ✅ roles used by notification routing
    role: {
      type: String,
      enum: ["OPERATOR", "SUPERVISOR", "MANAGER", "SENIOR_MANAGER", "ADMIN"],
      default: "OPERATOR",
      index: true,
    },

    // optional (future use)
    station_id: { type: String, default: "", index: true },
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
