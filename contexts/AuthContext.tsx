
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AuthContextType, User } from '../types';
import { api } from '../services/api';
import { supabase, isConfigured } from '../services/supabaseClient';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Initial Load from LocalStorage (for fast UI render)
    const storedUser = localStorage.getItem('fintrack_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }

    if (isConfigured) {
        // 2. Supabase Auth Listener (Real-time)
        // Cast auth to any to support onAuthStateChange if types are mismatched (v2 method)
        const { data: authListener } = (supabase.auth as any).onAuthStateChange(async (event: string, session: any) => {
            if (session?.user) {
                try {
                    // Fetch profile details
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (profile) {
                        const appUser: User = {
                            id: session.user.id,
                            email: session.user.email || '',
                            name: profile.name || 'User',
                            role: profile.role || 'viewer',
                            status: profile.status || 'active'
                        };

                        if (profile.status === 'inactive') {
                            await (supabase.auth as any).signOut();
                            setUser(null);
                            localStorage.removeItem('fintrack_user');
                            return;
                        }

                        // Update state if different
                        if (!user || JSON.stringify(user) !== JSON.stringify(appUser)) {
                            setUser(appUser);
                            localStorage.setItem('fintrack_user', JSON.stringify(appUser));
                        }
                    }
                } catch (e) {
                    console.error("Auth sync error:", e);
                }
            } else {
                if (event === 'SIGNED_OUT') {
                    setUser(null);
                    localStorage.removeItem('fintrack_user');
                }
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }
  }, []);

  const login = async (username: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.login(username, pass);
      
      if (response.status === 'success' && response.user) {
        const newUser = response.user;
        setUser(newUser);
        localStorage.setItem('fintrack_user', JSON.stringify(newUser));
      } else {
        const msg = response.message || response.error || 'Log masuk gagal.';
        setError(msg);
        throw new Error(msg);
      }
    } catch (err: any) {
      console.error("Login Context Error:", err);
      const msg = err.message || 'Ralat rangkaian.';
      setError(msg);
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
        const newUser = response.user;
        setUser(newUser);
        localStorage.setItem('fintrack_user', JSON.stringify(newUser));
      } else {
        const msg = response.message || response.error || 'Pendaftaran gagal.';
        setError(msg);
        throw new Error(msg);
      }
    } catch (err: any) {
      console.error("Register Context Error:", err);
      const msg = err.message || 'Ralat rangkaian.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (user?.email) {
        api.logActivity(user.email, 'LOGOUT', 'User logged out');
    }
    setUser(null);
    localStorage.removeItem('fintrack_user');
    if (isConfigured) {
        await (supabase.auth as any).signOut();
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
