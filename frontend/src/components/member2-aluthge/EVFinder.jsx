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
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);


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

    const handleConfirmNavigation = () => {
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
            distanceKm: (result.originalDistance || result.distance),
            submissionDate: now.toISOString().split('T')[0],
            submissionTime: now.toTimeString().split(' ')[0].substring(0, 5)
        };

        // Send recommendation record instantly
        fetch(`${API_BASE}/recommendations`, {
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
    };

    const [dbStations, setDbStations] = useState([]);
    const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8081/api";

    const fetchDbStations = async () => {
        try {
            const response = await fetch(`${API_BASE}/ev-stations`);
            const data = await response.json();
            setDbStations(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to fetch EV stations", err);
            setDbStations([]);
        }
    };

    // Geocoding cache to avoid repeated API calls
    const [geoCache, setGeoCache] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('ev_geo_cache') || '{}');
        } catch { return {}; }
    });

    const geocodeWithRetry = async (address) => {
        if (geoCache[address]) return geoCache[address];

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ", Sri Lanka")}&format=json&limit=1`);
            const data = await res.json();
            if (data && data.length > 0) {
                const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                setGeoCache(prev => {
                    const next = { ...prev, [address]: coords };
                    localStorage.setItem('ev_geo_cache', JSON.stringify(next));
                    return next;
                });
                return coords;
            }
        } catch (err) {
            console.warn(`Geocoding failed for ${address}`, err);
        }
        return null;
    };

    const findNearestStation = async (userLoc) => {
        setLoading(true);
        setError(null);
        try {
            const stationsSource = dbStations;
            const processedStations = [];

            // Process and geocode stations
            for (const st of stationsSource) {
                const stationAddr = st.location || st.address;

                // User requested system convert registered address to Lat/Lng
                let coords = await geocodeWithRetry(stationAddr);

                // Fallback to stored lat/lng or default (Colombo)
                if (!coords) {
                    coords = {
                        lat: parseFloat(st.lat) || 6.9271,
                        lng: parseFloat(st.lng) || 79.8612
                    };
                }

                processedStations.push({
                    id: st._id || st.id,
                    name: st.name,
                    lat: coords.lat,
                    lng: coords.lng,
                    address: stationAddr,
                    status: st.status === 'Active' || st.status === 'Open' ? 'Open' : 'Closed',
                    power: st.power,
                    phone: st.phone
                });
            }

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

            const resultsWithDistance = processedStations.map(station => {
                let distanceNum = calculateDistance(userLoc.lat, userLoc.lng, station.lat, station.lng);
                let isReported = reportedStationNames.find(r => r.name === station.name);

                let originalDistance = distanceNum;

                if (isReported) {
                    distanceNum += 50;
                }

                return {
                    ...station,
                    distance: distanceNum,
                    originalDistance: originalDistance,
                    wait: `${Math.floor(Math.random() * 15 + 5)} mins`,
                    reportedIssue: isReported ? isReported.reason : null
                };
            }).sort((a, b) => a.distance - b.distance);

            if (resultsWithDistance.length > 0) {
                setResult(resultsWithDistance[0]);
                setStep(3);
            } else {
                setError("No stations found nearby.");
                setStep(1);
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
        fetchDbStations();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-blue-200/30 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-green-200/30 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-xl z-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10 text-center"
                >
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl text-white mb-6">
                        <Zap size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tight">EV Station Finder</h1>
                    <p className="text-slate-600 mt-3 text-lg">Find the nearest charging point in seconds</p>
                </motion.div>

                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="bg-white rounded-[2.5rem] shadow-2xl p-12 border border-white/50 backdrop-blur-sm"
                        >
                            <form onSubmit={handleSubmit} className="space-y-8">
                                <div>
                                    <label className="block text-base font-bold text-slate-700 mb-3">
                                        Current Location
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                                            <MapPin className={`h-6 w-6 ${location ? 'text-green-500' : 'text-slate-400'}`} />
                                        </div>
                                        <input
                                            type="text"
                                            readOnly
                                            value={location ? (locationName || 'Fetching place name...') : 'Detecting location...'}
                                            className="block w-full pl-14 pr-4 py-5 bg-slate-50 border-0 rounded-[1.5rem] text-slate-800 text-base font-medium focus:ring-2 focus:ring-blue-500/20 transition-all cursor-not-allowed"
                                        />
                                        <div className="absolute inset-y-0 right-5 flex items-center">
                                            {loading && <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>}
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
                                    className="w-full flex items-center justify-center gap-4 py-5 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-[1.5rem] text-lg font-black shadow-xl shadow-slate-900/20 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider"
                                >
                                    <span>Find Nearest Station</span>
                                    <ArrowRight size={22} />
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
                            className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
                        >
                            <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                    <Zap size={140} />
                                </div>
                                <div className="relative z-10">
                                    <span className="inline-block px-4 py-1.5 bg-green-500/20 text-green-400 text-xs font-black rounded-full mb-4 border border-green-500/30 uppercase tracking-widest">
                                        NEAREST STATION
                                    </span>
                                    <h2 className="text-3xl font-black mb-2">{result.name}</h2>
                                    <p className="text-slate-400 text-base font-medium flex items-center gap-2">
                                        <MapPin size={18} />
                                        {result.address}
                                    </p>
                                </div>
                            </div>

                            <div className="p-10">
                                <div className="grid grid-cols-2 gap-6 mb-10">
                                    <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 text-right shadow-sm">
                                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">Distance</p>
                                        <div className="flex items-baseline justify-end">
                                            <span className="text-4xl font-black text-blue-600">{(result.originalDistance || result.distance).toFixed(1)}</span>
                                            <span className="text-base text-slate-500 font-bold ml-1.5">km</span>
                                        </div>
                                        {result.reportedIssue && (
                                            <div className="text-[10px] mt-2 bg-red-100 text-red-600 px-2 py-1 rounded-lg uppercase tracking-wider font-black">
                                                Reported: {result.reportedIssue}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`p-6 rounded-[2rem] border shadow-sm ${result.status === 'Open' ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">Status</p>
                                        <p className={`text-4xl font-black ${result.status === 'Open' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {result.status}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        onClick={() => setShowConfirmDialog(true)}
                                        className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] text-lg font-black shadow-xl shadow-blue-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-wider"
                                    >
                                        <Navigation size={22} />
                                        Confirm Station
                                    </button>

                                    <div className="grid grid-cols-2 gap-4">
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

            {/* --- Navigation Confirmation UI --- */}
            <AnimatePresence>
                {showConfirmDialog && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                            className="bg-white max-w-sm w-full rounded-[2.5rem] overflow-hidden shadow-2xl"
                        >
                            <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Zap size={120} className="text-white" />
                                </div>
                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-500/30">
                                        <Navigation size={30} />
                                    </div>
                                    <h3 className="text-xl font-black text-white">Start Charging Trip?</h3>
                                    <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest font-bold">Recommended EV Hub</p>
                                </div>
                            </div>

                            <div className="p-8">
                                <div className="mb-8 text-center">
                                    <p className="text-lg font-bold text-slate-800 line-clamp-1">{result?.name}</p>
                                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{result?.address}</p>

                                    <div className="mt-6 flex items-center justify-center gap-4">
                                        <div className="px-4 py-2 bg-slate-100 rounded-xl text-center flex-1">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Distance</p>
                                            <p className="text-sm font-black text-slate-700">{(result?.originalDistance || result?.distance || 0).toFixed(1)} km</p>
                                        </div>
                                        <div className="px-4 py-2 bg-blue-50 rounded-xl text-center border border-blue-100 flex-1">
                                            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tighter">Status</p>
                                            <p className={`text-sm font-black ${result?.status === 'Open' ? 'text-green-600' : 'text-red-500'}`}>
                                                {result?.status || 'Unknown'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        onClick={handleConfirmNavigation}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-slate-800 transition-all border border-slate-700"
                                    >
                                        Confirm & Start Driving
                                    </button>
                                    <button
                                        onClick={() => setShowConfirmDialog(false)}
                                        className="w-full py-3 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-widest transition-all"
                                    >
                                        Maybe Later
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EVFinder;
