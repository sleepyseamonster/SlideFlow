import React, { useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { normalizePlan, PLAN_MAX_CAROUSELS, type PlanKey } from '../lib/plans';
import { AuthContext, type AuthContextType, type User } from './auth-context';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await setUserFromSupabase(session.user);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (session?.user) {
          await setUserFromSupabase(session.user);
        } else {
          setUser(null);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const setUserFromSupabase = async (supabaseUser: SupabaseUser) => {
    // Fetch profile data from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .maybeSingle();

    const { data: connectedAccounts } = await supabase
      .from('connected_account')
      .select('id, ig_user_id, ig_username, page_id, page_name, is_primary')
      .eq('user_id', supabaseUser.id)
      .eq('platform', 'instagram')
      .is('revoked_at', null);

    const primaryAccount =
      connectedAccounts?.find((account) => account.is_primary) ||
      connectedAccounts?.[0] ||
      null;

    const planKey = normalizePlan(profile?.plan);
    const creditsBalance = profile?.credits_balance ?? profile?.credits ?? null;
    const creditBuckets =
      profile?.subscription_balance ||
      profile?.purchased_balance ||
      profile?.bonus_balance
        ? {
            subscription: profile?.subscription_balance,
            purchased: profile?.purchased_balance,
            bonus: profile?.bonus_balance,
          }
        : undefined;

    const emailLower = (supabaseUser.email || '').toLowerCase();
    const kirkEmail = 'kirkartman00@gmail.com';
    // Temporary override to mirror requested account state until billing/credits are fully wired.
    const effectivePlan: PlanKey = emailLower === kirkEmail ? 'creator' : planKey;
    const effectiveCredits =
      emailLower === kirkEmail ? Math.max(creditsBalance ?? 0, 300) : creditsBalance ?? undefined;

    // Create user with Supabase data and profile data
    const appUser: User = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name:
        profile?.name ||
        supabaseUser.user_metadata?.name ||
        supabaseUser.user_metadata?.full_name ||
        supabaseUser.email?.split('@')[0] ||
        'User',
      plan: effectivePlan,
      carouselsGenerated: profile?.carousels_generated || 0,
      maxCarousels: profile?.max_carousels || PLAN_MAX_CAROUSELS[effectivePlan] || 1,
      creditsBalance: effectiveCredits,
      creditsBuckets: creditBuckets,
      creditsRenewalAt: profile?.credits_renewal_at ?? null,
      instagramConnected: !!connectedAccounts?.length,
      instagramBusinessAccountId: primaryAccount?.ig_user_id,
      instagramUsername: primaryAccount?.ig_username ?? undefined,
      connectedAccountId: primaryAccount?.id,
      facebookPageId: primaryAccount?.page_id,
      facebookPageName: primaryAccount?.page_name ?? undefined,
    };
    setUser(appUser);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error.message);
        return false;
      }

      return !!data.user;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const loginWithFacebook = async (): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          scopes: 'public_profile,email,instagram_basic,instagram_content_publish,pages_read_engagement,pages_show_list'
        }
      });

      if (error) {
        console.error('Facebook login error:', error.message);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Facebook login error:', error);
      return false;
    }
  };

  const connectInstagram = async (): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Instagram connection session error:', sessionError.message);
      }
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        return { ok: false, error: 'You need to be logged in to connect Meta.' };
      }

      const { data, error } = await supabase.functions.invoke('meta-oauth-start', {
        body: { redirectBase: window.location.origin },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error || !data?.authUrl) {
        const message = error?.message || 'Failed to start Meta connection.';
        return { ok: false, error: message };
      }
      window.location.href = data.authUrl as string;
      return { ok: true };
    } catch (error) {
      console.error('Instagram connection error:', error);
      const message = error instanceof Error ? error.message : 'Failed to start Meta connection.';
      return { ok: false, error: message };
    }
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (error) {
        console.error('Signup error:', error.message);
        return false;
      }

      return !!data.user;
    } catch (error) {
      console.error('Signup error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Logout error:', error.message);
      }
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
    }
  };

  const refreshUser = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session?.user) {
      await setUserFromSupabase(sessionData.session.user);
    }
  };

  const value: AuthContextType = {
    user,
    login,
    loginWithFacebook,
    connectInstagram,
    signup,
    logout,
    loading,
    updateUser,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
