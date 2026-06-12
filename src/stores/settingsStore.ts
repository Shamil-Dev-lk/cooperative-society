import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Settings } from '@/types';

interface SettingsState {
  settings: Settings;
  setSettings: (settings: Settings) => void;
}

const defaultSettings: Settings = {
  society_name: 'Cooperative Society',
  address: '',
  telephone: '',
  email: '',
  logo_url: '',
  theme_color: '#CC0000',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      setSettings: (settings) => set({ settings }),
    }),
    { name: 'settings-store' }
  )
);
