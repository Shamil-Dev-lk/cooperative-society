import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Shield, User, Eye, EyeOff, CheckCircle, Users, KeyRound,
  Trash2, RefreshCw, X, ShieldAlert, Calendar, Clock, Download, FileText,
  FileSpreadsheet, Printer, Copy
} from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import { authService, SystemUser } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { formatDate } from '@/utils/dateUtils';
import {
  exportUsersToPDF, exportUsersToExcel, exportUsersToCSV, downloadAccountSlip
} from '@/utils/exportUtils';
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
  const [showExportMenu, setShowExportMenu] = useState(false);
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

  // Query system users
  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ['system-users'],
    queryFn: () => authService.getAllUsers(),
    staleTime: 10000,
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

      // Also generate login slip download automatically!
      downloadAccountSlip(form.email, form.role, form.password, settings?.society_name);

      setForm({ email: '', password: '', confirmPassword: '', role: 'OPERATOR' });
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      toast.success(`User "${form.email}" account created! Login slip opened for download.`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user';
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
      
      // Auto download updated login slip for reset password
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
      toast.success(`User ${deletingUser.email} deleted`);
      queryClient.invalidateQueries({ queryKey: ['system-users'] });
      setDeletingUser(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportPDF = () => {
    if (!users || users.length === 0) {
      toast.error('No users available to export');
      return;
    }
    exportUsersToPDF(users, settings?.society_name);
    setShowExportMenu(false);
  };

  const handleExportExcel = () => {
    if (!users || users.length === 0) {
      toast.error('No users available to export');
      return;
    }
    exportUsersToExcel(users, settings?.society_name);
    setShowExportMenu(false);
  };

  const handleExportCSV = () => {
    if (!users || users.length === 0) {
      toast.error('No users available to export');
      return;
    }
    exportUsersToCSV(users);
    setShowExportMenu(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-text-dark">User Account Management</h1>
          <p className="text-sm text-gray-400 mt-1">
            පරිශීලක ගිණුම් කළමනාකරණය — Manage staff user accounts, permissions & login details
          </p>
        </div>

        {/* Action Controls & Tab buttons */}
        <div className="flex items-center gap-3">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu((v) => !v)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm"
            >
              <Download size={16} /> Export / බාගන්න
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl py-2 z-30">
                <button
                  onClick={handleExportPDF}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <FileText size={15} className="text-red-500" /> Export User List (PDF)
                </button>
                <button
                  onClick={handleExportExcel}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <FileSpreadsheet size={15} className="text-emerald-500" /> Export User List (Excel)
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
                >
                  <Download size={15} className="text-blue-500" /> Export User List (CSV)
                </button>
              </div>
            )}
          </div>

          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'list'
                  ? 'bg-white dark:bg-surface-dark text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Users size={16} /> User Accounts ({(users || []).length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'create'
                  ? 'bg-white dark:bg-surface-dark text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <UserPlus size={16} /> Add New User
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
        <Shield size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-semibold mb-0.5">Admin Security Control</p>
          <p className="text-xs leading-relaxed">
            Only administrators have permission to manage user accounts and download credentials. <strong>OPERATOR</strong> users can view and edit data, while <strong>ADMIN</strong> users have complete access including system settings, backups, and user security.
          </p>
        </div>
      </div>

      {/* TAB 1: USER LIST */}
      {activeTab === 'list' && (
        <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-bold text-text dark:text-text-dark text-base flex items-center gap-2">
              <Users size={18} className="text-primary" /> Active System Accounts List
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 px-3 py-1.5 rounded-lg transition-colors font-semibold"
              >
                <Printer size={14} /> Print / Save PDF
              </button>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary transition-colors border border-gray-200 dark:border-gray-700 px-3 py-1.5 rounded-lg"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh List
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Created Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Last Sign In</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      Loading user accounts list...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-amber-600">
                      <div className="max-w-md mx-auto space-y-2">
                        <p className="font-semibold text-sm">Database Function Required</p>
                        <p className="text-xs text-gray-500">
                          Please run the user management RPC script in your Supabase SQL Editor to enable full user listing.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (users || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No user accounts found.
                    </td>
                  </tr>
                ) : (
                  (users || []).map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-text dark:text-text-dark">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {u.email.charAt(0).toUpperCase()}
                          </div>
                          <span>{u.email}</span>
                          {currentUser?.id === u.id && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}
                        >
                          {u.role === 'ADMIN' ? <Shield size={12} /> : <User size={12} />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {formatDate(u.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                        {u.last_sign_in_at ? (
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {new Date(u.last_sign_in_at).toLocaleString('en-LK')}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Never</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Download Login Slip */}
                          <button
                            onClick={() => downloadAccountSlip(u.email, u.role, undefined, settings?.society_name)}
                            title="Download Login Slip / Slip එක බාගන්න"
                            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 rounded-lg transition-colors font-medium"
                          >
                            <FileText size={14} /> Slip
                          </button>

                          {/* Role Toggle */}
                          <button
                            onClick={() =>
                              roleMutation.mutate({
                                userId: u.id,
                                role: u.role === 'ADMIN' ? 'OPERATOR' : 'ADMIN',
                              })
                            }
                            title="Toggle Role / තනතුර වෙනස් කරන්න"
                            className="px-2.5 py-1 text-xs border border-gray-200 dark:border-gray-600 hover:border-primary hover:text-primary rounded-lg transition-colors"
                          >
                            Set {u.role === 'ADMIN' ? 'Operator' : 'Admin'}
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => {
                              setResetUser(u);
                              setNewPassword('');
                            }}
                            title="Reset Password / මුරපදය නැවත සකසන්න"
                            className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 rounded-lg transition-colors"
                          >
                            <KeyRound size={15} />
                          </button>

                          {/* Delete User */}
                          <button
                            onClick={() => setDeletingUser(u)}
                            disabled={currentUser?.id === u.id}
                            title="Delete User / ඉවත් කරන්න"
                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
              className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-emerald-800 dark:text-emerald-200 text-base">User Account Created Successfully!</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-300">
                    <strong>{createdAccount.email}</strong> is now registered as <strong>{createdAccount.role}</strong>.
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <span className="text-xs text-emerald-700 font-medium">Download Account Login Credentials Slip:</span>
                <button
                  onClick={() =>
                    downloadAccountSlip(
                      createdAccount.email,
                      createdAccount.role,
                      createdAccount.password,
                      settings?.society_name
                    )
                  }
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition-all"
                >
                  <Download size={14} /> Download Login Slip (PDF)
                </button>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-surface-dark rounded-2xl shadow-card p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserPlus size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-text dark:text-text-dark">Create New User Account</h2>
                <p className="text-xs text-gray-400">නව පරිශීලකයෙකු සාදා පිවිසුම් පත්‍රිකාව බාගන්න</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="user@cooperative.lk"
                  autoComplete="off"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none
                    focus:ring-2 focus:ring-primary/30 focus:border-primary
                    dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  required
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  User Role <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: 'OPERATOR' }))}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      form.role === 'OPERATOR'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <User size={18} className={form.role === 'OPERATOR' ? 'text-primary' : 'text-gray-400'} />
                    <div>
                      <p className={`text-sm font-semibold ${form.role === 'OPERATOR' ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                        Operator
                      </p>
                      <p className="text-xs text-gray-400">View & Edit</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, role: 'ADMIN' }))}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      form.role === 'ADMIN'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <Shield size={18} className={form.role === 'ADMIN' ? 'text-primary' : 'text-gray-400'} />
                    <div>
                      <p className={`text-sm font-semibold ${form.role === 'ADMIN' ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                        Admin
                      </p>
                      <p className="text-xs text-gray-400">Full Access</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 text-sm focus:outline-none
                      focus:ring-2 focus:ring-primary/30 focus:border-primary
                      dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
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
                    className={`w-full px-4 py-3 pr-12 rounded-xl border text-sm focus:outline-none
                      focus:ring-2 focus:ring-primary/30 focus:border-primary
                      dark:bg-gray-800 dark:border-gray-600 dark:text-white
                      ${form.confirmPassword && form.password !== form.confirmPassword
                        ? 'border-red-400' : 'border-gray-200'}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Submit */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover
                    text-white py-3 px-6 rounded-xl font-medium text-sm transition-all shadow-sm
                    hover:shadow-md disabled:opacity-60"
                >
                  {isCreating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <UserPlus size={16} />
                  )}
                  {isCreating ? 'Creating User...' : 'Create Account & Download Slip'}
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
              className="bg-white dark:bg-surface-dark rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
            >
              <button
                onClick={() => setResetUser(null)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100">Reset User Password</h3>
                  <p className="text-xs text-gray-400">{resetUser.email}</p>
                </div>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                    New Password (Min 8 chars)
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
                      {showResetPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetUser(null)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isResetting}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors disabled:opacity-60"
                  >
                    {isResetting ? 'Resetting...' : 'Save Password & Download Slip'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE USER MODAL */}
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
              className="bg-white dark:bg-surface-dark rounded-2xl max-w-md w-full p-6 shadow-2xl relative"
            >
              <div className="flex items-center gap-3 mb-4 text-red-600">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100">Delete User Account</h3>
                  <p className="text-xs text-red-500 font-semibold">Action cannot be undone</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                Are you sure you want to permanently delete the user account for <strong>{deletingUser.email}</strong>? They will immediately lose access to the system.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeletingUser(null)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={isDeleting}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-60"
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
