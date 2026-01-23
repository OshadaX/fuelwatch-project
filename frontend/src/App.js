// src/App.js
import React from "react";
import { Routes, Route } from "react-router-dom";

import Sidebar from "./components/shared/Sidebar";
import MainLayout from "./components/shared/MainLayout";
import "./index.css";

// Existing pages
import Anomaly from "./components/member1-kumara/Anomaly";
import SensorTest from "./components/member1-kumara/SensorTest";

// ✅ New Forecast page/component
import FuelForecastPanel from "./components/member1-kumara/FuelForecastPanel";

function App() {
  return (
    <div className="App">
      <MainLayout>
        <div style={{ display: "flex" }}>
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <main style={{ flex: 1, padding: "1rem" }}>
            <Routes>
              {/* Default page */}
              <Route
                path="/"
                element={
                  <div style={{ padding: "20px" }}>
                    <h2>Welcome to FuelWatch Dashboard</h2>
                    <p>Please select a module from the sidebar to get started.</p>
                  </div>
                }
              />

              {/* Existing routes */}
              <Route path="/anomaly" element={<Anomaly />} />
              <Route path="/sensor-test" element={<SensorTest />} />

              {/* ✅ New Forecast route */}
              <Route path="/fuel-forecast" element={<FuelForecastPanel />} />

              {/* Optional: 404 page */}
              <Route
                path="*"
                element={
                  <div style={{ padding: "20px" }}>
                    <h2>404 - Page Not Found</h2>
                    <p>The page you are looking for does not exist.</p>
                  </div>
                }
              />
            </Routes>
          </main>
        </div>
      </MainLayout>
    </div>
  );
}

export default App;
