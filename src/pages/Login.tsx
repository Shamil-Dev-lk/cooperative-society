import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, Lock, Mail, ShieldCheck, ShieldAlert,
  Volume2, VolumeX, Building2, Cpu, Terminal, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { loginSchema, type LoginFormData } from '@/schemas';
import { MatrixBackground } from '@/components/common/MatrixBackground';
import { cyberSound } from '@/utils/cyberSound';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Success / Failure animation states
  const [authStatus, setAuthStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const toggleSound = () => {
    setSoundEnabled(prev => !prev);
    cyberSound.playClick(!soundEnabled);
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    cyberSound.playProcessing(soundEnabled);

    try {
      const user = await authService.signIn(data.email, data.password);
      setUser(user);

      // Trigger SUCCESS Cyber Security Access Animation & Voice
      setAuthStatus('success');
      cyberSound.playSuccess(soundEnabled);
      cyberSound.speakSuccess(soundEnabled);
      toast.success('Successfully logged in. You are in the Safe Zone.');

      // Redirect after short cyber animation
      setTimeout(() => {
        navigate('/dashboard');
      }, 2200);

    } catch (err: unknown) {
      // Trigger FAILURE Cyber Security Alert Animation & Voice
      setAuthStatus('failed');
      cyberSound.playError(soundEnabled);
      cyberSound.speakError(soundEnabled);

      const rawMsg = err instanceof Error ? err.message : String(err);
      const cleanMsg = (rawMsg.includes('Failed to fetch') || rawMsg.includes('TypeError') || rawMsg.includes('NetworkError'))
        ? 'Invalid email or password. Please check your credentials.'
        : rawMsg;

      toast.error(cleanMsg);

      // Reset card after warning animation
      setTimeout(() => {
        setAuthStatus('idle');
      }, 2500);

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-950 flex items-center justify-center p-4 font-sans overflow-hidden select-none">
      {/* Red Matrix Code Rain & Cyber Background */}
      <MatrixBackground />

      {/* Sound Toggle Button (Top Right HUD) */}
      <div className="absolute top-6 right-6 z-30">
        <button
          onClick={toggleSound}
          type="button"
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold transition-all duration-300 border
            ${soundEnabled
              ? 'bg-red-950/90 border-red-500/50 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:bg-red-900/90'
              : 'bg-gray-900/80 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'}`}
        >
          {soundEnabled ? <Volume2 size={15} className="animate-pulse text-red-400" /> : <VolumeX size={15} />}
          <span>{soundEnabled ? 'SOUND ON' : 'SOUND OFF'}</span>
        </button>
      </div>

      {/* Main Glassmorphism Cyber Login Portal Card (Red Cyber Theme) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{
          opacity: 1,
          scale: authStatus === 'failed' ? [1, 1.02, 0.98, 1.02, 1] : 1,
          x: authStatus === 'failed' ? [-6, 6, -6, 6, 0] : 0,
        }}
        transition={{ duration: 0.4 }}
        className={`relative w-full max-w-md z-20 rounded-3xl backdrop-blur-2xl transition-all duration-500 border overflow-hidden
          ${authStatus === 'success'
            ? 'bg-emerald-950/90 border-emerald-400 shadow-[0_0_80px_rgba(16,185,129,0.4)]'
            : authStatus === 'failed'
            ? 'bg-red-950/95 border-red-500 shadow-[0_0_90px_rgba(239,68,68,0.6)]'
            : 'bg-gray-950/90 border-red-500/40 shadow-[0_0_70px_rgba(239,68,68,0.25)]'}`}
      >
        {/* Animated Card Border Glow */}
        <div className="absolute inset-0 rounded-3xl pointer-events-none border border-red-500/30 animate-pulse" />

        {/* OVERLAY: SUCCESS STATE (ACCESS GRANTED) */}
        <AnimatePresence>
          {authStatus === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-gray-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="relative mb-6">
                <motion.div
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-24 h-24 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-400"
                >
                  <ShieldCheck size={56} className="text-emerald-400" />
                </motion.div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-gray-950 p-1.5 rounded-full">
                  <CheckCircle2 size={20} />
                </div>
              </div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-black tracking-widest text-emerald-400 font-mono mb-2"
              >
                ACCESS GRANTED
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xs font-mono text-emerald-300/80 bg-emerald-950/60 px-4 py-2 rounded-xl border border-emerald-500/30"
              >
                🛡️ YOU ARE IN THE SAFE ZONE
              </motion.p>

              <p className="text-[11px] text-emerald-400/60 font-mono mt-6 animate-pulse">
                Redirecting to secure dashboard...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* OVERLAY: FAILED STATE (ACCESS DENIED) */}
        <AnimatePresence>
          {authStatus === 'failed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-gray-950/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="relative mb-6">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                  className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500"
                >
                  <ShieldAlert size={56} className="text-red-500" />
                </motion.div>
                <div className="absolute -bottom-2 -right-2 bg-red-500 text-white p-1.5 rounded-full">
                  <AlertTriangle size={20} />
                </div>
              </div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-black tracking-widest text-red-500 font-mono mb-2"
              >
                ACCESS DENIED
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xs font-mono text-red-400 bg-red-950/60 px-4 py-2 rounded-xl border border-red-500/40"
              >
                ⚠️ SECURITY ALERT: Unsuccessful Login Attempt
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Card Header */}
        <div className="p-8 pb-4 text-center border-b border-red-500/20 relative">
          {/* Logo Badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/40 flex items-center justify-center mx-auto mb-3 shadow-[0_0_30px_rgba(239,68,68,0.3)]"
          >
            <Building2 size={32} className="text-red-500" />
          </motion.div>

          <h1 className="text-xl font-bold text-white tracking-wide">
            Cooperative Society
          </h1>
          <p className="text-xs text-red-400/90 font-mono mt-0.5">සමූපකාර සමිතිය කළමනාකරණ</p>

          {/* Glitch HUD Subtitle */}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/80 border border-red-500/40">
            <Cpu size={12} className="text-rose-400 animate-spin" />
            <span className="text-[10px] font-mono tracking-widest text-red-300 font-bold uppercase">
              SECURE ACCESS PORTAL
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-5">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-mono font-semibold text-red-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Mail size={13} className="text-rose-400" /> Email Address / විද්‍යුත් තැපෑල
            </label>
            <div className="relative">
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                onFocus={() => cyberSound.playBeep(soundEnabled)}
                placeholder="shamildeveloperlk@gmail.com"
                className={`w-full px-4 py-3 rounded-xl border text-sm font-mono transition-all duration-300 bg-gray-900/90 text-gray-100 placeholder-gray-600
                  focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400 focus:bg-gray-950
                  ${errors.email ? 'border-red-500 bg-red-950/40' : 'border-red-500/30 hover:border-red-500/60'}`}
              />
            </div>
            {errors.email && (
              <p className="text-red-400 text-xs mt-1.5 font-mono flex items-center gap-1">
                <AlertTriangle size={12} /> {errors.email.message}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-mono font-semibold text-red-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Lock size={13} className="text-rose-400" /> Password / මුරපදය
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                onFocus={() => cyberSound.playBeep(soundEnabled)}
                placeholder="••••••••"
                className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm font-mono transition-all duration-300 bg-gray-900/90 text-gray-100 placeholder-gray-600
                  focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-400 focus:bg-gray-950
                  ${errors.password ? 'border-red-500 bg-red-950/40' : 'border-red-500/30 hover:border-red-500/60'}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-red-400 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-400 text-xs mt-1.5 font-mono flex items-center gap-1">
                <AlertTriangle size={12} /> {errors.password.message}
              </p>
            )}
          </div>

          {/* Cyber Red Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            onClick={() => cyberSound.playClick(soundEnabled)}
            className="group relative w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-mono font-bold text-sm text-white
              bg-gradient-to-r from-red-600 via-rose-500 to-red-600 hover:from-red-500 hover:to-rose-400
              transition-all duration-300 shadow-[0_0_35px_rgba(239,68,68,0.4)] hover:shadow-[0_0_50px_rgba(255,51,102,0.6)]
              disabled:opacity-60 disabled:cursor-not-allowed mt-4 overflow-hidden"
          >
            {/* Hover Light Sweep */}
            <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />

            {isLoading ? (
              <div className="flex items-center gap-2 text-white font-bold">
                <Terminal size={16} className="animate-spin" />
                <span>AUTHENTICATING...</span>
              </div>
            ) : (
              <>
                <Terminal size={17} />
                <span>LOGIN / පිවිසෙන්න</span>
              </>
            )}
          </button>
        </form>

        {/* Card Footer */}
        <div className="p-4 bg-gray-950/80 border-t border-red-500/15 text-center">
          <p className="text-[10px] font-mono text-red-400/60">
            © {new Date().getFullYear()} Cooperative Society Management System — SECURE RED GATEWAY
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;

