import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AppRouter } from '@/router';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/authStore';
import { isSupabaseConfigured, supabase } from '@/services/supabaseClient';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { useAutoUpdate } from '@/hooks/useAutoUpdate';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

// Bootstrap auth state
async function bootstrap() {
  const { setUser, setLoading } = useAuthStore.getState();
  if (!isSupabaseConfigured) { setLoading(false); return; }

  // Restore session on load
  try {
    const user = await authService.getSession();
    setUser(user);
  } catch {
    setUser(null);
  } finally {
    setLoading(false);
  }
  try {
    authService.onAuthStateChange((user) => setUser(user));
  } catch { /* ignore */ }

  // Auto-refresh session every 30 minutes to prevent "invalid api key" errors
  setInterval(async () => {
    try {
      const { data } = await supabase.auth.refreshSession();
      if (!data.session) {
        useAuthStore.getState().setUser(null);
      }
    } catch { /* silent fail */ }
  }, 30 * 60 * 1000); // every 30 minutes
}

bootstrap();


// Setup banner when .env not configured
const SetupBanner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center p-8 font-sans"
    style={{ background: 'linear-gradient(135deg, #fff5f5, #ffe0e0)' }}>
    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-10 text-center">
      <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Setup Required</h1>
      <p className="text-gray-500 mb-6 text-sm">Configure your Supabase credentials to continue.</p>
      <div className="bg-gray-900 rounded-xl p-4 text-left mb-6">
        <p className="text-xs text-gray-400 mb-2 font-mono">📄 .env</p>
        <p className="text-green-400 font-mono text-xs">VITE_SUPABASE_URL=<span className="text-yellow-300">https://xxx.supabase.co</span></p>
        <p className="text-green-400 font-mono text-xs">VITE_SUPABASE_ANON_KEY=<span className="text-yellow-300">eyJ...</span></p>
      </div>
      <div className="text-left space-y-3 text-sm text-gray-600">
        <div className="flex gap-3 items-start"><span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">1</span><span>Create project at <strong>supabase.com</strong></span></div>
        <div className="flex gap-3 items-start"><span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">2</span><span>Run <code className="bg-gray-100 px-1 rounded">supabase/schema.sql</code> in SQL Editor</span></div>
        <div className="flex gap-3 items-start"><span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">3</span><span>Copy Project URL + anon key to <code className="bg-gray-100 px-1 rounded">.env</code></span></div>
        <div className="flex gap-3 items-start"><span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">4</span><span>Restart the dev server</span></div>
      </div>
    </div>
  </div>
);

// Auto-update wrapper — checks for new deployments every 2 minutes
const AutoUpdatingApp: React.FC = () => {
  useAutoUpdate();
  return isSupabaseConfigured ? <AppRouter /> : <SetupBanner />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <AutoUpdatingApp />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                fontFamily: '"Nirmala UI", "Noto Sans Sinhala", "Segoe UI", Arial, sans-serif',
                fontSize: '13px',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#CC0000', secondary: '#fff' } },
            }}
          />
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
