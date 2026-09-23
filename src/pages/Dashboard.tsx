import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, DollarSign, TrendingUp, MapPin, Bell, CheckCircle2,
  Info, AlertTriangle, XCircle, Check, Trash2, ArrowRight
} from 'lucide-react';
import { memberService } from '@/services/memberService';
import { formatCurrency, formatNumber, formatDate } from '@/utils/dateUtils';
import { StatCardSkeleton, TableRowSkeleton } from '@/components/common/Skeleton';
import { useSettingsStore } from '@/stores/settingsStore';
import { useNotificationStore } from '@/stores/notificationStore';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettingsStore();
  const { notifications, markAsRead, markAllAsRead, clearNotifications, unreadCount } = useNotificationStore();
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => memberService.getDashboardStats(),
    staleTime: 0,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: monthlyData, isLoading: chartLoading } = useQuery({
    queryKey: ['monthly-registrations'],
    queryFn: () => memberService.getMonthlyRegistrations(12),
    staleTime: 0,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });

  const { data: recentMembers, isLoading: recentLoading } = useQuery({
    queryKey: ['recent-members'],
    queryFn: () => memberService.getRecentMembers(10),
    staleTime: 0,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const statCards = [
    {
      title: 'Total Members',
      titleSi: 'සාමාජිකයින් සංඛ්‍යාව',
      value: statsLoading ? '—' : formatNumber(stats?.totalMembers ?? 0),
      icon: <Users size={22} className="text-white" />,
      color: 'from-red-500 to-red-700',
      bg: 'bg-red-50',
    },
    {
      title: 'Total Capital',
      titleSi: 'මුළු ප්‍රාග්ධනය',
      value: statsLoading ? '—' : formatCurrency(stats?.totalShareCapital ?? 0),
      icon: <DollarSign size={22} className="text-white" />,
      color: 'from-emerald-500 to-emerald-700',
      bg: 'bg-emerald-50',
    },
    {
      title: 'New This Month',
      titleSi: 'මෙම මාසයේ නව සාමාජිකයන්',
      value: statsLoading ? '—' : formatNumber(stats?.newMembersThisMonth ?? 0),
      icon: <TrendingUp size={22} className="text-white" />,
      color: 'from-blue-500 to-blue-700',
      bg: 'bg-blue-50',
    },
    {
      title: 'Electoral Divisions',
      titleSi: 'ආසන සංඛ්‍යාව',
      value: statsLoading ? '—' : formatNumber(stats?.totalDivisions ?? 0),
      icon: <MapPin size={22} className="text-white" />,
      color: 'from-purple-500 to-purple-700',
      bg: 'bg-purple-50',
    },
  ];

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />;
      case 'warning': return <AlertTriangle size={16} className="text-amber-500 shrink-0" />;
      case 'error': return <XCircle size={16} className="text-red-500 shrink-0" />;
      default: return <Info size={16} className="text-blue-500 shrink-0" />;
    }
  };

  const filteredNotifications = notifFilter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadNum = unreadCount();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text dark:text-text-dark">
          {settings.society_name}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          ආයුබෝවන් — Welcome to your management dashboard
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : statCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">
                    {card.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.titleSi}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}>
                  {card.icon}
                </div>
              </div>
              <p className="text-2xl font-bold text-text dark:text-text-dark">{card.value}</p>
            </motion.div>
          ))}
      </div>

      {/* Chart & Quick Summary */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-card">
          <h2 className="font-semibold text-text dark:text-text-dark mb-1">Monthly Registrations</h2>
          <p className="text-xs text-gray-400 mb-5">මාසික ලියාපදිංචිය — Last 12 months</p>
          {chartLoading ? (
            <div className="h-52 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData || []} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#CC0000" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#CC0000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#888' }} />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#CC0000"
                  strokeWidth={2.5}
                  fill="url(#colorCount)"
                  dot={{ fill: '#CC0000', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#CC0000' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick stats sidebar */}
        <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-card">
          <h2 className="font-semibold text-text dark:text-text-dark mb-1">Quick Summary</h2>
          <p className="text-xs text-gray-400 mb-5">ක්ෂණික සාරාංශය</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <span className="text-sm text-gray-600 dark:text-gray-300">Total Members</span>
              <span className="font-bold text-primary">{formatNumber(stats?.totalMembers ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <span className="text-sm text-gray-600 dark:text-gray-300">Total Capital</span>
              <span className="font-bold text-emerald-600">Rs. {formatNumber(stats?.totalShareCapital ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <span className="text-sm text-gray-600 dark:text-gray-300">New This Month</span>
              <span className="font-bold text-blue-600">{formatNumber(stats?.newMembersThisMonth ?? 0)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
              <span className="text-sm text-gray-600 dark:text-gray-300">Divisions</span>
              <span className="font-bold text-purple-600">{formatNumber(stats?.totalDivisions ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD NOTIFICATIONS & SYSTEM ALERTS SECTION */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-gray-100 dark:border-gray-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Bell size={20} />
            </div>
            <div>
              <h2 className="font-bold text-text dark:text-text-dark text-base flex items-center gap-2">
                System Notifications & Alerts
                {unreadNum > 0 && (
                  <span className="bg-primary text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadNum} New
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">පද්ධති නිවේදන සහ දැනුම්දීම්</p>
            </div>
          </div>

          {/* Filter Tabs & Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button
                onClick={() => setNotifFilter('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  notifFilter === 'all'
                    ? 'bg-white dark:bg-surface-dark text-text dark:text-text-dark shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setNotifFilter('unread')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  notifFilter === 'unread'
                    ? 'bg-white dark:bg-surface-dark text-text dark:text-text-dark shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Unread ({unreadNum})
              </button>
            </div>

            {notifications.length > 0 && (
              <div className="flex items-center gap-1.5 ml-1">
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-primary hover:underline font-semibold px-2 py-1"
                >
                  <Check size={13} /> Mark Read
                </button>
                <button
                  onClick={clearNotifications}
                  className="flex items-center gap-1 text-gray-400 hover:text-red-500 font-semibold px-2 py-1 transition-colors"
                >
                  <Trash2 size={13} /> Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredNotifications.length === 0 ? (
              <div className="col-span-full py-8 text-center text-gray-400">
                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs">No notifications found / නිවේදන නොමැත</p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => {
                    markAsRead(n.id);
                    if (n.link) navigate(n.link);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between
                    ${!n.read
                      ? 'bg-primary/5 dark:bg-primary/10 border-primary/30 hover:border-primary shadow-sm'
                      : 'bg-gray-50/50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                    }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {getNotifIcon(n.type)}
                        <h3 className={`text-xs font-bold text-text dark:text-text-dark ${!n.read ? 'text-primary' : ''}`}>
                          {n.title}
                        </h3>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {formatDate(n.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-300 font-medium leading-relaxed mb-1">
                      {n.titleSi}
                    </p>
                    <p className="text-xs text-gray-400 leading-snug">
                      {n.message}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-[11px]">
                    <span className="text-primary font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View details <ArrowRight size={12} />
                    </span>
                    {!n.read && (
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Recent Members Table */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-card overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-text dark:text-text-dark">Recent Members</h2>
          <p className="text-xs text-gray-400 mt-1">අලුතින් ලියාපදිංචි වූ සාමාජිකයන් — Last 10</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Member No', 'Name / නම', 'NIC', 'Division', 'Joined Date', 'Share Amount'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {recentLoading
                ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                : (recentMembers || []).map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{m.member_no}</td>
                    <td className="px-4 py-3 font-medium text-text dark:text-text-dark">{m.name}</td>
                    <td className="px-4 py-3 text-gray-500">{m.nic}</td>
                    <td className="px-4 py-3 text-gray-500">{m.electoral_division?.division_name || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(m.joined_date)}</td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">
                      Rs. {formatNumber(m.share_amount || 0)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
