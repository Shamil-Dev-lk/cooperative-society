import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCircle2, AlertTriangle, XCircle, Info, Check, Trash2,
  Search, ArrowRight, ShieldCheck, RefreshCw, Layers
} from 'lucide-react';
import { useNotificationStore, type SystemNotification } from '@/stores/notificationStore';
import { formatDate } from '@/utils/dateUtils';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead, markAllAsRead, clearNotifications, unreadCount } = useNotificationStore();
  
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'success' | 'info' | 'warning' | 'error'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const unreadNum = unreadCount();

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-amber-500 shrink-0" />;
      case 'error':
        return <XCircle size={20} className="text-red-500 shrink-0" />;
      default:
        return <Info size={20} className="text-blue-500 shrink-0" />;
    }
  };

  const getNotifBadge = (type: string) => {
    switch (type) {
      case 'success':
        return <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Success</span>;
      case 'warning':
        return <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Warning</span>;
      case 'error':
        return <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Error</span>;
      default:
        return <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Info</span>;
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    // Type Filter
    if (filterType === 'unread' && n.read) return false;
    if (filterType !== 'all' && filterType !== 'unread' && n.type !== filterType) return false;
    
    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(q) ||
        n.titleSi.toLowerCase().includes(q) ||
        n.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header Banner */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-primary">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Bell size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text dark:text-text-dark flex items-center gap-2">
                System Notifications & Alerts
                {unreadNum > 0 && (
                  <span className="bg-primary text-white text-xs font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                    {unreadNum} New
                  </span>
                )}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">පද්ධති නිවේදන සහ දැනුම්දීම් මධ්‍යස්ථානය</p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <>
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
              >
                <Check size={14} /> Mark all read
              </button>
              <button
                onClick={clearNotifications}
                className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all"
              >
                <Trash2 size={14} /> Clear all
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-surface-dark rounded-2xl p-4 shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications... / සෙවීම"
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs bg-gray-50 dark:bg-gray-800 text-text dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 flex-wrap w-full md:w-auto text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              filterType === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilterType('unread')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              filterType === 'unread'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Unread ({unreadNum})
          </button>
          <button
            onClick={() => setFilterType('success')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              filterType === 'success'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Success
          </button>
          <button
            onClick={() => setFilterType('info')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
              filterType === 'info'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Info
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredNotifications.length === 0 ? (
            <div className="bg-white dark:bg-surface-dark rounded-2xl p-12 text-center text-gray-400 shadow-card">
              <Bell size={40} className="mx-auto mb-3 opacity-20 text-gray-400" />
              <p className="text-sm font-semibold">No notifications found</p>
              <p className="text-xs text-gray-400 mt-1">දැනට කිසිදු නිවේදනයක් නොමැත</p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => {
                  markAsRead(n.id);
                  if (n.link) navigate(n.link);
                }}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative group flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-card hover:shadow-card-hover
                  ${!n.read
                    ? 'bg-primary/5 dark:bg-primary/10 border-primary/40 hover:border-primary'
                    : 'bg-white dark:bg-surface-dark border-gray-150 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">{getNotifIcon(n.type)}</div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className={`text-sm font-bold text-text dark:text-text-dark ${!n.read ? 'text-primary' : ''}`}>
                        {n.title}
                      </h3>
                      {getNotifBadge(n.type)}
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-0.5">
                      {n.titleSi}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                      {n.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 dark:border-gray-700 text-xs shrink-0">
                  <span className="text-[11px] font-mono text-gray-400">
                    {formatDate(n.timestamp)}
                  </span>
                  {n.link && (
                    <span className="text-primary font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View details <ArrowRight size={13} />
                    </span>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NotificationsPage;
