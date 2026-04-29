import React, { useState, useEffect } from 'react';
import { Fuel, MapPin, Search, RefreshCw, AlertCircle, Trash2, Eye, Filter, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API_BASE = "http://localhost:8081/api";

const FuelStationPortal = () => {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);
    const [selectedStation, setSelectedStation] = useState(null);
    const [filterDistrict, setFilterDistrict] = useState('All');

    const fetchStations = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE}/station`);
            const data = response.data;
            // The API returns { ok: true, stations: [] }
            setStations(data.stations || []);
        } catch (err) {
            console.error(err);
            setError("Failed to fetch fuel stations. Please ensure the backend is running.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStations();
    }, []);

    const filtered = stations.filter(s => {
        const name = s.Name || "";
        const id = s.Id || "";
        const address = s.Address || "";
        const location = s.Location || "";

        const matchesSearch = (name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            address.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesDistrict = filterDistrict === 'All' || location === filterDistrict;
        return matchesSearch && matchesDistrict;
    });

    const districts = ['All', ...new Set(stations.map(s => s.Location).filter(Boolean))];

    const handleDelete = async (stationId) => {
        // stationId here is the PUCSL 'Id' (e.g. ST-001)
        if (!window.confirm(`Are you sure you want to delete station ${stationId}?`)) return;
        try {
            await axios.delete(`${API_BASE}/station/${stationId}`);
            fetchStations();
        } catch (err) {
            alert("Delete failed.");
        }
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                            <Fuel size={22} />
                        </div>
                        Fuel Station Registry
                    </h1>
                    <p className="text-slate-500 mt-1 ml-[52px]">View and manage all registered filling stations</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchStations}
                        className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors shadow-sm"
                        title="Refresh"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm flex items-center gap-2">
                        <Fuel size={16} className="text-blue-500" />
                        <span className="text-sm text-slate-600 font-semibold">{stations.length} <span className="text-slate-400 font-normal">Stations</span></span>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 flex items-center gap-3 bg-red-50 border border-red-200 text-red-600 px-5 py-4 rounded-2xl">
                    <AlertCircle size={20} />
                    <span className="font-medium">{error}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Sidebar Filters */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Filter size={16} className="text-blue-500" />
                            Filters
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Search</label>
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Name, ID or Address..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">District</label>
                                <select
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none cursor-pointer"
                                    value={filterDistrict}
                                    onChange={e => setFilterDistrict(e.target.value)}
                                >
                                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 p-6 text-white overflow-hidden relative">
                        <Fuel className="absolute -right-4 -bottom-4 opacity-10 rotate-12" size={120} />
                        <h4 className="font-bold text-lg mb-2 relative z-10">Real-time Data</h4>
                        <p className="text-blue-100 text-sm relative z-10 leading-relaxed mb-4">
                            Showing stations directly from the central database managed by PUCSL rules.
                        </p>
                    </div>
                </div>

                {/* Main List */}
                <div className="lg:col-span-3">
                    {loading && stations.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center">
                            <RefreshCw size={40} className="text-blue-200 mx-auto mb-4 animate-spin" />
                            <p className="text-slate-500 font-medium">Loading stations...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center">
                            <Fuel size={40} className="text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-500 font-medium">No stations match your search.</p>
                            <button onClick={() => { setSearchTerm(''); setFilterDistrict('All'); }} className="text-blue-600 text-sm font-bold mt-2 hover:underline">Clear all filters</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <AnimatePresence>
                                {filtered.map((station, idx) => (
                                    <motion.div
                                        key={station._id || idx}
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: idx * 0.03 }}
                                        className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="inline-flex px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg uppercase tracking-wider">
                                                {station.Id || "N/A"}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setSelectedStation(station)}
                                                    className="p-1.5 hover:bg-slate-100 rounded text-slate-500"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(station.Id)}
                                                    className="p-1.5 hover:bg-red-50 rounded text-red-400"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-slate-800 mb-1 truncate">{station.Name}</h3>
                                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mb-4">
                                            <MapPin size={12} className="shrink-0" />
                                            {station.Location}, {station.Address}
                                        </p>

                                        <div className="flex flex-wrap gap-2">
                                            {station.tanks?.slice(0, 3).map((tank, tIdx) => (
                                                <span key={tIdx} className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] text-slate-500 font-bold whitespace-nowrap">
                                                    {tank.fuel_type}
                                                </span>
                                            ))}
                                            {station.tanks?.length > 3 && (
                                                <span className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] text-slate-400 font-bold">
                                                    +{station.tanks.length - 3} more
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* Station Detail Modal */}
            <AnimatePresence>
                {selectedStation && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto" onClick={() => setSelectedStation(null)}>
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={e => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
                        >
                            <div className="bg-blue-600 p-8 text-white relative">
                                <button onClick={() => setSelectedStation(null)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white">
                                    <X size={20} />
                                </button>
                                <div className="inline-flex px-3 py-1 bg-white/20 rounded-full text-xs font-bold mb-4 backdrop-blur-lg">
                                    {selectedStation.Id}
                                </div>
                                <h2 className="text-3xl font-black mb-1">{selectedStation.Name}</h2>
                                <p className="text-blue-100 flex items-center gap-2">
                                    <MapPin size={16} />
                                    {selectedStation.Address}, {selectedStation.Location}
                                </p>
                            </div>

                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Contact Person</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-xs text-slate-500 mb-0.5">Manager Name</p>
                                                <p className="font-bold text-slate-800">{selectedStation.person?.PersonName || "N/A"}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-0.5">Contact Number</p>
                                                <p className="font-bold text-slate-800">{selectedStation.person?.ContactNumber || "N/A"}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 mb-0.5">Operating Hours</p>
                                                <p className="font-bold text-slate-800">
                                                    {selectedStation.person?.StartTime} - {selectedStation.person?.EndTime}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Available Fuel Tanks</h4>
                                        <div className="space-y-2">
                                            {selectedStation.tanks?.map((tank, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                    <span className="text-sm font-bold text-slate-700">{tank.fuel_type}</span>
                                                    <div className="text-right">
                                                        <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{tank.tank_capacity}L</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setSelectedStation(null)}
                                    className="w-full mt-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold transition-all"
                                >
                                    Close Details
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

const X = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

export default FuelStationPortal;
