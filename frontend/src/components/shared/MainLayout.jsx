import React from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const MainLayout = ({ children, onBrandClick }) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                onToggle={toggleSidebar}
            />
            <div className={`flex-1 transition-all duration-300 pt-16 ${isSidebarCollapsed ? 'ml-20' : 'ml-[280px]'}`}>
                <div
                    className={`fixed top-0 right-0 h-16 transition-all duration-300 ${isSidebarCollapsed ? 'left-20' : 'left-[280px]'}`}
                    style={{ zIndex: 100 }}
                >
                    <Navbar onBrandClick={onBrandClick} />
                </div>
                <main className="min-h-[calc(100vh-64px)] overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
