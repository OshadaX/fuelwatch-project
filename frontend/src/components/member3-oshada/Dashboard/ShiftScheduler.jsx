import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Users, Calendar, CheckCircle2, X, Plus, Loader2, UserCheck, ChevronRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8081/api';

const SHIFT_COLORS = {
    Morning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-400' },
    Night: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', dot: 'bg-purple-400' },
};

const ShiftScheduler = ({ predictions = [], stationId, isDark }) => {
    const [shifts, setShifts] = useState({});         // { 'YYYY-MM-DD': [shift, ...] }
    const [employees, setEmployees] = useState([]);   // Available employees for this station
    const [selectedDay, setSelectedDay] = useState(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedShiftType, setSelectedShiftType] = useState('Morning');
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);

    // Build a clean date list from predictions
    const days = predictions.map(p => ({
        date: p.date?.split('T')[0] || p.date,
        dayName: p.day_name || new Date(p.date).toLocaleDateString('en-US', { weekday: 'short' }),
        monthDay: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        needed: p.employees_needed,
        breakdown: p.breakdown || null,
        isHoliday: !!p.is_holiday,
        isWeekend: !!p.is_weekend,
    }));

    const fetchShifts = useCallback(async () => {
        if (!stationId) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/shifts/station/${encodeURIComponent(stationId)}`);
            // Group by date
            const grouped = {};
            (res.data || []).forEach(s => {
                if (!grouped[s.date]) grouped[s.date] = [];
                grouped[s.date].push(s);
            });
            setShifts(grouped);
        } catch (err) {
            console.error('Failed to fetch shifts:', err);
        }
    }, [stationId]);

    const fetchEmployees = useCallback(async () => {
        if (!stationId) return;
        try {
            const res = await axios.get(`${API_BASE_URL}/employees?stationId=${encodeURIComponent(stationId)}`);
            setEmployees(res.data || []);
        } catch (err) {
            console.error('Failed to fetch employees:', err);
        }
    }, [stationId]);

    useEffect(() => {
        fetchShifts();
        fetchEmployees();
    }, [fetchShifts, fetchEmployees]);

    const openPanel = (day) => {
        setSelectedDay(day);
        setSelectedEmployeeIds([]);
        setSelectedShiftType('Morning');
        setIsPanelOpen(true);
    };

    const closePanel = () => {
        setIsPanelOpen(false);
        setSelectedDay(null);
    };

    const toggleEmployee = (id) => {
        setSelectedEmployeeIds(prev =>
            prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
        );
    };

    // Get IDs of employees already assigned to selected day
    const alreadyAssignedIds = selectedDay
        ? (shifts[selectedDay.date] || []).map(s => s.employeeId?._id || s.employeeId)
        : [];

    const handleAssign = async () => {
        if (!selectedDay || selectedEmployeeIds.length === 0) {
            toast.error('Please select at least one employee.');
            return;
        }
        setSaving(true);
        try {
            const results = await Promise.allSettled(
                selectedEmployeeIds.map(empId =>
                    axios.post(`${API_BASE_URL}/shifts`, {
                        date: selectedDay.date,
                        stationId,
                        employeeId: empId,
                        shiftType: selectedShiftType,
                        recommendedHeadcount: selectedDay.needed,
                    })
                )
            );

            const succeeded = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected');

            if (succeeded > 0) {
                toast.success(`${succeeded} employee(s) assigned successfully.`);
            }

            if (failed.length > 0) {
                const firstError = failed[0].reason?.response?.data?.message || 'Some assignments failed';
                toast.error(failed.length === 1 ? firstError : `${failed.length} assignments failed. ${firstError}`);
            }

            await fetchShifts();
            if (succeeded > 0) closePanel();
        } catch (err) {
            toast.error('An unexpected error occurred.');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveShift = async (shiftId, e) => {
        e.stopPropagation();
        try {
            await axios.delete(`${API_BASE_URL}/shifts/${shiftId}`);
            await fetchShifts();
            toast.success('Assignment removed');
        } catch (err) {
            toast.error('Failed to remove shift');
        }
    };

    const handleStatusChange = async (shiftId, newStatus, e) => {
        e.stopPropagation();
        try {
            await axios.patch(`${API_BASE_URL}/shifts/${shiftId}`, { status: newStatus });
            await fetchShifts();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    if (!stationId) {
        return (
            <div className={`mt-12 p-10 rounded-[2rem] text-center border-2 border-dashed ${isDark ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                <Calendar size={36} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">Select a station to use the Shift Scheduler.</p>
            </div>
        );
    }

    if (predictions.length === 0) return null;

    return (
        <div className="mt-12">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Shift Scheduler
                    </h2>
                    <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Assign employees to AI-recommended shifts. Click a day to assign.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold">
                    {['Morning', 'Night'].map(type => (
                        <span key={type} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${SHIFT_COLORS[type].bg} ${SHIFT_COLORS[type].border} ${SHIFT_COLORS[type].text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${SHIFT_COLORS[type].dot}`}></span>
                            {type}
                        </span>
                    ))}
                </div>
            </div>

            {/* 7-Day Calendar Grid — 4 per row, large cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {days.map(day => {
                    const dayShifts = shifts[day.date] || [];
                    const assigned = dayShifts.length;
                    const needed = day.needed;
                    const coverage = needed > 0 ? Math.min(Math.round((assigned / needed) * 100), 100) : 0;
                    const isFullyCovered = assigned >= needed;

                    return (
                        <div
                            key={day.date}
                            onClick={() => openPanel(day)}
                            className={`relative rounded-[20px] border-2 p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg group
                                ${isDark
                                    ? `bg-slate-800 ${isFullyCovered ? 'border-emerald-500/40' : 'border-slate-700 hover:border-blue-500/50'}`
                                    : `bg-white ${isFullyCovered ? 'border-emerald-200' : 'border-slate-100 hover:border-blue-200'} shadow-sm`
                                }`}
                        >
                            {/* Date Header */}
                            <div className="mb-3">
                                <p className={`text-xs font-bold uppercase tracking-widest ${day.isWeekend ? 'text-blue-500' : isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                                    {day.dayName}
                                </p>
                                <p className={`text-base font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{day.monthDay}</p>
                                {day.isHoliday && (
                                    <span className="text-[9px] font-black text-red-500 uppercase tracking-wider">🎉 Holiday</span>
                                )}
                            </div>

                            {/* Headcount */}
                            <div className="mb-3">
                                <div className="flex items-center justify-between mb-1">
                                    <div />
                                    {isFullyCovered && <CheckCircle2 size={12} className="text-emerald-500" />}
                                </div>
                                <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
                                    <div
                                        className={`h-full rounded-full transition-all ${isFullyCovered ? 'bg-emerald-500' : coverage > 60 ? 'bg-amber-400' : 'bg-blue-500'}`}
                                        style={{ width: `${coverage}%` }}
                                    />
                                </div>
                            </div>

                            {/* Fuel Type Breakdown */}
                            {day.breakdown && Object.keys(day.breakdown).length > 0 && (
                                <div className={`mb-3 p-2 rounded-xl border ${isDark ? 'bg-slate-800/80 border-slate-700/50' : 'bg-slate-50/80 border-slate-100'}`}>
                                    <p className={`text-[9px] font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        Required per Fuel
                                    </p>
                                    <div className="space-y-1">
                                        {Object.entries(day.breakdown).map(([fuel, count], idx) => {
                                            // Assign colors based on fuel name dynamically
                                            const isPetrol = fuel.toLowerCase().includes('petrol') || fuel.toLowerCase().includes('92') || fuel.toLowerCase().includes('95');
                                            const dotColor = isPetrol ? 'bg-red-400' : 'bg-blue-400';
                                            return (
                                                <div key={idx} className="flex justify-between items-center">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} />
                                                        <span className={`text-[10px] font-medium truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`} title={fuel}>
                                                            {fuel}
                                                        </span>
                                                    </div>
                                                    <span className={`text-[10px] font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                                        {count}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Employee Avatars */}
                            <div className="flex flex-wrap gap-1 min-h-[24px]">
                                {dayShifts.slice(0, 6).map(s => (
                                    <div
                                        key={s._id}
                                        className="relative group/avatar"
                                        onClick={e => e.stopPropagation()}
                                        title={`${s.employeeId?.name} — ${s.shiftType}`}
                                    >
                                        <div
                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold border-2 border-white shadow-sm 
                                                ${s.status === 'confirmed' ? 'ring-1 ring-emerald-400' : ''}
                                                ${s.status === 'cancelled' ? 'opacity-40' : ''}`}
                                            style={{ backgroundColor: s.employeeId?.color || '#3b82f6' }}
                                        >
                                            {s.employeeId?.avatar || s.employeeId?.name?.charAt(0) || '?'}
                                        </div>
                                    </div>
                                ))}
                                {dayShifts.length > 6 && (
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-white ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                        +{dayShifts.length - 6}
                                    </div>
                                )}
                            </div>

                            {/* Add button */}
                            <div className={`absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity`}>
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                                    <Plus size={12} className="text-white" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Assignment Side Panel */}
            {isPanelOpen && selectedDay && (
                <div className="fixed inset-0 z-[500] flex">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closePanel} />
                    <div className={`relative ml-auto h-full w-full max-w-md shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 
                        ${isDark ? 'bg-slate-900 border-l border-slate-800' : 'bg-white border-l border-slate-100'}`}>

                        {/* Panel Header */}
                        <div className={`p-6 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                            <div className="flex items-center justify-between mb-1">
                                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    Assign Shifts
                                </h3>
                                <button onClick={closePanel} className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    <X size={18} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                </button>
                            </div>
                            <p className={`text-sm font-semibold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                {selectedDay.dayName} · {selectedDay.monthDay}
                            </p>
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                ML recommends <strong>{selectedDay.needed}</strong> employees · {(shifts[selectedDay.date] || []).length} currently assigned
                            </p>
                        </div>

                        {/* Shift Type Selector */}
                        <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                            <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Shift Type</p>
                            <div className="flex gap-2">
                                {['Morning', 'Night'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedShiftType(type)}
                                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all
                                            ${selectedShiftType === type
                                                ? `${SHIFT_COLORS[type].bg} ${SHIFT_COLORS[type].border} ${SHIFT_COLORS[type].text}`
                                                : isDark ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Already Assigned */}
                        {(shifts[selectedDay.date] || []).length > 0 && (
                            <div className={`p-4 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                                <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    Currently Assigned
                                </p>
                                <div className="space-y-2">
                                    {(shifts[selectedDay.date] || []).map(s => {
                                        const c = SHIFT_COLORS[s.shiftType] || SHIFT_COLORS.Morning;
                                        return (
                                            <div key={s._id} className={`flex items-center justify-between p-2.5 rounded-xl ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                                                        style={{ backgroundColor: s.employeeId?.color || '#3b82f6' }}
                                                    >
                                                        {s.employeeId?.avatar || s.employeeId?.name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                                            {s.employeeId?.name || 'Unknown'}
                                                        </p>
                                                        <span className={`text-[10px] font-semibold ${c.text}`}>{s.shiftType}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {s.status !== 'confirmed' && (
                                                        <button
                                                            onClick={e => handleStatusChange(s._id, 'confirmed', e)}
                                                            className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 transition-colors"
                                                            title="Confirm"
                                                        >
                                                            <CheckCircle2 size={14} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={e => handleRemoveShift(s._id, e)}
                                                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                                                        title="Remove"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Employee Checklist */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                Add Employees ({selectedEmployeeIds.length} selected)
                            </p>
                            {employees.length === 0 ? (
                                <div className={`p-8 text-center text-sm ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                    No employees at this station.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {employees
                                        .filter(e => !alreadyAssignedIds.includes(e._id))
                                        .map(emp => {
                                            const isSelected = selectedEmployeeIds.includes(emp._id);
                                            return (
                                                <button
                                                    key={emp._id}
                                                    onClick={() => toggleEmployee(emp._id)}
                                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                                                        ${isSelected
                                                            ? `border-blue-400 ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`
                                                            : `${isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-800/40' : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'}`
                                                        }`}
                                                >
                                                    <div
                                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                                        style={{ backgroundColor: emp.color || '#3b82f6' }}
                                                    >
                                                        {emp.avatar || emp.name?.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-slate-800'}`}>{emp.name}</p>
                                                        <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{emp.role} · {emp.shift} shift</p>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-blue-500 bg-blue-500' : isDark ? 'border-slate-600' : 'border-slate-300'}`}>
                                                        {isSelected && <CheckCircle2 size={12} className="text-white" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                </div>
                            )}
                        </div>

                        {/* Footer Action */}
                        <div className={`p-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                            <button
                                onClick={handleAssign}
                                disabled={saving || selectedEmployeeIds.length === 0}
                                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                            >
                                {saving ? <Loader2 size={18} className="animate-spin" /> : <UserCheck size={18} />}
                                {saving ? 'Assigning...' : `Assign ${selectedEmployeeIds.length > 0 ? selectedEmployeeIds.length : ''} Employee${selectedEmployeeIds.length !== 1 ? 's' : ''}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShiftScheduler;
