const Feedback = require('../../models/member2-aluthge/FeedbackModel');

// GET /api/feedback/downvoted
// Returns an array of station names that were reported closed/unavailable recently.
exports.getDownvotedStations = async (req, res) => {
    try {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        const feedbacks = await Feedback.find({
            wasEasyToFind: false,
            createdAt: { $gte: twelveHoursAgo }
        }).select('stationName reason createdAt');

        res.json(feedbacks);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch downvoted stations', error: err.message });
    }
};

// GET /api/feedback
exports.getAll = async (req, res) => {
    try {
        const feedbacks = await Feedback.find().sort({ createdAt: -1 });
        res.json(feedbacks);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch feedback', error: err.message });
    }
};

// POST /api/feedback
exports.create = async (req, res) => {
    try {
        const feedback = new Feedback(req.body);
        const saved = await feedback.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: 'Failed to save feedback', error: err.message });
    }
};

// DELETE /api/feedback/:id
exports.remove = async (req, res) => {
    try {
        const feedback = await Feedback.findByIdAndDelete(req.params.id);
        if (!feedback) return res.status(404).json({ message: 'Feedback not found' });
        res.json({ message: 'Feedback deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
