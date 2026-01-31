import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { User, LogIn, LogOut, History, MapPin, Loader2, QrCode, X } from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

const EmployeePortal = () => {
    const { user } = useAuth();
    const [status, setStatus] = useState({ isClockedIn: false, record: null });
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [manualStationId, setManualStationId] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);

    useEffect(() => {
        if (user) {
            fetchStatus();
            fetchHistory();
            setLoading(false);
        }
    }, [user]);

    const fetchStatus = async () => {
        try {
            const response = await axios.get(`${API_URL}/attendance/status/${user._id || user.id}`);
            setStatus(response.data);
        } catch (error) {
            console.error('Status fetch error:', error);
        }
    };

    const fetchHistory = async () => {
        try {
            const response = await axios.get(`${API_URL}/attendance/history/${user._id || user.id}`);
            setHistory(response.data);
        } catch (error) {
            console.error('History fetch error:', error);
        }
    };

    const startScanner = () => {
        setIsScanning(true);
        setTimeout(() => {
            const scanner = new Html5QrcodeScanner("reader", {
                fps: 10,
                qrbox: { width: 250, height: 250 }
            }, false);

            scanner.render(async (decodedText) => {
                try {
                    const data = JSON.parse(decodedText);
                    if (data.type === 'STATION_CHECKIN') {
                        scanner.clear();
                        setIsScanning(false);
                        await handleClockIn(data.stationId);
                    }
                } catch (e) {
                    toast.error('Invalid QR Code');
                }
            }, (error) => {
                // console.warn(error);
            });
        }, 100);
    };

    const handleClockIn = async (stationId) => {
        try {
            await axios.post(`${API_URL}/attendance/clock-in`, {
                employeeId: user._id || user.id,
                stationId
            });
            toast.success('Successfully clocked in!');
            fetchStatus();
            fetchHistory();
            setShowManualInput(false);
            setManualStationId('');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Clock-in failed');
        }
    };

    const handleClockOut = async () => {
        try {
            await axios.post(`${API_URL}/attendance/clock-out`, {
                employeeId: user._id || user.id
            });
            toast.success('Successfully clocked out!');
            fetchStatus();
            fetchHistory();
        } catch (error) {
            toast.error('Clock-out failed');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="animate-spin text-blue-600" size={48} />
        </div>
    );

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
                <div className="bg-white rounded-[40px] p-12 shadow-2xl border border-slate-100 max-w-lg w-full">
                    <p className="text-slate-500 mb-4">Please login to access the Employee Portal</p>
                    <button
                        onClick={() => window.location.href = '/login'}
                        className="px-8 py-3 bg-blue-600 text-white rounded-2xl font-bold"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 relative">
            <Toaster position="top-right" />

            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Profile & Actions */}
                    <div className="space-y-8">
                        <div className="bg-white rounded-[40px] p-8 shadow-xl border border-slate-100 relative overflow-hidden">
                            <div className=" absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16"></div>

                            <div className="flex items-center gap-6 mb-8">
                                <div className="w-20 h-20 rounded-[28px] flex items-center justify-center text-white text-2xl font-bold shadow-lg" style={{ backgroundColor: user.color || '#3b82f6' }}>
                                    {user.avatar || user.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{user.name}</h2>
                                    <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold inline-block mt-1">
                                        {user.role}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-50">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Employee ID</span>
                                    <span className="font-bold text-slate-700">{user.employeeId}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400">Fixed Shift</span>
                                    <span className="font-bold text-slate-700">{user.shift || 'N/A'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Clocking Card */}
                        <div className="bg-white rounded-[40px] p-8 shadow-xl border border-slate-100 text-center">
                            {status.isClockedIn ? (
                                <>
                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-1">Shift in Progress</h3>
                                    <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mb-8">
                                        <MapPin size={14} /> {status.record.stationId}
                                    </div>
                                    <button
                                        onClick={handleClockOut}
                                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <LogOut size={18} /> Clock Out Now
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <QrCode className="text-blue-600" size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to Start?</h3>
                                    <p className="text-slate-400 text-sm mb-8 px-4">Find the station QR code and scan to automatically check-in</p>

                                    <div className="space-y-3">
                                        <button
                                            onClick={startScanner}
                                            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <QrCode size={18} /> Scan Station QR
                                        </button>

                                        <p className="text-xs text-slate-400">or</p>

                                        {!showManualInput ? (
                                            <button
                                                onClick={() => setShowManualInput(true)}
                                                className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-semibold hover:bg-slate-200 transition-all"
                                            >
                                                Manual Check-in
                                            </button>
                                        ) : (
                                            <div className="space-y-3 p-4 bg-slate-50 rounded-2xl animate-in fade-in zoom-in duration-300">
                                                <input
                                                    type="text"
                                                    placeholder="Enter Station ID"
                                                    value={manualStationId}
                                                    onChange={(e) => setManualStationId(e.target.value)}
                                                    className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setShowManualInput(false)}
                                                        className="flex-1 py-2 bg-slate-200 text-slate-600 font-bold rounded-xl"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={() => handleClockIn(manualStationId)}
                                                        disabled={!manualStationId}
                                                        className="flex-[2] py-2 bg-slate-900 text-white font-bold rounded-xl disabled:opacity-50"
                                                    >
                                                        Submit
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="p-4 text-center">
                            <p className="text-xs text-slate-400 italic">Secure location verified check-in enforced.</p>
                        </div>
                    </div>

                    {/* Right: History */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-[40px] p-8 shadow-xl border border-slate-100 min-h-full">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                                    <History className="text-blue-600" size={24} />
                                    Attendance History
                                </h3>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Last 30 Days</div>
                            </div>

                            <div className="space-y-4">
                                {history.length === 0 ? (
                                    <div className="p-20 text-center text-slate-400 border-2 border-dashed border-slate-100 rounded-[32px]">
                                        No shift history found yet.
                                    </div>
                                ) : (
                                    history.map(item => (
                                        <div key={item._id} className="p-6 rounded-[28px] bg-slate-50 border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-blue-100 transition-all duration-300">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                                    <LogIn size={18} className="text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-800">{new Date(item.checkInTime).toLocaleDateString()}</div>
                                                    <div className="text-xs text-slate-400">{item.stationId}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-slate-800">
                                                    {new Date(item.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    {item.checkOutTime && ` → ${new Date(item.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                </div>
                                                <span className={`text-[10px] uppercase font-black tracking-tighter ${item.status === 'Completed' ? 'text-emerald-500' : 'text-blue-500'}`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scanner Modal */}
            {isScanning && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => setIsScanning(false)}></div>
                    <div className="relative bg-white rounded-[40px] p-4 max-w-lg w-full overflow-hidden shadow-2xl">
                        <div className="flex items-center justify-between p-4 mb-4">
                            <h3 className="text-lg font-bold text-slate-900">Scanner</h3>
                            <button onClick={() => setIsScanning(false)} className="p-2 bg-slate-100 rounded-xl">
                                <X size={20} />
                            </button>
                        </div>
                        <div id="reader" className="overflow-hidden rounded-[28px]"></div>
                        <div className="p-8 text-center">
                            <p className="text-sm text-slate-400">Position the station QR code within the frame to check-in</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeePortal;
