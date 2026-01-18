import React from 'react';
import './layout.css';

const Sidebar = () => {
    const menuItems = [
        {
            title: "Fuel Monitoring",
            member: "Kumara",
            features: ["Anomaly Detection", "Demand Prediction"]
        },
        {
            title: "Recommendations",
            member: "Aluthge",
            features: ["Smart Recommendations", "Station Map"]
        },
        {
            title: "Staff Management",
            member: "Oshada",
            features: ["Live Fuel Stock", "Employee Dashboard", "Staff Prediction"]
        },
        {
            title: "Gas & Refill",
            member: "Vithanage",
            features: ["Gas Predictor", "Auto-refill Suggest"]
        }
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h1 style={{ fontSize: '1.25rem', fontWeight: '800' }}>MENU</h1>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '1.5rem' }}>
                        <div className="sidebar-section-title">{item.title} ({item.member})</div>
                        {item.features.map((feature, fIdx) => (
                            <div key={fIdx} className="sidebar-item">
                                <span style={{ marginLeft: '0.5rem' }}>{feature}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
