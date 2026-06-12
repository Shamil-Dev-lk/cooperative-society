import { supabase } from './supabaseClient';
import type { AuthUser, UserRole } from '@/types';

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

  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { role },
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
