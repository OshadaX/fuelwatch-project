import React, { useState, useEffect } from 'react';
import { Zap, MapPin, Plus, Trash2, Pencil, Save, X, Search, RefreshCw, CheckCircle, AlertCircle, BatteryCharging } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LS_KEY = 'evStations';

const defaultForm = {
    id: '',
    name: '',
    location: '',
    lat: '',
    lng: '',
    connectorTypes: ['Type 2'],
    power: '',
    status: 'Active',
    operator: '',
    phone: ''
};

const CONNECTOR_OPTIONS = ['Type 2', 'CCS', 'CHAdeMO', 'Tesla', 'Type 1', 'GB/T'];

const EVStationPortal = () => {
    const [stations, setStations] = useState([]);
    const [form, setForm] = useState(defaultForm);
    const [editingId, setEditingId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
    const [successMsg, setSuccessMsg] = useState('');
    const [errors, setErrors] = useState({});

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(LS_KEY);
        if (stored) setStations(JSON.parse(stored));
    }, []);

    const persist = (data) => {
        localStorage.setItem(LS_KEY, JSON.stringify(data));
        setStations(data);
    };

    const generateId = () => `EV-${Date.now().toString(36).toUpperCase()}`;

    const handleConnectorToggle = (type) => {
        setForm(prev => ({
            ...prev,
            connectorTypes: prev.connectorTypes.includes(type)
                ? prev.connectorTypes.filter(c => c !== type)
                : [...prev.connectorTypes, type]
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Validate required fields
        const newErrors = {};
        if (!form.name.trim()) newErrors.name = 'Station name is required';
        if (!form.location.trim()) newErrors.location = 'Location is required';
        if (form.lat && isNaN(parseFloat(form.lat))) newErrors.lat = 'Must be a valid number (e.g. 6.9271)';
        if (form.lng && isNaN(parseFloat(form.lng))) newErrors.lng = 'Must be a valid number (e.g. 79.8612)';
        if (form.phone && !/^(?:\+94|0)\d{9}$/.test(form.phone.trim())) newErrors.phone = 'Use 0XXXXXXXXX or +94XXXXXXXXX format';
        if (form.connectorTypes.length === 0) newErrors.connectorTypes = 'Select at least one connector type';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        setErrors({});

        const now = new Date().toISOString();
        if (editingId) {
            const updated = stations.map(s => s.id === editingId ? { ...form, id: editingId, updatedAt: now } : s);
            persist(updated);
            showSuccess('EV Station updated successfully!');
        } else {
            const newStation = { ...form, id: generateId(), registeredAt: now };
            persist([newStation, ...stations]);
            showSuccess('EV Station registered successfully!');
        }
        setForm(defaultForm);
        setEditingId(null);
    };

    const startEdit = (station) => {
        setForm({ ...station });
        setEditingId(station.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const confirmDelete = () => {
        const updated = stations.filter(s => s.id !== deleteModal.id);
        persist(updated);
        setDeleteModal({ open: false, id: null });
        showSuccess('Station deleted.');
    };

    const showSuccess = (msg) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(''), 3000);
    };

    const filtered = stations.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const Field = ({ label, error, children }) => (
        <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{label}</label>
            {children}
            {error && <p className="mt-1.5 text-xs text-red-500 font-medium flex items-center gap-1">⚠ {error}</p>}
        </div>
    );

    const inputClass = (field) => `w-full px-4 py-3 bg-slate-50 border ${errors[field] ? 'border-red-400 focus:ring-red-400/30 focus:border-red-400' : 'border-slate-200 focus:ring-indigo-500/30 focus:border-indigo-400'
        } rounded-xl text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 transition-all`;

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                                <BatteryCharging size={22} />
                            </div>
                            EV Station Portal
                        </h1>
                        <p className="text-slate-500 mt-1 ml-[52px]">Register and manage EV charging stations</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                        <Zap size={16} className="text-indigo-500" />
                        <span><b className="text-slate-800">{stations.length}</b> Stations Registered</span>
                    </div>
                </div>

                {/* Success Toast */}
                <AnimatePresence>
                    {successMsg && (
                        <motion.div
                            initial={{ opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            className="mb-6 flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-3 rounded-2xl shadow-sm"
                        >
                            <CheckCircle size={18} />
                            <span className="font-semibold text-sm">{successMsg}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="grid grid-cols-1 xl:grid-cols-[480px_1fr] gap-6">
                    {/* -------- FORM CARD -------- */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-7">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-slate-800">
                                {editingId ? 'Edit Station' : 'Register New EV Station'}
                            </h2>
                            {editingId && (
                                <button onClick={() => { setForm(defaultForm); setEditingId(null); }}
                                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Station ID (auto)">
                                    <input readOnly value={editingId || 'Auto-generated'} className={`${inputClass()} cursor-not-allowed text-slate-400`} />
                                </Field>
                                <Field label="Status">
                                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className={inputClass('status')}>
                                        <option value="Active">Active</option>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Offline">Offline</option>
                                    </select>
                                </Field>
                            </div>

                            <Field label="Station Name *" error={errors.name}>
                                <input
                                    placeholder="e.g. GreenCharge Colombo 07"
                                    value={form.name}
                                    onChange={e => { setForm({ ...form, name: e.target.value }); setErrors(p => ({ ...p, name: '' })); }}
                                    className={inputClass('name')}
                                />
                            </Field>

                            <Field label="Location / Address *" error={errors.location}>
                                <input
                                    placeholder="e.g. 42 Alfred Place, Colombo"
                                    value={form.location}
                                    onChange={e => { setForm({ ...form, location: e.target.value }); setErrors(p => ({ ...p, location: '' })); }}
                                    className={inputClass('location')}
                                />
                            </Field>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Latitude (GPS)" error={errors.lat}>
                                    <input type="number" step="any" placeholder="e.g. 6.9271"
                                        value={form.lat}
                                        onChange={e => { setForm({ ...form, lat: e.target.value }); setErrors(p => ({ ...p, lat: '' })); }}
                                        className={inputClass('lat')} />
                                </Field>
                                <Field label="Longitude (GPS)" error={errors.lng}>
                                    <input type="number" step="any" placeholder="e.g. 79.8612"
                                        value={form.lng}
                                        onChange={e => { setForm({ ...form, lng: e.target.value }); setErrors(p => ({ ...p, lng: '' })); }}
                                        className={inputClass('lng')} />
                                </Field>
                            </div>

                            <Field label="Connector Types" error={errors.connectorTypes}>
                                <div className="flex flex-wrap gap-2 mt-1">
                                    {CONNECTOR_OPTIONS.map(type => (
                                        <button
                                            type="button"
                                            key={type}
                                            onClick={() => { handleConnectorToggle(type); setErrors(p => ({ ...p, connectorTypes: '' })); }}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${form.connectorTypes.includes(type)
                                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                                                    : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </Field>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Charging Power (kW)">
                                    <input type="number" placeholder="e.g. 22"
                                        value={form.power} onChange={e => setForm({ ...form, power: e.target.value })} className={inputClass('power')} />
                                </Field>
                                <Field label="Operator / Brand">
                                    <input placeholder="e.g. ChargeNet LK"
                                        value={form.operator} onChange={e => setForm({ ...form, operator: e.target.value })} className={inputClass('operator')} />
                                </Field>
                            </div>

                            <Field label="Contact Phone" error={errors.phone}>
                                <input placeholder="e.g. 0771234567"
                                    value={form.phone}
                                    onChange={e => { setForm({ ...form, phone: e.target.value }); setErrors(p => ({ ...p, phone: '' })); }}
                                    className={inputClass('phone')} />
                            </Field>

                            <button type="submit"
                                className="w-full mt-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98]">
                                <Save size={18} />
                                {editingId ? 'Update Station' : 'Register Station'}
                            </button>
                        </form>
                    </div>

                    {/* -------- STATIONS LIST -------- */}
                    <div>
                        {/* Search Bar */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 mb-5 flex items-center gap-3">
                            <Search size={18} className="text-slate-400 ml-2 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search by name, location, or ID..."
                                className="flex-1 bg-transparent outline-none text-sm font-medium text-slate-700"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        {filtered.length === 0 ? (
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-16 text-center">
                                <BatteryCharging size={48} className="text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-500 font-medium">No EV stations registered yet.</p>
                                <p className="text-slate-400 text-sm mt-1">Use the form to add your first station.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <AnimatePresence>
                                    {filtered.map((station, idx) => (
                                        <motion.div
                                            key={station.id}
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ delay: idx * 0.04 }}
                                            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2.5 mb-2">
                                                        <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                                                            <Zap size={16} />
                                                        </div>
                                                        <h3 className="font-bold text-slate-800 text-base truncate">{station.name}</h3>
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${station.status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                                                            station.status === 'Maintenance' ? 'bg-amber-50 text-amber-700' :
                                                                'bg-red-50 text-red-600'
                                                            }`}>{station.status}</span>
                                                    </div>

                                                    <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-3">
                                                        <MapPin size={13} className="shrink-0" />
                                                        {station.location}
                                                    </p>

                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-semibold">{station.id}</span>
                                                        {station.power && (
                                                            <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-semibold">{station.power} kW</span>
                                                        )}
                                                        {station.connectorTypes?.map(c => (
                                                            <span key={c} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-semibold">{c}</span>
                                                        ))}
                                                        {station.operator && (
                                                            <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg font-semibold">{station.operator}</span>
                                                        )}
                                                        {station.lat && station.lng && (
                                                            <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-lg font-semibold">
                                                                📍 {parseFloat(station.lat).toFixed(4)}, {parseFloat(station.lng).toFixed(4)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 shrink-0">
                                                    <button onClick={() => startEdit(station)}
                                                        className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button onClick={() => setDeleteModal({ open: true, id: station.id })}
                                                        className="p-2.5 rounded-xl border border-red-100 hover:bg-red-50 text-red-400 transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteModal.open && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
                        >
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 mx-auto">
                                <AlertCircle size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-center text-slate-800 mb-2">Delete Station?</h3>
                            <p className="text-center text-slate-500 text-sm mb-6">This EV station will be removed from the map and the system permanently.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeleteModal({ open: false, id: null })}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors">
                                    Cancel
                                </button>
                                <button onClick={confirmDelete}
                                    className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-colors">
                                    Delete
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EVStationPortal;
