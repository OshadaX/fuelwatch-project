import React from 'react';

const Navbar = ({ onBrandClick }) => {
    return (
        <nav className="h-full w-full bg-white border-b border-slate-200 flex items-center px-8 shadow-sm">
            <div
                className="text-2xl font-bold text-blue-600 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={onBrandClick}
            >
                FUELWATCH
            </div>
            <div className="ml-auto flex items-center gap-4">
                <span className="text-sm text-slate-500">Admin Dashboard</span>
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                    ON
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
