import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/shared/Sidebar';
import Anomaly from './components/member1-kumara/Anomaly';

import MainLayout from './components/shared/MainLayout';

function App() {
  return (
    
    <div className="App">
      <MainLayout>
        <div style={{ padding: '20px' }}>
          <h2>Welcome to FuelWatch Dashboard</h2>
          <p>Please select a module from the sidebar to get started.</p>
        </div>
      </MainLayout>
      <Router>
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '1rem' }}>
          <Routes>
            <Route path="/anomaly" element={<Anomaly />} />
            {/* Add other routes here */}
          </Routes>
        </main>
      </div>
    </Router>
    </div>
  );
}

export default App;
