import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Check if we're using placeholder values
const isUsingPlaceholders = supabaseUrl === 'https://placeholder.supabase.co' || 
                           supabaseAnonKey === 'placeholder-key' ||
                           supabaseUrl === 'your-supabase-url-here' ||
                           supabaseAnonKey === 'your-supabase-anon-key-here';

if (isUsingPlaceholders) {
  console.warn('Supabase is not configured. Using mock client. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          plan: 'free' | 'premium';
          carousels_generated: number;
          max_carousels: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          plan?: 'free' | 'premium';
          carousels_generated?: number;
          max_carousels?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          plan?: 'free' | 'premium';
          carousels_generated?: number;
          max_carousels?: number;
          updated_at?: string;
        };
      };
    };
  };
};