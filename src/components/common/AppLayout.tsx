import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useUIStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { settingsService } from '@/services/settingsService';

export const AppLayout: React.FC = () => {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { setSettings, settings } = useSettingsStore();
  const { darkMode } = useUIStore();

  useEffect(() => {
    settingsService.get().then((s) => setSettings(s)).catch(() => {});
  }, [setSettings]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Apply theme color as CSS variable
  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', settings.theme_color || '#CC0000');
  }, [settings.theme_color]);

  return (
    <div className="flex h-screen bg-bg dark:bg-bg-dark overflow-hidden font-sans">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={toggleSidebar}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div
        className="flex flex-col flex-1 overflow-hidden transition-all duration-300 w-full"
        style={{ marginLeft: 'var(--sidebar-width, 0)' }}
      >
        <TopNav />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
