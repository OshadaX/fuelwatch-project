import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import ShiftScheduler from './ShiftScheduler';
import PendingRequestsPanel from './PendingRequestsPanel';
import { predictStaffBatch } from '../../../services/mlService';

const ML_API_URL = process.env.REACT_APP_ML_API_URL || 'http://localhost:5003';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

const ShiftSchedulerPage = () => {
    const { user } = useAuth();
    const stationId = user?.stationId || '';
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        loadPredictions();
    }, []);

    const loadPredictions = async () => {
        setLoading(true);
        try {
            // Try Member 1 data first
            const res = await axios.get(`${API_BASE_URL}/reports/fuel-prediction/latest`, {
                params: { stationId: stationId || 'STATION_001' }
            });
            if (res.data?.ok && res.data?.data?.predictions?.length) {
                const staffData = await predictStaffBatch(res.data.data.predictions.slice(0, 7));
                if (staffData.ok) {
                    setPredictions(staffData.predictions);
                    setLoading(false);
                    return;
                }
            }
        } catch (e) {
            console.error('Error fetching Member 1 fuel prediction in ShiftScheduler:', e);
        }

        // Fallback: use ML independent forecast
        try {
            const res = await axios.get(`${ML_API_URL}/predict/weekly`, {
                params: { base_demand: 6000 }
            });
            if (res.data?.ok) setPredictions(res.data.predictions);
        } catch (e) {
            console.error('Could not load predictions for shift scheduler:', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'} p-6 md:p-12`}>
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className={`text-4xl md:text-5xl font-light tracking-tight ${isDark ? 'text-white' : 'text-slate-900'} mb-2`}>
                            Shift Scheduler
                        </h1>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Assign employees to AI-predicted staffing requirements for the next 7 days
                        </p>
                    </div>
                    <button
                        onClick={() => setIsDark(!isDark)}
                        className={`p-3 rounded-2xl text-xl transition-all ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm'}`}
                    >
                        {isDark ? '☀️' : '🌙'}
                    </button>
                </div>

                <PendingRequestsPanel isDark={isDark} />

                {/* Loading State */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin" />
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Loading staffing predictions...
                        </p>
                    </div>
                ) : predictions.length === 0 ? (
                    <div className={`rounded-[2rem] border-2 border-dashed p-20 text-center ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                        <Calendar size={40} className="mx-auto mb-4 opacity-40" />
                        <h3 className="text-lg font-semibold mb-2">No Predictions Available</h3>
                        <p className="text-sm">Please go to Staff Prediction and sync with Member 1 first, or wait for the ML service to load.</p>
                    </div>
                ) : (
                    <ShiftScheduler
                        predictions={predictions}
                        stationId={stationId}
                        isDark={isDark}
                    />
                )}
            </div>
        </div>
    );
};

export default ShiftSchedulerPage;
