import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, Download, Monitor, Share2, Info, MapPin, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

const AdminQRView = () => {
    const [stationId, setStationId] = useState('');
    const [stations, setStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stationName, setStationName] = useState('');
    const [lastRefreshed, setLastRefreshed] = useState(new Date());

    const { user } = useAuth();
    const isStationAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchStations();
        if (isStationAdmin && user.stationId) {
            setStationId(user.stationId);
        }
    }, [user, isStationAdmin]);

    const fetchStations = async () => {
        try {
            const response = await axios.get(`${API_URL}/station`);
            // The API returns { items: [...], total: X, page: X ... }
            const data = response.data?.stations || response.data?.items || response.data?.data || [];

            // Ensure data is always an array
            const stationList = Array.isArray(data) ? data : [];
            setStations(stationList);

            if (isStationAdmin && user.stationId) {
                const myStation = stationList.find(s => s.Id === user.stationId || s._id === user.stationId);
                if (myStation) setStationName(myStation.Name);
            }
        } catch (error) {
            console.error('Failed to fetch stations:', error);
            setStations([]);
        } finally {
            setLoading(false);
        }
    };

    const refreshQR = () => {
        setLastRefreshed(new Date());
    };

    const qrValue = JSON.stringify({
        stationId,
        timestamp: lastRefreshed.getTime(),
        type: 'STATION_CHECKIN'
    });

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12">
            <div className="max-w-4xl mx-auto">
                <div className="mb-12">
                    <h1 className="text-4xl font-light text-slate-900 mb-2">Station Check-in QR</h1>
                    <div className="flex items-center gap-2 text-blue-600 font-bold mb-1">
                        <MapPin size={18} />
                        {isStationAdmin ? (stationName || "Loading Station...") : (stationId ? stations.find(s => s.Id === stationId || s._id === stationId)?.Name : "No Station Selected")}
                    </div>
                    <p className="text-slate-500 text-sm">Official QR code for employee clock-in at this location</p>
                </div>

                {/* Station Selection - Hidden for Station Admin */}
                {!isStationAdmin && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 mb-8">
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                            <MapPin size={16} className="text-blue-600" />
                            Select Station Location
                        </label>
                        <div className="relative">
                            <select
                                value={stationId}
                                onChange={(e) => {
                                    setStationId(e.target.value);
                                    setLastRefreshed(new Date());
                                }}
                                disabled={loading}
                                className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-3 px-4 pr-8 rounded-xl outline-none focus:border-blue-500 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                <option value="">{loading ? 'Loading stations...' : 'Choose a station...'}</option>
                                {stations.map((st) => (
                                    <option key={st._id} value={st.Id || st._id}>
                                        {st.Name || st.Id || st._id}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                {loading ? <Loader2 size={16} className="animate-spin" /> : (
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {stationId ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* QR Code Display Card */}
                        <div className="bg-white rounded-[40px] p-12 shadow-2xl shadow-blue-500/10 border border-slate-100 flex flex-col items-center gap-8 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>

                            <div className="bg-slate-50 p-8 rounded-[32px] border border-slate-100 transition-transform group-hover:scale-105 duration-500">
                                <QRCodeSVG
                                    value={qrValue}
                                    size={256}
                                    level="H"
                                    includeMargin={true}
                                    imageSettings={{
                                        src: "https://cdn-icons-png.flaticon.com/512/847/847969.png", // Just a fuel icon placeholder
                                        x: undefined,
                                        y: undefined,
                                        height: 48,
                                        width: 48,
                                        excavate: true,
                                    }}
                                />
                            </div>

                            <div className="text-center">
                                <div className="text-xl font-semibold text-slate-900 mb-1">{stationId}</div>
                                <div className="text-xs text-slate-400 uppercase tracking-widest font-bold">Official Monitoring Station</div>
                            </div>

                            <button
                                onClick={refreshQR}
                                className="flex items-center gap-2 text-blue-600 font-semibold text-sm hover:underline"
                            >
                                <RefreshCw size={16} className={Date.now() - lastRefreshed.getTime() < 1000 ? 'animate-spin' : ''} />
                                Refresh Token
                            </button>
                        </div>

                        {/* Stats & Actions */}
                        <div className="space-y-6">
                            <div className="bg-blue-600 rounded-[32px] p-8 text-white shadow-xl shadow-blue-500/30">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="p-3 bg-white/20 rounded-2xl">
                                        <Monitor className="text-white" size={24} />
                                    </div>
                                    <h3 className="text-xl font-semibold">Active Display</h3>
                                </div>
                                <p className="text-blue-100 text-sm leading-relaxed mb-6">
                                    This QR code uses a secure dynamic token system. Employees must scan this while being physically present at the selected station.
                                </p>
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest opacity-80">
                                    <span>Status: Online</span>
                                    <span>v2.0 Secured</span>
                                </div>
                            </div>

                            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
                                <h4 className="text-slate-900 font-semibold mb-6 flex items-center gap-2">
                                    <Info size={18} className="text-blue-600" />
                                    Administrator Tools
                                </h4>
                                <div className="space-y-4">
                                    <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                                        <span className="text-sm font-medium text-slate-700">Download for Print</span>
                                        <Download size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                                    </button>
                                    <button className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                                        <span className="text-sm font-medium text-slate-700">Push to Station Display</span>
                                        <Share2 size={18} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-[40px] p-16 text-center text-slate-400">
                        <Monitor size={48} className="mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-medium text-slate-600 mb-2">No Station Selected</h3>
                        <p className="text-sm max-w-sm mx-auto">Please choose a station from the dropdown above to generate its official check-in QR code.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminQRView;
