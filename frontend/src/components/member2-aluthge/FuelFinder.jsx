import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, ArrowRight, Fuel, ChevronLeft, Search, CheckCircle, XCircle, Droplet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FuelFinder = () => {
    const [step, setStep] = useState(1);
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Form states
    const [fuelType, setFuelType] = useState('Petrol');
    const [brand, setBrand] = useState('');

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

    const handleGetLocation = () => {
        setLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                    setLoading(false);
                },
                (err) => {
                    setError("Using default location (GPS denied needed for demo).");
                    setLocation({ lat: 6.9270, lng: 79.8610 });
                    setLoading(false);
                }
            );
        } else {
            setError("Geolocation is not supported by your browser.");
            setLoading(false);
        }
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
        setStep(2);

        setTimeout(() => {
            const userLoc = location || { lat: 6.9270, lng: 79.8610 };
            findBestStation(userLoc);
        }, 1500);
    };

    const findBestStation = (userLoc) => {
        // 1. Calculate distance & Filter by Brand (if selected)
        let candidates = mockStations.map(station => ({
            ...station,
            distance: calculateDistance(userLoc.lat, userLoc.lng, station.lat, station.lng)
        }));

        if (brand && brand !== 'Any') {
            candidates = candidates.filter(s => s.brand === brand);
        }

        // 2. Sort by distance
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
        }
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
                                            value={location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : "Detecting location..."}
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
                                                <option value="Petrol">Petrol</option>
                                                <option value="Diesel">Diesel</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                                                <Droplet size={16} />
                                            </div>
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

                                {error && <div className="p-3 bg-red-50 text-red-500 text-xs rounded-xl flex items-center gap-2">
                                    <XCircle size={14} /> {error}
                                </div>}

                                <button
                                    type="submit"
                                    disabled={!location && !loading} // Allow if location is set (even default) 
                                    className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-semibold shadow-lg shadow-slate-900/10 transition-all transform active:scale-[0.98] mt-2"
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
                                        <span className="text-2xl font-bold text-slate-800">{result.distance.toFixed(1)}</span>
                                        <span className="text-sm text-slate-400 font-medium ml-1">km</span>
                                    </div>
                                </div>

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
                                        onClick={() => window.alert("Navigation Started!")}
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
        </div>
    );
};

export default FuelFinder;
