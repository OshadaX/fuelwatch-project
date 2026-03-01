import React, { useState, useEffect } from 'react';
import {
    CheckCircle, XCircle, Clock, MapPin, Search,
    Filter, FileText, Download, ChevronDown, Zap, Fuel, Trash2, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SmartRecommendationAdmin = () => {
    const [activeTab, setActiveTab] = useState('all'); // all, ev, fuel
    const [searchTerm, setSearchTerm] = useState('');
    const [submissions, setSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    // Mock data based on the requirements
    const mockData = [
        {
            id: "REC-2026-001",
            currentLocation: "6.9271, 79.8612 (Colombo 01)",
            type: "EV Charging",
            preference: "Any",
            status: "Resolved",
            recommendedStation: "City Center EV Hub",
            submissionDate: "2026-03-01",
            submissionTime: "13:45"
        },
        {
            id: "REC-2026-002",
            currentLocation: "6.8915, 79.8588 (Bambalapitiya)",
            type: "Fuel",
            preference: "Petrol (Any)",
            status: "Resolved",
            recommendedStation: "City Fuels",
            submissionDate: "2026-03-01",
            submissionTime: "13:30"
        },
        {
            id: "REC-2026-003",
            currentLocation: "6.8511, 79.8682 (Dehiwala)",
            type: "Fuel",
            preference: "Diesel (Ceypetco)",
            status: "No Stations",
            recommendedStation: "N/A",
            submissionDate: "2026-03-01",
            submissionTime: "13:15"
        },
        {
            id: "REC-2026-004",
            currentLocation: "6.9147, 79.9733 (Malabe)",
            type: "EV Charging",
            preference: "Any",
            status: "Resolved",
            recommendedStation: "TechZone Charger",
            submissionDate: "2026-03-01",
            submissionTime: "12:50"
        },
        {
            id: "REC-2026-005",
            currentLocation: "6.9320, 79.8550 (Galle Face)",
            type: "Fuel",
            preference: "Petrol (IOC)",
            status: "Resolved",
            recommendedStation: "Lanka IOC Station",
            submissionDate: "2026-03-01",
            submissionTime: "11:20"
        }
    ];

    useEffect(() => {
        // Simulate API fetch delay
        setTimeout(() => {
            // Check local storage for recent guest submissions
            const storedString = localStorage.getItem('guestSubmissions');
            const storedArray = storedString ? JSON.parse(storedString) : [];

            // Combine mock data with any new local storage submissions
            setSubmissions([...storedArray, ...mockData]);
            setIsLoading(false);
        }, 800);
    }, []);

    // Filter logic
    const filteredSubmissions = submissions.filter(sub => {
        const matchesTab =
            activeTab === 'all' ||
            (activeTab === 'ev' && sub.type === 'EV Charging') ||
            (activeTab === 'fuel' && sub.type === 'Fuel');

        const matchesSearch =
            sub.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sub.currentLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sub.recommendedStation.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesTab && matchesSearch;
    });

    const getStatusIcon = (status) => {
        if (status === 'Resolved') return <CheckCircle size={16} className="text-emerald-500" />;
        if (status === 'No Stations') return <XCircle size={16} className="text-red-500" />;
        return <Clock size={16} className="text-amber-500" />;
    };

    const getStatusClass = (status) => {
        if (status === 'Resolved') return "bg-emerald-50 text-emerald-700 border-emerald-200";
        if (status === 'No Stations') return "bg-red-50 text-red-700 border-red-200";
        return "bg-amber-50 text-amber-700 border-amber-200";
    };

    const requestDelete = (id) => {
        setItemToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (!itemToDelete) return;

        // Remove from state
        setSubmissions(currentSubmissions => currentSubmissions.filter(sub => sub.id !== itemToDelete));

        // Remove from local storage (if it exists there)
        const storedString = localStorage.getItem('guestSubmissions');
        if (storedString) {
            const storedArray = JSON.parse(storedString);
            const newArray = storedArray.filter(sub => sub.id !== itemToDelete);
            localStorage.setItem('guestSubmissions', JSON.stringify(newArray));
        }

        setDeleteModalOpen(false);
        setItemToDelete(null);
    };

    const cancelDelete = () => {
        setDeleteModalOpen(false);
        setItemToDelete(null);
    };

    return (
        <div className="p-6 md:p-8 bg-slate-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Smart Recommendation Logs</h1>
                        <p className="text-slate-500 mt-1">Track guest EV and Fuel station finder inquiries</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                            <Download size={18} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                {/* Filters and Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 font-medium text-sm">Total Queries</p>
                            <h3 className="text-3xl font-bold text-slate-800">{submissions.length}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                            <FileText size={24} />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 font-medium text-sm">EV Searches</p>
                            <h3 className="text-3xl font-bold text-slate-800">
                                {submissions.filter(s => s.type === 'EV Charging').length}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <Zap size={24} />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 font-medium text-sm">Fuel Searches</p>
                            <h3 className="text-3xl font-bold text-slate-800">
                                {submissions.filter(s => s.type === 'Fuel').length}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                            <Fuel size={24} />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-slate-500 font-medium text-sm">Success Rate</p>
                            <h3 className="text-3xl font-bold text-slate-800">
                                {Math.round((submissions.filter(s => s.status === 'Resolved').length / (submissions.length || 1)) * 100)}%
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Table Controls */}
                    <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                        <div className="flex gap-2 p-1 bg-slate-100 rounded-lg w-fit">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                All Specs
                            </button>
                            <button
                                onClick={() => setActiveTab('ev')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'ev' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Zap size={14} /> EV Charging
                            </button>
                            <button
                                onClick={() => setActiveTab('fuel')}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'fuel' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Fuel size={14} /> Fuel
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <Search size={16} className="text-slate-400" />
                                </span>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search entries..."
                                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                            </div>
                            <button className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50">
                                <Filter size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                                    <th className="px-6 py-4 font-semibold">ID</th>
                                    <th className="px-6 py-4 font-semibold">Query Type</th>
                                    <th className="px-6 py-4 font-semibold">Location</th>
                                    <th className="px-6 py-4 font-semibold">Preference</th>
                                    <th className="px-6 py-4 font-semibold">Date & Time</th>
                                    <th className="px-6 py-4 font-semibold">Result Station</th>
                                    <th className="px-6 py-4 font-semibold">Status</th>
                                    <th className="px-6 py-4 font-semibold text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                                                <p>Loading records...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredSubmissions.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <Search size={48} className="text-slate-200 mb-4" />
                                                <p>No records found matching your criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    <AnimatePresence>
                                        {filteredSubmissions.map((sub, idx) => (
                                            <motion.tr
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9, backgroundColor: '#fee2e2' }}
                                                transition={{ duration: 0.2, delay: idx * 0.05 }}
                                                key={sub.id}
                                                className="border-b border-slate-100 hover:bg-blue-50/30 transition-colors"
                                            >
                                                <td className="px-6 py-4 font-medium text-slate-700">{sub.id}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${sub.type === 'EV Charging' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                                                        }`}>
                                                        {sub.type === 'EV Charging' ? <Zap size={12} /> : <Fuel size={12} />}
                                                        {sub.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    <div className="flex items-center gap-2 max-w-[200px] truncate" title={sub.currentLocation}>
                                                        <MapPin size={14} className="text-slate-400 shrink-0" />
                                                        <span className="truncate">{sub.currentLocation}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">{sub.preference}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-800 font-medium">{sub.submissionDate}</span>
                                                        <span className="text-slate-500 text-xs">{sub.submissionTime}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-700 font-medium">{sub.recommendedStation}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusClass(sub.status)}`}>
                                                        {getStatusIcon(sub.status)}
                                                        {sub.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                        <button
                                                            onClick={() => requestDelete(sub.id)}
                                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete entry"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Dummy */}
                    {!isLoading && filteredSubmissions.length > 0 && (
                        <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-500 bg-slate-50">
                            <p>Showing 1 to {filteredSubmissions.length} of {filteredSubmissions.length} entries</p>
                            <div className="flex gap-1">
                                <button className="px-3 py-1 border border-slate-200 rounded-md bg-white text-slate-400 cursor-not-allowed">Previous</button>
                                <button className="px-3 py-1 border border-blue-500 rounded-md bg-blue-50 text-blue-600 font-medium">1</button>
                                <button className="px-3 py-1 border border-slate-200 rounded-md bg-white text-slate-400 cursor-not-allowed">Next</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Delete Confirmation Modal */}
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
                                        Are you sure you want to delete this recommendation log? This action cannot be undone.
                                    </p>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={cancelDelete}
                                            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={confirmDelete}
                                            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SmartRecommendationAdmin;
