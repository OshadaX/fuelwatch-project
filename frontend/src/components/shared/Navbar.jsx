import React from 'react';
import './layout.css';

const Navbar = () => {
    return (
        <nav className="navbar">
            <div className="navbar-brand">FUELWATCH</div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Admin Dashboard</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                    ON
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
