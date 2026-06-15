import React, { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { Save, Upload, Building2, Phone, Mail, MapPin, Palette } from 'lucide-react';
import { settingsService } from '@/services/settingsService';
import { useSettingsStore } from '@/stores/settingsStore';
import { settingsSchema, type SettingsFormData } from '@/schemas';
import { FormSkeleton } from '@/components/common/Skeleton';
import toast from 'react-hot-toast';

const SettingsPage: React.FC = () => {
  const { setSettings, settings: storedSettings } = useSettingsStore();
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [logoPreview, setLogoPreview] = React.useState<string>(storedSettings.logo_url || '');

  const { isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const s = await settingsService.get();
      setSettings(s);
      if (s.logo_url) setLogoPreview(s.logo_url);
      reset({
        society_name: s.society_name,
        address: s.address,
        telephone: s.telephone || '',
        email: s.email || '',
        theme_color: s.theme_color || '#CC0000',
        resend_api_key: s.resend_api_key || '',
        twilio_sid: s.twilio_sid || '',
        twilio_auth_token: s.twilio_auth_token || '',
        twilio_from_number: s.twilio_from_number || '',
      });
      return s;
    },
    staleTime: 60000,
  });

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      society_name: storedSettings.society_name,
      address: storedSettings.address,
      telephone: storedSettings.telephone || '',
      email: storedSettings.email || '',
      theme_color: storedSettings.theme_color || '#CC0000',
      resend_api_key: storedSettings.resend_api_key || '',
      twilio_sid: storedSettings.twilio_sid || '',
      twilio_auth_token: storedSettings.twilio_auth_token || '',
      twilio_from_number: storedSettings.twilio_from_number || '',
    },
  });

  const themeColor = watch('theme_color');

  const saveMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      let logoUrl = storedSettings.logo_url;

      if (logoFile) {
        try {
          logoUrl = await settingsService.uploadLogo(logoFile);
        } catch {
          toast.error('Logo upload failed, saving other settings...');
        }
      }

      return settingsService.save({ ...data, logo_url: logoUrl });
    },
    onSuccess: (saved) => {
      setSettings(saved);
      toast.success('Settings saved / සැකසීම් සාර්ථකව සුරකින ලදී');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) {
      setLogoFile(files[0]);
      const url = URL.createObjectURL(files[0]);
      setLogoPreview(url);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.svg', '.webp'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text dark:text-text-dark">Settings</h1>
        <p className="text-sm text-gray-400 mt-1">සැකසීම් — Society configuration (Admin only)</p>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card p-8">
          <FormSkeleton />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-surface-dark rounded-2xl shadow-card p-8"
        >
          <form onSubmit={handleSubmit((data) => saveMutation.mutate(data))} className="space-y-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Society Logo <span className="text-gray-400 font-normal text-xs">/ සමිතිය ලාංජනය</span>
              </label>
              <div className="flex items-center gap-5">
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-20 h-20 rounded-xl object-contain border border-gray-100 p-1"
                  />
                )}
                <div
                  {...getRootProps()}
                  className={`flex-1 border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all
                    ${isDragActive ? 'border-primary bg-red-50' : 'border-gray-200 hover:border-primary hover:bg-red-50/30'}`}
                >
                  <input {...getInputProps()} />
                  <Upload size={24} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">
                    {logoFile ? logoFile.name : 'Drop logo here or click to upload'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG, SVG — Max 5MB</p>
                </div>
              </div>
            </div>

            {/* Society Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Building2 size={14} className="inline mr-1.5 text-gray-400" />
                Society Name <span className="text-gray-400 font-normal text-xs">/ සමිතිය නාමය</span>
              </label>
              <input
                {...register('society_name')}
                placeholder="Cooperative Society Name"
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-all
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                  dark:bg-gray-800 dark:border-gray-600 dark:text-white
                  ${errors.society_name ? 'border-red-400' : 'border-gray-200'}`}
              />
              {errors.society_name && <p className="text-red-500 text-xs mt-1">{errors.society_name.message}</p>}
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <MapPin size={14} className="inline mr-1.5 text-gray-400" />
                Address <span className="text-gray-400 font-normal text-xs">/ ලිපිනය</span>
              </label>
              <textarea
                {...register('address')}
                rows={3}
                placeholder="Society address"
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-all resize-none
                  focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                  dark:bg-gray-800 dark:border-gray-600 dark:text-white
                  ${errors.address ? 'border-red-400' : 'border-gray-200'}`}
              />
              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <Phone size={14} className="inline mr-1.5 text-gray-400" />
                  Telephone
                </label>
                <input
                  {...register('telephone')}
                  type="tel"
                  placeholder="+94 XX XXX XXXX"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none
                    focus:ring-2 focus:ring-primary/30 focus:border-primary
                    dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  <Mail size={14} className="inline mr-1.5 text-gray-400" />
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="society@example.com"
                  className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none
                    focus:ring-2 focus:ring-primary/30 focus:border-primary
                    dark:bg-gray-800 dark:border-gray-600 dark:text-white
                    ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
            </div>

            {/* Theme Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                <Palette size={14} className="inline mr-1.5 text-gray-400" />
                Theme Color <span className="text-gray-400 font-normal text-xs">/ තේමා වර්ණය</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  {...register('theme_color')}
                  type="color"
                  className="h-11 w-16 rounded-xl border border-gray-200 cursor-pointer p-1"
                />
                <input
                  {...register('theme_color')}
                  type="text"
                  placeholder="#CC0000"
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none
                    focus:ring-2 focus:ring-primary/30 focus:border-primary
                    dark:bg-gray-800 dark:border-gray-600 dark:text-white font-mono"
                />
                <div
                  className="w-11 h-11 rounded-xl border border-gray-200 shadow-sm"
                  style={{ backgroundColor: themeColor }}
                />
              </div>
            </div>

            {/* Messaging Configuration Section */}
            <div className="border-t border-gray-100 pt-6 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                Bulk Messaging Integration (Email & SMS)
              </h3>
              <p className="text-xs text-gray-400 mb-4">
                Leave these fields blank to use Simulation Mode (logs mock messages in the dashboard). Provide Resend/Twilio credentials to send real messages.
              </p>
              
              <div className="space-y-4">
                {/* Resend API Key */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Resend API Key (for Email Broadcasts)
                  </label>
                  <input
                    {...register('resend_api_key')}
                    type="password"
                    placeholder="re_..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* Twilio SID & Auth Token & From Number */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Twilio Account SID
                    </label>
                    <input
                      {...register('twilio_sid')}
                      type="text"
                      placeholder="AC..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Twilio Auth Token
                    </label>
                    <input
                      {...register('twilio_auth_token')}
                      type="password"
                      placeholder="Auth Token"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Twilio From Number / Sender ID
                    </label>
                    <input
                      {...register('twilio_from_number')}
                      type="text"
                      placeholder="e.g. +1234567890"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="pt-4 border-t border-gray-100">
              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover
                  text-white py-3 px-6 rounded-xl font-medium text-sm transition-all shadow-sm
                  hover:shadow-md disabled:opacity-60"
              >
                {saveMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : <Save size={16} />}
                {saveMutation.isPending ? 'Saving...' : 'Save Settings / සැකසීම් සුරකින්න'}
              </button>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default SettingsPage;
