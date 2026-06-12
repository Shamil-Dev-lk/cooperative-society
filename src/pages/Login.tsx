import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Building2 } from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { loginSchema, type LoginFormData } from '@/schemas';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const user = await authService.signIn(data.email, data.password);
      setUser(user);
      toast.success(`Welcome back! / ආයුබෝවන්!`);
      navigate('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4 font-sans"
      style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffe8e8 50%, #fff0f0 100%)' }}>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-modal overflow-hidden">
          {/* Header */}
          <div className="px-8 pt-10 pb-8 text-center"
            style={{ background: 'linear-gradient(135deg, #CC0000 0%, #8B0000 100%)' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4 shadow-lg"
            >
              <Building2 size={40} className="text-white" />
            </motion.div>
            <h1 className="text-white text-2xl font-bold mb-1">Cooperative Society</h1>
            <p className="text-white/70 text-sm">සමූපකාර සමිතිය කළමනාකරණ</p>
            <p className="text-white/60 text-xs mt-1">Management System</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address / විද්‍යුත් තැපැල්
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                  ${errors.email ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password / මුරපදය
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                    ${errors.password ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover
                text-white py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200
                shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn size={18} />
              )}
              {isLoading ? 'Logging in...' : 'Login / පිවිසෙන්න'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          © {new Date().getFullYear()} Cooperative Society Management System
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
