import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Check if we're using placeholder credentials
const isUsingPlaceholders = import.meta.env.VITE_SUPABASE_URL === 'https://placeholder.supabase.co' || 
                           import.meta.env.VITE_SUPABASE_ANON_KEY === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDk3MjYwMDAsImV4cCI6MTk2NTA5OTYwMH0.placeholder';

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
  logout: () => Promise<void>;
  loading: boolean;
  updateUser: (updates: Partial<User>) => Promise<void>;
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

// Mock user data for placeholder mode
const mockUser: User = {
  id: 'mock-user-id',
  email: 'demo@example.com',
  name: 'Demo User',
  plan: 'free',
  carouselsGenerated: 0,
  maxCarousels: 1
};
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isUsingPlaceholders) {
      // In placeholder mode, just set loading to false
      setLoading(false);
      return;
    }

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await fetchUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (profile) {
        setUser({
          id: profile.id,
          email: profile.email,
          name: profile.name,
          plan: profile.plan as 'free' | 'premium',
          carouselsGenerated: profile.carousels_generated,
          maxCarousels: profile.max_carousels
        });
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    if (isUsingPlaceholders) {
      // Mock login for placeholder mode
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      setUser({ ...mockUser, email });
      return true;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    if (isUsingPlaceholders) {
      // Mock Google login for placeholder mode
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUser({ ...mockUser, name: 'Google User' });
      return true;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard'
        }
      });

      if (error) {
        console.error('Google login error:', error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Google login error:', error);
      return false;
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    if (isUsingPlaceholders) {
      // Mock signup for placeholder mode
      await new Promise(resolve => setTimeout(resolve, 1000));
      setUser({ ...mockUser, email, name });
      return true;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          }
        }
      });

      if (error) {
        console.error('Signup error:', error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  };

  const logout = async () => {
    if (isUsingPlaceholders) {
      // Mock logout for placeholder mode
      setUser(null);
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error.message);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    if (isUsingPlaceholders) {
      // Mock update for placeholder mode
      setUser(prev => prev ? { ...prev, ...updates } : null);
      return;
    }
    try {
      // Convert camelCase to snake_case for database
      const dbUpdates: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.plan !== undefined) dbUpdates.plan = updates.plan;
      if (updates.carouselsGenerated !== undefined) dbUpdates.carousels_generated = updates.carouselsGenerated;
      if (updates.maxCarousels !== undefined) dbUpdates.max_carousels = updates.maxCarousels;

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        return;
      }

      // Update local state
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error in updateUser:', error);
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