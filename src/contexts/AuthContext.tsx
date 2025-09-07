import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'premium';
  carouselsGenerated: number;
  maxCarousels: number;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('slideflow_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Mock authentication
    if (email && password) {
      const mockUser: User = {
        id: '1',
        email,
        name: email.split('@')[0],
        plan: 'free',
        carouselsGenerated: 0,
        maxCarousels: 1
      };
      setUser(mockUser);
      localStorage.setItem('slideflow_user', JSON.stringify(mockUser));
      return true;
    }
    return false;
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    // Mock Google OAuth
    const mockUser: User = {
      id: '1',
      email: 'user@gmail.com',
      name: 'Google User',
      plan: 'free',
      carouselsGenerated: 0,
      maxCarousels: 1
    };
    setUser(mockUser);
    localStorage.setItem('slideflow_user', JSON.stringify(mockUser));
    return true;
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    // Mock signup
    if (email && password && name) {
      const mockUser: User = {
        id: '1',
        email,
        name,
        plan: 'free',
        carouselsGenerated: 0,
        maxCarousels: 1
      };
      setUser(mockUser);
      localStorage.setItem('slideflow_user', JSON.stringify(mockUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('slideflow_user');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('slideflow_user', JSON.stringify(updatedUser));
    }
  };

  const value = {
    user,
    login,
    loginWithGoogle,
    signup,
    logout,
    loading,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}