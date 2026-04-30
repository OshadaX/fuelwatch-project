const mongoose = require("mongoose");

const FuelPredictionSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: false,
        },
        stationId: {
            type: String,
            required: true,
            index: true,
        },
        mode: {
            type: String,
            required: true,
            enum: ["weekly", "monthly", "annual"],
        },
        predictions: {
            type: [mongoose.Schema.Types.Mixed],
            required: true,
        },
        createdAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("FuelPrediction", FuelPredictionSchema);
