import React from "react";
import { useNavigate } from "react-router-dom";
import "./layout.css"; // ✅ correct CSS import

const Sidebar = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: "Real Time Fuel Monitoring",
      member: "Senura",
      features: [
        { name: "Dispensed Error Detection", path: "/anomaly" },
        { name: "Fuel quantity-Predictions", path: "/fuel-prediction" },
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
    <aside className="sidebar">
      {/* HEADER */}
      <div className="sidebar-header">
        <h1 className="sidebar-title">MENU</h1>
      </div>

      {/* NAVIGATION */}
      <nav className="sidebar-nav">
        {menuItems.map((item, idx) => (
          <div key={idx} className="sidebar-section">
            <div className="sidebar-section-title">
              {item.title} ({item.member})
            </div>

            {item.features.map((feature, fIdx) => (
              <div
                key={fIdx}
                className="sidebar-item"
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
