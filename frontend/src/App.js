import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import MainLayout from './components/shared/MainLayout';
import LiveFuelStock from './components/member3-oshada/LiveFuelStock';
import EmployeeDashboard from './components/member3-oshada/EmployeeDashboard';
import Portal from './components/member1-kumara/Portal';
import Anomaly from './components/member1-kumara/Anomaly';
import FuelForecastPanel from './components/member1-kumara/FuelForecastPanel';
import SensorTest from './components/member1-kumara/SensorTest';
import Hero from './components/shared/Hero';
import AdminQRView from './components/member3-oshada/AdminQRView';
import EmployeePortal from './components/member3-oshada/EmployeePortal';

import { useAuth } from './context/AuthContext';
import { useEffect } from 'react';

function App() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'employee' && (window.location.pathname === '/' || window.location.pathname === '/live-fuel')) {
      navigate('/employee-portal');
    }
  }, [user, navigate]);

  return (
    <div className="App">
      <MainLayout onBrandClick={() => navigate('/')}>
        <Routes>
          <Route path="/" element={<Hero onExplore={() => navigate(user?.role === 'employee' ? '/employee-portal' : '/live-fuel')} />} />
          <Route path="/portal" element={<Portal />} />
          <Route path="/anomaly" element={<Anomaly />} />
          <Route path="/fuel-forecast" element={<FuelForecastPanel />} />
          <Route path="/sensor-test" element={<SensorTest />} />
          <Route path="/live-fuel" element={<LiveFuelStock />} />
          <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
          <Route path="/admin-qr" element={<AdminQRView />} />
          <Route path="/employee-portal" element={<EmployeePortal />} />
          {/* Fallback */}
          <Route path="*" element={<Hero onExplore={() => navigate(user?.role === 'employee' ? '/employee-portal' : '/live-fuel')} />} />
        </Routes>
      </MainLayout>
    </div>
  );
}

export default App;
