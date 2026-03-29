import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles, Zap, MapPin, Clock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { surveyStats } from '../../data/surveyData';

const AIAssistant = ({ contextData, type = 'ev' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const chatEndRef = useRef(null);

    const isEV = type === 'ev';
    const storageKey = `fuelwatch_chat_${type}`;

    // Initial welcome message
    const welcomeMsg = {
        id: 'welcome',
        type: 'bot',
        text: isEV
            ? "Hello! I'm your FuelWatch EV Assistant. Need help finding a station or have questions about charging?"
            : "Hello! I'm your FuelWatch Smart Assistant. I can help you find fuel stations and check real-time availability!",
        timestamp: new Date().toISOString()
    };

    // Load messages from localStorage
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : [welcomeMsg];
    });

    // Save messages to localStorage
    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(messages));
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Predefined suggestions
    const suggestions = isEV ? [
        "Find nearest charger",
        "Charging tips",
        "Battery best practices",
        "How to use this app?"
    ] : [
        "Find nearest fuel station",
        "Survey findings (2022)",
        "Did it reduce queues?",
        "Registration issues"
    ];

    const handleAction = (text) => {
        const userMsg = { id: Date.now(), type: 'user', text, timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);

        // Simulate bot thinking
        setTimeout(() => {
            let response = "";
            const lowerText = text.toLowerCase();

            if (lowerText.includes("charger") || lowerText.includes("nearest") || lowerText.includes("fuel station")) {
                response = contextData?.nearestStation
                    ? `The nearest ${isEV ? 'EV station' : 'fuel station'} is ${contextData.nearestStation.name} (${contextData.nearestStation.distance.toFixed(1)} km away). It's currently ${contextData.nearestStation.status}.`
                    : `I need your location first! Use the 'Find Nearest Station' button to help me find a spot for you.`;
            } else if (isEV && (lowerText.includes("type") || lowerText.includes("connector") || lowerText.includes("level"))) {
                response = "In Sri Lanka, most public chargers use Type 2 (AC) or CCS2 (DC Fast Charging). Level 2 AC chargers are common for homes/malls, while Level 3 DC chargers are found at major highway stops for rapid charging (20-80% in 30 mins).";
            } else if (isEV && (lowerText.includes("battery") || lowerText.includes("health") || lowerText.includes("longevity"))) {
                response = "To maintain battery health, follow the 20-80 rule: avoid letting the charge drop below 20% or stay at 100% for too long. Lithium-ion batteries in EVs last longer when kept in this mid-range!";
            } else if (isEV && (lowerText.includes("algorithm") || lowerText.includes("recommend") || lowerText.includes("smart"))) {
                response = "Our FuelWatch Smart Algorithm doesn't just look at distance! If a station has been downvoted or reported for issues, we apply a '50km Distance Penalty' to its score. This ensures you are always recommended the MOST RELIABLE station, not just the closest one.";
            } else if (!isEV && (lowerText.includes("survey") || lowerText.includes("finding") || lowerText.includes("research") || lowerText.includes("2022"))) {
                response = `Based on our research during the 2022 Fuel Crisis, the system was viewed as highly effective! Around 36% of users registered online manually, and 51% gave the system a 4/5 or 5/5 rating for efficiency.`;
            } else if (!isEV && (lowerText.includes("registration") || lowerText.includes("register"))) {
                const highEase = surveyStats.easeOfRegistration.find(e => e.value === 5)?.count || 0;
                response = `Regarding the National Fuel Pass, most users (over 60%) registered themselves online. About ${highEase} users reported a seamless registration experience (5/5 difficulty rating). Technical issues like website errors and verification delays were the main hurdles.`;
            } else if (!isEV && (lowerText.includes("queue") || lowerText.includes("effectiveness") || lowerText.includes("reduce"))) {
                const reductionCount = surveyStats.impactOnQueues.find(i => i.label === 'Significant Reduction')?.count || 0;
                response = `The Fuel Pass was very effective! Our research found that ${reductionCount} users experienced a 'Significant Reduction' in fuel queues. However, a small percentage (about 10%) felt it made things more complicated due to technical errors.`;
            } else if (!isEV && (lowerText.includes("qr") || lowerText.includes("scan") || lowerText.includes("verify") || lowerText.includes("upload"))) {
                response = "To verify your fuel quota, just click the 'Scan QR Pass' button! You can then upload an image of your National Fuel Pass. We use image processing for better reliability and privacy. Our system then performs a 'Deep Neural Verification' to securely unlock your registered vehicle details!";
            } else if (lowerText.includes("tips") || lowerText.includes("practices")) {
                response = isEV
                    ? "Try to keep your EV battery between 20% and 80% for maximum longevity. Rapid charging is great for trips, but AC charging is gentler for daily use!"
                    : "To save fuel, maintain steady speeds, keep your tires properly inflated, and avoid carrying unnecessary weight in your car!";
            } else if (lowerText.includes("price")) {
                response = "Fuel prices are updated monthly by CPC and LIOC. You can see the current market rates directly on the Fuel Finder page!";
            } else if (lowerText.includes("how to use")) {
                response = "Just click the 'Find Nearest Station' button. I'll automatically detect your location and show you the best spot nearby based on real-time availability!";
            } else {
                response = isEV
                    ? "I'm still learning about EV charging, but I can help you find stations and give battery tips!"
                    : "I'm your Smart Fuel Assistant! You can ask me about station availability or even technical findings from the 2022 Fuel Crisis survey.";
            }

            setMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text: response, timestamp: new Date().toISOString() }]);
        }, 800);
    };

    const clearChat = () => {
        setShowClearConfirm(true);
    };

    const confirmClear = () => {
        setMessages([welcomeMsg]);
        setShowClearConfirm(false);
    };

    return (
        <div className="fixed bottom-8 right-8 z-[9999] pointer-events-auto">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="absolute bottom-20 right-0 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className={`bg-gradient-to-r ${isEV ? 'from-blue-600 to-indigo-600' : 'from-amber-500 to-orange-600'} p-5 text-white shrink-0`}>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                                        <Bot size={22} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{isEV ? 'EV Assistant' : 'Fuel Assistant'}</h4>
                                        <div className="flex items-center gap-1.5 opacity-80">
                                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                            <span className="text-[10px]">Active Session</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={clearChat}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                        title="Clear Session"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Chat Body - STRICT FIXED HEIGHT & SCROLLABLE */}
                        <div
                            className="bg-slate-50/50 p-5 space-y-4 overflow-y-scroll chat-scrollbar"
                            style={{ height: '400px', scrollBehavior: 'smooth' }}
                        >
                            {messages.map((msg, idx) => (
                                <motion.div
                                    key={msg.id || idx}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] p-3.5 rounded-2xl text-[13px] leading-relaxed shadow-sm ${msg.type === 'user'
                                        ? `${isEV ? 'bg-blue-600' : 'bg-amber-600'} text-white rounded-tr-none shadow-blue-600/10`
                                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                        }`}>
                                        {msg.text}
                                        {msg.timestamp && (
                                            <div className={`text-[9px] mt-1 opacity-50 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-slate-100 shrink-0">
                            <div className="flex gap-2 overflow-x-auto pb-3 custom-no-scrollbar">
                                {suggestions.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleAction(s)}
                                        className="whitespace-nowrap px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-full text-[11px] font-bold border border-slate-100 transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Ask anything..."
                                    className="flex-1 bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                            handleAction(e.target.value);
                                            e.target.value = '';
                                        }
                                    }}
                                />
                                <button className={`p-3 ${isEV ? 'bg-blue-600 shadow-blue-600/20' : 'bg-amber-600 shadow-amber-600/20'} text-white rounded-xl shadow-lg active:scale-95 transition-all`}>
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Force Scrollbar styles */}
                        <style>{`
                            .chat-scrollbar {
                                scrollbar-width: thin !important;
                                scrollbar-color: #cbd5e1 transparent !important;
                                -webkit-overflow-scrolling: touch;
                            }
                            .chat-scrollbar::-webkit-scrollbar {
                                width: 8px !important;
                                display: block !important;
                            }
                            .chat-scrollbar::-webkit-scrollbar-track {
                                background: #f8fafc;
                            }
                            .chat-scrollbar::-webkit-scrollbar-thumb {
                                background-color: #cbd5e1;
                                border-radius: 20px;
                                border: 2px solid #f8fafc;
                            }
                            .chat-scrollbar::-webkit-scrollbar-thumb:hover {
                                background-color: #94a3b8;
                            }
                            .custom-no-scrollbar::-webkit-scrollbar {
                                display: none;
                            }
                            .custom-no-scrollbar {
                                -ms-overflow-style: none;
                                scrollbar-width: none;
                            }
                        `}</style>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Clear History Confirmation Modal */}
            <AnimatePresence>
                {showClearConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white max-w-[280px] w-full rounded-3xl overflow-hidden shadow-2xl overflow-hidden"
                        >
                            <div className={`p-6 text-center ${isEV ? 'bg-blue-600' : 'bg-amber-500'} text-white`}>
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                                    <Trash2 size={24} />
                                </div>
                                <h3 className="font-bold">Clear Chat History?</h3>
                                <p className="text-[11px] opacity-80 mt-1">This will permanently delete all your messages in this session.</p>
                            </div>
                            <div className="p-4 space-y-2">
                                <button
                                    onClick={confirmClear}
                                    className={`w-full py-3 rounded-xl font-bold text-xs ${isEV ? 'bg-blue-600 shadow-blue-600/20' : 'bg-amber-600 shadow-amber-600/20'} text-white shadow-lg active:scale-95 transition-all`}
                                >
                                    Confirm Clear
                                </button>
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="w-full py-2.5 text-slate-400 hover:text-slate-600 font-bold text-[10px] uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl transition-all ${isOpen ? 'bg-slate-800 text-white rotate-90' : (isEV ? 'bg-blue-600' : 'bg-amber-600') + ' text-white'
                    }`}
            >
                {isOpen ? <X size={24} /> : (
                    <div className="relative">
                        <Bot size={28} />
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"
                        />
                    </div>
                )}
            </motion.button>
        </div>
    );
};

export default AIAssistant;
