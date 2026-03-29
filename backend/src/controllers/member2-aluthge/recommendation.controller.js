const RecommendationLog = require('../../models/member2-aluthge/RecommendationLogModel');

// GET /api/recommendations
exports.getAll = async (req, res) => {
    try {
        const { type, status, date } = req.query;
        const filter = {};
        if (type) filter.type = type;
        if (status) filter.status = status;
        if (date) filter.submissionDate = date;

        let logs = await RecommendationLog.aggregate([
            { $match: filter },
            { $sort: { createdAt: -1 } },
            {
                $lookup: {
                    from: 'feedback', // Name of the feedback collection as defined in model
                    localField: 'logId',
                    foreignField: 'recommendationId',
                    as: 'feedbackData'
                }
            }
        ]);

        // Format to map back to the expected object shape for the frontend
        logs = logs.map(log => ({
            ...log,
            feedback: log.feedbackData && log.feedbackData.length > 0 ? log.feedbackData[0] : undefined
        }));

        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch recommendations', error: err.message });
    }
};

// GET /api/recommendations/stats
exports.getStats = async (req, res) => {
    try {
        const total = await RecommendationLog.countDocuments();
        const evCount = await RecommendationLog.countDocuments({ type: 'EV Charging' });
        const fuelCount = await RecommendationLog.countDocuments({ type: 'Fuel' });
        const resolvedCount = await RecommendationLog.countDocuments({ status: 'Resolved' });

        res.json({
            total,
            evCount,
            fuelCount,
            resolvedCount,
            successRate: total ? Math.round((resolvedCount / total) * 100) : 0,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/recommendations
exports.create = async (req, res) => {
    try {
        // Avoid duplicate logId
        const exists = await RecommendationLog.findOne({ logId: req.body.logId });
        if (exists) {
            return res.status(409).json({ message: 'Duplicate logId — already saved' });
        }
        const log = new RecommendationLog(req.body);
        const saved = await log.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: 'Failed to save recommendation log', error: err.message });
    }
};

// DELETE /api/recommendations/:id
exports.remove = async (req, res) => {
    try {
        const log = await RecommendationLog.findByIdAndDelete(req.params.id);
        if (!log) return res.status(404).json({ message: 'Log not found' });
        res.json({ message: 'Log deleted', id: req.params.id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// DELETE /api/recommendations  (bulk delete by logId array)
exports.bulkDelete = async (req, res) => {
    try {
        const { logIds } = req.body; // array of logId strings
        if (!Array.isArray(logIds) || logIds.length === 0) {
            return res.status(400).json({ message: 'Provide logIds array' });
        }
        const result = await RecommendationLog.deleteMany({ logId: { $in: logIds } });
        res.json({ message: `${result.deletedCount} log(s) deleted` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
