import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Fuel, ArrowRight, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

const CustomerGuestPage = () => {
    const navigate = useNavigate();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 lg:p-12 relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-amber-50 to-orange-100 rounded-full blur-3xl opacity-60 pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12 text-center"
                >
                    <h1 className="text-4xl md:text-5xl font-black text-slate-800 mb-4">
                        Welcome, Guest
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                        We're here to help you get moving. Choose a service below to find the nearest station.
                    </p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
                >
                    {/* EV Option */}
                    <motion.div
                        variants={itemVariants}
                        onClick={() => navigate('/ev-station')}
                        className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer border border-slate-100 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <Zap size={200} />
                        </div>

                        <div className="relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                <Zap size={32} />
                            </div>

                            <h2 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">EV Charging</h2>
                            <p className="text-slate-500 mb-8 font-medium">Find nearest charging spots with real-time distance calculations.</p>

                            <div className="flex items-center text-blue-600 font-bold group-hover:translate-x-2 transition-transform">
                                <span>Find Station</span>
                                <ArrowRight size={20} className="ml-2" />
                            </div>
                        </div>
                    </motion.div>

                    {/* Fuel Option */}
                    <motion.div
                        variants={itemVariants}
                        onClick={() => navigate('/fuel-station')}
                        className="group relative bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer border border-slate-100 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
                            <Fuel size={200} />
                        </div>

                        <div className="relative z-10">
                            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6 group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                                <Fuel size={32} />
                            </div>

                            <h2 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-amber-600 transition-colors">Fuel Station</h2>
                            <p className="text-slate-500 mb-8 font-medium">Locate petrol & diesel stations with availability checks.</p>

                            <div className="flex items-center text-amber-600 font-bold group-hover:translate-x-2 transition-transform">
                                <span>Find Station</span>
                                <ArrowRight size={20} className="ml-2" />
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Optional Map Visual/Preview */}
                <motion.div
                    variants={itemVariants}
                    className="mt-16 bg-white/60 backdrop-blur-sm rounded-3xl p-6 border border-white max-w-4xl mx-auto shadow-sm"
                >
                    <div className="flex items-center gap-3 text-slate-400 text-sm font-medium justify-center">
                        <MapPin size={16} />
                        <span>Location services required for best recommendations</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default CustomerGuestPage;
