import React, { useState, useEffect } from 'react';
import { Search, Users, Clock, Coffee, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

const EmployeeDashboard = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isDark, setIsDark] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        employeeId: '',
        name: '',
        role: '',
        status: 'active',
        shift: 'Morning',
        joinDate: new Date().toISOString().split('T')[0],
        color: '#3b82f6',
        avatar: ''
    });

    useEffect(() => {
        fetchEmployees();
    }, []);

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

    const handleOpenModal = (employee = null) => {
        if (employee) {
            setIsEditing(true);
            setFormData(employee);
        } else {
            setIsEditing(false);
            setFormData({
                employeeId: `FW${String(employees.length + 1).padStart(3, '0')}`,
                name: '',
                role: 'Pump Operator',
                status: 'active',
                shift: 'Morning',
                joinDate: new Date().toISOString().split('T')[0],
                color: '#3b82f6',
                avatar: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFormData({
            employeeId: '',
            name: '',
            role: '',
            status: 'active',
            shift: 'Morning',
            joinDate: new Date().toISOString().split('T')[0],
            color: '#3b82f6',
            avatar: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this employee?')) {
            try {
                await axios.delete(`${API_URL}/employees/${id}`);
                toast.success('Employee deleted successfully');
                fetchEmployees();
            } catch (error) {
                console.error('Error deleting employee:', error);
                toast.error('Failed to delete employee');
            }
        }
    };

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = [
        {
            label: 'Total',
            value: employees.length,
            icon: <Users className="w-5 h-5" />,
            color: '#3b82f6',
            bgColor: isDark ? 'bg-blue-500/10' : 'bg-blue-50'
        },
        {
            label: 'Active',
            value: employees.filter(e => e.status === 'active').length,
            icon: <div className="w-2 h-2 rounded-full bg-emerald-500"></div>,
            color: '#10b981',
            bgColor: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
        },
        {
            label: 'On Break',
            value: employees.filter(e => e.status === 'on-break').length,
            icon: <Coffee className="w-5 h-5" />,
            color: '#f59e0b',
            bgColor: isDark ? 'bg-amber-500/10' : 'bg-amber-50'
        },
        {
            label: 'Off Duty',
            value: employees.filter(e => e.status === 'offline').length,
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
                <div className="mb-16">
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
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                            <input
                                type="text"
                                placeholder="Search employees..."
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
                                                    onClick={() => handleDelete(emp._id)}
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
                                No employees found
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                        onClick={handleCloseModal}
                    ></div>
                    <div className={`relative w-full max-w-lg ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-white'} border rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300`}>
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    {isEditing ? 'Edit Employee' : 'Add New Employee'}
                                </h2>
                                <button
                                    onClick={handleCloseModal}
                                    className={`p-2 rounded-xl transition-all ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
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
                                        <label className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Role</label>
                                        <select
                                            className={`w-full px-4 py-3 rounded-2xl text-sm ${isDark ? 'bg-slate-900/60 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'} border outline-none transition-all`}
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                        >
                                            <option value="Pump Operator">Pump Operator</option>
                                            <option value="Station Manager">Station Manager</option>
                                            <option value="Inventory Specialist">Inventory Specialist</option>
                                            <option value="Security Guard">Security Guard</option>
                                            <option value="Accountant">Accountant</option>
                                            <option value="Customer Service">Customer Service</option>
                                            <option value="Maintenance Tech">Maintenance Tech</option>
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
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeDashboard;