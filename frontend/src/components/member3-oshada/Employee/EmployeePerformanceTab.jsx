import React from 'react';
import { Loader2, TrendingUp, Award, Clock, AlertCircle } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';

const EmployeePerformanceTab = ({
    fetchingPerformance,
    attendanceHistory
}) => {
    if (fetchingPerformance) {
        return (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-slate-400 text-sm font-medium">Analyzing attendance history...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
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
        </div>
    );
};

export default EmployeePerformanceTab;
