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
    const { data, error } = await supabase.rpc('get_all_users');
    if (error) throw error;
    return data || [];
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
