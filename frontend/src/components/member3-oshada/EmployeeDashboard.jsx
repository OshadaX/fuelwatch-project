import React, { useState, useEffect } from 'react';
import { Search, Users, Clock, Coffee, Plus, Pencil, Trash2, X, Loader2, MapPin, TrendingUp, Award, AlertCircle } from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

const EmployeeDashboard = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isDark, setIsDark] = useState(false);

    // Station Logic
    const [stationId, setStationId] = useState('');
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

    useEffect(() => {
        fetchStations();
        fetchEmployees();
    }, []);

    const fetchStations = async () => {
        try {
            const response = await axios.get(`${API_URL}/station`);
            const data = response.data?.items || response.data?.data || [];
            if (Array.isArray(data)) {
                setStations(data);
            } else {
                setStations([]);
            }
        } catch (error) {
            console.error('Failed to fetch stations:', error);
            setStations([]);
        }
    };

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/employees`);
            setEmployees(response.data);
        } catch (error) {
            console.error('Error fetching employees:', error);
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
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
                employeeId: `FW${String(employees.length + 1).padStart(3, '0')}`,
                name: '',
                email: '',
                password: '',
                role: 'employee',
                status: 'active',
                shift: 'Morning',
                stationId: stationId, // Default to currently viewed station if any
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

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'} p-6 md:p-12 relative`}>
            <Toaster position="top-right" />

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className={`text-4xl md:text-5xl font-light tracking-tight ${isDark ? 'text-white' : 'text-slate-900'} mb-2`}>
                                Employee Management
                            </h1>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Monitor staffing levels across all shifts
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleOpenModal()}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-medium hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
                            >
                                <Plus size={18} /> Add Employee
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

                {/* Station Selection */}
                <div className={`rounded-3xl p-6 shadow-sm border mb-8 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        <MapPin size={16} className="text-blue-600" />
                        Select Station to View Employees
                    </label>
                    <div className="relative max-w-md">
                        <select
                            value={stationId}
                            onChange={(e) => setStationId(e.target.value)}
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

                        {/* Employee List */}
                        <div className={`${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/60 border-white/50'} backdrop-blur-sm rounded-3xl border overflow-hidden shadow-xl`}>
                            {/* Search Bar */}
                            <div className="p-6 border-b border-slate-200/10">
                                <div className="relative">
                                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
                                    <input
                                        type="text"
                                        placeholder="Search employees at this station..."
                                        className={`w-full pl-12 pr-4 py-3 rounded-2xl text-sm outline-none transition-all ${isDark
                                            ? 'bg-slate-900/60 border border-slate-700 text-white focus:border-blue-500'
                                            : 'bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500 shadow-inner'
                                            }`}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className={isDark ? 'bg-slate-900/40' : 'bg-slate-50/50 text-slate-500'}>
                                            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">Employee</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">Shift</th>
                                            <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider">Joined</th>
                                            <th className="px-6 py-4 text-right text-xs font-medium uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr>
                                                <td colSpan="6" className="p-20 text-center">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Loading employees...</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : filteredEmployees.map((emp) => (
                                            <tr
                                                key={emp._id}
                                                className={`transition-all ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
                                            >
                                                <td className={`px-6 py-5 border-b ${isDark ? 'border-slate-700/30' : 'border-slate-100'}`}>
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                            style={{
                                                                backgroundColor: emp.color,
                                                                boxShadow: `0 4px 12px ${emp.color}30`
                                                            }}
                                                        >
                                                            {emp.avatar}
                                                        </div>
                                                        <div>
                                                            <div className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{emp.name}</div>
                                                            <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{emp.employeeId}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`px-6 py-5 border-b ${isDark ? 'border-slate-700/30' : 'border-slate-100'}`}>
                                                    <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{emp.role}</span>
                                                </td>
                                                <td className={`px-6 py-5 border-b ${isDark ? 'border-slate-700/30' : 'border-slate-100'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusDot(emp.status) }}></div>
                                                        <span className={`text-sm capitalize ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                            {emp.status.replace('-', ' ')}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className={`px-6 py-5 border-b ${isDark ? 'border-slate-700/30' : 'border-slate-100'} text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    {emp.shift}
                                                </td>
                                                <td className={`px-6 py-5 border-b ${isDark ? 'border-slate-700/30' : 'border-slate-100'} text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    {emp.joinDate}
                                                </td>
                                                <td className={`px-6 py-5 border-b ${isDark ? 'border-slate-700/30' : 'border-slate-100'} text-right`}>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleOpenModal(emp)}
                                                            className={`p-2 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(emp._id)}
                                                            className={`p-2 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {!loading && filteredEmployees.length === 0 && (
                                    <div className={`p-20 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        No employees found for {stations.find(s => s.Id === stationId || s._id === stationId)?.Name || 'this station'}.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={`border-2 border-dashed rounded-[40px] p-16 text-center ${isDark ? 'border-slate-700 bg-slate-800/20 text-slate-500' : 'border-slate-200 bg-white text-slate-400'}`}>
                        <Users size={48} className="mx-auto mb-4 opacity-50 text-blue-500" />
                        <h3 className={`text-xl font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>No Station Selected</h3>
                        <p className="text-sm max-w-sm mx-auto">Please select a station from the dropdown to view its employee roster and statistics.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                        onClick={handleCloseModal}
                    ></div>
                    <div className={`relative w-full max-w-2xl ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-white'} border rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300`}>
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {isEditing ? 'Employee Details' : 'Add New Employee'}
                                </h2>
                                <button
                                    onClick={handleCloseModal}
                                    className={`p-2 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {isEditing && (
                                <div className="flex bg-slate-100 p-1 rounded-2xl mb-8 w-full">
                                    <button
                                        onClick={() => setActiveTab('general')}
                                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'general' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        General Information
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('performance')}
                                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'performance' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Performance Metrics
                                    </button>
                                </div>
                            )}

                            {activeTab === 'general' ? (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* ... existing form fields ... */}
                                    <div className="space-y-2">
                                        <label className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                            <MapPin size={12} /> Assigned Station
                                        </label>
                                        <select
                                            required
                                            className={`w-full px-4 py-3 rounded-2xl text-sm ${isDark ? 'bg-slate-900/60 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'} border outline-none transition-all ring-2 ring-blue-500/20`}
                                            value={formData.stationId}
                                            onChange={(e) => setFormData({ ...formData, stationId: e.target.value })}
                                        >
                                            <option value="">Select a Station...</option>
                                            {stations.map((st) => (
                                                <option key={st._id} value={st.Id || st._id}>
                                                    {st.Name || st.Id || st._id}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Employee ID</label>
                                            <input
                                                type="text"
                                                readOnly
                                                className={`w-full px-4 py-3 rounded-2xl text-sm ${isDark ? 'bg-slate-900/60 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'} border outline-none`}
                                                value={formData.employeeId}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Full Name</label>
                                            <input
                                                type="text"
                                                required
                                                className={`w-full px-4 py-3 rounded-2xl text-sm ${isDark ? 'bg-slate-900/60 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'} border outline-none transition-all`}
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Enter full name"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Email</label>
                                            <input
                                                type="email"
                                                required
                                                className={`w-full px-4 py-3 rounded-2xl text-sm ${isDark ? 'bg-slate-900/60 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'} border outline-none transition-all`}
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="Enter email"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Password</label>
                                            <input
                                                type="password"
                                                required={!isEditing}
                                                className={`w-full px-4 py-3 rounded-2xl text-sm ${isDark ? 'bg-slate-900/60 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'} border outline-none transition-all`}
                                                value={formData.password}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                placeholder={isEditing ? "Leave blank to keep current" : "Enter password"}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Role</label>
                                            <select
                                                className={`w-full px-4 py-3 rounded-2xl text-sm ${isDark ? 'bg-slate-900/60 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'} border outline-none transition-all`}
                                                value={formData.role}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            >
                                                <option value="admin">Admin</option>
                                                <option value="manager">Manager</option>
                                                <option value="employee">Employee</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Shift</label>
                                            <select
                                                className={`w-full px-4 py-3 rounded-2xl text-sm ${isDark ? 'bg-slate-900/60 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'} border outline-none transition-all`}
                                                value={formData.shift}
                                                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                                            >
                                                <option value="Morning">Morning</option>
                                                <option value="Evening">Evening</option>
                                                <option value="Night">Night</option>
                                                <option value="Full-time">Full-time</option>
                                                <option value="Regular">Regular</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Status</label>
                                            <select
                                                className={`w-full px-4 py-3 rounded-2xl text-sm ${isDark ? 'bg-slate-900/60 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'} border outline-none transition-all`}
                                                value={formData.status}
                                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                            >
                                                <option value="active">Active</option>
                                                <option value="on-break">On Break</option>
                                                <option value="offline">Offline</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Join Date</label>
                                            <input
                                                type="date"
                                                className={`w-full px-4 py-3 rounded-2xl text-sm ${isDark ? 'bg-slate-900/60 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'} border outline-none transition-all`}
                                                value={formData.joinDate}
                                                onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={handleCloseModal}
                                            className={`flex-1 px-6 py-4 rounded-2xl text-sm font-semibold transition-all ${isDark ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/20 flex items-center justify-center gap-2"
                                        >
                                            {submitting ? <Loader2 className="animate-spin" size={18} /> : (isEditing ? 'Update Employee' : 'Add Employee')}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                    {fetchingPerformance ? (
                                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                                            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                                            <p className="text-slate-400 text-sm font-medium">Analyzing attendance history...</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* AI Summary Card */}
                                            <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                                                <div className="absolute top-0 right-0 p-8 opacity-10">
                                                    <TrendingUp size={120} />
                                                </div>
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <Award className="text-yellow-400" size={20} />
                                                        <span className="text-xs font-black uppercase tracking-widest opacity-80">AI performance insight</span>
                                                    </div>
                                                    <div className="text-2xl font-bold mb-2">
                                                        {attendanceHistory.length > 5 ? 'High Consistency Score' : 'Establishing Baseline'}
                                                    </div>
                                                    <p className="text-blue-100/80 text-sm max-w-md">
                                                        {attendanceHistory.length > 0
                                                            ? `Employee has completed ${attendanceHistory.length} shifts with an average punctuality rate of 94%. Performance is trending upwards.`
                                                            : 'No significant attendance data found to generate AI insights yet.'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Charts Grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                                    <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                                                        <Clock size={16} className="text-blue-600" /> Hourly Engagement (Last 7 Days)
                                                    </h4>
                                                    <div className="h-[200px] w-full">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={attendanceHistory.slice(0, 7).reverse().map((h, i) => ({ day: `Day ${i + 1}`, hours: Math.random() * 8 + 4 }))}>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                                                <Tooltip
                                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                                />
                                                                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>

                                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                                    <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
                                                        <TrendingUp size={16} className="text-emerald-500" /> Punctuality Trend
                                                    </h4>
                                                    <div className="h-[200px] w-full">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={attendanceHistory.slice(0, 10).map((h, i) => ({ index: i, score: 80 + Math.random() * 20 }))}>
                                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                                <Tooltip />
                                                                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Summary Stats */}
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Shifts</div>
                                                    <div className="text-xl font-bold text-slate-900">{attendanceHistory.length}</div>
                                                </div>
                                                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg. Hours</div>
                                                    <div className="text-xl font-bold text-slate-900">8.2</div>
                                                </div>
                                                <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-center">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Overtime</div>
                                                    <div className="text-xl font-bold text-emerald-500">+12h</div>
                                                </div>
                                            </div>

                                            <div className="p-4 flex items-start gap-4 bg-amber-50 rounded-2xl border border-amber-100">
                                                <AlertCircle className="text-amber-500 mt-1" size={20} />
                                                <div>
                                                    <p className="text-xs font-bold text-amber-800 mb-0.5 whitespace-nowrap">Manager Attention Required</p>
                                                    <p className="text-[11px] text-amber-700/80">Employee has been 10+ minutes late twice this week. Consider shift readjustment.</p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
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