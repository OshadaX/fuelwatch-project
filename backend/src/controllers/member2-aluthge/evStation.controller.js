const EVStation = require('../../models/member2-aluthge/EVStationModel');

// GET /api/ev-stations
exports.getAll = async (req, res) => {
    try {
        const { status, search } = req.query;
        const filter = {};
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
                { operator: { $regex: search, $options: 'i' } },
            ];
        }
        const stations = await EVStation.find(filter).sort({ createdAt: -1 });
        res.json(stations);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch EV stations', error: err.message });
    }
};

// GET /api/ev-stations/:id
exports.getById = async (req, res) => {
    try {
        const station = await EVStation.findById(req.params.id);
        if (!station) return res.status(404).json({ message: 'EV station not found' });
        res.json(station);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// POST /api/ev-stations
exports.create = async (req, res) => {
    try {
        const station = new EVStation(req.body);
        const saved = await station.save();
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ message: 'Failed to create EV station', error: err.message });
    }
};

// PUT /api/ev-stations/:id
exports.update = async (req, res) => {
    try {
        const station = await EVStation.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!station) return res.status(404).json({ message: 'EV station not found' });
        res.json(station);
    } catch (err) {
        res.status(400).json({ message: 'Failed to update EV station', error: err.message });
    }
};

// DELETE /api/ev-stations/:id
exports.remove = async (req, res) => {
    try {
        const station = await EVStation.findByIdAndDelete(req.params.id);
        if (!station) return res.status(404).json({ message: 'EV station not found' });
        res.json({ message: 'EV station deleted successfully', id: req.params.id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
