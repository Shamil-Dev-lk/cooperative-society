import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Shield, User, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from '@/services/supabaseClient';
import toast from 'react-hot-toast';

interface CreateUserForm {
  email: string;
  password: string;
  confirmPassword: string;
  role: 'ADMIN' | 'OPERATOR';
}

const UserManagementPage: React.FC = () => {
  const [form, setForm] = useState<CreateUserForm>({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'OPERATOR',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setSuccess(null);
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

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_creation_queue')
        .insert({
          email: form.email,
          password: form.password,
          role: form.role,
        });

      if (error) throw error;

      setSuccess(form.email);
      setForm({ email: '', password: '', confirmPassword: '', role: 'OPERATOR' });
      toast.success(`User "${form.email}" creation requested successfully!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create user';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text dark:text-text-dark">User Management</h1>
        <p className="text-sm text-gray-400 mt-1">
          පරිශීලකයන් — Create login access for staff members
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
        <Shield size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-semibold mb-0.5">Admin Only — Restricted Access</p>
          <p className="text-xs leading-relaxed">
            Only administrators can create new user accounts. Users with <strong>OPERATOR</strong> role
            can view and edit data. Users with <strong>ADMIN</strong> role have full access including settings and user management.
          </p>
        </div>
      </div>

      {/* Success message */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4"
        >
          <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
          <div className="text-sm text-emerald-700 dark:text-emerald-300">
            <p className="font-semibold">User created successfully!</p>
            <p className="text-xs mt-0.5"><strong>{success}</strong> can now log in to the system.</p>
          </div>
        </motion.div>
      )}

      {/* Create User Form */}
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
            <h2 className="font-semibold text-text dark:text-text-dark">Create New User</h2>
            <p className="text-xs text-gray-400">නව පරිශීලකයෙකු සාදන්න</p>
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
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover
                text-white py-3 px-6 rounded-xl font-medium text-sm transition-all shadow-sm
                hover:shadow-md disabled:opacity-60"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus size={16} />
              )}
              {isLoading ? 'Creating User...' : 'Create User Account / ගිණුම සාදන්න'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default UserManagementPage;
