import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://msvcwhqvsqtdtwqequkq.supabase.co';

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmN3aHF2c3F0ZHR3cWVxdWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQyNjEsImV4cCI6MjEwMzk5MDI2MX0.SGClzfh3W8TFiQsE3u6SyB7APF90I6fNYrKTYYPP5TU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const isSupabaseConfigured = true;

export default supabase;
