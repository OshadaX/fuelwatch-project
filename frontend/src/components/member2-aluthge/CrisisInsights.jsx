import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart2, ShieldCheck, Users, AlertTriangle,
    TrendingDown, Info, ChevronRight, Zap,
    MessageSquare, CheckCircle2, ClipboardList
} from 'lucide-react';
import { surveyStats } from '../../data/surveyData';

const CrisisInsights = () => {
    const [surveySubmitted, setSurveySubmitted] = useState(false);

    const fadeIn = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5 }
    };

    const handleSurveySubmit = (e) => {
        e.preventDefault();
        setSurveySubmitted(true);
        setTimeout(() => setSurveySubmitted(false), 5000);
    };

    return (
        <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header Section */}
                <motion.div
                    className="mb-12 text-center"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <span className="px-4 py-1.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-widest border border-indigo-200">
                        Academic Research Dashboard
                    </span>
                    <h1 className="text-4xl font-black text-slate-800 mt-4 mb-4">
                        2022 Fuel Crisis: <span className="text-indigo-600">QR System Impact</span>
                    </h1>
                    <p className="text-slate-500 max-w-2xl mx-auto text-lg leading-relaxed">
                        Analyzing 56 user experiences from the Sri Lankan National Fuel Pass
                        to build more resilient distribution systems for the future.
                    </p>
                </motion.div>

                {/* --- SECTION 1: HISTORICAL DATA --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <motion.div {...fadeIn} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4"><TrendingDown size={24} /></div>
                        <h3 className="text-3xl font-black text-slate-800">69.7%</h3>
                        <p className="text-slate-500 font-semibold text-sm uppercase mt-1">Queue Reduction</p>
                    </motion.div>

                    <motion.div {...fadeIn} transition={{ delay: 0.1 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4"><ShieldCheck size={24} /></div>
                        <h3 className="text-3xl font-black text-slate-800">51.8%</h3>
                        <p className="text-slate-500 font-semibold text-sm uppercase mt-1">Hoarding Prevented</p>
                    </motion.div>

                    <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4"><Users size={24} /></div>
                        <h3 className="text-3xl font-black text-slate-800">56</h3>
                        <p className="text-slate-500 font-semibold text-sm uppercase mt-1">Research Participants</p>
                    </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Queue reduction Chart View */}
                    <motion.div {...fadeIn} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-8">
                            <BarChart2 className="text-indigo-600" />
                            <h2 className="text-xl font-bold text-slate-800">Queue Management Impact</h2>
                        </div>
                        <div className="space-y-6">
                            {surveyStats.impactOnQueues.map((item, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm font-bold mb-2">
                                        <span className="text-slate-600">{item.label}</span>
                                        <span className="text-slate-800">{Math.round((item.count / 56) * 100)}%</span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(item.count / 56) * 100}%` }}
                                            transition={{ duration: 1, delay: idx * 0.1 }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: item.color }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Hoarding Prevention Highlight */}
                    <motion.div {...fadeIn} className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-8">
                            <AlertTriangle className="text-rose-500" />
                            <h2 className="text-xl font-bold text-slate-800">Hoarding Mitigation</h2>
                        </div>
                        <p className="text-slate-600 leading-relaxed mb-6">
                            By linking a single QR to a National ID, the system created a robust barrier against
                            fuel hoarding. Our research confirms this was the most effective deterrent.
                        </p>
                        <div className="space-y-3">
                            {surveyStats.hoardingPrevention.map((item, i) => (
                                <div key={i} className="flex justify-between items-center p-3 rounded-2xl bg-slate-50 border border-slate-100">
                                    <span className="text-sm font-bold text-slate-700">{item.label}</span>
                                    <span className={`px-3 py-1 rounded-lg text-xs font-black ${item.status === 'Yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                                        {item.count} Votes
                                    </span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* --- SECTION 2: PROACTIVE RESEARCH (Point 5) --- */}
                <motion.div
                    {...fadeIn}
                    className="mt-12 p-10 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[3rem] text-white shadow-xl shadow-indigo-200 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none rotate-12">
                        <ClipboardList size={240} />
                    </div>

                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
                        <div className="lg:col-span-2">
                            <h2 className="text-3xl font-black mb-4">System Resiliency Survey (2026)</h2>
                            <p className="text-indigo-100 text-lg leading-relaxed mb-8">
                                Help us compare the 2022 crisis data with today's efficiency.
                                Your feedback informs our "Crisis Mode" recommendations.
                            </p>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">1</div>
                                    <span className="text-sm">Real-time availability accuracy</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">2</div>
                                    <span className="text-sm">Station navigation efficiency</span>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-3">
                            <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-8 border border-white/20">
                                <AnimatePresence mode="wait">
                                    {!surveySubmitted ? (
                                        <motion.form
                                            key="survey-form"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            onSubmit={handleSurveySubmit}
                                            className="space-y-6"
                                        >
                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-widest mb-3 opacity-80">
                                                    How long was the queue today?
                                                </label>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    {['No queue', '< 15 mins', '15-30 mins', '30+ mins'].map(q => (
                                                        <button key={q} type="button" className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[11px] font-bold border border-white/10 transition-all">
                                                            {q}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black uppercase tracking-widest mb-3 opacity-80">
                                                    Is availability data correct?
                                                </label>
                                                <div className="flex gap-4">
                                                    <button type="button" className="flex-1 py-3 bg-emerald-500/80 hover:bg-emerald-500 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
                                                        <CheckCircle2 size={16} /> Yes
                                                    </button>
                                                    <button type="button" className="flex-1 py-3 bg-rose-500/80 hover:bg-rose-500 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all">
                                                        <AlertTriangle size={16} /> No
                                                    </button>
                                                </div>
                                            </div>

                                            <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black shadow-lg shadow-black/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                                <MessageSquare size={18} />
                                                Submit 2026 Feedback
                                            </button>
                                        </motion.form>
                                    ) : (
                                        <motion.div
                                            key="success"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="py-12 text-center"
                                        >
                                            <div className="w-16 h-16 bg-emerald-400 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle2 size={32} />
                                            </div>
                                            <h3 className="text-2xl font-black mb-2">Thank you!</h3>
                                            <p className="text-white/80">Your insight helps us fight future fuel fraud.</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default CrisisInsights;
