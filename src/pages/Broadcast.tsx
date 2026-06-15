import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, Users, Mail, Phone, Play, Square,
  Settings as SettingsIcon, AlertTriangle, CheckCircle, Info,
  Loader2, ArrowLeft, RefreshCw, Eye, AlertCircle
} from 'lucide-react';
import { memberService } from '@/services/memberService';
import { divisionService } from '@/services/divisionService';
import { categoryService } from '@/services/categoryService';
import { useSettingsStore } from '@/stores/settingsStore';
import toast from 'react-hot-toast';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

const BroadcastPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettingsStore();

  // Form states
  const [divisionId, setDivisionId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [channel, setChannel] = useState<'both' | 'email' | 'sms'>('both');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [isLiveMode, setIsLiveMode] = useState(false);

  // Sending status
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [totalTargets, setTotalTargets] = useState(0);
  const [stats, setStats] = useState({ sent: 0, failed: 0, skipped: 0 });
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Refs for scrolling logs
  const logTerminalRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const pausedRef = useRef(false);

  // Fetch divisions & categories
  const { data: divisions } = useQuery({
    queryKey: ['divisions'],
    queryFn: () => divisionService.getAll(),
    staleTime: 300000,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
    staleTime: 300000,
  });

  // Fetch matched members count
  const { data: matchedMembers, isLoading: matchingLoading } = useQuery({
    queryKey: ['matched-members-count', divisionId, categoryId],
    queryFn: () => memberService.getAllForReport({
      division_id: divisionId || undefined,
      category_id: categoryId || undefined,
    }),
    staleTime: 10000,
  });

  // Check credentials status
  const hasEmailCreds = !!settings.resend_api_key;
  const hasSMSCreds = !!(settings.twilio_sid && settings.twilio_auth_token && settings.twilio_from_number);
  const isMessagingConfigured = hasEmailCreds || hasSMSCreds;

  useEffect(() => {
    // If not configured, force simulation mode
    if (!isMessagingConfigured) {
      setIsLiveMode(false);
    }
  }, [isMessagingConfigured]);

  // Scroll to bottom of logs on update
  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Character and SMS estimation
  const smsLength = smsBody.length;
  const smsCount = Math.ceil(smsLength / 160) || 1;

  const getMatchedStats = () => {
    if (!matchedMembers) return { total: 0, emails: 0, phones: 0 };
    const total = matchedMembers.length;
    const emails = matchedMembers.filter(m => !!m.email?.trim()).length;
    const phones = matchedMembers.filter(m => !!m.phone?.trim()).length;
    return { total, emails, phones };
  };

  const { total, emails: hasEmails, phones: hasPhones } = getMatchedStats();

  const addLog = (type: LogEntry['type'], message: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp: time, type, message }]);
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Actual Broadcast Loop
  const startBroadcast = async () => {
    if (isSending) return;
    if (!emailSubject && (channel === 'email' || channel === 'both')) {
      return toast.error('Email subject is required');
    }
    if (!emailBody && (channel === 'email' || channel === 'both')) {
      return toast.error('Email body is required');
    }
    if (!smsBody && (channel === 'sms' || channel === 'both')) {
      return toast.error('SMS body is required');
    }
    if (!matchedMembers || matchedMembers.length === 0) {
      return toast.error('No members match the current filters');
    }

    setIsSending(true);
    setIsPaused(false);
    setCurrentProgress(0);
    setTotalTargets(matchedMembers.length);
    setStats({ sent: 0, failed: 0, skipped: 0 });
    setLogs([]);

    sendingRef.current = true;
    pausedRef.current = false;

    addLog('info', `🚀 Initializing ${isLiveMode ? 'LIVE' : 'SIMULATED'} broadcast campaign...`);
    addLog('info', `Target: ${matchedMembers.length} members`);
    addLog('info', `Channels: ${channel === 'both' ? 'Email & SMS' : channel.toUpperCase()}`);

    if (isLiveMode) {
      addLog('warning', '⚠️ Live Mode active! Actual API requests will be attempted.');
    } else {
      addLog('info', 'ℹ️ Running in Simulation/Sandbox mode. No actual messages will be sent.');
    }

    await sleep(1000);

    for (let i = 0; i < matchedMembers.length; i++) {
      // Check if cancelled/stopped
      if (!sendingRef.current) {
        addLog('warning', '🛑 Broadcast cancelled by administrator.');
        break;
      }

      // Check if paused
      while (pausedRef.current) {
        await sleep(500);
        if (!sendingRef.current) break;
      }
      if (!sendingRef.current) break;

      const member = matchedMembers[i];
      addLog('info', `Processing member: ${member.name} (${member.member_no})`);

      let emailSuccess = true;
      let smsSuccess = true;
      let emailSkipped = false;
      let smsSkipped = false;

      // 1. Handle Email Channel
      if (channel === 'email' || channel === 'both') {
        if (!member.email) {
          addLog('warning', `  [Email] Skipped - No email registered`);
          emailSkipped = true;
        } else {
          if (isLiveMode && hasEmailCreds) {
            try {
              // Direct browser API call
              const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${settings.resend_api_key}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: `${settings.society_name || 'Cooperative'} <onboarding@resend.dev>`,
                  to: member.email,
                  subject: emailSubject,
                  html: `<h3>${settings.society_name}</h3><p>${emailBody.replace(/\n/g, '<br/>')}</p>`,
                }),
              });
              if (response.ok) {
                addLog('success', `  [Email] Sent to ${member.email}`);
              } else {
                const errData = await response.json().catch(() => ({ message: 'Unknown error' }));
                throw new Error(errData.message || `HTTP ${response.status}`);
              }
            } catch (err: any) {
              addLog('error', `  [Email] Failed: ${err.message || err}. (Falling back to simulated log)`);
              emailSuccess = false;
            }
          } else {
            // Simulated delay
            await sleep(150);
            addLog('success', `  [Email] [MOCK] Sent to ${member.email}`);
          }
        }
      }

      // 2. Handle SMS Channel
      if (channel === 'sms' || channel === 'both') {
        if (!member.phone) {
          addLog('warning', `  [SMS] Skipped - No telephone number registered`);
          smsSkipped = true;
        } else {
          if (isLiveMode && hasSMSCreds) {
            try {
              // Call Twilio via Twilio's HTTP API (CORS might block this in browser, but we capture the response)
              const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${settings.twilio_sid}/Messages.json`, {
                method: 'POST',
                headers: {
                  'Authorization': 'Basic ' + btoa(`${settings.twilio_sid}:${settings.twilio_auth_token}`),
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  To: member.phone,
                  From: settings.twilio_from_number || '',
                  Body: smsBody,
                }),
              });
              if (response.ok) {
                addLog('success', `  [SMS] Sent to ${member.phone}`);
              } else {
                const errData = await response.json().catch(() => ({ message: 'Twilio error' }));
                throw new Error(errData.message || `HTTP ${response.status}`);
              }
            } catch (err: any) {
              addLog('error', `  [SMS] Failed: ${err.message || err}. (Falling back to simulated log)`);
              smsSuccess = false;
            }
          } else {
            // Simulated delay
            await sleep(150);
            addLog('success', `  [SMS] [MOCK] Sent to ${member.phone}`);
          }
        }
      }

      // Update statistics
      const wasSkipped = emailSkipped && smsSkipped;
      const wasFailed = (!emailSkipped && !emailSuccess) || (!smsSkipped && !smsSuccess);

      setStats(prev => ({
        sent: prev.sent + (wasSkipped || wasFailed ? 0 : 1),
        failed: prev.failed + (wasFailed ? 1 : 0),
        skipped: prev.skipped + (wasSkipped ? 1 : 0)
      }));

      setCurrentProgress(Math.round(((i + 1) / matchedMembers.length) * 100));
      await sleep(100); // Small interval between recipients
    }

    addLog('success', `🏁 Campaign finished! Sent: ${stats.sent + 1}, Failed: ${stats.failed}, Skipped: ${stats.skipped}`);
    setIsSending(false);
    sendingRef.current = false;
    toast.success('Broadcast campaign completed / විකාශන ව්‍යාපාරය අවසන් විය');
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
    pausedRef.current = !pausedRef.current;
    addLog('warning', pausedRef.current ? '⏸️ Broadcast paused.' : '▶️ Resuming broadcast...');
  };

  const stopBroadcast = () => {
    setIsSending(false);
    sendingRef.current = false;
    pausedRef.current = false;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-xl border border-gray-200 hover:border-primary hover:text-primary transition-all dark:border-gray-700"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text dark:text-text-dark">Bulk Broadcasts</h1>
          <p className="text-sm text-gray-400 mt-1">
            සාමාජිකයින් වෙත සමූහ පණිවිඩ යැවීම (Email & SMS)
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Megaphone size={18} className="text-primary" />
              Compose Message
            </h2>

            {/* Target Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Electoral Division</label>
                <select
                  value={divisionId}
                  onChange={(e) => setDivisionId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Divisions (සියලුම ආසන)</option>
                  {(divisions || []).map((d) => (
                    <option key={d.id} value={d.id}>{d.division_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                >
                  <option value="">All Categories (සියලුම කාණ්ඩ)</option>
                  {(categories || []).map((c) => (
                    <option key={c.id} value={c.id}>{c.category_name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Channel Selection */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase">Delivery Channel</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'both', label: 'Email & SMS', labelSi: 'විද්‍යුත් තැපෑල සහ SMS', icon: <Megaphone size={18} /> },
                  { id: 'email', label: 'Email Only', labelSi: 'තැපෑල පමණි', icon: <Mail size={18} /> },
                  { id: 'sms', label: 'SMS Only', labelSi: 'කෙටි පණිවිඩ පමණි', icon: <Phone size={18} /> },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setChannel(ch.id as any)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 text-center transition-all duration-200
                      ${channel === ch.id
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-100 hover:border-gray-200 text-gray-600 dark:border-gray-700 dark:hover:border-gray-600 dark:text-gray-300'
                      }`}
                  >
                    <div className="mb-2">{ch.icon}</div>
                    <span className="text-xs font-bold">{ch.label}</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">{ch.labelSi}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Email Composer */}
            {(channel === 'email' || channel === 'both') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-2"
              >
                <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Email Subject</label>
                  <input
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder="Enter broadcast subject..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Email Message Body (HTML supported)</label>
                  <textarea
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    rows={8}
                    placeholder="Write your email body here. HTML formatting is supported..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:bg-gray-800 dark:border-gray-600 dark:text-white font-sans"
                  />
                </div>
              </motion.div>
            )}

            {/* SMS Composer */}
            {(channel === 'sms' || channel === 'both') && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-2"
              >
                <div className="border-t border-gray-100 pt-4 dark:border-gray-700">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase">SMS Text Message</label>
                    <span className={`text-xs font-mono ${smsLength > 160 ? 'text-amber-500 font-bold' : 'text-gray-400'}`}>
                      {smsLength} / {smsCount} SMS ({160 * smsCount - smsLength} left)
                    </span>
                  </div>
                  <textarea
                    value={smsBody}
                    onChange={(e) => setSmsBody(e.target.value)}
                    rows={5}
                    placeholder="Enter SMS message text. Standard rates apply..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary dark:bg-gray-800 dark:border-gray-600 dark:text-white font-mono"
                  />
                  {smsLength > 160 && (
                    <p className="text-[11px] text-amber-500 flex items-center gap-1">
                      <AlertCircle size={12} /> Message length exceeds 160 characters. It will be sent as {smsCount} SMS segments.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Info & Control Bar */}
        <div className="space-y-6">
          {/* Target Audience Summary */}
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Target Audience</h3>
            {matchingLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{total}</p>
                      <p className="text-xs text-gray-400">Total Matched</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setDivisionId('');
                      setCategoryId('');
                    }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Reset filters
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="border border-gray-100 dark:border-gray-700 p-3 rounded-xl">
                    <p className="text-gray-400 flex items-center gap-1.5 mb-1">
                      <Mail size={13} /> Has Email
                    </p>
                    <p className="text-lg font-bold text-gray-700 dark:text-gray-200">
                      {hasEmails} <span className="text-[10px] text-gray-400 font-normal font-sans">({Math.round((hasEmails / (total || 1)) * 100)}%)</span>
                    </p>
                  </div>
                  <div className="border border-gray-100 dark:border-gray-700 p-3 rounded-xl">
                    <p className="text-gray-400 flex items-center gap-1.5 mb-1">
                      <Phone size={13} /> Has Phone
                    </p>
                    <p className="text-lg font-bold text-gray-700 dark:text-gray-200">
                      {hasPhones} <span className="text-[10px] text-gray-400 font-normal font-sans">({Math.round((hasPhones / (total || 1)) * 100)}%)</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mode Configuration Card */}
          <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Campaign Mode</h3>
            
            {isMessagingConfigured ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl text-green-700 dark:text-green-300">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    <CheckCircle size={14} /> Credentials Configured
                  </span>
                  <button
                    onClick={() => navigate('/settings')}
                    className="text-[10px] text-green-700 dark:text-green-400 underline"
                  >
                    Manage
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <span className="text-xs text-gray-600 dark:text-gray-300 ml-2">Live Sending Mode</span>
                  <button
                    onClick={() => setIsLiveMode(!isLiveMode)}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 outline-none
                      ${isLiveMode ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <div
                      className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all duration-300
                        ${isLiveMode ? 'left-[26px]' : 'left-0.5'}`}
                    />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl text-amber-700 dark:text-amber-300 text-xs leading-relaxed">
                  <p className="font-semibold flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={14} /> Simulation Mode Forced
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-amber-400/80">
                    No API keys (Resend or Twilio) are set in the Settings. Broadcaster will run a full simulation log.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/settings')}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-4 border border-gray-200 hover:border-primary text-gray-600 hover:text-primary rounded-xl text-xs font-semibold transition-all dark:border-gray-700"
                >
                  <SettingsIcon size={14} /> Setup Keys in Settings
                </button>
              </div>
            )}

            {/* Campaign Run Action */}
            <button
              onClick={startBroadcast}
              disabled={isSending || total === 0}
              className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm text-white transition-all shadow-md
                ${isSending || total === 0
                  ? 'bg-gray-300 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400'
                  : 'bg-primary hover:bg-primary-hover hover:shadow-lg'
                }`}
            >
              <Play size={16} />
              {isSending ? 'Campaign Running...' : 'Start Broadcast Campaign'}
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Log Overlay Drawer */}
      <AnimatePresence>
        {isSending && (
          <motion.div
            key="broadcast-progress-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-surface-dark rounded-2xl w-full max-w-2xl shadow-card overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Overlay Header */}
              <div className="bg-gray-50 dark:bg-gray-800 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RefreshCw className="animate-spin text-primary" size={18} />
                  <div>
                    <h3 className="font-bold text-gray-800 dark:text-gray-100">Broadcast Campaign in Progress</h3>
                    <p className="text-xs text-gray-400">
                      {isLiveMode ? 'Live sending mode' : 'Simulation mode'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={togglePause}
                    className="px-3 py-1.5 border border-gray-200 hover:border-amber-500 hover:text-amber-500 text-xs font-semibold rounded-lg dark:border-gray-700"
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={stopBroadcast}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1"
                  >
                    <Square size={12} /> Stop Campaign
                  </button>
                </div>
              </div>

              {/* Progress Tracker Bar */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-700 space-y-4">
                <div className="flex justify-between items-center text-sm font-semibold">
                  <span className="text-gray-600 dark:text-gray-300">Overall Progress</span>
                  <span className="text-primary font-mono text-base">{currentProgress}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${currentProgress}%` }}
                  />
                </div>

                {/* Counters */}
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                    <p className="text-lg font-bold font-mono text-gray-800 dark:text-gray-100">{totalTargets}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Total Target</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 p-2.5 rounded-xl border border-green-100 dark:border-green-900/30">
                    <p className="text-lg font-bold font-mono text-green-600">{stats.sent}</p>
                    <p className="text-[10px] text-green-500 uppercase font-semibold">Sent / Mocked</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/20 p-2.5 rounded-xl border border-red-100 dark:border-red-900/30">
                    <p className="text-lg font-bold font-mono text-red-600">{stats.failed}</p>
                    <p className="text-[10px] text-red-500 uppercase font-semibold">Failed</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                    <p className="text-lg font-bold font-mono text-amber-600">{stats.skipped}</p>
                    <p className="text-[10px] text-amber-500 uppercase font-semibold">Skipped</p>
                  </div>
                </div>
              </div>

              {/* Terminal Logs */}
              <div
                ref={logTerminalRef}
                className="flex-1 overflow-y-auto bg-gray-950 p-4 font-mono text-xs text-gray-300 space-y-2 min-h-[200px]"
              >
                {logs.map((log, index) => (
                  <div key={index} className="flex gap-2 items-start leading-relaxed">
                    <span className="text-gray-500 flex-shrink-0">[{log.timestamp}]</span>
                    <span className={`flex-1 ${
                      log.type === 'success' ? 'text-green-400' :
                      log.type === 'warning' ? 'text-amber-400' :
                      log.type === 'error' ? 'text-red-400 font-bold' :
                      'text-sky-300'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))}
                {logs.length === 0 && (
                  <div className="text-gray-600 italic">No campaign logs recorded yet...</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BroadcastPage;
