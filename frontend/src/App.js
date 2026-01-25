import React, { useState } from 'react';
import MainLayout from './components/shared/MainLayout';
import LiveFuelStock from './components/member3-oshada/LiveFuelStock';
import EmployeeDashboard from './components/member3-oshada/EmployeeDashboard';
import Hero from './components/shared/Hero';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderContent = () => {
    switch (currentView) {
      case 'Live Fuel Stock':
        return <LiveFuelStock />;
      case 'Employee Dashboard':
        return <EmployeeDashboard />;
      default:
        return <Hero onExplore={() => setCurrentView('Live Fuel Stock')} />;
    }
  };

  const handleBrandClick = () => {
    setCurrentView('dashboard');
  };

  return (
    <div className="App">
      <MainLayout onViewChange={setCurrentView} onBrandClick={handleBrandClick}>
        {renderContent()}
      </MainLayout>
    </div>
  );
}

export default App;
