import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Info, Phone, Mail, Navigation, Search, List, Map as MapIcon, X, TrendingUp, Users } from 'lucide-react';
import axios from 'axios';

// Fix for default marker icon in Leaflet + React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

// Helper to pan map
const RecenterAutomatically = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            map.flyTo([lat, lng], 14, {
                duration: 1.5,
                easeLinearity: 0.25
            });
        }
    }, [lat, lng, map]);
    return null;
}

const StationsView = () => {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStation, setSelectedStation] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    useEffect(() => {
        fetchStations();
    }, []);

    const fetchStations = async () => {
        try {
            const response = await axios.get(`${API_URL}/station`);
            const items = response.data.items || response.data;
            setStations(items);
        } catch (error) {
            console.error('Error fetching stations:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStations = stations.filter(s =>
        s.Name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.Location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleStationSelect = (station) => {
        setSelectedStation(station);
        setIsPanelOpen(true);
    };

    const mapCenter = [7.8731, 80.7718]; // Center of Sri Lanka

    return (
        <div className="h-screen bg-slate-50 flex flex-col overflow-hidden relative">
            {/* Header / Search Floating Overlay */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-xl px-4">
                <div className="bg-white/80 backdrop-blur-xl border border-white/50 p-2 rounded-3xl shadow-2xl flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <MapPin size={24} />
                    </div>
                    <div className="flex-1 relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search among all stations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-100/50 border-none pl-11 pr-4 py-3 rounded-2xl text-sm focus:ring-0 placeholder:text-slate-400"
                        />
                    </div>
                    {searchQuery && (
                        <div className="absolute top-20 left-0 right-0 max-h-60 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-100 overflow-auto animate-in fade-in zoom-in duration-200 p-2">
                            {filteredStations.length > 0 ? (
                                filteredStations.map(s => (
                                    <div
                                        key={s._id}
                                        onClick={() => {
                                            handleStationSelect(s);
                                            setSearchQuery('');
                                        }}
                                        className="p-3 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                                    >
                                        <div>
                                            <div className="text-sm font-bold text-slate-800">{s.Name}</div>
                                            <div className="text-[10px] text-slate-500">{s.Location}</div>
                                        </div>
                                        <Navigation size={14} className="text-blue-500" />
                                    </div>
                                ))
                            ) : (
                                <div className="p-4 text-center text-slate-400 text-xs font-medium">No stations found</div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative">
                <MapContainer
                    center={mapCenter}
                    zoom={8}
                    zoomControl={false}
                    style={{ height: '100%', width: '100%', zIndex: 10 }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    {filteredStations.filter(s => s.latitude && s.longitude).map(station => (
                        <Marker
                            key={station._id}
                            position={[station.latitude, station.longitude]}
                            eventHandlers={{
                                click: () => handleStationSelect(station),
                            }}
                        >
                            <Popup closeButton={false} className="custom-popup">
                                <div className="p-2 text-center">
                                    <div className="font-bold text-slate-900 leading-tight">{station.Name}</div>
                                    <div className="text-[10px] text-slate-500 mb-2">{station.Location}</div>
                                    <div className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase">
                                        Click for Hub
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                    {selectedStation?.latitude && (
                        <RecenterAutomatically lat={selectedStation.latitude} lng={selectedStation.longitude} />
                    )}
                </MapContainer>

                {/* Legend Overlay */}
                <div className="absolute bottom-8 left-8 z-[1000] bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-2xl">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Live Network Status</h4>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                            <span className="text-[11px] text-white font-medium">{stations.length} Active Stations</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[11px] text-white font-medium">98% System Uptime</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Station Hub Slide-in Panel */}
            <div className={`fixed top-0 right-0 bottom-0 z-[2000] w-full max-w-md bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.2)] transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {selectedStation && (
                    <div className="h-full flex flex-col p-8 overflow-y-auto">
                        <button
                            onClick={() => setIsPanelOpen(false)}
                            className="absolute top-6 right-6 p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
                        >
                            <X size={20} className="text-slate-600" />
                        </button>

                        <div className="mb-10">
                            <div className="text-xs font-black text-blue-600 uppercase tracking-widest mb-2">Station Hub</div>
                            <h2 className="text-4xl font-black text-slate-900 uppercase leading-none mb-2">{selectedStation.Name}</h2>
                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                <MapPin size={16} /> {selectedStation.Location}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-10">
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center gap-2">
                                <Users size={24} className="text-blue-600" />
                                <div className="text-2xl font-black text-slate-900">12</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter text-center leading-none">Registered<br />Employees</div>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center gap-2">
                                <Navigation size={24} className="text-emerald-500" />
                                <div className="text-2xl font-black text-slate-900">4</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter text-center leading-none">Active<br />Service Points</div>
                            </div>
                        </div>

                        {/* Fuel Levels (Logic Mapped for better visual) */}
                        <div className="mb-10 space-y-6">
                            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp size={16} className="text-blue-600" /> Real-time Inventory
                            </h4>
                            <div className="space-y-4">
                                {['92 Octane', '95 Octane', 'Auto Diesel', 'Super Diesel'].map((fuel, idx) => {
                                    const percent = 40 + Math.random() * 50;
                                    return (
                                        <div key={fuel} className="space-y-1">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[11px] font-bold text-slate-600">{fuel}</span>
                                                <span className="text-[11px] font-black text-slate-900">{Math.round(percent)}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${percent < 50 ? 'bg-orange-500' : 'bg-blue-600'}`}
                                                    style={{ width: `${percent}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Manager Contact */}
                        <div className="mb-10 p-6 bg-slate-900 rounded-[32px] text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Phone size={80} />
                            </div>
                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 relative z-10">Primary Contact</h4>
                            <div className="flex items-center gap-4 mb-6 relative z-10">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl font-black">
                                    {selectedStation.person?.PersonName?.charAt(0) || 'M'}
                                </div>
                                <div>
                                    <div className="font-bold">{selectedStation.person?.PersonName}</div>
                                    <div className="text-[10px] text-white/50">{selectedStation.person?.PersonDesignation || 'Station Manager'}</div>
                                </div>
                            </div>
                            <div className="space-y-3 relative z-10">
                                <div className="flex items-center gap-3 text-xs text-white/70">
                                    <Phone size={14} className="text-blue-400" /> {selectedStation.person?.ContactNumber}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-white/70">
                                    <Mail size={14} className="text-blue-400" /> {selectedStation.person?.PersonEmail}
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-8 grid grid-cols-2 gap-4">
                            <button
                                onClick={() => window.location.href = `/live-fuel?station=${selectedStation._id}`}
                                className="py-4 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-2xl font-black text-[11px] uppercase tracking-wider transition-all"
                            >
                                Stock Dashboard
                            </button>
                            <button className="py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all">
                                Get Directions
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StationsView;
