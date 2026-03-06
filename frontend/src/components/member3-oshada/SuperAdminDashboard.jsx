import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
    Fuel, MapPin, AlertTriangle, Activity, Package, Users,
    ArrowUpRight, ArrowDownRight, Search, Filter, LogOut,
    Bell, RefreshCw, BarChart3, Layers
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import 'leaflet.heat';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

// --- HEATMAP LAYER COMPONENT ---
const HeatmapLayer = ({ points }) => {
    const map = useMap();

    useEffect(() => {
        if (!map || !points.length) return;

        const heatLayer = L.heatLayer(points, {
            radius: 35,
            blur: 25,
            maxZoom: 17,
            gradient: {
                0.4: '#3b82f6', // Blue
                0.6: '#10b981', // Emerald
                0.8: '#f59e0b', // Amber
                1.0: '#ef4444'  // Red
            }
        }).addTo(map);

        return () => {
            map.removeLayer(heatLayer);
        };
    }, [map, points]);

    return null;
};

// --- STYLING UTILS ---
const getMarkerIcon = (status) => {
    let color = '#10b981'; // Normal
    if (status === 'critical') color = '#ef4444';
    if (status === 'low') color = '#f59e0b';

    return L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 3px solid rgba(255,255,255,0.8); box-shadow: 0 0 15px ${color}80;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    });
};

// Helper to add tiny random offset to prevent perfect overlapping of markers
const applyJitter = (lat, lng, index) => {
    const jitterAmount = 0.00015; // Tiny offset
    const angle = index * (Math.PI * 2 / 8); // Spread in a circle
    return [
        lat + Math.cos(angle) * jitterAmount * (index % 3 + 1),
        lng + Math.sin(angle) * jitterAmount * (index % 3 + 1)
    ];
};

const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [stations, setStations] = useState([]);
    const [readings, setReadings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewMode, setViewMode] = useState('network'); // 'network' (markers) | 'revenue' (heatmap)

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000); // Auto-refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [stationsRes, sensorRes] = await Promise.all([
                axios.get(`${API_URL}/station?limit=100`),
                axios.get(`${API_URL}/sensor`)
            ]);

            const stationsData = stationsRes.data?.stations || stationsRes.data?.items || [];
            setStations(stationsData);
            setReadings(sensorRes.data || []);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        }
    };

    // --- DATA PROCESSING ---
    const getStockInfo = (stationId) => {
        // In this system, sensors are tied to hardcoded IDs like 'Tank-1-Octane-92'
        // For a true global view, we'd need sensors tied to station IDs.
        // We will simulate data mapping based on station for the demo.
        const hash = stationId.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);

        // Mock levels based on station ID to ensure consistency in the demo
        const petrol = (hash % 85) + 10; // 10% to 95%
        const diesel = ((hash * 1.5) % 80) + 15;
        const superDiesel = ((hash * 0.7) % 90) + 5;

        const minLevel = Math.min(petrol, diesel, superDiesel);
        let status = 'normal';
        if (minLevel < 15) status = 'critical';
        else if (minLevel < 30) status = 'low';

        return { petrol, diesel, superDiesel, status };
    };

    const stats = {
        total: stations.length,
        critical: stations.filter(s => getStockInfo(s.Id).status === 'critical').length,
        low: stations.filter(s => getStockInfo(s.Id).status === 'low').length,
        healthy: stations.filter(s => getStockInfo(s.Id).status === 'normal').length
    };

    const filteredStations = stations.filter(s => {
        const info = getStockInfo(s.Id);
        const matchesSearch = s.Name.toLowerCase().includes(searchTerm.toLowerCase()) || s.Location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStatus === 'all' || info.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const criticalAlerts = stations
        .map(s => ({ ...s, ...getStockInfo(s.Id) }))
        .filter(s => s.status === 'critical')
        .slice(0, 5);

    return (
        <div className="flex h-screen bg-[#0f1115] text-slate-200 overflow-hidden font-sans">
            {/* --- LEFT NAVIGATION (MINIMAL) --- */}
            <div className="w-20 border-r border-white/5 flex flex-col items-center py-8 gap-10 bg-[#0a0a0c]">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Fuel className="text-white w-6 h-6" />
                </div>
                <div className="flex flex-col gap-8">
                    <button
                        onClick={() => document.getElementById('network-stats')?.scrollIntoView({ behavior: 'smooth' })}
                        className={`p-3 transition-all ${filterStatus === 'all' ? 'text-blue-500 bg-blue-500/10' : 'text-slate-500 hover:text-white'} rounded-xl`}
                        title="Network Stats"
                    >
                        <Activity size={20} />
                    </button>
                    <button
                        onClick={() => document.getElementById('global-map')?.scrollIntoView({ behavior: 'smooth' })}
                        className="p-3 text-slate-500 hover:text-white transition-colors"
                        title="Global Map"
                    >
                        <Layers size={20} />
                    </button>
                    <button
                        onClick={() => document.getElementById('inventory-table')?.scrollIntoView({ behavior: 'smooth' })}
                        className="p-3 text-slate-500 hover:text-white transition-colors"
                        title="Inventory Table"
                    >
                        <BarChart3 size={20} />
                    </button>
                    <button className="p-3 text-slate-500 hover:text-white transition-colors" title="Notifications"><Bell size={20} /></button>
                </div>
                <button
                    onClick={() => { logout(); navigate('/login'); }}
                    className="mt-auto p-3 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                >
                    <LogOut size={20} />
                </button>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-20 border-b border-white/5 px-8 flex items-center justify-between bg-[#0a0a0c]/50 backdrop-blur-md">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight flex items-center gap-3">
                            Super Admin <span className="text-xs px-2 py-1 bg-white/5 border border-white/10 rounded text-slate-500 font-mono">NETWORK_OVERVIEW</span>
                        </h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mt-1 font-bold">Global Fuel Logistics Command</p>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                            <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Live System Connected</span>
                        </div>
                        <div className="h-8 w-[1px] bg-white/5"></div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-xs font-bold">Network Admin</p>
                                <p className="text-[10px] text-slate-500">Master Account</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center font-bold text-xs">
                                SA
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {/* Top Stats */}
                    <div id="network-stats" className="grid grid-cols-4 gap-6 mb-8">
                        {[
                            { label: 'Total Stations', value: stats.total, icon: <Package />, color: 'blue' },
                            { label: 'Critical Assets', value: stats.critical, icon: <AlertTriangle />, color: 'red' },
                            { label: 'Low Stock', value: stats.low, icon: <Activity />, color: 'amber' },
                            { label: 'Healthy Supply', value: stats.healthy, icon: <MapPin />, color: 'emerald' }
                        ].map((s, i) => (
                            <div key={i} className="bg-[#121216] border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                                <div className={`absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity text-${s.color}-500`}>
                                    {React.cloneElement(s.icon, { size: 64 })}
                                </div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{s.label}</p>
                                <div className="text-3xl font-bold tracking-tighter">{loading ? '...' : s.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-3 gap-8">
                        {/* Map View */}
                        <div id="global-map" className="col-span-2 h-[600px] bg-[#121216] border border-white/5 rounded-[32px] overflow-hidden relative shadow-2xl">
                            <div className="absolute top-6 left-6 z-[100] flex gap-2">
                                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-xs font-bold flex items-center gap-2">
                                    <MapPin size={14} className="text-blue-500" />
                                    {viewMode === 'network' ? 'Global Network Visualization' : 'Regional Revenue Analytics'}
                                </div>
                                <div className="flex bg-black/60 backdrop-blur-md p-1 rounded-2xl border border-white/10 ml-2">
                                    <button
                                        onClick={() => setViewMode('network')}
                                        className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'network' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        Network
                                    </button>
                                    <button
                                        onClick={() => setViewMode('revenue')}
                                        className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === 'revenue' ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        Revenue
                                    </button>
                                </div>
                            </div>

                            <MapContainer
                                center={[7.8731, 80.7718]}
                                zoom={8}
                                style={{ height: '100%', width: '100%' }}
                                zoomControl={false}
                            >
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                    attribution='&copy; CARTO'
                                />

                                {viewMode === 'network' ? (
                                    filteredStations
                                        .filter(st => st.latitude && st.longitude)
                                        .map((st, idx) => {
                                            const info = getStockInfo(st.Id);
                                            const jitteredPos = applyJitter(st.latitude, st.longitude, idx);
                                            return (
                                                <Marker
                                                    key={st._id}
                                                    position={jitteredPos}
                                                    icon={getMarkerIcon(info.status)}
                                                >
                                                    <Popup className="custom-popup">
                                                        <div className="p-2 min-w-[200px]">
                                                            <h4 className="font-bold text-slate-900 border-b pb-2 mb-2">{st.Name}</h4>
                                                            <div className="space-y-1.5 text-xs text-slate-700">
                                                                <div className="flex justify-between">
                                                                    <span>92 Octane:</span>
                                                                    <span className="font-bold">{info.petrol}%</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Diesel:</span>
                                                                    <span className="font-bold">{info.diesel}%</span>
                                                                </div>
                                                                <div className="flex justify-between">
                                                                    <span>Super Diesel:</span>
                                                                    <span className="font-bold">{info.superDiesel}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            );
                                        })
                                ) : (
                                    <HeatmapLayer
                                        points={filteredStations
                                            .filter(st => st.latitude && st.longitude)
                                            .map(st => {
                                                const hash = st.Id.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
                                                // Simulate revenue intensity (0.2 to 1.0)
                                                const intensity = ((hash % 80) + 20) / 100;
                                                return [st.latitude, st.longitude, intensity];
                                            })}
                                    />
                                )}
                            </MapContainer>

                            <div className="absolute bottom-6 left-6 z-[100] bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex gap-4 items-center">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Normal
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div> Low
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div> Critical
                                </div>
                            </div>
                        </div>

                        {/* Recent Alerts & Filtering */}
                        <div className="col-span-1 space-y-6 flex flex-col">
                            <div className="bg-[#121216] border border-white/5 p-8 rounded-[32px] flex flex-col gap-6">
                                <h3 className="text-sm font-bold flex items-center gap-2">
                                    <Filter size={16} className="text-blue-500" /> Filter & Control
                                </h3>

                                <div className="space-y-4">
                                    <div className="relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Search network..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-[#1c1c21] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-xs text-white focus:border-blue-500/30 transition-all outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {['all', 'critical', 'low', 'normal'].map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setFilterStatus(f)}
                                                className={`py-2 px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all ${filterStatus === f ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'}`}
                                            >
                                                {f}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-red-500/5 border border-red-500/10 p-8 rounded-[32px] flex-1">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-bold text-red-500 flex items-center gap-2">
                                        <AlertTriangle size={16} /> Critical Stock Alerts
                                    </h3>
                                    <span className="text-[10px] px-2 py-1 bg-red-500 text-white rounded font-bold">{criticalAlerts.length}</span>
                                </div>
                                <div className="space-y-4">
                                    {loading ? [1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 animate-pulse rounded-2xl"></div>) :
                                        criticalAlerts.length > 0 ? criticalAlerts.map((st, i) => (
                                            <div key={i} className="p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-all cursor-pointer">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-200">{st.Name}</p>
                                                        <p className="text-[10px] text-slate-500 mt-0.5">{st.Location}</p>
                                                    </div>
                                                    <div className="text-red-500">
                                                        <ArrowDownRight size={14} />
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex gap-2">
                                                    <div className="h-1 flex-1 bg-black/40 rounded-full overflow-hidden">
                                                        <div className="h-full bg-red-500" style={{ width: `${Math.min(st.petrol, st.diesel, st.superDiesel)}%` }}></div>
                                                    </div>
                                                    <span className="text-[10px] font-black text-red-500">{Math.min(st.petrol, st.diesel, st.superDiesel)}%</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="py-10 text-center text-slate-600">
                                                <Activity size={32} className="mx-auto mb-3 opacity-20" />
                                                <p className="text-xs">No critical inventory detected</p>
                                            </div>
                                        )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Station Table */}
                    <div id="inventory-table" className="mt-8 bg-[#121216] border border-white/5 rounded-[32px] overflow-hidden">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Package size={16} className="text-blue-500" /> Network Status Inventory
                            </h3>
                            <button className="text-[10px] font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1">
                                <RefreshCw size={12} /> SYNC DATABASE
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="bg-white/5 text-slate-500 font-bold uppercase tracking-wider">
                                        <th className="px-8 py-4">Station ID / Name</th>
                                        <th className="px-8 py-4">Network Node</th>
                                        <th className="px-8 py-4">Petrol (92/95)</th>
                                        <th className="px-8 py-4">Diesel / Super</th>
                                        <th className="px-8 py-4">Manager</th>
                                        <th className="px-8 py-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr><td colSpan="6" className="px-8 py-20 text-center text-slate-600 font-medium">Scanning network assets...</td></tr>
                                    ) : filteredStations.map((st, i) => {
                                        const info = getStockInfo(st.Id);
                                        return (
                                            <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-8 py-5">
                                                    <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{st.Name}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{st.Id}</p>
                                                </td>
                                                <td className="px-8 py-5 text-slate-400">
                                                    <div className="flex flex-col">
                                                        <span>{st.Location}</span>
                                                        {(!st.latitude || !st.longitude) && (
                                                            <span className="text-[9px] text-red-500 font-bold mt-1 uppercase flex items-center gap-1">
                                                                <AlertTriangle size={10} /> No GPS Data
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col gap-1.5 min-w-[120px]">
                                                        <div className="flex justify-between font-mono text-[9px] text-slate-500 uppercase">
                                                            <span>92 Octane</span>
                                                            <span className={info.petrol < 15 ? 'text-red-500' : 'text-slate-300'}>{info.petrol}%</span>
                                                        </div>
                                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${info.petrol < 15 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${info.petrol}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col gap-1.5 min-w-[120px]">
                                                        <div className="flex justify-between font-mono text-[9px] text-slate-500 uppercase">
                                                            <span>Auto Diesel</span>
                                                            <span className={info.diesel < 15 ? 'text-red-500' : 'text-slate-300'}>{info.diesel}%</span>
                                                        </div>
                                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full ${info.diesel < 15 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${info.diesel}%` }}></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className="text-slate-200">{st.person?.PersonName || 'No Manager'}</p>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">{st.person?.ContactNumber || 'N/A'}</p>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${info.status === 'critical' ? 'bg-red-500/10 text-red-500' :
                                                        info.status === 'low' ? 'bg-amber-500/10 text-amber-500' :
                                                            'bg-emerald-500/10 text-emerald-500'
                                                        }`}>
                                                        <div className={`w-1 h-1 rounded-full ${info.status === 'critical' ? 'bg-red-500' :
                                                            info.status === 'low' ? 'bg-amber-500' :
                                                                'bg-emerald-500'
                                                            }`}></div>
                                                        {info.status}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .custom-popup .leaflet-popup-content-wrapper {
                    background: white;
                    color: #0f172a;
                    border-radius: 16px;
                    padding: 4px;
                }
                .custom-popup .leaflet-popup-tip {
                    background: white;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
};

export default SuperAdminDashboard;
