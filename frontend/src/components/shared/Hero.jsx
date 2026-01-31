import React from 'react';

const Hero = ({ onExplore }) => {
    return (
        <section className="relative overflow-hidden bg-slate-50 py-12 px-6 lg:px-12 animate-fadeIn">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-slate-200 rounded-full blur-3xl opacity-30"></div>

            <div className="relative z-10 max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-6">
                            <span className="flex h-2 w-2 mr-2">
                                <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            Smart Energy Tracking
                        </div>

                        <h1 className="text-4xl lg:text-6xl font-black text-slate-900 leading-tight mb-6">
                            Fuel Management <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                Powered by Intelligence
                            </span>
                        </h1>

                        <p className="text-lg text-slate-600 mb-8 max-w-xl">
                            Real-time monitoring, predictive analytics, and seamless distribution control.
                            FuelWatch provides the precision you need to optimize your energy stock and demand.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={onExplore}
                                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all duration-300"
                            >
                                Get Started
                            </button>
                            <button className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all duration-300">
                                View demo
                            </button>
                        </div>

                        <div className="mt-12 flex items-center gap-8 grayscale opacity-60">
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-slate-800">99.8%</span>
                                <span className="text-xs uppercase tracking-widest text-slate-500">Uptime</span>
                            </div>
                            <div className="w-px h-8 bg-slate-300"></div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-slate-800">24h</span>
                                <span className="text-xs uppercase tracking-widest text-slate-500">Real-time</span>
                            </div>
                            <div className="w-px h-8 bg-slate-300"></div>
                            <div className="flex flex-col">
                                <span className="text-2xl font-bold text-slate-800">10k+</span>
                                <span className="text-xs uppercase tracking-widest text-slate-500">Sensors</span>
                            </div>
                        </div>
                    </div>

                    <div className="relative">
                        {/* Mock Dashboard Visual */}
                        <div className="bg-white p-4 rounded-3xl shadow-2xl border border-slate-100 rotate-3 transform hover:rotate-0 transition-transform duration-700">
                            <div className="bg-slate-900 rounded-2xl p-6 text-white overflow-hidden relative">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="text-xl font-bold">Network Overview</h3>
                                        <p className="text-slate-400 text-xs">System status: Optimal</p>
                                    </div>
                                    <div className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-[10px] font-bold">LIVE</div>
                                </div>

                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xs">0{i}</div>
                                                <div className="h-2 w-24 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500 w-2/3"></div>
                                                </div>
                                            </div>
                                            <span className="text-xs font-mono text-slate-400">88.4L/s</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 pt-8 border-t border-slate-800 flex justify-between">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-400">421</div>
                                        <div className="text-[10px] text-slate-500 uppercase">Stations</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-indigo-400">89%</div>
                                        <div className="text-[10px] text-slate-500 uppercase">Efficiency</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-emerald-400">0</div>
                                        <div className="text-[10px] text-slate-500 uppercase">Alerts</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Floating elements */}
                        <div className="absolute top-1/2 left-0 -ml-12 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 animate-bounce transition-all duration-1000">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">🔥</div>
                                <div>
                                    <div className="text-xs font-bold text-slate-800">Efficiency Insight</div>
                                    <div className="text-[10px] text-green-500">+12.5% this week</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
