import React from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import MainLayout from './components/shared/MainLayout';
import LiveFuelStock from './components/member3-oshada/Station/LiveFuelStock';
import EmployeeDashboard from './components/member3-oshada/Employee/EmployeeDashboard';
import Portal from './components/member1-kumara/Portal';
import ReportsGenerator from './components/member1-kumara/ReportsGenerator';
import Anomaly from './components/member1-kumara/Anomaly';
import FuelForecastPanel from './components/member1-kumara/FuelForecastPanel';
import SensorTest from './components/member1-kumara/SensorTest';
import Hero from './components/shared/Hero';
import AdminQRView from './components/member3-oshada/Admin/AdminQRView';
import EmployeePortal from './components/member3-oshada/Employee/EmployeePortal';
import LoginPage from './components/member3-oshada/Auth/LoginPage';
import StaffPrediction from './components/member3-oshada/Dashboard/StaffPrediction';
import ShiftSchedulerPage from './components/member3-oshada/Dashboard/ShiftSchedulerPage';
import StationsView from './components/member3-oshada/Station/StationsView';
import SuperAdminDashboard from './components/member3-oshada/Admin/SuperAdminDashboard';

import CustomerGuestPage from './components/member2-aluthge/CustomerGuestPage';
import EVFinder from './components/member2-aluthge/EVFinder';
import FuelFinder from './components/member2-aluthge/FuelFinder';
import SmartRecommendationAdmin from './components/member2-aluthge/admin/SmartRecommendationAdmin';
import StationMap from './components/member2-aluthge/admin/StationMap';
import NavigationMap from './components/member2-aluthge/NavigationMap';
import EVStationPortal from './components/member2-aluthge/admin/EVStationPortal';
import FuelStationPortal from './components/member2-aluthge/admin/FuelStationPortal';
import CrisisInsights from './components/member2-aluthge/CrisisInsights';

import { useAuth } from './context/AuthContext';
import { useEffect } from 'react';

function App() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === 'super_admin' && (window.location.pathname === '/' || window.location.pathname === '/live-fuel')) {
      navigate('/super-admin-dashboard');
    }
    if (user?.role === 'employee' && (window.location.pathname === '/' || window.location.pathname === '/live-fuel')) {
      navigate('/employee-portal');
    }
  }, [user, navigate]);

  const handleExplore = () => {
    if (!user) {
      navigate('/login');
    } else if (user.role === 'super_admin') {
      navigate('/super-admin-dashboard');
    } else if (user.role === 'employee') {
      navigate('/employee-portal');
    } else {
      navigate('/live-fuel');
    }
  };

  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/super-admin-dashboard" element={<SuperAdminDashboard />} />
        <Route path="*" element={
          <MainLayout onBrandClick={() => navigate('/')}>
            <Routes>
              <Route path="/" element={<Hero onExplore={handleExplore} />} />
              <Route path="/portal" element={<Portal />} />
              <Route path="/regen" element={<ReportsGenerator />} />
              <Route path="/anomaly" element={<Anomaly />} />
              <Route path="/fuel-forecast" element={<FuelForecastPanel />} />
              <Route path="/sensor-test" element={<SensorTest />} />
              <Route path="/live-fuel" element={<LiveFuelStock />} />
              <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
              <Route path="/admin-qr" element={<AdminQRView />} />
              <Route path="/employee-portal" element={<EmployeePortal />} />
              <Route path="/customer" element={<CustomerGuestPage />} />
              <Route path="/ev-station" element={<EVFinder />} />
              <Route path="/fuel-station" element={<FuelFinder />} />
              <Route path="/navigate" element={<NavigationMap />} />
              <Route path="/staff-prediction" element={<StaffPrediction />} />
              <Route path="/recommendation" element={<SmartRecommendationAdmin />} />
              <Route path="/ev-portal" element={<EVStationPortal />} />
              <Route path="/fuel-portal" element={<FuelStationPortal />} />
              <Route path="/station-map" element={<StationMap />} />
              <Route path="/crisis-insights" element={<CrisisInsights />} />
              <Route path="/shift-scheduler" element={<ShiftSchedulerPage />} />
              <Route path="/stations" element={<StationsView />} />
              {/* Fallback */}
              <Route path="*" element={<Hero onExplore={handleExplore} />} />
            </Routes>
          </MainLayout>
        } />
      </Routes>
    </div>
  );
}

export default App;
