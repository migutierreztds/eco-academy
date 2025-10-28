// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Prefer app.config.ts -> extra, then fall back to .env
const url =
  (Constants.expoConfig?.extra as any)?.supabaseUrl ??
  process.env.EXPO_PUBLIC_SUPABASE_URL;
const anon =
  (Constants.expoConfig?.extra as any)?.supabaseAnonKey ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    `Supabase env missing. Got url=${String(url)} anon=${
      anon ? '***' : 'undefined'
    }.
Ensure .env has EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY,
and app.config.ts maps them into extra.`
  );
}

export const supabase = createClient(url, anon, {
  auth: {
    storage: AsyncStorage,                // ✅ required for native
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: Platform.OS === 'web', // ✅ only true on web
  },
});