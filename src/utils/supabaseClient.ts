/**
 * Supabase client singleton.
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars.
 */

import { createClient } from '@supabase/supabase-js';

const originalUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co';
const useLocal = import.meta.env.DEV || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

const supabaseUrl = useLocal
  ? originalUrl
  : (typeof window !== 'undefined' ? `${window.location.origin}/proxy-supabase` : originalUrl);

const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit',
    detectSessionInUrl: true,
  },
});
