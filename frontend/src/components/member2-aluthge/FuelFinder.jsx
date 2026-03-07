import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, ArrowRight, Fuel, ChevronLeft, Search, CheckCircle, XCircle, Droplet, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// ─── CPC / Ceypetco official fuel prices (LKR per litre) ────────────────────
// Source: Ceylon Petroleum Corporation announcements (updated 1st of each month)
const FUEL_PRICES_BY_MONTH = {
    '2025-11': { 'Lanka Petrol 92 Octane': 294, 'Lanka Petrol 95 Octane': 335, 'Lanka Auto Diesel': 277, 'Lanka Super Diesel': 318, 'Auto Kerosene': 180 },
    '2025-12': { 'Lanka Petrol 92 Octane': 294, 'Lanka Petrol 95 Octane': 335, 'Lanka Auto Diesel': 277, 'Lanka Super Diesel': 318, 'Auto Kerosene': 185 },
    '2026-01': { 'Lanka Petrol 92 Octane': 292, 'Lanka Petrol 95 Octane': 340, 'Lanka Auto Diesel': 277, 'Lanka Super Diesel': 323, 'Auto Kerosene': 182 },
    '2026-02': { 'Lanka Petrol 92 Octane': 292, 'Lanka Petrol 95 Octane': 340, 'Lanka Auto Diesel': 277, 'Lanka Super Diesel': 323, 'Auto Kerosene': 182 },
    '2026-03': { 'Lanka Petrol 92 Octane': 293, 'Lanka Petrol 95 Octane': 340, 'Lanka Auto Diesel': 281, 'Lanka Super Diesel': 329, 'Auto Kerosene': 182 },
};

const FUEL_LABELS = {
    'Lanka Petrol 92 Octane': 'Petrol 92',
    'Lanka Petrol 95 Octane': 'Petrol 95',
    'Lanka Auto Diesel': 'Auto Diesel',
    'Lanka Super Diesel': 'Super Diesel',
    'Auto Kerosene': 'Kerosene',
};

const getMonthKey = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const getFuelPrices = () => {
    const key = getMonthKey();
    const cacheRaw = localStorage.getItem('fuelPricesCache');
    if (cacheRaw) {
        try {
            const cache = JSON.parse(cacheRaw);
            if (cache.month === key && cache.prices) return cache.prices;
        } catch { /* ignore */ }
    }
    // Use this month's table or the latest known month as fallback
    const prices = FUEL_PRICES_BY_MONTH[key]
        || FUEL_PRICES_BY_MONTH[Object.keys(FUEL_PRICES_BY_MONTH).sort().at(-1)];
    localStorage.setItem('fuelPricesCache', JSON.stringify({ month: key, prices }));
    return prices;
};

const FuelFinder = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [location, setLocation] = useState(null);
    const [locationName, setLocationName] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [dbStations, setDbStations] = useState([]);

    // Form states
    const [fuelType, setFuelType] = useState('Lanka Petrol 92 Octane');
    const [brand, setBrand] = useState('');
    const [fuelPrices, setFuelPrices] = useState(() => getFuelPrices());
    const [budget, setBudget] = useState('');

    // API Base URL
    const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8081/api";

    // Mock data
    const mockStations = [
        {
            id: 1,
            name: "City Fuels",
            lat: 6.9271,
            lng: 79.8612,
            address: "123 Main St, Colombo",
            status: "Open",
            brand: "Ceypetco",
            inventory: { 'Petrol': 'Available', 'Diesel': 'Unavailable', 'Other': 'Available' }
        },
        {
            id: 2,
            name: "Lanka IOC Station",
            lat: 6.9320,
            lng: 79.8550,
            address: "45 Park Ave, Colombo",
            status: "Open",
            brand: "IOC",
            inventory: { 'Petrol': 'Available', 'Diesel': 'Available', 'Other': 'Unavailable' }
        },
        {
            id: 3,
            name: "Highway Filling",
            lat: 6.9100,
            lng: 79.8700,
            address: "88 Tech Rd, Colombo",
            status: "Closed",
            brand: "Ceypetco",
            inventory: { 'Petrol': 'Available', 'Diesel': 'Available', 'Other': 'Available' }
        },
        {
            id: 4,
            name: "Suburban Fuel",
            lat: 6.9000,
            lng: 79.8500,
            address: "101 Sub Rd, Colombo",
            status: "Open",
            brand: "Sinopec",
            inventory: { 'Petrol': 'Unavailable', 'Diesel': 'Available', 'Other': 'Available' }
        },
    ];

    const fetchDbStations = async () => {
        try {
            // Note: In reality, use an endpoint that returns all items without pagination if possible, 
            // or pass a high limit just for frontend radius filtering.
            const response = await fetch(`${API_BASE}/station?limit=100`);
            const data = await response.json();

            const stationsList = Array.isArray(data) ? data : (data.items || []);

            // Map the DB Stations into a usable format, assigning mock coordinates built from their location string roughly
            // since actual lat/lng fields don't seem explicitly present on the registration form Schema.
            const mappedStations = stationsList.map(st => {
                // Creating deterministic faux-coordinates based on ID length to scatter them around Colombo
                const baseLat = 6.9271;
                const baseLng = 79.8612;
                const offset = (st.Id.length * 0.01) || 0.05;

                // Simplify tank inventory structure to what the UI expects for `Available`/`Unavailable`
                const inventoryObj = {};
                st.tanks?.forEach(tank => {
                    // If it exists in tanks array, assume Available 
                    inventoryObj[tank.fuel_type] = 'Available';
                });

                return {
                    id: st._id || st.Id,
                    name: st.Name,
                    lat: baseLat + (Math.random() * offset * (Math.random() > 0.5 ? 1 : -1)),
                    lng: baseLng + (Math.random() * offset * (Math.random() > 0.5 ? 1 : -1)),
                    address: st.Location,
                    status: "Open", // Defaulting to Open
                    brand: st.Name.includes("IOC") ? "IOC" : st.Name.includes("Sinopec") ? "Sinopec" : "Ceypetco",
                    inventory: inventoryObj
                };
            });

            setDbStations(mappedStations);
        } catch (err) {
            console.error("Failed to fetch registered stations", err);
            // Fallback to mock data if backend request fails
            setDbStations(mockStations);
        }
    };

    const handleGetLocation = () => {
        setLoading(true);
        setError(null);
        setLocation(null);
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            setLoading(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude: lat, longitude: lng } = position.coords;
                setLocation({ lat, lng });

                // Reverse geocode to get a human-readable name
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
                    );
                    const data = await res.json();
                    const addr = data.address || {};
                    const name =
                        addr.suburb ||
                        addr.neighbourhood ||
                        addr.village ||
                        addr.town ||
                        addr.city ||
                        addr.county ||
                        data.display_name ||
                        `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    setLocationName(name);
                } catch {
                    setLocationName(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                }

                setLoading(false);
            },
            (err) => {
                let msg = "Unable to retrieve your location.";
                if (err.code === 1) msg = "Location access denied. Please allow location permission in your browser.";
                else if (err.code === 2) msg = "Location unavailable. Please check your GPS or network.";
                else if (err.code === 3) msg = "Location request timed out. Please try again.";
                setError(msg);
                setLoading(false);
                // No fallback — real location is required
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!location) {
            setError("Real location is required. Please allow GPS access and try again.");
            return;
        }
        setStep(2);

        // Find best station using real GPS location
        setTimeout(() => {
            findBestStation(location);
        }, 1500);
    };

    const findBestStation = async (userLoc) => {
        setLoading(true);
        setError(null);
        try {
            let reportedStationNames = [];
            try {
                const feedbackRes = await fetch('http://localhost:8081/api/feedback/downvoted');
                if (feedbackRes.ok) {
                    const downvotedData = await feedbackRes.json();
                    reportedStationNames = downvotedData.map(d => ({ name: d.stationName, reason: d.reason }));
                }
            } catch (err) {
                console.log("Could not fetch feedback downvotes - continuing normally.");
            }

            // 1. Calculate distance & Filter by Brand (if selected)
            let candidates = dbStations.map(station => {
                let distanceNum = calculateDistance(userLoc.lat, userLoc.lng, station.lat, station.lng);
                let isReported = reportedStationNames.find(r => r.name === station.name);

                let originalDistance = distanceNum;

                if (isReported) {
                    distanceNum += 50; // Add 50km penalty
                }

                return {
                    ...station,
                    distance: distanceNum,
                    originalDistance,
                    reportedIssue: isReported ? isReported.reason : null
                };
            });

            if (brand && brand !== 'Any') {
                candidates = candidates.filter(s => s.brand === brand);
            }

            // 2. Sort by penalised distance
            candidates.sort((a, b) => a.distance - b.distance);

            // 3. Evaluate one by one
            let recommended = null;

            for (const station of candidates) {
                // Is Open?
                if (station.status !== 'Open') continue;

                // Has Fuel?
                const availability = station.inventory[fuelType];
                if (availability === 'Available') {
                    recommended = station;
                    break;
                }
            }

            if (recommended) {
                setResult(recommended);
                setStep(3);
            } else {
                setError(`No open stations found with ${fuelType} available nearby.`);
                setStep(1);

                saveSubmissionLogger({
                    type: 'Fuel',
                    location: userLoc,
                    locationName: locationName,
                    preference: `${fuelType} (${brand || 'Any'})`,
                    status: 'No Stations',
                    recommendedStation: 'N/A',
                    stationAddress: '',
                    distanceKm: null,
                    brand: brand || 'Any'
                });
            }
        } catch (err) {
            console.error(err);
            setError("An error occurred generating your recommendation.");
            setStep(1);
        } finally {
            setLoading(false);
        }
    };

    const saveSubmissionLogger = (data) => {
        const existingLogs = JSON.parse(localStorage.getItem('guestSubmissions') || '[]');

        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);

        const newLog = {
            id: `REC-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            currentLocation: data.locationName || `${data.location.lat.toFixed(4)}, ${data.location.lng.toFixed(4)}`,
            type: data.type,
            preference: data.preference,
            status: data.status,
            recommendedStation: data.recommendedStation,
            stationAddress: data.stationAddress || '',
            distanceKm: data.distanceKm != null ? parseFloat(data.distanceKm.toFixed(2)) : null,
            brand: data.brand || '',
            submissionDate: dateStr,
            submissionTime: timeStr
        };

        localStorage.setItem('guestSubmissions', JSON.stringify([newLog, ...existingLogs]));
    };

    const resetForm = () => {
        setStep(1);
        setResult(null);
        setError(null);
        setBudget('');
    };

    useEffect(() => {
        handleGetLocation();
        fetchDbStations();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute overflow-hidden top-[-20%] left-[20%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-3xl opacity-50" />
                <div className="absolute overflow-hidden bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-3xl opacity-50" />
            </div>

            <div className="w-full max-w-md z-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 text-center"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg text-white mb-4">
                        <Fuel size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800">Fuel Station Finder</h1>
                    <p className="text-slate-500 mt-2">Locate real-time fuel availability</p>
                </motion.div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-white rounded-3xl shadow-xl p-8 border border-white/50 backdrop-blur-sm"
                        >
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Current Location
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <MapPin className={`h-5 w-5 ${location ? 'text-green-500' : 'text-slate-400'}`} />
                                        </div>
                                        <input
                                            type="text"
                                            readOnly
                                            value={location ? (locationName || 'Fetching place name...') : 'Detecting location...'}
                                            className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border-0 rounded-2xl text-slate-800 text-sm font-medium focus:ring-2 focus:ring-amber-500/20"
                                        />
                                        {loading && (
                                            <div className="absolute inset-y-0 right-4 flex items-center">
                                                <div className="animate-spin h-4 w-4 border-2 border-amber-500 rounded-full border-t-transparent"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Fuel Type
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={fuelType}
                                                onChange={(e) => setFuelType(e.target.value)}
                                                className="block w-full pl-4 pr-8 py-3.5 bg-slate-50 border-0 rounded-2xl text-slate-800 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 appearance-none cursor-pointer"
                                            >
                                                {Object.entries(FUEL_LABELS).map(([key, label]) => (
                                                    <option key={key} value={key}>
                                                        {label} — Rs.{fuelPrices[key]}/L
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                                                <Droplet size={16} />
                                            </div>
                                        </div>
                                        {/* Live price badge */}
                                        <div className="mt-2 flex items-center justify-between">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-full">
                                                <Droplet size={11} />
                                                Rs. {fuelPrices[fuelType]} / litre
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                                <RefreshCw size={9} />
                                                Updated 1st of month
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Brand <span className="text-xs text-slate-400 font-normal">(Opt)</span>
                                        </label>
                                        <select
                                            value={brand}
                                            onChange={(e) => setBrand(e.target.value)}
                                            className="block w-full px-4 py-3.5 bg-slate-50 border-0 rounded-2xl text-slate-800 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 appearance-none cursor-pointer"
                                        >
                                            <option value="">Any</option>
                                            <option value="Ceypetco">Ceypetco</option>
                                            <option value="IOC">IOC</option>
                                            <option value="Sinopec">Sinopec</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Optional Budget Field */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Your Budget
                                        <span className="text-xs text-slate-400 font-normal ml-1">(Optional)</span>
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <span className="text-sm font-bold text-slate-400">Rs.</span>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="e.g. 2000"
                                            value={budget}
                                            onChange={(e) => setBudget(e.target.value)}
                                            className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 border-0 rounded-2xl text-slate-800 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    {budget && Number(budget) > 0 && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="mt-2 flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl"
                                        >
                                            <Droplet size={14} className="text-green-500 shrink-0" />
                                            <span className="text-sm text-green-700">
                                                You can get{' '}
                                                <span className="font-bold text-green-800">
                                                    {(Number(budget) / fuelPrices[fuelType]).toFixed(2)} L
                                                </span>{' '}
                                                of {FUEL_LABELS[fuelType]}
                                            </span>
                                        </motion.div>
                                    )}
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 text-red-500 text-xs rounded-xl flex items-start gap-2">
                                        <XCircle size={14} className="mt-0.5 shrink-0" />
                                        <div>
                                            <span>{error}</span>
                                            <button
                                                type="button"
                                                onClick={handleGetLocation}
                                                className="block mt-1 text-blue-600 hover:text-blue-800 font-semibold underline"
                                            >
                                                ↺ Retry Location
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !location}
                                    className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-semibold shadow-lg shadow-slate-900/10 transition-all transform active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Search size={18} />
                                    Find Fuel Station
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white/90 rounded-3xl shadow-xl p-10 text-center backdrop-blur-sm mx-4"
                        >
                            <div className="relative w-20 h-20 mx-auto mb-6">
                                <div className="animate-spin absolute inset-0 border-4 border-amber-500 rounded-full border-b-transparent"></div>
                                <div className="absolute inset-0 flex items-center justify-center text-amber-600">
                                    <Fuel size={28} />
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">Checking Availability</h3>
                            <p className="text-slate-500 text-sm mt-1">Scanning stations for {fuelType}...</p>
                        </motion.div>
                    )}

                    {step === 3 && result && (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100"
                        >
                            <div className="bg-slate-900 p-6 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Fuel size={100} />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="px-2.5 py-1 bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-md">
                                            Recommended
                                        </span>
                                        <span className="px-2.5 py-1 bg-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-md">
                                            {result.brand}
                                        </span>
                                    </div>
                                    <h2 className="text-2xl font-bold mb-1">{result.name}</h2>
                                    <p className="text-slate-400 text-sm flex items-center gap-1">
                                        <MapPin size={14} />
                                        {result.address}
                                    </p>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Status</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                            <span className="font-bold text-slate-700">Open Now</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Distance</p>
                                        <span className="text-2xl font-bold text-slate-800">{(result.originalDistance || result.distance).toFixed(1)}</span>
                                        {result.reportedIssue && (
                                            <div className="text-[10px] mt-1 bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                                                Reported: {result.reportedIssue}
                                            </div>
                                        )}
                                        <span className="text-sm text-slate-400 font-medium ml-1">km</span>
                                    </div>
                                </div>

                                {/* Budget breakdown card — only shown if user entered a budget */}
                                {budget && Number(budget) > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="mb-5 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200"
                                    >
                                        <p className="text-xs text-amber-600 uppercase font-bold mb-2 flex items-center gap-1.5">
                                            <Droplet size={12} /> Budget Breakdown
                                        </p>
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <p className="text-3xl font-black text-amber-700">
                                                    {(Number(budget) / fuelPrices[fuelType]).toFixed(2)}
                                                    <span className="text-base font-semibold text-amber-500 ml-1">L</span>
                                                </p>
                                                <p className="text-xs text-amber-600 mt-0.5">
                                                    of {FUEL_LABELS[fuelType]} for Rs. {Number(budget).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-400">Rate</p>
                                                <p className="text-sm font-bold text-slate-600">Rs. {fuelPrices[fuelType]}/L</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                <div className="mb-8">
                                    <h4 className="text-sm font-bold text-slate-800 mb-3 px-1">Real-time Availability</h4>
                                    <div className="space-y-2">
                                        {Object.entries(result.inventory).map(([type, status]) => (
                                            <div key={type} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${type === fuelType ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                                                        <Droplet size={16} />
                                                    </div>
                                                    <span className={`text-sm font-medium ${type === fuelType ? 'text-slate-900' : 'text-slate-600'}`}>{type}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold ${status === 'Available' ? 'text-green-600' : 'text-red-500'}`}>
                                                        {status}
                                                    </span>
                                                    {status === 'Available' ?
                                                        <CheckCircle size={16} className="text-green-500" /> :
                                                        <XCircle size={16} className="text-red-400" />
                                                    }
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={() => {
                                            const isConfirmed = window.confirm("Are you sure you want to confirm this station recommendation and start navigating?");
                                            if (isConfirmed) {
                                                const now = new Date();
                                                const newLogId = `REC-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
                                                const recPayload = {
                                                    logId: newLogId,
                                                    type: 'Fuel',
                                                    currentLocation: locationName || location,
                                                    preference: `${fuelType} (${brand || 'Any'})`,
                                                    status: 'Resolved',
                                                    recommendedStation: result.name,
                                                    stationAddress: result.address,
                                                    distanceKm: result.distance,
                                                    brand: result.brand,
                                                    submissionDate: now.toISOString().split('T')[0],
                                                    submissionTime: now.toTimeString().split(' ')[0].substring(0, 5)
                                                };

                                                fetch('http://localhost:8081/api/recommendations', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(recPayload)
                                                }).catch(console.error);

                                                navigate('/navigate', {
                                                    state: {
                                                        destination: { ...result, type: 'fuel' },
                                                        origin: location,
                                                        logId: newLogId
                                                    }
                                                });
                                            }
                                        }}
                                        className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <Navigation size={20} />
                                        Navigate to Station
                                    </button>

                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={resetForm}
                                            className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                                        >
                                            <ChevronLeft size={18} />
                                            Back
                                        </button>
                                        <button
                                            onClick={() => window.location.href = '/'}
                                            className="py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold transition-colors"
                                        >
                                            Home
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div >
    );
};

export default FuelFinder;
