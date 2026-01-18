import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './layout.css';

const MainLayout = ({ children }) => {
    return (
        <div className="main-layout">
            <Sidebar />
            <div className="main-content">
                <Navbar />
                <main>{children}</main>
            </div>
        </div>
    );
};

export default MainLayout;
