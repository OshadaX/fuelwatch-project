import React from 'react';
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
    </div>
  );
}

export default App;
