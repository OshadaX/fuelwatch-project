import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogIn, LogOut, UserCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({ isCollapsed, onToggle }) => {
    const navigate = useNavigate();
    const { user, login, logout } = useAuth();

    const menuItems = [
        {
            title: "Real Time Fuel Monitoring",
            member: "Senura",
            roles: ["admin"],
            features: [
                { name: "Fuelwatch Portal", path: "/portal" },
                { name: "Dispensed Error Detection", path: "/anomaly" },
                { name: "Fuel quantity-Predictions", path: "/fuel-forecast" },
                { name: "Sensor Testing", path: "/sensor-test" }
            ]
        },
        {
            title: "Recommendations",
            member: "Aluthge",
            roles: ["admin"],
            features: [
                { name: "Smart Recommendations", path: "/recommendation" },
                { name: "Station Map", path: "/station-map" }
            ]
        },
        {
            title: "Staff Management",
            member: "Oshada",
            roles: ["admin", "employee"],
            features: [
                { name: "Live Fuel Stock", path: "/live-fuel", roles: ["admin"] },
                { name: "Employee Dashboard", path: "/employee-dashboard", roles: ["admin"] },
                { name: "Admin Station QR", path: "/admin-qr", roles: ["admin"] },
                { name: "Employee Portal", path: "/employee-portal", roles: ["employee"] },
                { name: "Staff Prediction", path: "/staff-prediction", roles: ["admin"] }
            ]
        },
        {
            title: "Gas & Refill",
            member: "Vithanage",
            roles: ["admin"],
            features: [
                { name: "Gas Predictor", path: "/gas-predictor" },
                { name: "Auto-refill Suggest", path: "/auto-refill" }
            ]
        }
    ];

    const handleClick = (feature) => {
        navigate(feature.path);
    };

    // Filter items based on user role
    const filteredMenuItems = menuItems.filter(item => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        return item.roles?.includes(user.role);
    }).map(item => ({
        ...item,
        features: item.features.filter(feature => {
            if (user.role === 'admin') {
                // Admins see everything EXCEPT the employee portal if we want to be clean, 
                // but user said "admin log show all the things".
                return true;
            }
            return feature.roles?.includes(user.role);
        })
    })).filter(item => item.features.length > 0);

    return (
        <aside
            className={`fixed top-0 left-0 bottom-0 bg-[#1e293b] text-[#f1f5f9] py-6 px-2 flex flex-col transition-all duration-300 ease-in-out overflow-x-hidden z-[101] ${isCollapsed ? 'w-20' : 'w-[280px]'
                }`}
        >
            {/* HEADER */}
            <div className="mb-8 px-4 flex items-center justify-between min-h-[40px]">
                {!isCollapsed && (
                    <div className="flex items-center gap-2">
                        <UserCircle className="text-blue-400" size={24} />
                        <h1 className="text-lg font-bold tracking-wider uppercase">
                            {user ? user.role : 'Guest'}
                        </h1>
                    </div>
                )}
                <button
                    onClick={onToggle}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>

            {/* NAVIGATION */}
            <nav className="flex-1 flex flex-col gap-2 px-2 overflow-y-auto custom-scrollbar">
                {!user ? (
                    <div className="px-4 py-8 text-center text-slate-400 text-sm italic">
                        Please login to access features
                    </div>
                ) : (
                    filteredMenuItems.map((item, idx) => (
                        <div key={idx} className="mb-4">
                            {!isCollapsed && (
                                <div className="text-[0.75rem] uppercase text-[#64748b] mt-6 mb-2 ml-4 font-semibold whitespace-nowrap">
                                    {item.title} ({item.member})
                                </div>
                            )}

                            {item.features.map((feature, fIdx) => (
                                <div
                                    key={fIdx}
                                    className={`flex items-center py-3 px-4 rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap hover:bg-white/10 active:scale-95 ${isCollapsed ? 'justify-center' : ''
                                        }`}
                                    onClick={() => handleClick(feature)}
                                    title={isCollapsed ? feature.name : ''}
                                >
                                    {isCollapsed ? (
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    ) : (
                                        feature.name
                                    )}
                                </div>
                            ))}
                        </div>
                    ))
                )}
            </nav>

            {/* AUTH ACTIONS */}
            <div className="mt-auto px-2 pt-4 border-t border-slate-700/50">
                {!user ? (
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => login('admin')}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all text-sm font-semibold justify-center"
                        >
                            <LogIn size={18} /> {!isCollapsed && "Login as Admin"}
                        </button>
                        <button
                            onClick={() => login('employee')}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition-all text-sm font-semibold justify-center"
                        >
                            <UserCircle size={18} /> {!isCollapsed && "Login as Employee"}
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            logout();
                            navigate('/');
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-sm font-semibold justify-center border border-red-500/20"
                    >
                        <LogOut size={18} /> {!isCollapsed && "Logout"}
                    </button>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
