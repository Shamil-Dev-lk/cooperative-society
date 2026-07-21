import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Shield, User, Eye, EyeOff, CheckCircle, Users, KeyRound,
  Trash2, RefreshCw, X, ShieldAlert, Calendar, Clock, FileText, Search,
  Printer, UserCheck, Copy
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { authService, SystemUser } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatDate } from '@/utils/dateUtils';
import { exportUsersToPDF, downloadAccountSlip } from '@/utils/exportUtils';
import type { UserRole } from '@/types';
import toast from 'react-hot-toast';

interface CreateUserForm {
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

const UserManagementPage: React.FC = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const settings = useSettingsStore((s) => s.settings);

  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState<CreateUserForm>({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'OPERATOR',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Success state with created user details for slip download
  const [createdAccount, setCreatedAccount] = useState<{ email: string; role: string; password?: string } | null>(null);

  // Password reset modal state
  const [resetUser, setResetUser] = useState<SystemUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Delete modal state
  const [deletingUser, setDeletingUser] = useState<SystemUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Query system users (with fallback for old created accounts)
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['system-users'],
    queryFn: () => authService.getAllUsers(),
    staleTime: 5000,
  });

  // Role toggle mutation
  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      authService.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      toast.success('User role updated successfully');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update role');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setCreatedAccount(null);
  };

  const validate = (): string | null => {
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return 'Please enter a valid email address.';
    if (form.password.length < 8)
      return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword)
      return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { toast.error(err); return; }

    setIsCreating(true);
    try {
      const { error } = await supabase
        .from('user_creation_queue')
        .insert({
          email: form.email,
          password: form.password,
          role: form.role,
        });

      if (error) throw error;

      setCreatedAccount({
        email: form.email,
        role: form.role,
        password: form.password,
      });

      // Automatically generate PDF Login Slip download
      downloadAccountSlip(form.email, form.role, form.password, settings?.society_name);

      setForm({ email: '', password: '', confirmPassword: '', role: 'OPERATOR' });
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      toast.success(`Account "${form.email}" created! PDF Login Slip generated.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user account';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setIsResetting(true);
    try {
      await authService.resetUserPassword(resetUser.id, newPassword);
      toast.success(`Password reset for ${resetUser.email}`);
      
      // Auto download updated login slip PDF
      downloadAccountSlip(resetUser.email, resetUser.role, newPassword, settings?.society_name);

      setResetUser(null);
      setNewPassword('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      toast.error(message);
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await authService.deleteUser(deletingUser.id);
      toast.success(`Account ${deletingUser.email} deleted`);
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      setDeletingUser(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete user account';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportPDFList = () => {
    if (!users || users.length === 0) {
      toast.error('No accounts available to export');
      return;
    }
    exportUsersToPDF(users, settings?.society_name);
  };

  // Filtered users for search
  const filteredUsers = (users || []).filter((u) =>
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsersCount = (users || []).length;
  const adminCount = (users || []).filter((u) => u.role === 'ADMIN').length;
  const operatorCount = (users || []).filter((u) => u.role === 'OPERATOR').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Top Header & Export Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-card border border-gray-100 dark:border-gray-800">
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-text-dark flex items-center gap-2.5">
            <Users className="text-primary" size={26} /> User Account Management
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            පරිශීලක ගිණුම් කළමනාකරණය — Manage system staff accounts, security roles & print login slips
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Export PDF Button */}
          <button
            onClick={handleExportPDFList}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all transform active:scale-95"
          >
            <FileText size={16} /> Export PDF Account List
          </button>

          {/* Navigation Tab Toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'list'
                  ? 'bg-white dark:bg-surface-dark text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Users size={15} /> All Accounts ({totalUsersCount})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'create'
                  ? 'bg-white dark:bg-surface-dark text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <UserPlus size={15} /> Create Account
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-blue-200/50 dark:border-blue-800/40 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center font-bold shadow-md">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase tracking-wider">Total Accounts</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{totalUsersCount}</h3>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-200/50 dark:border-purple-800/40 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md">
            <Shield size={22} />
          </div>
          <div>
            <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider">Administrators</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{adminCount}</h3>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-200/50 dark:border-emerald-800/40 p-4 rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
            <UserCheck size={22} />
          </div>
          <div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">Operators</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{operatorCount}</h3>
          </div>
        </div>
      </div>

      {/* Info Banner & SQL Setup Guide */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/10 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-start gap-3">
          <Shield className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-xs text-amber-800 dark:text-amber-200">
            <p className="font-bold text-sm">Want to load ALL your old created accounts from Supabase Auth?</p>
            <p className="mt-0.5 leading-relaxed text-amber-700 dark:text-amber-300">
              Run this 1-click SQL script in your <strong>Supabase Dashboard &gt; SQL Editor</strong> to grant access to all past &amp; future staff accounts.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            const sql = `-- Run this in Supabase Dashboard > SQL Editor to load all old accounts
CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE (id UUID, email TEXT, role TEXT, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY SELECT u.id, u.email::text, COALESCE(u.raw_user_meta_data->>'role', 'OPERATOR')::text AS role, u.created_at, u.last_sign_in_at FROM auth.users u ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_user_role(target_user_id UUID, new_role TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE auth.users SET raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{role}', to_jsonb(new_role)), updated_at = NOW() WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.reset_user_password(target_user_id UUID, new_password TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE auth.users SET encrypted_password = crypt(new_password, gen_salt('bf')), updated_at = NOW() WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_user(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_all_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_user_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;`;
            navigator.clipboard.writeText(sql);
            toast.success('SQL Script copied to clipboard! Paste in Supabase SQL Editor.');
          }}
          className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex-shrink-0"
        >
          <Copy size={14} /> Copy SQL Script
        </button>
      </div>

      {/* TAB 1: ALL ACCOUNTS LIST */}
      {activeTab === 'list' && (
        <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card overflow-hidden border border-gray-100 dark:border-gray-800">
          {/* Search Bar & Header */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-800/40">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search account email or role..."
                className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleExportPDFList}
                className="flex items-center gap-1.5 text-xs text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 px-3 py-1.5 rounded-xl transition-colors font-semibold"
              >
                <Printer size={14} /> Export PDF List
              </button>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-primary transition-colors border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-xl bg-white dark:bg-gray-800 font-medium"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100/70 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">User Account Email</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Created Date</th>
                  <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Last Sign In</th>
                  <th className="px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider">Actions (PDF / Security)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400 font-medium">
                      Loading created accounts list...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                      {searchTerm ? 'No accounts match your search.' : 'No created accounts found.'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-4 font-semibold text-gray-800 dark:text-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-rose-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                            {u.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{u.email}</p>
                            {currentUser?.id === u.id && (
                              <span className="inline-block text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 px-2 py-0.5 rounded-md font-bold mt-0.5">
                                Current Active Session
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200'
                          }`}
                        >
                          {u.role === 'ADMIN' ? <Shield size={13} /> : <User size={13} />}
                          {u.role}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-gray-400" /> {formatDate(u.created_at)}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {u.last_sign_in_at ? (
                          <span className="flex items-center gap-1.5">
                            <Clock size={13} className="text-emerald-500" /> {new Date(u.last_sign_in_at).toLocaleString('en-LK')}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Never Signed In</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Export PDF Slip Button */}
                          <button
                            onClick={() => downloadAccountSlip(u.email, u.role, undefined, settings?.society_name)}
                            title="Export PDF Login Details Slip / Slip එක බාගන්න"
                            className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all transform active:scale-95"
                          >
                            <FileText size={14} /> PDF Slip
                          </button>

                          {/* Role Toggle Button */}
                          <button
                            onClick={() =>
                              roleMutation.mutate({
                                userId: u.id,
                                role: u.role === 'ADMIN' ? 'OPERATOR' : 'ADMIN',
                              })
                            }
                            title="Toggle Role / තනතුර වෙනස් කරන්න"
                            className="px-3 py-1.5 text-xs font-semibold border border-gray-200 dark:border-gray-700 hover:border-primary hover:text-primary rounded-xl transition-colors bg-white dark:bg-gray-800"
                          >
                            Set {u.role === 'ADMIN' ? 'Operator' : 'Admin'}
                          </button>

                          {/* Reset Password Button */}
                          <button
                            onClick={() => {
                              setResetUser(u);
                              setNewPassword('');
                            }}
                            title="Reset Password / මුරපදය නැවත සකසන්න"
                            className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300 rounded-xl transition-colors border border-amber-200/60"
                          >
                            <KeyRound size={15} />
                          </button>

                          {/* Delete Account Button */}
                          <button
                            onClick={() => setDeletingUser(u)}
                            disabled={currentUser?.id === u.id}
                            title="Delete Account / ඉවත් කරන්න"
                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded-xl transition-colors border border-red-200/60 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CREATE USER FORM */}
      {activeTab === 'create' && (
        <div className="max-w-lg mx-auto space-y-6">
          {createdAccount && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 space-y-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <CheckCircle size={22} className="text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-emerald-800 dark:text-emerald-200 text-base">Account Created Successfully!</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                    <strong>{createdAccount.email}</strong> is now registered as <strong>{createdAccount.role}</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-3">
                <span className="text-xs text-emerald-800 dark:text-emerald-200 font-medium">PDF Credentials Slip:</span>
                <button
                  onClick={() =>
                    downloadAccountSlip(
                      createdAccount.email,
                      createdAccount.role,
                      createdAccount.password,
                      settings?.society_name
                    )
                  }
                  className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all transform active:scale-95"
                >
                  <FileText size={15} /> Export PDF Slip
                </button>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-surface-dark rounded-2xl shadow-card p-6 border border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserPlus size={22} className="text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-gray-800 dark:text-gray-100 text-lg">Create New Staff Account</h2>
                <p className="text-xs text-gray-400">නව පරිශීලක ගිණුමක් සාදා PDF පිවිසුම් පත්‍රිකාව ලබාගන්න</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="user@cooperative.lk"
                  autoComplete="off"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  User Role <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: 'OPERATOR' }))}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      form.role === 'OPERATOR'
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    <User size={20} className={form.role === 'OPERATOR' ? 'text-primary' : 'text-gray-400'} />
                    <div>
                      <p className={`text-sm font-bold ${form.role === 'OPERATOR' ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                        Operator
                      </p>
                      <p className="text-xs text-gray-400">View & Edit Access</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: 'ADMIN' }))}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      form.role === 'ADMIN'
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    <Shield size={20} className={form.role === 'ADMIN' ? 'text-primary' : 'text-gray-400'} />
                    <div>
                      <p className={`text-sm font-bold ${form.role === 'ADMIN' ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                        Admin
                      </p>
                      <p className="text-xs text-gray-400">Full System Access</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Confirm Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    name="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:bg-gray-800 dark:border-gray-600 dark:text-white ${
                      form.confirmPassword && form.password !== form.confirmPassword ? 'border-red-400' : 'border-gray-200'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1 font-medium">Passwords do not match</p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-rose-600 hover:from-primary-hover hover:to-rose-700 text-white py-3.5 px-6 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-60 transform active:scale-98"
                >
                  {isCreating ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UserPlus size={18} />
                  )}
                  {isCreating ? 'Creating Account...' : 'Create Account & Generate PDF Slip'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      <AnimatePresence>
        {resetUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-surface-dark rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 dark:border-gray-700"
            >
              <button
                onClick={() => setResetUser(null)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  <KeyRound size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">Reset Account Password</h3>
                  <p className="text-xs text-gray-400">{resetUser.email}</p>
                </div>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                    New Password (Min. 8 characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetUser(null)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-60"
                  >
                    <FileText size={14} /> Save & Export PDF Slip
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE ACCOUNT MODAL */}
      <AnimatePresence>
        {deletingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-surface-dark rounded-2xl max-w-md w-full p-6 shadow-2xl relative border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-3 mb-4 text-red-600">
                <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center">
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 text-base">Delete User Account</h3>
                  <p className="text-xs text-red-500 font-bold">Permanent Security Action</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                Are you sure you want to permanently delete the user account for <strong>{deletingUser.email}</strong>? They will immediately lose login access to the system.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeletingUser(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all disabled:opacity-60 shadow-sm"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Account'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagementPage;
