import { createClient } from '@supabase/supabase-js';

// Credentials — anon key is safe to expose (designed for client-side use)
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://qnzkownqbkhifenzsgxf.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuemtvd25xYmtoaWZlbnpzZ3hmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNjUxMzgsImV4cCI6MjA5Njc0MTEzOH0.dphxn5visOA3jxbkLqRb5wEL7JXmTvqI2gzHVtFrGFM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const isSupabaseConfigured = true;

export default supabase;
