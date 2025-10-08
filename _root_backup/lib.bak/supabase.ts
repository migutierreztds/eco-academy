import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const url = Constants.expoConfig?.extra?.supabaseUrl as string;
const anon = Constants.expoConfig?.extra?.supabaseAnonKey as string;

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});