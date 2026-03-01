import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Search, Layers, Activity, Zap, Fuel, AlertTriangle } from 'lucide-react';

// Fix for default Leaflet icon paths in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png')
});

// Custom Icons
const fuelIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const evIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to dynamically change map view bounds
function ChangeView({ center, zoom }) {
    const map = useMap();
    map.setView(center, zoom);
    return null;
}

const StationMap = () => {
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [mapStyle, setMapStyle] = useState('dark');

    // Default center to Colombo
    const [center, setCenter] = useState([6.9271, 79.8612]);

    const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8081/api";

    useEffect(() => {
        const fetchStations = async () => {
            try {
                // 1. Fetch registered FUEL stations from backend
                const response = await fetch(`${API_BASE}/station?limit=200`);
                const data = await response.json();
                const stationsList = Array.isArray(data) ? data : (data.items || []);

                const mappedFuelStations = stationsList.map((st, i) => {
                    const baseLat = 6.9271;
                    const baseLng = 79.8612;
                    const offset = (st.Id?.length || 5) * 0.005;
                    return {
                        id: st._id || st.Id || i,
                        name: st.Name || "Unnamed Station",
                        lat: baseLat + ((i % 5) * offset * (i % 2 === 0 ? 1 : -1)),
                        lng: baseLng + ((i % 7) * offset * (i % 3 === 0 ? 1 : -1)),
                        location: st.Location || "Unknown Location",
                        type: "Fuel",
                        brand: st.Name?.includes("IOC") ? "IOC" : st.Name?.includes("Sinopec") ? "Sinopec" : "Ceypetco",
                        idTag: st.Id || "ST-UNKNOWN",
                        person: st.person?.PersonName || "Admin"
                    };
                });

                // 2. Read EV stations registered via EVStationPortal (localStorage)
                const stored = localStorage.getItem('evStations');
                const evStations = stored ? JSON.parse(stored) : [];
                const mappedEvStations = evStations.map(st => ({
                    id: st.id,
                    name: st.name,
                    lat: st.lat ? parseFloat(st.lat) : 6.9271 + (Math.random() * 0.06 - 0.03),
                    lng: st.lng ? parseFloat(st.lng) : 79.8612 + (Math.random() * 0.06 - 0.03),
                    location: st.location,
                    type: "EV Charging",
                    brand: st.operator || "EV Station",
                    idTag: st.id,
                    person: st.phone || "—"
                }));

                // 3. Static seed EV stations
                const mockEvStations = [
                    { id: 'ev-seed-1', name: "ChargeNet — Odel Hub", lat: 6.9147, lng: 79.8647, location: "Colombo 07", type: "EV Charging", brand: "ChargeNet", idTag: "EV-SEED-001", person: "Automated" },
                    { id: 'ev-seed-2', name: "Vega Innovations L2", lat: 6.9400, lng: 79.8600, location: "Colombo 03", type: "EV Charging", brand: "Vega", idTag: "EV-SEED-002", person: "Automated" }
                ];

                setStations([...mappedFuelStations, ...mappedEvStations, ...mockEvStations]);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch map stations", err);
                // Fallback: still show EV stations from localStorage
                const stored = localStorage.getItem('evStations');
                const evStations = stored ? JSON.parse(stored) : [];
                setStations(evStations.map(st => ({
                    id: st.id, name: st.name,
                    lat: st.lat ? parseFloat(st.lat) : 6.9271,
                    lng: st.lng ? parseFloat(st.lng) : 79.8612,
                    location: st.location, type: "EV Charging",
                    brand: st.operator || "EV", idTag: st.id, person: st.phone
                })));
                setLoading(false);
            }
        };

        fetchStations();
    }, [API_BASE]);

    const filteredStations = stations.filter(station =>
        station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.idTag.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const mapTiles = {
        dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        light: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    };

    return (
        <div className="flex flex-col h-screen bg-slate-50 relative">

            {/* Header Overlay */}
            <div className="absolute top-0 left-0 w-full z-10 p-4 pointer-events-none">
                <div className="max-w-7xl mx-auto flex gap-4 pointer-events-auto items-start">

                    {/* Floating Search Bar */}
                    <div className="bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] flex items-center p-3 flex-1 max-w-md border border-slate-100">
                        <Search size={20} className="text-slate-400 mx-2" />
                        <input
                            type="text"
                            placeholder="Search registered stations..."
                            className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {loading && <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>}
                    </div>

                    {/* Stats Pill */}
                    <div className="hidden md:flex bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] p-3 items-center gap-6 border border-slate-100 font-semibold px-6">
                        <div className="flex items-center gap-2">
                            <Activity size={16} className="text-blue-500" />
                            <span className="text-slate-800 text-sm">System Live</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200"></div>
                        <div className="flex items-center gap-2">
                            <MapPin size={16} className="text-slate-400" />
                            <span className="text-slate-800 text-sm">{filteredStations.length} Stations Found</span>
                        </div>
                    </div>

                    {/* Map Layers Toggle */}
                    <div className="ml-auto bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] p-1 flex border border-slate-100">
                        <button
                            onClick={() => setMapStyle('light')}
                            className={`p-2.5 rounded-xl transition-all ${mapStyle === 'light' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Light Map"
                        >
                            <MapPin size={18} />
                        </button>
                        <button
                            onClick={() => setMapStyle('dark')}
                            className={`p-2.5 rounded-xl transition-all ${mapStyle === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Dark Map"
                        >
                            <Layers size={18} />
                        </button>
                    </div>

                </div>
            </div>

            {/* Main Map Container */}
            <div className="flex-1 w-full relative z-0">
                <MapContainer
                    center={center}
                    zoom={13}
                    style={{ height: "100%", width: "100%", zIndex: 0 }}
                    zoomControl={false} // Hiding default zoom to stick to modern look
                >
                    <TileLayer
                        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url={mapTiles[mapStyle]}
                    />

                    {filteredStations.map(station => (
                        <Marker
                            key={station.id}
                            position={[station.lat, station.lng]}
                            icon={station.type === 'EV Charging' ? evIcon : fuelIcon}
                        >
                            <Popup className="custom-popup">
                                <div className="p-1 min-w-[200px]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`p-1.5 rounded-lg ${station.type === 'EV Charging' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {station.type === 'EV Charging' ? <Zap size={14} /> : <Fuel size={14} />}
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{station.type}</span>
                                            <p className="text-xs text-slate-500 font-semibold">{station.idTag}</p>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-lg text-slate-800 leading-tight mb-1">{station.name}</h3>
                                    <p className="text-sm text-slate-500 mb-3 flex items-start gap-1">
                                        <MapPin size={14} className="shrink-0 mt-0.5" />
                                        {station.location}
                                    </p>

                                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-slate-500 font-medium">Brand</span>
                                            <span className="text-slate-800 font-bold">{station.brand}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500 font-medium">Contact</span>
                                            <span className="text-slate-800 font-bold">{station.person}</span>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    <ChangeView center={center} zoom={13} />
                </MapContainer>
            </div>

            {/* Dark mode popup styling patch */}
            <style>{`
                .leaflet-popup-content-wrapper {
                    border-radius: 16px;
                    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2);
                    padding: 4px;
                }
                .leaflet-popup-content {
                    margin: 12px;
                }
                .leaflet-container a.leaflet-popup-close-button {
                    top: 12px;
                    right: 12px;
                    color: #94a3b8;
                }
            `}</style>

        </div>
    );
};

export default StationMap;
