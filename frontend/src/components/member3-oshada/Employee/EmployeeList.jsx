import React from 'react';
import { Search, Loader2, Pencil, Trash2 } from 'lucide-react';

const EmployeeList = ({
    isDark,
    loading,
    searchTerm,
    setSearchTerm,
    filteredEmployees,
    stations,
    stationId,
    handleOpenModal,
    handleDeleteClick,
    getStatusDot
}) => {
    return (
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
    );
};

export default EmployeeList;
