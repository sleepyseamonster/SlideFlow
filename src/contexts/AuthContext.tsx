import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, AuthError } from '@supabase/supabase-js';

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
  login: (email: string, password: string) => Promise<AuthError | null>;
  loginWithGoogle: () => Promise<AuthError | null>;
  loginWithFacebook: () => Promise<AuthError | null>;
  signup: (email: string, password: string, name: string) => Promise<AuthError | null>;
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
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
      } else {
        // Create profile if it doesn't exist
        await createUserProfile(supabaseUser);
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const createUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
          plan: 'free',
          carousels_generated: 0,
          max_carousels: 1
        });

      if (error) {
        console.error('Error creating profile:', error);
        return;
      }

      // Fetch the newly created profile
      await fetchUserProfile(supabaseUser);
    } catch (error) {
      console.error('Error in createUserProfile:', error);
    }
  };

  const login = async (email: string, password: string): Promise<AuthError | null> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return error;
      }

      return null;
    } catch (error) {
      console.error('Login error:', error);
      return new Error('Unexpected login error') as AuthError;
    }
  };

  const loginWithGoogle = async (): Promise<AuthError | null> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        return error;
      }

      return null;
    } catch (error) {
      console.error('Google login error:', error);
      return new Error('Unexpected Google login error') as AuthError;
    }
  };

  const loginWithFacebook = async (): Promise<AuthError | null> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          scopes: 'public_profile'
        }
      });

      if (error) {
        return error;
      }

      return null;
    } catch (error) {
      console.error('Facebook login error:', error);
      return new Error('Unexpected Facebook login error') as AuthError;
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<AuthError | null> => {
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
        return error;
      }

      return null;
    } catch (error) {
      console.error('Signup error:', error);
      return new Error('Unexpected signup error') as AuthError;
    }
  };

  const logout = async () => {
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
    loginWithFacebook,
    signup,
    logout,
    loading,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}