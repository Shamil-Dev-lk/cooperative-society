import { supabase } from './supabaseClient';
import type { AuthUser, UserRole } from '@/types';

export interface SystemUser {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
  last_sign_in_at: string | null;
}

export const authService = {
  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('No user returned');

    const role = (data.user.user_metadata?.role as UserRole) || 'OPERATOR';
    return {
      id: data.user.id,
      email: data.user.email!,
      role,
    };
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession(): Promise<AuthUser | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const role = (session.user.user_metadata?.role as UserRole) || 'OPERATOR';
    return {
      id: session.user.id,
      email: session.user.email!,
      role,
    };
  },

  async getAllUsers(): Promise<SystemUser[]> {
    try {
      const { data, error } = await supabase.rpc('get_all_users');
      if (!error && data && data.length > 0) {
        return data;
      }
    } catch {
      // Fall through to query fallbacks
    }

    // Fallback: Query user_creation_queue + current user session
    const list: SystemUser[] = [];

    // Current logged in user session
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

    // Fetch queued / created users from user_creation_queue
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
