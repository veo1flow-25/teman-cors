// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AuthContextType, User } from '../types';
import { api } from '../services/api';

// Declare netlifyIdentity for TypeScript
declare global {
  interface Window {
    netlifyIdentity: any;
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapNetlifyUser = (netlifyUser: any): User => {
    return {
      id: netlifyUser.id,
      email: netlifyUser.email,
      name: netlifyUser.user_metadata?.full_name || netlifyUser.email.split('@')[0],
      role: (netlifyUser.app_metadata?.roles && netlifyUser.app_metadata.roles[0]) || 'user',
      status: 'active'
    };
  };

  useEffect(() => {
    // 1. Initialize Netlify Identity
    if (window.netlifyIdentity) {
      window.netlifyIdentity.on('init', (netlifyUser: any) => {
        if (netlifyUser) {
          const appUser = mapNetlifyUser(netlifyUser);
          setUser(appUser);
          localStorage.setItem('fintrack_user', JSON.stringify(appUser));
        }
        setLoading(false);
      });

      window.netlifyIdentity.on('login', (netlifyUser: any) => {
        const appUser = mapNetlifyUser(netlifyUser);
        setUser(appUser);
        localStorage.setItem('fintrack_user', JSON.stringify(appUser));
        window.netlifyIdentity.close(); // Close modal on success
      });

      window.netlifyIdentity.on('logout', () => {
        setUser(null);
        localStorage.removeItem('fintrack_user');
      });

      window.netlifyIdentity.init();
    } else {
      // Fallback if Netlify is not available (e.g. localhost without script)
      const storedUser = localStorage.getItem('fintrack_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    }
  }, []);

  const login = async (username: string, pass: string) => {
    // Manual login fallback or specific trigger
    setLoading(true);
    setError(null);
    try {
      const response = await api.login(username, pass);
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

  const register = async (username: string, pass: string, name: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.register(username, pass, name);
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

  const logout = async () => {
    if (window.netlifyIdentity) {
      window.netlifyIdentity.logout();
    } else {
      setUser(null);
      localStorage.removeItem('fintrack_user');
    }
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