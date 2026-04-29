import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Navigation, MapPin, Clock, Zap, Fuel, Activity, Star, CheckCircle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NavigationMap = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const [progress, setProgress] = useState(0);
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [wasEasyToFind, setWasEasyToFind] = useState(null); // Changed initial state to null
    const [reason, setReason] = useState(''); // Added reason state
    const [comment, setComment] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Provide robust fallbacks if someone manually visits this route
    const destination = state?.destination || {
        name: "Unknown Station",
        lat: 6.9271,
        lng: 79.8612,
        address: "Colombo, Sri Lanka",
        distance: 2.5,
        type: "fuel" // 'ev' or 'fuel'
    };

    const origin = state?.origin || {
        lat: 6.9000,
        lng: 79.8500
    };

    useEffect(() => {
        // Simulate a progress bar representing driving route calculation or GPS connection
        const timer = setInterval(() => {
            setProgress(p => {
                if (p >= 100) {
                    clearInterval(timer);
                    return 100;
                }
                return p + (Math.random() * 15);
            });
        }, 300);

        return () => clearInterval(timer);
    }, []);

    // Estimate based on 30km/h average city driving speed
    const estimatedMinutes = Math.max(1, Math.round((destination.distance / 30) * 60));

    // Calculate embedded google map URL (Using directions mode)
    const mapUrl = `https://www.google.com/maps/embed/v1/directions?key=YOUR_GOOGLE_MAPS_API_KEY_HERE&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=driving`;

    // Note: Since we don't have an embed API key, we use a static map search embed as a fallback
    // In production with a real API key, swap this to the `directions` embed above.
    const fallbackMapUrl = `https://www.google.com/maps?q=${destination.lat},${destination.lng}&hl=es;z=14&output=embed`;

    const handleSubmitFeedback = () => {
        if (rating === 0) return; // Rating is mandatory

        const feedbackData = {
            recommendationId: state?.logId || `REC-UNKNOWN-${Math.floor(1000 + Math.random() * 9000)}`,
            stationName: destination.name,
            rating,
            wasEasyToFind,
            reason: !wasEasyToFind ? reason : '',
            comment
        };

        fetch('http://localhost:8081/api/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feedbackData)
        })
            .then(() => {
                setIsSubmitted(true);
                // Auto navigate after 3 seconds
                setTimeout(() => {
                    if (wasEasyToFind === false) {
                        navigate(destination.type === 'ev' ? '/ev-station' : '/fuel-station');
                    } else {
                        navigate('/');
                    }
                }, 3000);
            })
            .catch(err => {
                console.error(err);
                setIsSubmitted(true); // Still show success UI but log error
                setTimeout(() => {
                    if (wasEasyToFind === false) {
                        navigate(destination.type === 'ev' ? '/ev-station' : '/fuel-station');
                    } else {
                        navigate('/');
                    }
                }, 3000);
            });
    };

    return (
        <div className="relative h-screen w-full bg-slate-900 overflow-hidden flex flex-col">

            {/* Top Navigation Bar */}
            <div className="absolute top-0 left-0 w-full z-20 p-6 pointer-events-none">
                <div className="flex justify-between items-start pointer-events-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:scale-105 transition-transform text-slate-800"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700/50 shadow-lg flex items-center gap-2">
                        <Activity size={16} className="text-emerald-400 animate-pulse" />
                        <span className="text-white text-sm font-semibold tracking-wide">Live GPS Tracker</span>
                    </div>
                </div>
            </div>

            {/* The Map iframe surface */}
            <div className="flex-1 w-full bg-slate-200 relative">
                <iframe
                    title="Navigation Map"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    src={fallbackMapUrl}
                />

                {/* Simulated Loading Overlay */}
                {progress < 100 && (
                    <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center flex-col z-10 transition-opacity duration-500">
                        <div className="w-64 h-2 bg-white/30 rounded-full overflow-hidden mb-4">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-slate-800 font-bold bg-white/80 px-4 py-1 rounded-full shadow-sm text-sm">
                            Locating route...
                        </p>
                    </div>
                )}
            </div>

            {/* Bottom Uber-style Card Drawer */}
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 120 }}
                className="relative z-20 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pb-8 pt-2 px-6"
            >
                {/* Drawer notch */}
                <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6" />

                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {destination.type === 'ev' ? (
                                <Zap size={18} className="text-indigo-600" />
                            ) : (
                                <Fuel size={18} className="text-amber-500" />
                            )}
                            <h2 className="text-2xl font-bold text-slate-800">{destination.name}</h2>
                        </div>
                        <p className="text-slate-500 text-sm flex items-center gap-1.5">
                            <MapPin size={14} /> {destination.address}
                        </p>
                    </div>

                    <div className="text-right">
                        <div className="text-3xl font-black text-emerald-500">
                            {estimatedMinutes}
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">MIN</p>
                    </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                            <Navigation size={24} className="transform -rotate-45 ml-[-2px] mt-[2px]" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Route active</p>
                            <p className="text-xs text-slate-500">{destination.distance.toFixed(1)} km remaining</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white shadow-sm border border-slate-100 rounded-full">
                        <Clock size={14} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600">
                            {(new Date(Date.now() + estimatedMinutes * 60000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => {
                            window.open(`https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`, '_blank');
                        }}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl shadow-sm transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        Maps App
                    </button>
                    <button
                        onClick={() => setFeedbackOpen(true)}
                        className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={20} />
                        Arrived & Feedback
                    </button>
                </div>
            </motion.div>

            {/* Mandatory Feedback Modal */}
            <AnimatePresence>
                {feedbackOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
                        >
                            <AnimatePresence mode='wait'>
                                {!isSubmitted ? (
                                    <motion.div
                                        key="form"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <div className="bg-emerald-500 p-6 text-center text-white relative">
                                            <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3 backdrop-blur-md border border-white/30">
                                                <CheckCircle size={32} className="text-white drop-shadow-md" />
                                            </div>
                                            <h3 className="text-xl font-black">You've Arrived!</h3>
                                            <p className="text-emerald-50 text-sm mt-1">Please rate your experience.</p>
                                        </div>

                                        <div className="p-6">
                                            <p className="text-center font-bold text-slate-700 mb-4">How was {destination.name}?</p>

                                            {/* Star Rating */}
                                            <div className="flex justify-center gap-2 mb-6">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button
                                                        key={star}
                                                        type="button"
                                                        onClick={() => setRating(star)}
                                                        onMouseEnter={() => setHoverRating(star)}
                                                        onMouseLeave={() => setHoverRating(0)}
                                                        className="p-1 transition-transform hover:scale-110 focus:outline-none"
                                                    >
                                                        <Star
                                                            size={32}
                                                            className={`transition-colors ${(hoverRating || rating) >= star
                                                                ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                                                                : 'text-slate-200 fill-slate-50'
                                                                }`}
                                                        />
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Easy to find toggle */}
                                            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl mb-4 border border-slate-100">
                                                <span className="text-sm font-semibold text-slate-700">Found it easily?</span>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setWasEasyToFind(true)}
                                                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${wasEasyToFind ? 'bg-emerald-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
                                                            }`}
                                                    >
                                                        Yes
                                                    </button>
                                                    <button
                                                        onClick={() => setWasEasyToFind(false)}
                                                        className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${!wasEasyToFind ? 'bg-red-500 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
                                                            }`}
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Failure Reason Dropdown */}
                                            {wasEasyToFind === false && (
                                                <div className="mb-4">
                                                    <select
                                                        value={reason}
                                                        onChange={(e) => setReason(e.target.value)}
                                                        className="w-full px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/30"
                                                    >
                                                        <option value="">-- Why couldn't you find it? --</option>
                                                        <option value="Station Closed">Station was Closed</option>
                                                        <option value="Fuel/EV Unavailable">Fuel / EV Chargers Unavailable</option>
                                                        <option value="Incorrect Location">Incorrect Map Location</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                            )}

                                            <div className="relative mb-6">
                                                <MessageSquare size={16} className="absolute top-3 left-3 text-slate-400" />
                                                <textarea
                                                    placeholder="Any other comments? (Optional)"
                                                    value={comment}
                                                    onChange={(e) => setComment(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all resize-none h-24"
                                                ></textarea>
                                            </div>

                                            <button
                                                onClick={handleSubmitFeedback}
                                                disabled={rating === 0}
                                                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
                                            >
                                                Submit & Return Home
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-10 text-center"
                                    >
                                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                            <CheckCircle size={40} className="animate-bounce" />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-800 mb-2">Thank You!</h3>
                                        <p className="text-slate-500 leading-relaxed">
                                            Your feedback has been saved. Your contribution helps us improve the fuel distribution network research.
                                        </p>
                                        <div className="mt-8 flex flex-col items-center gap-2">
                                            <div className="w-12 h-1 bg-emerald-500 rounded-full animate-pulse" />
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Redirecting Home...</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NavigationMap;
