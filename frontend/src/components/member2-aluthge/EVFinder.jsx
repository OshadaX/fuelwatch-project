import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, ArrowRight, Zap, ChevronLeft, BatteryCharging, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import AIAssistant from './AIAssistant';

const EVFinder = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Form, 2: Loading, 3: Result
    const [location, setLocation] = useState(null);
    const [locationName, setLocationName] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Mock data for EV stations
    const mockStations = [
        { id: 1, name: "City Center EV Hub", lat: 6.9271, lng: 79.8612, address: "123 Main St, Colombo", status: "Open" },
        { id: 2, name: "Green Park Charging", lat: 6.9320, lng: 79.8550, address: "45 Park Ave, Colombo", status: "Closed" },
        { id: 3, name: "TechZone Charger", lat: 6.9100, lng: 79.8700, address: "88 Tech Rd, Colombo", status: "Open" },
    ];

    const getTimeOfDay = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
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
        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d;
    };

    const deg2rad = (deg) => {
        return deg * (Math.PI / 180);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!location) {
            setError("Real location is required. Please allow GPS access and try again.");
            return;
        }
        setStep(2);

        // Find nearest station using real GPS location
        setTimeout(() => {
            findNearestStation(location);
        }, 1500);
    };

    const findNearestStation = async (userLoc) => {
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

            let evPortalData = [];
            try {
                const stored = localStorage.getItem('evStations');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    evPortalData = parsed.map(s => ({
                        id: s.id,
                        name: s.name,
                        lat: parseFloat(s.lat) || 0,
                        lng: parseFloat(s.lng) || 0,
                        address: s.location || '',
                        status: s.status === 'Active' ? 'Open' : (s.status === 'Maintenance' ? 'Maintenance' : 'Closed'),
                        power: s.power,
                        operator: s.operator,
                        phone: s.phone
                    }));
                }
            } catch (e) {
                console.error('Error parsing evStations from localStorage', e);
            }

            const stations = evPortalData.length > 0 ? evPortalData : mockStations;

            const processedStations = stations
                .map(station => {
                    let distanceNum = calculateDistance(userLoc.lat, userLoc.lng, station.lat, station.lng);
                    let isReported = reportedStationNames.find(r => r.name === station.name);

                    let originalDistance = distanceNum; // Store original distance before penalty

                    if (isReported) {
                        distanceNum += 50; // Push far away
                    }

                    return {
                        ...station,
                        distance: distanceNum,
                        originalDistance: originalDistance,
                        wait: `${Math.floor(Math.random() * 15 + 5)} mins`,
                        reportedIssue: isReported ? isReported.reason : null
                    };
                })
                .sort((a, b) => a.distance - b.distance);

            if (processedStations.length > 0) {
                const recommendedStation = processedStations[0];
                setResult(recommendedStation);
                setStep(3);
            } else {
                setError("No stations found nearby.");
                setStep(1);

                // Log failed search
                saveSubmissionLogger({
                    type: 'EV Charging',
                    location: userLoc,
                    locationName: locationName,
                    preference: 'Any',
                    status: 'No Stations',
                    recommendedStation: 'N/A',
                    stationAddress: '',
                    distanceKm: null
                });
            }
        } catch (err) {
            console.error(err);
            setError("An error occurred while finding stations.");
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
            submissionDate: dateStr,
            submissionTime: timeStr
        };

        localStorage.setItem('guestSubmissions', JSON.stringify([newLog, ...existingLogs]));
    };

    const resetForm = () => {
        setStep(1);
        setResult(null);
        setError(null);
    };

    useEffect(() => {
        handleGetLocation();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-green-200/30 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md z-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 text-center"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg text-white mb-4">
                        <Zap size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800">EV Station Finder</h1>
                    <p className="text-slate-500 mt-2">Find the nearest charging point in seconds</p>
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
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Current Location
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <MapPin className={`h-5 w-5 ${location ? 'text-green-500' : 'text-slate-400'}`} />
                                        </div>
                                        <input
                                            type="text"
                                            readOnly
                                            value={location ? (locationName || 'Fetching place name...') : 'Detecting location...'}
                                            className="block w-full pl-12 pr-4 py-4 bg-slate-50 border-0 rounded-2xl text-slate-800 font-medium focus:ring-2 focus:ring-blue-500/20 transition-all cursor-not-allowed"
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                                            {loading && <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>}
                                        </div>
                                    </div>
                                    {error && (
                                        <div className="mt-2 ml-1">
                                            <p className="text-red-500 text-xs">{error}</p>
                                            <button
                                                type="button"
                                                onClick={handleGetLocation}
                                                className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                                            >
                                                ↺ Retry Location
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !location}
                                    className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-semibold shadow-lg shadow-slate-900/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span>Find Nearest Station</span>
                                    <ArrowRight size={20} />
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
                            className="bg-white/80 rounded-3xl shadow-xl p-12 text-center backdrop-blur-sm"
                        >
                            <div className="relative w-24 h-24 mx-auto mb-6">
                                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <BatteryCharging className="text-blue-500 animate-pulse" size={32} />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Analyzing Routes</h3>
                            <p className="text-slate-500 text-sm">Finding the best charging spot for you...</p>
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
                                <div className="absolute top-0 right-0 p-6 opacity-10">
                                    <Zap size={120} />
                                </div>
                                <div className="relative z-10">
                                    <span className="inline-block px-3 py-1 bg-green-500/20 text-green-400 text-xs font-bold rounded-full mb-3 border border-green-500/20">
                                        NEAREST STATION
                                    </span>
                                    <h2 className="text-2xl font-bold mb-1">{result.name}</h2>
                                    <p className="text-slate-400 text-sm flex items-center gap-1">
                                        <MapPin size={14} />
                                        {result.address}
                                    </p>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-right">
                                        <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Distance</p>
                                        <div className="flex items-baseline justify-end">
                                            <span className="text-2xl font-black text-blue-600">{(result.originalDistance || result.distance).toFixed(1)}</span>
                                            <span className="text-sm text-slate-500 font-medium ml-1">km</span>
                                        </div>
                                        {result.reportedIssue && (
                                            <div className="text-[10px] mt-1 bg-red-100 text-red-600 px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                                                Reported: {result.reportedIssue}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`p-4 rounded-2xl border ${result.status === 'Open' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                        <p className="text-slate-500 text-xs font-semibold uppercase mb-1">Status</p>
                                        <p className={`text-2xl font-bold ${result.status === 'Open' ? 'text-green-600' : 'text-red-500'}`}>
                                            {result.status}
                                        </p>
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
                                                    type: 'EV Charging',
                                                    currentLocation: locationName || location,
                                                    preference: 'Any',
                                                    status: 'Resolved',
                                                    recommendedStation: result.name,
                                                    stationAddress: result.address,
                                                    distanceKm: result.distance,
                                                    submissionDate: now.toISOString().split('T')[0],
                                                    submissionTime: now.toTimeString().split(' ')[0].substring(0, 5)
                                                };

                                                // Send recommendation record instantly
                                                fetch('http://localhost:8081/api/recommendations', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(recPayload)
                                                }).catch(console.error);

                                                navigate('/navigate', {
                                                    state: {
                                                        destination: { ...result, type: 'ev' },
                                                        origin: location,
                                                        logId: newLogId
                                                    }
                                                });
                                            }
                                        }}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <Navigation size={20} />
                                        Confirm Station
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

            {/* AI Smart Assistant */}
            <AIAssistant contextData={{ nearestStation: result }} />
        </div>
    );
};

export default EVFinder;
