import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Sparkles, Zap, MapPin, Clock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AIAssistant = ({ contextData, type = 'ev' }) => {
    const [isOpen, setIsOpen] = useState(false);
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
        "Current fuel prices",
        "Fuel saving tips",
        "How to use this app?"
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
            } else if (lowerText.includes("tips") || lowerText.includes("practices")) {
                response = isEV
                    ? "Try to keep your EV battery between 20% and 80% for maximum longevity. Rapid charging is great for trips, but AC charging is gentler for daily use!"
                    : "To save fuel, maintain steady speeds, keep your tires properly inflated, and avoid carrying unnecessary weight in your car!";
            } else if (lowerText.includes("price")) {
                response = "Fuel prices are updated monthly by CPC and LIOC. You can see the current market rates directly on the Fuel Finder page!";
            } else if (lowerText.includes("how to use")) {
                response = "Just click the 'Find Nearest Station' button. I'll automatically detect your location and show you the best spot nearby based on real-time availability!";
            } else {
                response = "I'm still learning, but I can definitely help with station locations and usage tips!";
            }

            setMessages(prev => [...prev, { id: Date.now() + 1, type: 'bot', text: response, timestamp: new Date().toISOString() }]);
        }, 800);
    };

    const clearChat = () => {
        if (window.confirm("Are you sure you want to clear your chat history?")) {
            setMessages([welcomeMsg]);
        }
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
