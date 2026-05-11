import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Supabase yapılandırılmamışsa demo moda düş
export const isDemoMode = !supabaseUrl || supabaseUrl === '' || supabaseUrl.includes('PROJE_ID');

// Singleton — HMR'da tekrar oluşturmayı önle
const GLOBAL_KEY = '__dietsync_supabase__';

function getOrCreateClient() {
  if (!isDemoMode) {
    if (window[GLOBAL_KEY]) return window[GLOBAL_KEY];
    window[GLOBAL_KEY] = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // NavigatorLock çakışmasını önle (Vite HMR + multiple tabs)
        lock: async (_name, _acquireTimeout, fn) => fn(),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return window[GLOBAL_KEY];
  }
  return null;
}

export const supabase = getOrCreateClient();


