// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const url =
  (Constants.expoConfig?.extra as any)?.supabaseUrl ??
  process.env.EXPO_PUBLIC_SUPABASE_URL;

const anon =
  (Constants.expoConfig?.extra as any)?.supabaseAnonKey ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  // Helpful error so you know exactly what's missing
  throw new Error(
    `Supabase env missing. Got url=${String(url)} anon=${anon ? '***' : 'undefined'}.
Ensure .env has EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY,
and app.config.ts maps them into extra.`
  );
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});