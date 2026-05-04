import React, { useState, useEffect } from 'react';
import {
    CheckCircle, XCircle, Clock, MapPin, Search,
    Filter, FileText, Download, Zap, Fuel, Trash2, AlertCircle,
    Navigation, Calendar, Milestone, Star, BarChart2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const SmartRecommendationAdmin = () => {
    const [activeTab, setActiveTab] = useState('all'); // all | ev | fuel
    const [searchTerm, setSearchTerm] = useState('');
    const [submissions, setSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // ── Load directly from the Backend Database ───────────────────────────────
    useEffect(() => {
        fetch('http://localhost:8081/api/recommendations')
            .then(res => res.json())
            .then(data => {
                setSubmissions(Array.isArray(data) ? data : []);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch logs from DB", err);
                setIsLoading(false);
            });
    }, []);

    // ── Filter ───────────────────────────────────────────────────────────────
    const filteredSubmissions = submissions.filter(sub => {
        const matchesTab =
            activeTab === 'all' ||
            (activeTab === 'ev' && sub.type === 'EV Charging') ||
            (activeTab === 'fuel' && sub.type === 'Fuel');

        const q = searchTerm.toLowerCase();
        const matchesSearch =
            sub.logId?.toLowerCase().includes(q) ||
            sub.currentLocation?.toLowerCase().includes(q) ||
            sub.recommendedStation?.toLowerCase().includes(q) ||
            sub.stationAddress?.toLowerCase().includes(q) ||
            sub.preference?.toLowerCase().includes(q);

        return matchesTab && matchesSearch;
    });

    // ── Helpers ──────────────────────────────────────────────────────────────
    const getStatusIcon = (status) => {
        if (status === 'Resolved') return <CheckCircle size={14} className="text-emerald-500" />;
        if (status === 'No Stations') return <XCircle size={14} className="text-red-500" />;
        return <Clock size={14} className="text-amber-500" />;
    };

    const getStatusClass = (status) => {
        if (status === 'Resolved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (status === 'No Stations') return 'bg-red-50 text-red-700 border-red-200';
        return 'bg-amber-50 text-amber-700 border-amber-200';
    };

    // ── Delete ───────────────────────────────────────────────────────────────
    const requestDelete = (id) => { setItemToDelete(id); setDeleteModalOpen(true); };
    const confirmDelete = () => {
        fetch(`http://localhost:8081/api/recommendations/${itemToDelete}`, { method: 'DELETE' })
            .then(() => {
                setSubmissions(submissions.filter(s => s._id !== itemToDelete));
                setDeleteModalOpen(false);
                setItemToDelete(null);
            })
            .catch(err => {
                console.error(err);
                setDeleteModalOpen(false);
                setItemToDelete(null);
            });
    };
    const cancelDelete = () => { setDeleteModalOpen(false); setItemToDelete(null); };

    // ── CSV Export ───────────────────────────────────────────────────────────
    const exportCSV = () => {
        const headers = ['ID', 'Type', 'Location', 'Preference', 'Station', 'Address', 'Distance (km)', 'Status', 'Date', 'Time'];
        const rows = filteredSubmissions.map(s => [
            s.logId, s.type, s.currentLocation, s.preference,
            s.recommendedStation, s.stationAddress || '',
            s.distanceKm != null ? s.distanceKm : '',
            s.status, s.submissionDate, s.submissionTime
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `recommendations_${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    // ── Stats ────────────────────────────────────────────────────────────────
    const total = submissions.length;
    const evCount = submissions.filter(s => s.type === 'EV Charging').length;
    const fuelCount = submissions.filter(s => s.type === 'Fuel').length;
    const resolvedCount = submissions.filter(s => s.status === 'Resolved').length;
    const successRate = total ? Math.round((resolvedCount / total) * 100) : 0;

    return (
        <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto">

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Recommendation History</h1>
                        <p className="text-slate-500 mt-1">All past EV &amp; Fuel station recommendations made by users</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            to="/crisis-insights"
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-semibold"
                        >
                            <BarChart2 size={18} />
                            {/* <span>Crisis Research Insights</span> */}
                        </Link>
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <Download size={18} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                {/* ── Stats ──────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Queries', value: total, icon: <FileText size={22} />, color: 'blue' },
                        { label: 'EV Searches', value: evCount, icon: <Zap size={22} />, color: 'indigo' },
                        { label: 'Fuel Searches', value: fuelCount, icon: <Fuel size={22} />, color: 'amber' },
                        { label: 'Success Rate', value: `${successRate}%`, icon: <CheckCircle size={22} />, color: 'emerald' },
                    ].map(({ label, value, icon, color }) => (
                        <div key={label} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="text-slate-500 font-medium text-sm">{label}</p>
                                <h3 className="text-3xl font-bold text-slate-800 mt-0.5">{value}</h3>
                            </div>
                            <div className={`w-12 h-12 rounded-full bg-${color}-50 flex items-center justify-center text-${color}-600`}>
                                {icon}
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Table Card ─────────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                    {/* Controls */}
                    <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                        {/* Tab switcher */}
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setActiveTab('ev')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'ev' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Zap size={14} /> EV
                            </button>
                            <button
                                onClick={() => setActiveTab('fuel')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'fuel' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Fuel size={14} /> Fuel
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search size={16} className="text-slate-400" />
                            </span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Search by station, location, type…"
                                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                    <th className="px-5 py-4 font-semibold">ID</th>
                                    <th className="px-5 py-4 font-semibold">Type</th>
                                    <th className="px-5 py-4 font-semibold">User Location</th>
                                    <th className="px-5 py-4 font-semibold">Preference</th>
                                    <th className="px-5 py-4 font-semibold">Recommended Station</th>
                                    <th className="px-5 py-4 font-semibold">Distance</th>
                                    <th className="px-5 py-4 font-semibold">Date &amp; Time</th>
                                    <th className="px-5 py-4 font-semibold">Status</th>
                                    <th className="px-5 py-4 font-semibold">Feedback</th>
                                    <th className="px-5 py-4 font-semibold text-center">Del</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="10" className="px-6 py-16 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
                                                <p>Loading records…</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredSubmissions.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 text-slate-400">
                                                <Navigation size={48} className="text-slate-200" />
                                                <p className="font-medium text-slate-500">No recommendation records yet.</p>
                                                <p className="text-xs">Records appear here after a user searches on the EV or Fuel Station page.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    <AnimatePresence>
                                        {filteredSubmissions.map((sub, idx) => (
                                            <motion.tr
                                                layout
                                                key={sub._id}
                                                initial={{ opacity: 0, y: 8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, backgroundColor: '#fee2e2' }}
                                                transition={{ duration: 0.18, delay: idx * 0.03 }}
                                                className="border-b border-slate-100 hover:bg-blue-50/20 transition-colors"
                                            >
                                                {/* ID */}
                                                <td className="px-5 py-4 font-mono text-xs text-slate-500 whitespace-nowrap">{sub.logId}</td>

                                                {/* Type badge */}
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${sub.type === 'EV Charging' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                                                        {sub.type === 'EV Charging' ? <Zap size={11} /> : <Fuel size={11} />}
                                                        {sub.type}
                                                    </span>
                                                </td>

                                                {/* Location */}
                                                <td className="px-5 py-4 max-w-[160px]">
                                                    <div className="flex items-start gap-1.5" title={sub.currentLocation}>
                                                        <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
                                                        <span className="truncate text-slate-600 text-xs">{sub.currentLocation}</span>
                                                    </div>
                                                </td>

                                                {/* Preference */}
                                                <td className="px-5 py-4 text-slate-600 text-xs max-w-[130px] truncate">{sub.preference}</td>

                                                {/* Recommended station */}
                                                <td className="px-5 py-4">
                                                    <p className="font-semibold text-slate-800 text-sm">{sub.recommendedStation}</p>
                                                    {sub.stationAddress && (
                                                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                            <Milestone size={10} />{sub.stationAddress}
                                                        </p>
                                                    )}
                                                </td>

                                                {/* Distance */}
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {sub.distanceKm != null ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                                                            <Navigation size={10} />{sub.distanceKm} km
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">—</span>
                                                    )}
                                                </td>

                                                {/* Date & Time */}
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5 text-slate-700 font-medium text-sm">
                                                        <Calendar size={13} className="text-slate-400" />
                                                        {sub.submissionDate}
                                                    </div>
                                                    <p className="text-xs text-slate-400 ml-[18px]">{sub.submissionTime}</p>
                                                </td>

                                                {/* Status */}
                                                <td className="px-5 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusClass(sub.status)}`}>
                                                        {getStatusIcon(sub.status)}
                                                        {sub.status}
                                                    </span>
                                                </td>

                                                {/* Feedback */}
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {sub.feedback ? (
                                                        <div className="flex flex-col gap-1" title={sub.feedback.comment || "No comments"}>
                                                            <div className="flex items-center gap-0.5 text-amber-500">
                                                                {Array.from({ length: 5 }).map((_, i) => (
                                                                    <Star key={i} size={12} className={i < sub.feedback.rating ? 'fill-amber-500' : 'text-slate-200'} />
                                                                ))}
                                                            </div>
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${sub.feedback.wasEasyToFind ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                {sub.feedback.wasEasyToFind ? 'Found Easily' : 'Hard to Find'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-300 italic">Pending Trip</span>
                                                    )}
                                                </td>

                                                {/* Delete */}
                                                <td className="px-5 py-4 text-center">
                                                    <button
                                                        onClick={() => requestDelete(sub._id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete record"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Foot */}
                    {!isLoading && filteredSubmissions.length > 0 && (
                        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
                            <p>Showing <b>{filteredSubmissions.length}</b> of <b>{submissions.length}</b> records</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Delete Confirmation Modal ──────────────────────────── */}
            <AnimatePresence>
                {deleteModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 mx-auto">
                                    <AlertCircle size={24} />
                                </div>
                                <h3 className="text-xl font-bold text-center text-slate-800 mb-2">Delete Record?</h3>
                                <p className="text-center text-slate-500 text-sm mb-6">
                                    This recommendation log will be permanently removed.
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={cancelDelete} className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors">
                                        Cancel
                                    </button>
                                    <button onClick={confirmDelete} className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SmartRecommendationAdmin;
