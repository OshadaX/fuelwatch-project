import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        // Try to get user from localStorage on init
        const savedUser = localStorage.getItem('fuelwatch_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const login = (role) => {
        const newUser = { role };
        setUser(newUser);
        localStorage.setItem('fuelwatch_user', JSON.stringify(newUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('fuelwatch_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
