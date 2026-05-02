import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Check, X } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

const PendingRequestsPanel = ({ isDark }) => {
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [swapRequests, setSwapRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [leaveRes, swapRes] = await Promise.all([
                axios.get(`${API_BASE_URL}/leave/all`),
                axios.get(`${API_BASE_URL}/shifts/swaps/available`)
            ]);
            setLeaveRequests(leaveRes.data?.filter(l => l.status === 'Pending') || []);
            setSwapRequests(swapRes.data?.filter(s => s.swapStatus === 'offered') || []);
        } catch (error) {
            console.error('Error fetching manager requests', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLeave = async (id, status) => {
        try {
            await axios.put(`${API_BASE_URL}/leave/${id}/status`, { status });
            toast.success(`Leave request ${status.toLowerCase()}`);
            fetchData();
        } catch (error) {
            toast.error('Failed to update leave request');
        }
    };

    const handleSwap = async (id, approve) => {
        try {
            await axios.post(`${API_BASE_URL}/shifts/${id}/approve-swap`, { approve });
            toast.success(`Swap ${approve ? 'approved' : 'rejected'}`);
            fetchData();
        } catch (error) {
            toast.error('Failed to update swap request');
        }
    };

    if (loading) return null;
    if (leaveRequests.length === 0 && swapRequests.length === 0) return null;

    return (
        <div className={`mt-8 mb-8 p-6 rounded-[32px] border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-xl'}`}>
            <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Action Required: Pending Requests
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Leave Requests */}
                {leaveRequests.length > 0 && (
                    <div>
                        <h4 className={`text-sm font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>Leave Approvals</h4>
                        <div className="space-y-3">
                            {leaveRequests.map(leave => (
                                <div key={leave._id} className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{leave.employeeId?.name || 'Unknown'}</p>
                                            <p className="text-[10px] text-slate-500">{new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleLeave(leave._id, 'Approved')} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200">
                                                <Check size={16} />
                                            </button>
                                            <button onClick={() => handleLeave(leave._id, 'Rejected')} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className={`text-xs italic ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>"{leave.reason}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Swap Requests */}
                {swapRequests.length > 0 && (
                    <div>
                        <h4 className={`text-sm font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-purple-500' : 'text-purple-600'}`}>Shift Swaps</h4>
                        <div className="space-y-3">
                            {swapRequests.map(swap => (
                                <div key={swap._id} className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{new Date(swap.date).toLocaleDateString()} • {swap.shiftType}</p>
                                            <p className="text-xs mt-1 text-slate-500">
                                                <span className="font-semibold">{swap.employeeId?.name}</span> wants to drop.
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                <span className="font-semibold text-blue-500">{swap.swapCoveredBy?.name}</span> offered to cover.
                                            </p>
                                        </div>
                                        <div className="flex gap-1">
                                            <button onClick={() => handleSwap(swap._id, true)} className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200">
                                                <Check size={16} />
                                            </button>
                                            <button onClick={() => handleSwap(swap._id, false)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingRequestsPanel;
