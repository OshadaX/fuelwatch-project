import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, MapPin, X, Loader2, Search, Trash2, Mail } from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

const AdminManagement = () => {
    const [admins, setAdmins] = useState([]);
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        stationId: '',
        employeeId: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, stationsRes] = await Promise.all([
                axios.get(`${API_URL}/employees`),
                axios.get(`${API_URL}/station`)
            ]);

            // Filter for 'admin' role (excluding potential super admin if needed, 
            // but for now we show all admins)
            const allAdmins = (usersRes.data || []).filter(u => u.role === 'admin');
            setAdmins(allAdmins);
            setStations(stationsRes.data?.stations || stationsRes.data?.items || []);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to load administrators');
        }
    };

    const handleOpenModal = () => {
        // Generate a random employee ID for the admin
        const randomId = 'ADM' + Math.floor(Math.random() * 9000 + 1000);
        setFormData({
            name: '',
            email: '',
            password: '',
            stationId: '',
            employeeId: randomId
        });
        setIsModalOpen(true);
    };

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                role: 'admin',
                status: 'active',
                shift: 'Full-time',
                joinDate: new Date().toISOString().split('T')[0],
                avatar: formData.name.substring(0, 1).toUpperCase()
            };
            await axios.post(`${API_URL}/employees`, payload);
            toast.success('Station Admin created successfully!');
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create admin');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAdmin = async (id) => {
        if (!window.confirm('Are you sure you want to remove this administrator?')) return;
        try {
            await axios.delete(`${API_URL}/employees/${id}`);
            toast.success('Admin removed successfully');
            fetchData();
        } catch (error) {
            toast.error('Failed to remove admin');
        }
    };

    const filteredAdmins = admins.filter(a =>
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.stationId && a.stationId.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getStationName = (id) => {
        const station = stations.find(s => s.Id === id || s._id === id);
        return station ? station.Name : 'Global Admin / Unassigned';
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <Toaster position="top-right" />

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <Shield className="text-blue-500" /> Administrative Management
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Control access for station-level administrators</p>
                </div>
                <button
                    onClick={handleOpenModal}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                >
                    <Plus size={20} /> Provision New Admin
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#121216] border border-white/5 p-6 rounded-3xl">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Administrators</p>
                    <div className="text-3xl font-bold tracking-tighter">{loading ? '...' : admins.length}</div>
                </div>
                <div className="bg-[#121216] border border-white/5 p-6 rounded-3xl">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Managed Stations</p>
                    <div className="text-3xl font-bold tracking-tighter">{loading ? '...' : stations.length}</div>
                </div>
                <div className="bg-[#121216] border border-white/5 p-6 rounded-3xl">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Active Sessions</p>
                    <div className="text-3xl font-bold tracking-tighter">Live</div>
                </div>
            </div>

            {/* Search & Table */}
            <div className="bg-[#121216] border border-white/5 rounded-[32px] overflow-hidden">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div className="relative group w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Filter by name, email or station..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1c1c21] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs text-white focus:border-blue-500/30 transition-all outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="bg-white/5 text-slate-500 font-bold uppercase tracking-wider">
                                <th className="px-8 py-4">Administrator</th>
                                <th className="px-8 py-4">Assigned Station</th>
                                <th className="px-8 py-4">Employee ID</th>
                                <th className="px-8 py-4">Created Date</th>
                                <th className="px-8 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan="5" className="px-8 py-20 text-center text-slate-500">Loading administrators...</td></tr>
                            ) : filteredAdmins.length === 0 ? (
                                <tr><td colSpan="5" className="px-8 py-20 text-center text-slate-500">No administrators found matching criteria.</td></tr>
                            ) : filteredAdmins.map((admin) => (
                                <tr key={admin._id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center font-bold text-blue-500">
                                                {admin.avatar || admin.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white mb-0.5">{admin.name}</p>
                                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                    <Mail size={10} /> {admin.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2">
                                            <MapPin size={12} className="text-slate-500" />
                                            <span className="text-slate-300 font-semibold">{getStationName(admin.stationId)}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-slate-400 font-mono">{admin.employeeId}</td>
                                    <td className="px-8 py-5 text-slate-500">{new Date(admin.createdAt).toLocaleDateString()}</td>
                                    <td className="px-8 py-5 text-right">
                                        <button
                                            onClick={() => handleDeleteAdmin(admin._id)}
                                            className="p-2 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Admin Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0a0a0c]/95 backdrop-blur-md" onClick={() => !submitting && setIsModalOpen(false)}></div>
                    <div className="relative bg-[#121216] border border-white/10 w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-10">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h3 className="text-xl font-bold text-white">Provision Station Admin</h3>
                                    <p className="text-slate-500 text-xs mt-1">This user will have full administrative rights over their assigned station.</p>
                                </div>
                                <button
                                    onClick={() => !submitting && setIsModalOpen(false)}
                                    className="p-2 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateAdmin} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Station Admin Name</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full bg-[#1c1c21] border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-blue-500/30 transition-all outline-none"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Enter full name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Employee ID</label>
                                        <input
                                            readOnly
                                            type="text"
                                            className="w-full bg-[#1c1c21] border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-slate-500 outline-none"
                                            value={formData.employeeId}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Email Address</label>
                                    <input
                                        required
                                        type="email"
                                        className="w-full bg-[#1c1c21] border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-blue-500/30 transition-all outline-none"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="admin@station.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Login Password</label>
                                    <input
                                        required
                                        type="password"
                                        className="w-full bg-[#1c1c21] border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-blue-500/30 transition-all outline-none"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Min 6 characters"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Assign to Station</label>
                                    <select
                                        required
                                        className="w-full bg-[#1c1c21] border border-white/5 rounded-2xl px-5 py-3.5 text-sm text-white focus:border-blue-500/30 transition-all outline-none"
                                        value={formData.stationId}
                                        onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                                    >
                                        <option value="">Select a station...</option>
                                        {stations.map(st => (
                                            <option key={st._id} value={st.Id || st._id}>
                                                {st.Name} ({st.Location})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl mt-4 flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 transition-all"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Complete Provisioning'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminManagement;
