import { createContext } from 'react';
import type { PlanKey } from '../lib/plans';

export interface User {
  id: string;
  email: string;
  name: string;
  plan: PlanKey;
  carouselsGenerated: number;
  maxCarousels: number;
  creditsBalance?: number;
  creditsBuckets?: {
    subscription?: number;
    purchased?: number;
    bonus?: number;
  };
  creditsRenewalAt?: string | null;
  instagramConnected: boolean;
  instagramBusinessAccountId?: string;
  instagramUsername?: string;
  connectedAccountId?: string;
  facebookPageId?: string;
  facebookPageName?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  loginWithFacebook: () => Promise<boolean>;
  connectInstagram: () => Promise<{ ok: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
