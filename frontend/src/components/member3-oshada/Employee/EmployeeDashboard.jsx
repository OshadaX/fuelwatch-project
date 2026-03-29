import React, { useState, useEffect } from 'react';
import { Users, Clock, Coffee, Plus, MapPin, Trash2, LogIn, Navigation, RefreshCw } from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

import EmployeeList from './EmployeeList';
import EmployeeFormModal from './EmployeeFormModal';
import { useAuth } from '../../../context/AuthContext';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

const EmployeeDashboard = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isDark, setIsDark] = useState(false);

    // Top-level dashboard tab: 'employees' | 'checkins'
    const [dashTab, setDashTab] = useState('employees');

    // Station Logic
    const [stationId, setStationId] = useState('');
    const [stationName, setStationName] = useState('');
    const [stations, setStations] = useState([]);

    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [employeeToDelete, setEmployeeToDelete] = useState(null);
    const [formData, setFormData] = useState({
        employeeId: '',
        name: '',
        email: '',
        password: '',
        role: '',
        status: 'active',
        shift: 'Morning',
        stationId: '',
        joinDate: new Date().toISOString().split('T')[0],
        color: '#3b82f6',
        avatar: ''
    });

    // Performance Metrics State
    const [activeTab, setActiveTab] = useState('general'); // 'general' | 'performance'
    const [attendanceHistory, setAttendanceHistory] = useState([]);
    const [fetchingPerformance, setFetchingPerformance] = useState(false);

    // Live Check-ins State
    const [activeCheckIns, setActiveCheckIns] = useState([]);
    const [loadingCheckIns, setLoadingCheckIns] = useState(false);
    const [selectedCheckIn, setSelectedCheckIn] = useState(null);

    const { user } = useAuth();
    const isStationAdmin = user?.role === 'admin';

    useEffect(() => {
        fetchStations();
        if (isStationAdmin && user.stationId) {
            setStationId(user.stationId);
            fetchEmployees(user.stationId);
        } else {
            fetchEmployees();
        }
    }, [user, isStationAdmin]);

    useEffect(() => {
        if (dashTab === 'checkins') {
            fetchActiveCheckIns();
        }
    }, [dashTab]);

    const fetchStations = async () => {
        try {
            const response = await axios.get(`${API_URL}/station`);
            const data = response.data?.stations || response.data?.items || response.data?.data || [];
            if (Array.isArray(data)) {
                setStations(data);
                if (isStationAdmin && user.stationId) {
                    const myStation = data.find(s => s.Id === user.stationId || s._id === user.stationId);
                    if (myStation) setStationName(myStation.Name);
                }
            } else {
                setStations([]);
            }
        } catch (error) {
            console.error('Failed to fetch stations:', error);
            setStations([]);
        }
    };

    const fetchEmployees = async (sId = stationId) => {
        try {
            setLoading(true);
            const url = sId ? `${API_URL}/employees?stationId=${sId}` : `${API_URL}/employees`;
            const response = await axios.get(url);
            setEmployees(response.data);
        } catch (error) {
            console.error('Error fetching employees:', error);
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveCheckIns = async () => {
        try {
            setLoadingCheckIns(true);
            const response = await axios.get(`${API_URL}/attendance/active`);
            setActiveCheckIns(response.data);
        } catch (error) {
            console.error('Error fetching active check-ins:', error);
            toast.error('Failed to load check-in data');
        } finally {
            setLoadingCheckIns(false);
        }
    };

    const fetchPerformance = async (empId) => {
        try {
            setFetchingPerformance(true);
            const response = await axios.get(`${API_URL}/attendance/history/${empId}`);
            setAttendanceHistory(response.data);
        } catch (error) {
            console.error('Error fetching performance:', error);
        } finally {
            setFetchingPerformance(false);
        }
    };

    const handleOpenModal = (employee = null) => {
        setActiveTab('general');
        if (employee) {
            setIsEditing(true);
            setFormData(employee);
            fetchPerformance(employee._id || employee.id);
        } else {
            setIsEditing(false);
            setFormData({
                employeeId: `FW${Math.floor(Math.random() * 9000 + 1000)}`,
                name: '',
                email: '',
                password: '',
                role: 'employee',
                status: 'active',
                shift: 'Morning',
                stationId: stationId,
                joinDate: new Date().toISOString().split('T')[0],
                color: '#3b82f6',
                avatar: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setActiveTab('general');
        setAttendanceHistory([]);
        setFormData({
            employeeId: '',
            name: '',
            email: '',
            password: '',
            role: '',
            status: 'active',
            shift: 'Morning',
            stationId: '',
            joinDate: new Date().toISOString().split('T')[0],
            color: '#3b82f6',
            avatar: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.stationId) {
            toast.error('Please select a station for the employee');
            return;
        }

        setSubmitting(true);
        try {
            const dataToSubmit = {
                ...formData,
                avatar: formData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
            };

            if (isEditing) {
                await axios.put(`${API_URL}/employees/${formData._id}`, dataToSubmit);
                toast.success('Employee updated successfully');
            } else {
                await axios.post(`${API_URL}/employees`, dataToSubmit);
                toast.success('Employee added successfully');
            }
            fetchEmployees();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving employee:', error);
            toast.error(error.response?.data?.message || 'Failed to save employee');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (id) => {
        setEmployeeToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (employeeToDelete) {
            try {
                await axios.delete(`${API_URL}/employees/${employeeToDelete}`);
                toast.success('Employee deleted successfully');
                fetchEmployees();
            } catch (error) {
                console.error('Error deleting employee:', error);
                toast.error('Failed to delete employee');
            } finally {
                setIsDeleteModalOpen(false);
                setEmployeeToDelete(null);
            }
        }
    };

    // Filter by BOTH Station & Search term
    const stationEmployees = employees.filter(emp => emp.stationId === stationId);

    const filteredEmployees = stationEmployees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = [
        {
            label: 'Total',
            value: stationEmployees.length,
            icon: <Users className="w-5 h-5" />,
            color: '#3b82f6',
            bgColor: isDark ? 'bg-blue-500/10' : 'bg-blue-50'
        },
        {
            label: 'Active',
            value: stationEmployees.filter(e => e.status === 'active').length,
            icon: <div className="w-2 h-2 rounded-full bg-emerald-500"></div>,
            color: '#10b981',
            bgColor: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
        },
        {
            label: 'On Break',
            value: stationEmployees.filter(e => e.status === 'on-break').length,
            icon: <Coffee className="w-5 h-5" />,
            color: '#f59e0b',
            bgColor: isDark ? 'bg-amber-500/10' : 'bg-amber-50'
        },
        {
            label: 'Off Duty',
            value: stationEmployees.filter(e => e.status === 'offline').length,
            icon: <Clock className="w-5 h-5" />,
            color: '#64748b',
            bgColor: isDark ? 'bg-slate-500/10' : 'bg-slate-100'
        }
    ];

    const getStatusDot = (status) => {
        switch (status) {
            case 'active': return '#10b981';
            case 'on-break': return '#f59e0b';
            case 'offline': return '#64748b';
            default: return '#64748b';
        }
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getElapsed = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    const openMaps = (lat, lng) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'} p-6 md:p-12 relative`}>
            <Toaster position="top-right" />

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className={`text-4xl md:text-5xl font-light tracking-tight ${isDark ? 'text-white' : 'text-slate-900'} mb-2`}>
                                Employee Management
                            </h1>
                            {isStationAdmin && stationName && (
                                <div className="flex items-center gap-2 text-blue-600 font-bold mb-2">
                                    <MapPin size={16} />
                                    {stationName}
                                </div>
                            )}
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Monitor staffing levels across all shifts
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {dashTab === 'employees' && (
                                <button
                                    onClick={() => handleOpenModal()}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
                                >
                                    <Plus size={18} /> Add Employee
                                </button>
                            )}
                            <button
                                onClick={() => setIsDark(!isDark)}
                                className={`p-3 rounded-2xl text-xl transition-all ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50 shadow-sm'}`}
                            >
                                {isDark ? '☀️' : '🌙'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Top-level Tabs */}
                <div className={`flex gap-2 mb-8 p-1.5 rounded-2xl w-fit ${isDark ? 'bg-slate-800' : 'bg-white shadow-sm border border-slate-100'}`}>
                    <button
                        onClick={() => setDashTab('employees')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${dashTab === 'employees'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <Users size={16} />
                        Employees
                    </button>
                    <button
                        onClick={() => setDashTab('checkins')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${dashTab === 'checkins'
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                            : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${dashTab === 'checkins' ? 'bg-white animate-pulse' : 'bg-emerald-400'}`}></span>
                        Live Check-ins
                        {activeCheckIns.length > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${dashTab === 'checkins' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'}`}>
                                {activeCheckIns.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* ── EMPLOYEES TAB ─────────────────────────────────────── */}
                {dashTab === 'employees' && (
                    <>
                        {/* Station Selection */}
                        {!isStationAdmin && (
                            <div className={`rounded-3xl p-6 shadow-sm border mb-8 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                                <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                    <MapPin size={16} className="text-blue-600" />
                                    Select Station to View Employees
                                </label>
                                <div className="relative max-w-md">
                                    <select
                                        value={stationId}
                                        onChange={(e) => {
                                            setStationId(e.target.value);
                                            fetchEmployees(e.target.value);
                                        }}
                                        className={`w-full appearance-none py-3 px-4 pr-8 rounded-xl outline-none focus:border-blue-500 transition-colors cursor-pointer ${isDark
                                            ? 'bg-slate-900/60 border border-slate-700 text-slate-300'
                                            : 'bg-slate-50 border border-slate-200 text-slate-700'
                                            }`}
                                    >
                                        <option value="">Choose a station...</option>
                                        {stations.map((st) => (
                                            <option key={st._id} value={st.Id || st._id}>
                                                {st.Name || st.Id || st._id}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                    </div>
                                </div>
                            </div>
                        )}

                        {stationId ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                                    {stats.map((stat, index) => (
                                        <div
                                            key={index}
                                            className={`${isDark ? 'bg-slate-800/50 border-slate-700' : `${stat.bgColor} border-white/50`} rounded-3xl p-6 border hover:scale-[1.02] transition-all duration-300 shadow-sm`}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div style={{ color: stat.color }}>
                                                    {stat.icon}
                                                </div>
                                            </div>
                                            <div className={`text-3xl font-light ${isDark ? 'text-white' : 'text-slate-900'} mb-1`}>
                                                {loading ? '...' : stat.value}
                                            </div>
                                            <div className={`text-xs font-light uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                {stat.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <EmployeeList
                                    isDark={isDark}
                                    loading={loading}
                                    searchTerm={searchTerm}
                                    setSearchTerm={setSearchTerm}
                                    filteredEmployees={filteredEmployees}
                                    stations={stations}
                                    stationId={stationId}
                                    handleOpenModal={handleOpenModal}
                                    handleDeleteClick={handleDeleteClick}
                                    getStatusDot={getStatusDot}
                                />
                            </div>
                        ) : (
                            <div className={`border-2 border-dashed rounded-[40px] p-16 text-center ${isDark ? 'border-slate-700 bg-slate-800/20 text-slate-500' : 'border-slate-200 bg-white text-slate-400'}`}>
                                <Users size={48} className="mx-auto mb-4 opacity-50 text-blue-500" />
                                <h3 className={`text-xl font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>No Station Selected</h3>
                                <p className="text-sm max-w-sm mx-auto">Please select a station from the dropdown to view its employee roster and statistics.</p>
                            </div>
                        )}
                    </>
                )}

                {/* ── LIVE CHECK-INS TAB ────────────────────────────────── */}
                {dashTab === 'checkins' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Sub-header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    Currently Checked-In Employees
                                </h2>
                                <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Real-time view of employees on shift right now
                                </p>
                            </div>
                            <button
                                onClick={fetchActiveCheckIns}
                                disabled={loadingCheckIns}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${isDark
                                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm'
                                    }`}
                            >
                                <RefreshCw size={15} className={loadingCheckIns ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>

                        {loadingCheckIns ? (
                            <div className="flex items-center justify-center py-24">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="w-12 h-12 rounded-full border-4 border-emerald-200 border-t-emerald-500 animate-spin"></div>
                                    <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Loading check-ins...</p>
                                </div>
                            </div>
                        ) : activeCheckIns.length === 0 ? (
                            <div className={`border-2 border-dashed rounded-[40px] p-16 text-center ${isDark ? 'border-slate-700 bg-slate-800/20' : 'border-slate-200 bg-white'}`}>
                                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                                    <LogIn size={28} className="text-emerald-400" />
                                </div>
                                <h3 className={`text-xl font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>No Active Check-ins</h3>
                                <p className={`text-sm max-w-xs mx-auto ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    No employees are currently clocked in. Check back when shifts begin.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                {activeCheckIns.map((record) => {
                                    const emp = record.employeeId;
                                    const hasLocation = record.location?.latitude && record.location?.longitude;
                                    const isSelected = selectedCheckIn === record._id;

                                    return (
                                        <div
                                            key={record._id}
                                            onClick={() => setSelectedCheckIn(isSelected ? null : record._id)}
                                            className={`rounded-[28px] border p-6 cursor-pointer transition-all duration-300 ${isDark
                                                ? `bg-slate-800/60 border-slate-700 ${isSelected ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'hover:border-slate-600'}`
                                                : `bg-white border-slate-100 shadow-sm ${isSelected ? 'border-emerald-200 ring-2 ring-emerald-100' : 'hover:border-slate-200 hover:shadow-md'}`
                                                }`}
                                        >
                                            {/* Employee info row */}
                                            <div className="flex items-center gap-4 mb-5">
                                                <div
                                                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0"
                                                    style={{ backgroundColor: emp?.color || '#3b82f6' }}
                                                >
                                                    {emp?.avatar || emp?.name?.charAt(0) || '?'}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`font-bold text-base truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                        {emp?.name || 'Unknown Employee'}
                                                    </div>
                                                    <div className={`text-xs truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {emp?.role} · {emp?.employeeId}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    Live
                                                </div>
                                            </div>

                                            {/* Time info */}
                                            <div className={`rounded-2xl p-4 mb-4 space-y-2 ${isDark ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        <LogIn size={14} className="text-emerald-500" />
                                                        Checked in at
                                                    </span>
                                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                                        {formatTime(record.checkInTime)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className={`flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        <Clock size={14} className="text-blue-500" />
                                                        Date
                                                    </span>
                                                    <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                        {formatDate(record.checkInTime)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Duration</span>
                                                    <span className="text-emerald-500 font-bold">{getElapsed(record.checkInTime)}</span>
                                                </div>
                                            </div>

                                            {/* Location */}
                                            {hasLocation ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openMaps(record.location.latitude, record.location.longitude); }}
                                                    className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl text-sm font-semibold transition-all group"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <MapPin size={15} />
                                                        View Check-in Location
                                                    </span>
                                                    <Navigation size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                                </button>
                                            ) : (
                                                <div className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm ${isDark ? 'bg-slate-700/40 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
                                                    <MapPin size={15} />
                                                    Location not captured
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Extracted EmployeeFormModal Component */}
            <EmployeeFormModal
                isModalOpen={isModalOpen}
                isDark={isDark}
                isEditing={isEditing}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                formData={formData}
                setFormData={setFormData}
                stations={stations}
                handleSubmit={handleSubmit}
                handleCloseModal={handleCloseModal}
                submitting={submitting}
                fetchingPerformance={fetchingPerformance}
                attendanceHistory={attendanceHistory}
                isStationAdmin={isStationAdmin}
            />

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsDeleteModalOpen(false)}
                    ></div>
                    <div className={`relative w-full max-w-sm ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-white'} border rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 p-8 text-center`}>
                        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={32} />
                        </div>
                        <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'} mb-2`}>Confirm Deletion</h3>
                        <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-8`}>
                            This action cannot be undone. Are you sure you want to remove this employee from the system?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="flex-1 py-3 bg-red-500 text-white rounded-2xl text-sm font-semibold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeDashboard;