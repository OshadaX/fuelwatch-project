import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import {
    Users, Calendar, CloudSun, TrendingUp, RefreshCw,
    Sun, Cloud, CloudRain, CloudLightning, Loader2,
    AlertCircle, CheckCircle2, BarChart3
} from 'lucide-react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, Cell, Legend,
    ComposedChart, Line
} from 'recharts';
import { predictStaffBatch } from '../../../services/mlService';
import { useAuth } from '../../../context/AuthContext';

const ML_API_URL = process.env.REACT_APP_ML_API_URL || 'http://localhost:5003';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

const StaffPrediction = () => {
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [modelInfo, setModelInfo] = useState(null);
    const [baseDemand, setBaseDemand] = useState(6000);
    const [isDark, setIsDark] = useState(false);

    const { user } = useAuth();
    const stationId = user?.stationId || '';

    const location = useLocation();
    const [externalForecast, setExternalForecast] = useState(location.state?.fuelForecast || null);
    const [selectedFuelType, setSelectedFuelType] = useState("Lanka Petrol 92 Octane");
    const [availableFuels, setAvailableFuels] = useState([]);
    const [demandScenarios, setDemandScenarios] = useState([]);
    const [selectedScenarioId, setSelectedScenarioId] = useState('');
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (!hasInitialized.current) {
            hasInitialized.current = true;
            if (externalForecast) {
                extractAvailableFuels(externalForecast);
                fetchExternalPredictions(externalForecast, selectedFuelType);
            } else {
                handleInitialLoad();
            }
            fetchModelInfo();
            fetchScenarios();
        } else {
            if (externalForecast) {
                // When fuel type changes, re-fetch based on the new type
                fetchExternalPredictions(externalForecast, selectedFuelType);
            } else {
                fetchPredictions();
            }
        }
    }, [externalForecast, selectedFuelType]);

    const extractAvailableFuels = (predictionsArray) => {
        if (predictionsArray && predictionsArray.length > 0) {
            const firstDay = predictionsArray[0];
            const fuels = Object.keys(firstDay).filter(key => key !== 'Date' && key !== 'createdAt' && key !== 'updatedAt' && key !== '_id');
            setAvailableFuels(fuels);
        }
    };

    const processForecastForFuelType = (predictionsArray, fuelType) => {
        return predictionsArray.map(day => ({
            Date: day.Date,
            [fuelType]: day[fuelType] || 0
        }));
    };

    const handleInitialLoad = async () => {
        try {
            setLoading(true);
            setError(null);

            // Attempt to get Member 1's latest prediction
            const response = await axios.get(`${API_BASE_URL}/reports/fuel-prediction/latest`, {
                params: { stationId: 'STATION_001' }
            });

            if (response.data?.ok && response.data?.data?.predictions) {
                const latestPredictions = response.data.data.predictions;
                extractAvailableFuels(latestPredictions);
                setExternalForecast(latestPredictions);
                return; // Let the useEffect trigger fetchExternalPredictions
            }
        } catch (e) {
            console.log("Could not auto-sync with Member 1 on load, falling back to base forecast", e);
        }

        // Fallback to Member 3's independent forecast if Member 1 data is unavailable
        fetchPredictions();
    };

    const fetchPredictions = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axios.get(`${ML_API_URL}/predict/weekly`, {
                params: { base_demand: baseDemand }
            });
            if (response.data.ok) {
                setPredictions(response.data.predictions);
            } else {
                setError('Failed to fetch predictions');
            }
        } catch (err) {
            console.error('Error fetching predictions:', err);
            setError(err.message || 'Failed to connect to ML service');
        } finally {
            setLoading(false);
        }
    };

    const fetchScenarios = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/reports/fuel-prediction/list`, {
                params: { stationId: 'STATION_001' }
            });
            if (response.data.ok) {
                setDemandScenarios(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching scenarios:', err);
        }
    };

    const handleScenarioSelect = async (e) => {
        const id = e.target.value;
        if (!id) {
            handleReset();
            return;
        }
        
        try {
            setLoading(true);
            setSelectedScenarioId(id);
            const response = await axios.get(`${API_BASE_URL}/reports/fuel-prediction/${id}`);
            if (response.data.ok && response.data.data.predictions) {
                const forecastData = response.data.data.predictions;
                extractAvailableFuels(forecastData);
                setExternalForecast(forecastData);
                toast.success(`Loaded Scenario: ${response.data.data.title || 'Untitled'}`);
            }
        } catch (err) {
            console.error('Error loading scenario:', err);
            setError('Failed to load selected demand scenario');
        } finally {
            setLoading(false);
        }
    };

    const fetchExternalPredictions = async (forecastData, fuelType) => {
        try {
            setLoading(true);
            setError(null);

            if (!forecastData) return;

            const filteredForecast = processForecastForFuelType(forecastData, fuelType);

            // Call the batch prediction service with Member 1's daily data
            const data = await predictStaffBatch(filteredForecast);

            if (data.ok) {
                setPredictions(data.predictions);
                toast.success(`Analyzing impact of Member 1 Fuel Forecast (${fuelType})`);
            } else {
                setError('Failed to process external forecast data');
            }
        } catch (err) {
            console.error('Error processing external forecast:', err);
            setError('Staffing service unavailable for batch processing');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setExternalForecast(null);
        setSelectedFuelType("Lanka Petrol 92 Octane"); // Reset default
    };

    const handleSyncWithMember1 = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch latest fuel prediction from backend
            const response = await axios.get(`${API_BASE_URL}/reports/fuel-prediction/latest`, {
                params: { stationId: 'STATION_001' } // Matches Member 1's save logic
            });

            if (response.data.ok && response.data.data.predictions) {
                const latestPredictions = response.data.data.predictions;
                extractAvailableFuels(latestPredictions);
                const filteredForecast = processForecastForFuelType(latestPredictions, selectedFuelType);

                // 2. Pass to STAFF ML service
                const staffData = await predictStaffBatch(filteredForecast);

                if (staffData.ok) {
                    setPredictions(staffData.predictions);
                    setExternalForecast(latestPredictions);
                    toast.success(`Successfully synced with Member 1 Fuel Forecast (${selectedFuelType})`);
                } else {
                    setError('Staffing service failed to process synced data');
                }
            } else {
                setError('No fuel predictions found to sync');
            }
        } catch (err) {
            console.error('Error syncing with Member 1:', err);
            setError('Failed to sync with Member 1. Check if backend is running.');
        } finally {
            setLoading(false);
        }
    };

    const fetchModelInfo = async () => {
        try {
            const response = await axios.get(`${ML_API_URL}/model/info`);
            setModelInfo(response.data);
        } catch (err) {
            console.error('Error fetching model info:', err);
        }
    };

    const handleRefresh = () => {
        fetchPredictions();
    };

    const getWeatherIcon = (weather) => {
        switch (weather) {
            case 'Sunny': return <Sun className="w-5 h-5 text-amber-500" />;
            case 'Cloudy': return <Cloud className="w-5 h-5 text-slate-400" />;
            case 'Rainy': return <CloudRain className="w-5 h-5 text-blue-500" />;
            case 'Stormy': return <CloudLightning className="w-5 h-5 text-purple-500" />;
            default: return <CloudSun className="w-5 h-5 text-slate-400" />;
        }
    };

    const getEmployeeColor = (count) => {
        if (count <= 5) return '#22c55e';
        if (count <= 8) return '#3b82f6';
        if (count <= 11) return '#f59e0b';
        return '#ef4444';
    };

    // Prepare chart data
    const chartData = predictions.map((p) => ({
        day: p.day_name?.substring(0, 3) || new Date(p.date).toLocaleDateString('en-US', { weekday: 'short' }),
        date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        employees: p.employees_needed,
        fuelDemand: (p.estimated_fuel_demand || p.fuel_demand) / 1000, // in thousands
        temperature: p.temperature,
        isHoliday: p.is_holiday,
        isWeekend: p.is_weekend
    }));

    const totalEmployees = predictions.reduce((sum, p) => sum + p.employees_needed, 0);
    const avgEmployees = predictions.length ? (totalEmployees / predictions.length).toFixed(1) : 0;
    const maxEmployees = predictions.length ? Math.max(...predictions.map(p => p.employees_needed)) : 0;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className={`p-4 rounded-xl shadow-lg border ${isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
                    <p className="font-semibold mb-2">{data.day} - {data.date}</p>
                    <div className="space-y-1 text-sm">
                        <p><span className="text-blue-500">●</span> Employees: <strong>{data.employees}</strong></p>
                        <p><span className="text-emerald-500">●</span> Fuel: <strong>{(data.fuelDemand * 1000).toLocaleString()}L</strong></p>
                        <p><span className="text-amber-500">●</span> Temp: <strong>{data.temperature?.toFixed(1)}°C</strong></p>
                        {data.isHoliday && <p className="text-red-500 font-semibold">🎉 Holiday</p>}
                        {data.isWeekend && !data.isHoliday && <p className="text-blue-500">📅 Weekend</p>}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'} p-6 md:p-12`}>
            <Toaster position="top-right" />
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className={`text-4xl md:text-5xl font-light tracking-tight ${isDark ? 'text-white' : 'text-slate-900'} mb-2`}>
                                Staff Prediction
                            </h1>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                AI-powered employee scheduling based on fuel demand forecast
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                            <button
                                onClick={() => setIsDark(!isDark)}
                                className={`p-3 rounded-2xl text-xl transition-all ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm'}`}
                            >
                                {isDark ? '☀️' : '🌙'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scenario Selection */}
                <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <label className={`text-sm font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            Select Demand Scenario:
                        </label>
                        <select
                            value={selectedScenarioId}
                            onChange={handleScenarioSelect}
                            className={`flex-1 md:w-72 px-4 py-3 rounded-2xl text-sm font-medium transition-all border outline-none ${isDark
                                ? 'bg-slate-800 text-white border-slate-700 focus:border-blue-500'
                                : 'bg-white text-slate-900 border-slate-200 focus:border-blue-500 shadow-sm'
                                }`}
                        >
                            <option value="">Latest Forecast (Auto-Sync)</option>
                            {demandScenarios.map(scenario => (
                                <option key={scenario._id} value={scenario._id}>
                                    {scenario.title || `Forecast ${new Date(scenario.createdAt).toLocaleDateString()}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handleSyncWithMember1}
                        disabled={loading}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 ${isDark
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20'
                            : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                            }`}
                    >
                        <TrendingUp size={18} className={loading ? 'animate-spin' : ''} />
                        Sync with Latest
                    </button>
                </div>

                {/* External Forecast Source Indicator */}
                {externalForecast && (
                    <div className={`mb-8 p-6 rounded-[2rem] ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'} border flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top duration-500`}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <h3 className={`font-semibold ${isDark ? 'text-blue-300' : 'text-blue-900'}`}>Live Data Source</h3>
                                <p className={`text-sm ${isDark ? 'text-blue-400/80' : 'text-blue-700/80'}`}>
                                    Showing staffing requirements derived from <strong>Member 1: Fuel Demand Forecast</strong>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {availableFuels.length > 0 && (
                                <select
                                    value={selectedFuelType}
                                    onChange={(e) => setSelectedFuelType(e.target.value)}
                                    className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border outline-none ${isDark
                                        ? 'bg-slate-800 text-white border-slate-700 focus:border-blue-500'
                                        : 'bg-white text-blue-900 border-blue-200 focus:border-blue-500'
                                        }`}
                                >
                                    {availableFuels.map(fuel => (
                                        <option key={fuel} value={fuel}>{fuel}</option>
                                    ))}
                                </select>
                            )}
                            <button
                                onClick={handleReset}
                                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'}`}
                            >
                                Reset to Standard Forecast
                            </button>
                        </div>
                    </div>
                )}

                {/* Model Info Badge */}
                {modelInfo && (
                    <div className={`mb-8 flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-100'}`}>
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div className="flex items-center gap-6 text-sm">
                            <span className={isDark ? 'text-emerald-300' : 'text-emerald-700'}>
                                Model Accuracy: <strong>R² = {(modelInfo.metrics?.r2 * 100).toFixed(1)}%</strong>
                            </span>
                            <span className={isDark ? 'text-emerald-300' : 'text-emerald-700'}>
                                MAE: <strong>{modelInfo.metrics?.mae?.toFixed(2)} employees</strong>
                            </span>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className={`mb-8 flex items-center gap-4 p-4 rounded-2xl ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-100'}`}>
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className={isDark ? 'text-red-300' : 'text-red-700'}>{error}</span>
                        <span className={`text-xs ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                            Make sure ML API is running on port 5003
                        </span>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    <div className={`${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-blue-50 border-white/50'} rounded-3xl p-6 border`}>
                        <div className="flex items-center justify-between mb-4">
                            <Calendar className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className={`text-3xl font-light ${isDark ? 'text-white' : 'text-slate-900'} mb-1`}>
                            7 Days
                        </div>
                        <div className={`text-xs font-light uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Forecast Period
                        </div>
                    </div>
                    <div className={`${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-emerald-50 border-white/50'} rounded-3xl p-6 border`}>
                        <div className="flex items-center justify-between mb-4">
                            <Users className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className={`text-3xl font-light ${isDark ? 'text-white' : 'text-slate-900'} mb-1`}>
                            {loading ? '...' : totalEmployees}
                        </div>
                        <div className={`text-xs font-light uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Total Employee Days
                        </div>
                    </div>
                    <div className={`${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-50 border-white/50'} rounded-3xl p-6 border`}>
                        <div className="flex items-center justify-between mb-4">
                            <TrendingUp className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className={`text-3xl font-light ${isDark ? 'text-white' : 'text-slate-900'} mb-1`}>
                            {loading ? '...' : avgEmployees}
                        </div>
                        <div className={`text-xs font-light uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Avg Daily Staff
                        </div>
                    </div>
                    <div className={`${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-purple-50 border-white/50'} rounded-3xl p-6 border`}>
                        <div className="flex items-center justify-between mb-4">
                            <Users className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className={`text-3xl font-light ${isDark ? 'text-white' : 'text-slate-900'} mb-1`}>
                            {loading ? '...' : maxEmployees}
                        </div>
                        <div className={`text-xs font-light uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Peak Staff Need
                        </div>
                    </div>
                </div>

                {/* Charts Section */}
                {!loading && predictions.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                        {/* Fuel Demand Bar Chart */}
                        <div className={`${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/60 border-white/50'} backdrop-blur-sm rounded-3xl border p-6 shadow-xl`}>
                            <div className="flex items-center gap-3 mb-6">
                                <BarChart3 className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    7-Day Fuel Demand Forecast
                                </h3>
                            </div>
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                                    <XAxis
                                        dataKey="day"
                                        tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                                        axisLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                                    />
                                    <YAxis
                                        tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                                        axisLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                                        tickFormatter={(value) => `${value}kL`}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="fuelDemand" radius={[8, 8, 0, 0]} name="Fuel Demand">
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.isHoliday ? '#ef4444' : entry.isWeekend ? '#3b82f6' : '#10b981'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="flex justify-center gap-6 mt-4 text-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded bg-emerald-500"></div>
                                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Weekday</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded bg-blue-500"></div>
                                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Weekend</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded bg-red-500"></div>
                                    <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Holiday</span>
                                </div>
                            </div>
                        </div>

                        {/* Employee Count Line Chart */}
                        <div className={`${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/60 border-white/50'} backdrop-blur-sm rounded-3xl border p-6 shadow-xl`}>
                            <div className="flex items-center gap-3 mb-6">
                                <Users className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    Staff Requirement Trend
                                </h3>
                            </div>
                            <ResponsiveContainer width="100%" height={280}>
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="employeeGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#374151' : '#e5e7eb'} />
                                    <XAxis
                                        dataKey="day"
                                        tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                                        axisLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                                    />
                                    <YAxis
                                        tick={{ fill: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}
                                        axisLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
                                        domain={[0, 'auto']}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="employees"
                                        stroke="#3b82f6"
                                        strokeWidth={3}
                                        fill="url(#employeeGradient)"
                                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5, stroke: '#fff' }}
                                        activeDot={{ r: 7, stroke: '#3b82f6', strokeWidth: 2 }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Prediction Cards */}
                <div className={`${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/60 border-white/50'} backdrop-blur-sm rounded-3xl border overflow-hidden shadow-xl`}>
                    <div className="p-6 border-b border-slate-200/10">
                        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            7-Day Staff Forecast
                        </h2>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Based on predicted fuel demand and weather conditions
                        </p>
                    </div>

                    {loading ? (
                        <div className="p-20 flex flex-col items-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Loading predictions...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200/10">
                            {predictions.map((prediction, index) => (
                                <div
                                    key={prediction.date}
                                    className={`p-6 text-center transition-all hover:scale-[1.02] ${prediction.is_holiday || prediction.is_weekend
                                        ? isDark ? 'bg-blue-500/5' : 'bg-blue-50/50'
                                        : ''
                                        }`}
                                >
                                    {/* Day Name */}
                                    <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {prediction.day_name?.substring(0, 3) || new Date(prediction.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                    </div>

                                    {/* Date */}
                                    <div className={`text-sm font-medium mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {new Date(prediction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </div>

                                    {/* Employee Count Badge */}
                                    <div
                                        className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-4"
                                        style={{ backgroundColor: getEmployeeColor(prediction.employees_needed) }}
                                    >
                                        {prediction.employees_needed}
                                    </div>

                                    {/* Weather */}
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        {getWeatherIcon(prediction.weather)}
                                        <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                            {prediction.temperature?.toFixed(0)}°C
                                        </span>
                                    </div>

                                    {/* Fuel Demand */}
                                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {(prediction.estimated_fuel_demand || prediction.fuel_demand)?.toLocaleString()}L
                                    </div>

                                    {/* Holiday Badge */}
                                    {prediction.is_holiday && (
                                        <div className="mt-2">
                                            <span className="px-2 py-1 bg-red-500/20 text-red-500 text-[10px] font-semibold rounded-full">
                                                HOLIDAY
                                            </span>
                                        </div>
                                    )}
                                    {prediction.is_weekend && !prediction.is_holiday && (
                                        <div className="mt-2">
                                            <span className="px-2 py-1 bg-blue-500/20 text-blue-500 text-[10px] font-semibold rounded-full">
                                                WEEKEND
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className={`mt-8 p-6 rounded-2xl ${isDark ? 'bg-slate-800/30' : 'bg-white/40'}`}>
                    <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Staff Level Legend</h3>
                    <div className="flex flex-wrap gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-green-500"></div>
                            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Low (2-5)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-blue-500"></div>
                            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Normal (6-8)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-amber-500"></div>
                            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>High (9-11)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded bg-red-500"></div>
                            <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Peak (12-15)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaffPrediction;
