import React from 'react';
import { X, MapPin, Loader2 } from 'lucide-react';
import EmployeePerformanceTab from './EmployeePerformanceTab';

const EmployeeFormModal = ({
    isModalOpen,
    isDark,
    isEditing,
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    stations,
    handleSubmit,
    handleCloseModal,
    submitting,
    fetchingPerformance,
    attendanceHistory,
    isStationAdmin
}) => {
    if (!isModalOpen) return null;

    return (
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
                            {!isStationAdmin && (
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
                            )}

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
                                        {!isStationAdmin && <option value="admin">Admin</option>}
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
                        <EmployeePerformanceTab
                            fetchingPerformance={fetchingPerformance}
                            attendanceHistory={attendanceHistory}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmployeeFormModal;
