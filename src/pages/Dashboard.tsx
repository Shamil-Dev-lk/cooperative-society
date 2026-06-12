import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, DollarSign, TrendingUp, MapPin } from 'lucide-react';
import { memberService } from '@/services/memberService';
import { formatCurrency, formatNumber, formatDate } from '@/utils/dateUtils';
import { StatCardSkeleton, TableRowSkeleton } from '@/components/common/Skeleton';
import { useSettingsStore } from '@/stores/settingsStore';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const DashboardPage: React.FC = () => {
  const { settings } = useSettingsStore();

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

      {/* Chart */}
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
