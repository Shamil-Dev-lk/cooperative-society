import { supabase } from './supabaseClient';
import type { AuthUser, UserRole } from '@/types';

export interface SystemUser {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://msvcwhqvsqtdtwqequkq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zdmN3aHF2c3F0ZHR3cWVxdWtxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTQyNjEsImV4cCI6MjEwMzk5MDI2MX0.SGClzfh3W8TFiQsE3u6SyB7APF90I6fNYrKTYYPP5TU';

export const authService = {
  async signIn(rawEmail: string, rawPassword: string): Promise<AuthUser> {
    const email = rawEmail.trim().toLowerCase();
    const password = rawPassword.trim();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error('No user returned');

      const role = (data.user.user_metadata?.role as UserRole) || 'OPERATOR';
      return {
        id: data.user.id,
        email: data.user.email!,
        role,
      };
    } catch (err: any) {
      // Direct HTTPS fetch fallback
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apiKey': supabaseAnonKey,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error_description || errorData.msg || 'Invalid email or password');
      }

      const data = await res.json();
      if (data.access_token && data.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        const role = (data.user?.user_metadata?.role as UserRole) || 'OPERATOR';
        return {
          id: data.user.id,
          email: data.user.email,
          role,
        };
      }
      throw new Error('Invalid email or password');
    }
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession(): Promise<AuthUser | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;

      const role = (session.user.user_metadata?.role as UserRole) || 'OPERATOR';
      return {
        id: session.user.id,
        email: session.user.email!,
        role,
      };
    } catch {
      return null;
    }
  },

  async getAllUsers(): Promise<SystemUser[]> {
    try {
      const { data, error } = await supabase.rpc('get_all_users');
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      // Fall through
    }

    const list: SystemUser[] = [];

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      list.push({
        id: session.user.id,
        email: session.user.email!,
        role: (session.user.user_metadata?.role as UserRole) || 'ADMIN',
        created_at: session.user.created_at || new Date().toISOString(),
        last_sign_in_at: session.user.last_sign_in_at || new Date().toISOString(),
      });
    }

    const { data: queueData } = await supabase
      .from('user_creation_queue')
      .select('*')
      .order('created_at', { ascending: false });

    if (queueData && queueData.length > 0) {
      queueData.forEach((q) => {
        if (!list.some((u) => u.email.toLowerCase() === q.email.toLowerCase())) {
          list.push({
            id: q.id,
            email: q.email,
            role: (q.role as UserRole) || 'OPERATOR',
            created_at: q.created_at || new Date().toISOString(),
            last_sign_in_at: null,
          });
        }
      });
    }

    return list;
  },

  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase.rpc('update_user_role', {
      target_user_id: userId,
      new_role: role,
    });
    if (error) throw error;
  },

  async resetUserPassword(userId: string, newPassword: string): Promise<void> {
    const { error } = await supabase.rpc('reset_user_password', {
      target_user_id: userId,
      new_password: newPassword,
    });
    if (error) throw error;
  },

  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase.rpc('delete_user', {
      target_user_id: userId,
    });
    if (error) throw error;
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const role = (session.user.user_metadata?.role as UserRole) || 'OPERATOR';
        callback({ id: session.user.id, email: session.user.email!, role });
      } else {
        callback(null);
      }
    });
  },
};
