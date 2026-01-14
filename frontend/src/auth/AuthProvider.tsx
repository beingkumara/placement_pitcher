import React, { createContext, useContext, useState, useEffect } from 'react';

// Types
export interface User {
    id: number;
    name: string;
    role: 'core' | 'coordinator';
    token: string;
}

interface AuthContextType {
    user: User | null;
    login: (token: string, role: string, name: string, id: number) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        // Check local storage on mount
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role') as 'core' | 'coordinator';
        const name = localStorage.getItem('name');
        const id = localStorage.getItem('id');

        if (token && role && name && id) {
            setUser({ token, role, name, id: parseInt(id) });
        }
    }, []);

    const login = (token: string, role: string, name: string, id: number) => {
        localStorage.setItem('token', token);
        localStorage.setItem('role', role);
        localStorage.setItem('name', name);
        localStorage.setItem('id', id.toString());
        setUser({ token, role: role as 'core' | 'coordinator', name, id });
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('name');
        localStorage.removeItem('id');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
