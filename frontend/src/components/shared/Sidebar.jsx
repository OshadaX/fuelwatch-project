import React from "react";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
    const navigate = useNavigate();

    const menuItems = [
        {
            title: "Real Time Fuel Monitoring",
            member: "Senura",
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
            features: [
                { name: "Smart Recommendations", path: "/recommendation" },
                { name: "Station Map", path: "/station-map" }
            ]
        },
        {
            title: "Staff Management",
            member: "Oshada",
            features: [
                { name: "Live Fuel Stock", path: "/live-fuel" },
                { name: "Employee Dashboard", path: "/employee-dashboard" },
                { name: "Staff Prediction", path: "/staff-prediction" }
            ]
        },
        {
            title: "Gas & Refill",
            member: "Vithanage",
            features: [
                { name: "Gas Predictor", path: "/gas-predictor" },
                { name: "Auto-refill Suggest", path: "/auto-refill" }
            ]
        }
    ];

    return (
        <aside className="fixed top-0 left-0 bottom-0 w-[280px] bg-[#1e293b] text-[#f1f5f9] py-6 px-2 flex flex-col transition-all duration-300 ease-in-out overflow-x-hidden z-[101]">
            {/* HEADER */}
            <div className="mb-8 px-4 flex items-center justify-between min-h-[40px]">
                <h1 className="text-lg font-bold tracking-wider">MENU</h1>
            </div>

            {/* NAVIGATION */}
            <nav className="flex flex-col gap-2 px-2">
                {menuItems.map((item, idx) => (
                    <div key={idx} className="mb-4">
                        <div className="text-[0.75rem] uppercase text-[#64748b] mt-6 mb-2 ml-4 font-semibold whitespace-nowrap">
                            {item.title} ({item.member})
                        </div>

                        {item.features.map((feature, fIdx) => (
                            <div
                                key={fIdx}
                                className="flex items-center py-3 px-4 rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap hover:bg-white/10 active:scale-95"
                                onClick={() => navigate(feature.path)}
                            >
                                {feature.name}
                            </div>
                        ))}
                    </div>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
