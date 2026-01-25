import React from 'react';

const Sidebar = ({ isCollapsed, onToggle, onViewChange }) => {
    const menuItems = [
        {
            title: "Fuel Monitoring",
            member: "Kumara",
            features: ["Anomaly Detection", "Demand Prediction"],
            icon: "⛽"
        },
        {
            title: "Recommendations",
            member: "Aluthge",
            features: ["Smart Recommendations", "Station Map"],
            icon: "💡"
        },
        {
            title: "Staff Management",
            member: "Oshada",
            features: ["Live Fuel Stock", "Employee Dashboard", "Staff Prediction"],
            icon: "👥"
        },
        {
            title: "Gas & Refill",
            member: "Vithanage",
            features: ["Gas Predictor", "Auto-refill Suggest"],
            icon: "🔥"
        }
    ];

    return (
        <aside className={`fixed top-0 left-0 bottom-0 bg-[#1e293b] text-[#f1f5f9] flex flex-col transition-all duration-300 z-[101] overflow-x-hidden ${isCollapsed ? 'w-20' : 'w-[280px]'}`}>
            <div className="flex items-center justify-between px-4 h-16 min-h-[64px] mb-8 mt-6">
                {!isCollapsed && <h1 className="text-xl font-extrabold m-0">MENU</h1>}
                <button
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
                    onClick={onToggle}
                >
                    {isCollapsed ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                    ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    )}
                </button>
            </div>

            <nav className="flex flex-col gap-2 px-2">
                {menuItems.map((item, idx) => (
                    <div key={idx} className={isCollapsed ? 'mb-2' : 'mb-6'}>
                        <div className={`text-[0.75rem] uppercase font-semibold mx-4 mb-2 whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 text-[#64748b]'}`}>
                            {isCollapsed ? item.icon : `${item.title} (${item.member})`}
                        </div>
                        {item.features.map((feature, fIdx) => (
                            <div
                                key={fIdx}
                                className={`flex items-center py-3 px-4 rounded-lg cursor-pointer transition-all duration-200 whitespace-nowrap hover:bg-white/10 ${isCollapsed ? 'justify-center px-2' : ''}`}
                                title={isCollapsed ? feature : ''}
                                onClick={() => onViewChange && onViewChange(feature)}
                            >
                                <span className="text-[1.2rem]">{item.icon}</span>
                                <span className={`ml-2 transition-opacity duration-200 ${isCollapsed ? 'hidden' : 'block'}`}>
                                    {feature}
                                </span>
                            </div>
                        ))}
                    </div>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
