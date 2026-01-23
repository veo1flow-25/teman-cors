// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AuthContextType, User } from '../types';
import { api } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('fintrack_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.login(email, pass);
      if (response.status === 'success' && response.user) {
        setUser(response.user);
        localStorage.setItem('fintrack_user', JSON.stringify(response.user));
      } else {
        throw new Error(response.message || 'Log masuk gagal.');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.register(email, pass, name);
      if (response.status === 'success' && response.user) {
        setUser(response.user);
        localStorage.setItem('fintrack_user', JSON.stringify(response.user));
      } else {
        throw new Error(response.message || 'Pendaftaran gagal.');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('fintrack_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, error, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};