import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // AsyncStorage isn't available on web; Supabase will fall back to the web browser's
    // own localStorage automatically
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // We exchange the PKCE code for a session ourselves in AuthContext, so
    // auto-detection must stay off everywhere - otherwise the popup window
    // used on web (which loads this same app bundle) races our own
    // exchangeCodeForSession call for the single-use code verifier.
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

// Notes:
// AsyncStorage - React Native's persistent key-value storage API for React Native apps. 
// mobile equivalent of the web's localStorage, allowing you to save data directly
// onto the user's device so it persits even after the app is closed or the device
// reboots 
// Platform - A built-in module used to detect the operating system running the 
// application, allowing you to executre platform-specific logic and styling
