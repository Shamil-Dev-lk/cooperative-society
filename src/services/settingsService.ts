import { supabase } from './supabaseClient';
import type { Settings } from '@/types';

const SETTINGS_ID = 'singleton'; // We store one settings row

export const settingsService = {
  async get(): Promise<Settings> {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return (
      data || {
        society_name: 'Cooperative Society',
        address: '',
        telephone: '',
        email: '',
        logo_url: '',
        theme_color: '#CC0000',
      }
    );
  },

  async save(settings: Omit<Settings, 'id' | 'created_at' | 'updated_at'>): Promise<Settings> {
    const existing = await this.get();

    if (existing.id) {
      const { data, error } = await supabase
        .from('settings')
        .update({ ...settings, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data as Settings;
    } else {
      const { data, error } = await supabase
        .from('settings')
        .insert(settings)
        .select()
        .single();

      if (error) throw error;
      return data as Settings;
    }
  },

  async uploadLogo(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `logo.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('settings')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('settings').getPublicUrl(fileName);
    return data.publicUrl;
  },
};

export { SETTINGS_ID };
