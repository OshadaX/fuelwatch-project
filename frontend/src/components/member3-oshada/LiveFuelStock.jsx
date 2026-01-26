import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Flame, Droplet, Zap } from 'lucide-react';

const LiveFuelStock = () => {
    const [fuelData, setFuelData] = useState([
        {
            id: 1,
            type: '92 Octane',
            level: 65,
            capacity: 10000,
            consumption: 245,
            color: '#3b82f6',
            bgColor: 'bg-blue-50',
            prevLevel: 65,
        },
        {
            id: 2,
            type: '95 Octane',
            level: 42,
            capacity: 8000,
            consumption: 180,
            color: '#8b5cf6',
            bgColor: 'bg-purple-50',
            prevLevel: 42,
        },
        {
            id: 3,
            type: 'Auto Diesel',
            level: 18,
            capacity: 15000,
            consumption: 420,
            color: '#f59e0b',
            bgColor: 'bg-amber-50',
            prevLevel: 18,
        },
        {
            id: 4,
            type: 'Super Diesel',
            level: 88,
            capacity: 12000,
            consumption: 310,
            color: '#10b981',
            bgColor: 'bg-emerald-50',
            prevLevel: 88,
        }
    ]);

    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setFuelData(prevData => prevData.map(fuel => {
                const baseChange = fuel.consumption / 1000;
                const randomFactor = (Math.random() - 0.5) * 0.2;
                const change = -baseChange + randomFactor;
                const newLevel = Math.max(0, Math.min(100, fuel.level + change));

                return {
                    ...fuel,
                    prevLevel: fuel.level,
                    level: parseFloat(newLevel.toFixed(2)),
                };
            }));

            setLastUpdated(new Date());
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (level) => {
        if (level < 15) return '#ef4444';
        if (level < 35) return '#f59e0b';
        if (level < 60) return '#3b82f6';
        return '#10b981';
    };

    const getConsumptionStatus = (consumption) => {
        if (consumption > 350) return { icon: <Flame className="w-3 h-3" />, label: 'High', color: 'text-red-500' };
        if (consumption > 250) return { icon: <Zap className="w-3 h-3" />, label: 'Medium', color: 'text-amber-500' };
        return { icon: <Droplet className="w-3 h-3" />, label: 'Normal', color: 'text-emerald-500' };
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'} p-6 md:p-12`}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-16">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className={`text-4xl md:text-5xl font-light tracking-tight ${isDark ? 'text-white' : 'text-slate-900'} mb-2`}>
                                Live Fuel Stock
                            </h1>
                            <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                Real-time fuel monitoring across stations
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className={`text-sm font-light ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{formatTime(lastUpdated)}</span>
                            </div>
                            <button
                                onClick={() => setIsDark(!isDark)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50'}`}
                            >
                                {isDark ? '☀️' : '🌙'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Fuel Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {fuelData.map(fuel => {
                        const currentLitres = Math.round((fuel.level / 100) * fuel.capacity);
                        const radius = 42;
                        const circumference = 2 * Math.PI * radius;
                        const progress = (fuel.level / 100) * circumference;
                        const trend = fuel.level > fuel.prevLevel ? 'up' : 'down';
                        const statusColor = getStatusColor(fuel.level);
                        const isLowFuel = fuel.level < 15;

                        return (
                            <div
                                key={fuel.id}
                                className={`${isDark ? 'bg-slate-800/50 border-slate-700' : `${fuel.bgColor} border-white/50`} rounded-3xl p-8 hover:scale-[1.02] transition-all duration-300 border ${isLowFuel ? (isDark ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-slate-900' : 'ring-2 ring-red-500 ring-offset-2') : ''
                                    }`}
                                style={isLowFuel ? {
                                    animation: 'pulseRed 2s ease-in-out infinite'
                                } : {}}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className={`text-base font-medium ${isDark ? 'text-white' : 'text-slate-900'}`}>{fuel.type}</h3>
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: statusColor }}
                                    ></div>
                                </div>

                                {/* Circular Progress */}
                                <div className="relative w-44 h-44 mx-auto mb-8 group">
                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                        {/* Background */}
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r={radius}
                                            fill="none"
                                            stroke={isDark ? '#1e293b' : '#ffffff'}
                                            strokeWidth="5"
                                            strokeLinecap="round"
                                        />
                                        {/* Progress */}
                                        <circle
                                            cx="50"
                                            cy="50"
                                            r={radius}
                                            fill="none"
                                            stroke={fuel.color}
                                            strokeWidth="5"
                                            strokeLinecap="round"
                                            strokeDasharray={`${progress} ${circumference}`}
                                            className="transition-all duration-1000 ease-out group-hover:brightness-110"
                                            style={isDark ? { filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' } : {}}
                                        />
                                    </svg>

                                    {/* Center Content */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <div className={`text-4xl font-medium ${isDark ? 'text-white' : 'text-slate-900'} mb-1`}>
                                            {fuel.level}%
                                        </div>
                                        <div className={`text-xs font-light ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {currentLitres.toLocaleString()} L
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Stats */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5" style={{ color: fuel.color }}>
                                        {trend === 'up' ?
                                            <TrendingUp className="w-4 h-4" /> :
                                            <TrendingDown className="w-4 h-4" />
                                        }
                                        <span className="text-sm font-light">{fuel.consumption}/hr</span>
                                    </div>
                                    <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                                        {isLowFuel && `Empty in ${((currentLitres / fuel.consumption) * 60).toFixed(0)}m`}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Consumption Overview */}
                <div className={`mt-12 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white/60 border-white/50'} backdrop-blur-sm rounded-3xl p-8 border`}>
                    <h2 className={`text-xl font-light ${isDark ? 'text-white' : 'text-slate-900'} mb-8`}>Consumption</h2>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {fuelData.map(fuel => {
                            const status = getConsumptionStatus(fuel.consumption);
                            return (
                                <div key={fuel.id} className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{fuel.type.split(' ')[0]}</span>
                                            <span className={`${status.color} flex items-center gap-1`}>
                                                {status.icon}
                                            </span>
                                        </div>
                                        <span className={`text-sm font-light ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                            {fuel.consumption * 24}L
                                            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'} ml-1`}>/ day</span>
                                        </span>
                                    </div>
                                    <div className={`h-2 ${isDark ? 'bg-slate-700' : 'bg-white'} rounded-full overflow-hidden`}>
                                        <div
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{
                                                width: `${fuel.level}%`,
                                                backgroundColor: fuel.color,
                                                boxShadow: isDark ? `0 0 8px ${fuel.color}` : 'none'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <style jsx>{`
                    @keyframes pulseRed {
                        0%, 100% { 
                            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
                        }
                        50% { 
                            box-shadow: 0 0 20px 4px rgba(239, 68, 68, 0.6);
                        }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default LiveFuelStock;