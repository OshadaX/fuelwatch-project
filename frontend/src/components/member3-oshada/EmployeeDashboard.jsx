import React, { useState } from 'react';
import { Search, Users, Clock, Coffee } from 'lucide-react';

const EmployeeDashboard = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isDark, setIsDark] = useState(false);

    const employees = [
        { id: 'FW001', name: 'John Doe', role: 'Pump Operator', status: 'active', shift: 'Morning', joinDate: '2023-05-15', avatar: 'JD', color: '#3b82f6' },
        { id: 'FW002', name: 'Jane Smith', role: 'Station Manager', status: 'active', shift: 'Full-time', joinDate: '2022-11-20', avatar: 'JS', color: '#8b5cf6' },
        { id: 'FW003', name: 'Mike Ross', role: 'Inventory Specialist', status: 'on-break', shift: 'Morning', joinDate: '2024-01-10', avatar: 'MR', color: '#f59e0b' },
        { id: 'FW004', name: 'Sarah Connor', role: 'Pump Operator', status: 'active', shift: 'Evening', joinDate: '2023-08-05', avatar: 'SC', color: '#10b981' },
        { id: 'FW005', name: 'David Miller', role: 'Security Guard', status: 'offline', shift: 'Night', joinDate: '2023-03-22', avatar: 'DM', color: '#6366f1' },
        { id: 'FW006', name: 'Emily Wilson', role: 'Accountant', status: 'active', shift: 'Regular', joinDate: '2023-06-30', avatar: 'EW', color: '#ec4899' },
        { id: 'FW007', name: 'Robert Brown', role: 'Pump Operator', status: 'on-break', shift: 'Evening', joinDate: '2024-02-14', avatar: 'RB', color: '#14b8a6' },
        { id: 'FW008', name: 'Lisa Ann', role: 'Customer Service', status: 'active', shift: 'Morning', joinDate: '2023-10-12', avatar: 'LA', color: '#f97316' },
        { id: 'FW009', name: 'Tom Hardy', role: 'Maintenance Tech', status: 'offline', shift: 'Night', joinDate: '2023-12-01', avatar: 'TH', color: '#84cc16' },
        { id: 'FW010', name: 'Anna Lee', role: 'Pump Operator', status: 'active', shift: 'Evening', joinDate: '2024-03-01', avatar: 'AL', color: '#06b6d4' },
    ];

    const filteredEmployees = employees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = [
        {
            label: 'Total',
            value: employees.length,
            icon: <Users className="w-5 h-5" />,
            color: isDark ? '#3b82f6' : '#3b82f6',
            bgColor: isDark ? 'bg-blue-500/10' : 'bg-blue-50'
        },
        {
            label: 'Active',
            value: employees.filter(e => e.status === 'active').length,
            icon: <div className="w-2 h-2 rounded-full bg-emerald-500"></div>,
            color: isDark ? '#10b981' : '#10b981',
            bgColor: isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
        },
        {
            label: 'On Break',
            value: employees.filter(e => e.status === 'on-break').length,
            icon: <Coffee className="w-5 h-5" />,
            color: isDark ? '#f59e0b' : '#f59e0b',
            bgColor: isDark ? 'bg-amber-500/10' : 'bg-amber-50'
        },
        {
            label: 'Off Duty',
            value: employees.filter(e => e.status === 'offline').length,
            icon: <Clock className="w-5 h-5" />,
            color: isDark ? '#64748b' : '#64748b',
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
        <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'} p-6 md:p-12`}>
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
                        <button
                            onClick={() => setIsDark(!isDark)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                        >
                            {isDark ? '☀️' : '🌙'}
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            className={`${isDark ? 'bg-slate-800/50 border-slate-700' : `${stat.bgColor} border-white/50`} rounded-3xl p-6 border hover:scale-[1.02] transition-all duration-300`}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div style={{ color: stat.color }}>
                                    {stat.icon}
                                </div>
                            </div>
                            <div className={`text-3xl font-light ${isDark ? 'text-white' : 'text-slate-900'} mb-1`}>
                                {stat.value}
                            </div>
                            <div className={`text-xs font-light uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Employee List */}
                <div className={`${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/60 border-white/50'} backdrop-blur-sm rounded-3xl border overflow-hidden`}>
                    {/* Search Bar */}
                    <div className="p-6 border-b border-slate-200/10">
                        <div className="relative">
                            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`} />
                            <input
                                type="text"
                                placeholder="Search employees..."
                                className={`w-full pl-12 pr-4 py-3 rounded-2xl text-sm outline-none transition-all ${isDark
                                        ? 'bg-slate-900/60 border border-slate-700 text-white focus:border-blue-500'
                                        : 'bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500'
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
                                <tr className={isDark ? 'bg-slate-900/30' : 'bg-slate-50/50'}>
                                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Employee
                                    </th>
                                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Role
                                    </th>
                                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Status
                                    </th>
                                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Shift
                                    </th>
                                    <th className={`px-6 py-4 text-left text-xs font-medium uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                        Joined
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.map((emp) => (
                                    <tr
                                        key={emp.id}
                                        className={`transition-colors ${isDark ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50'}`}
                                    >
                                        <td className={`px-6 py-5 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                                                    style={{
                                                        backgroundColor: emp.color,
                                                        boxShadow: isDark ? `0 0 12px ${emp.color}40` : 'none'
                                                    }}
                                                >
                                                    {emp.avatar}
                                                </div>
                                                <div>
                                                    <div className={`font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                                        {emp.name}
                                                    </div>
                                                    <div className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {emp.id}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={`px-6 py-5 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
                                            <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                {emp.role}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-5 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'}`}>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: getStatusDot(emp.status) }}
                                                ></div>
                                                <span className={`text-sm capitalize ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                                    {emp.status.replace('-', ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={`px-6 py-5 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'} text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                                            {emp.shift}
                                        </td>
                                        <td className={`px-6 py-5 border-b ${isDark ? 'border-slate-700/50' : 'border-slate-100'} text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {emp.joinDate}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredEmployees.length === 0 && (
                            <div className={`p-20 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                No employees found
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;