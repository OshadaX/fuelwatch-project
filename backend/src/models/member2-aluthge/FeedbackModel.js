const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema(
    {
        recommendationId: { type: String, required: true }, // Links to logId of the recommendation
        stationName: { type: String, required: true },
        rating: { type: Number, required: true },
        wasEasyToFind: { type: Boolean, default: null },
        reason: { type: String, default: '' },
        comment: { type: String, default: '' },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Feedback', FeedbackSchema, 'feedback');
