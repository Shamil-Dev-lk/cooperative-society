import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, Moon, Sun, Bell, Plus, ChevronRight, CheckCircle2,
  Info, AlertTriangle, XCircle, Check, Trash2, X
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { formatDate } from '@/utils/dateUtils';

const routeTitles: Record<string, { title: string; titleSi: string }> = {
  '/dashboard': { title: 'Dashboard', titleSi: 'ප්‍රධාන පිටුව' },
  '/members': { title: 'Members', titleSi: 'සාමාජිකයන්' },
  '/members/add': { title: 'Add Member', titleSi: 'සාමාජිකයෙකු එක් කරන්න' },
  '/members/import': { title: 'Import Members', titleSi: 'සාමාජිකයන් ආනයනය කරන්න' },
  '/categories': { title: 'Categories', titleSi: 'කාණ්ඩ' },
  '/divisions': { title: 'Electoral Divisions', titleSi: 'ආසන' },
  '/reports': { title: 'Reports', titleSi: 'වාර්තා' },
  '/broadcast': { title: 'Broadcast', titleSi: 'විකාශනය' },
  '/users': { title: 'User Management', titleSi: 'පරිශීලකයන්' },
  '/settings': { title: 'Settings', titleSi: 'සැකසීම්' },
};

export const TopNav: React.FC = () => {
  const { toggleSidebar, toggleDarkMode, darkMode } = useUIStore();
  const { user, isAdmin } = useAuthStore((s) => ({ user: s.user, isAdmin: s.isAdmin() }));
  const { notifications, markAsRead, markAllAsRead, clearNotifications, unreadCount } = useNotificationStore();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isEditRoute = location.pathname.includes('/edit');
  const routeKey = isEditRoute ? '/members' : location.pathname;
  const pageInfo = routeTitles[routeKey] || { title: 'Page', titleSi: '' };
  const unreadNum = unreadCount();

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />;
      case 'warning': return <AlertTriangle size={16} className="text-amber-500 shrink-0" />;
      case 'error': return <XCircle size={16} className="text-red-500 shrink-0" />;
      default: return <Info size={16} className="text-blue-500 shrink-0" />;
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-700
      flex items-center justify-between px-3 sm:px-6 shadow-sm flex-shrink-0 relative z-30">
      {/* Left */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm min-w-0">
          <span className="text-gray-400 hidden sm:inline">System</span>
          <ChevronRight size={14} className="text-gray-300 hidden sm:inline" />
          <span className="font-semibold text-text dark:text-text-dark truncate">{pageInfo.title}</span>
          {pageInfo.titleSi && (
            <>
              <ChevronRight size={14} className="text-gray-300 hidden sm:inline" />
              <span className="text-gray-400 hidden sm:inline truncate">{pageInfo.titleSi}</span>
            </>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {location.pathname === '/members' && isAdmin && (
          <button
            onClick={() => navigate('/members/add')}
            className="hidden sm:flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-4 py-2
              rounded-xl text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Plus size={16} />
            Add Member
          </button>
        )}

        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Toggle dark mode"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadNum > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadNum > 9 ? '9+' : unreadNum}
              </span>
            )}
          </button>

          {/* Notifications Panel */}
          <AnimatePresence>
            {showNotifications && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-surface-dark border border-gray-150 dark:border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  {/* Panel Header */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-primary" />
                      <h3 className="font-bold text-sm text-text dark:text-text-dark">
                        Notifications / නිවේදන
                      </h3>
                      {unreadNum > 0 && (
                        <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                          {unreadNum} unread
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Panel Actions */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-2 bg-gray-50/30 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs">
                      <button
                        onClick={markAllAsRead}
                        className="flex items-center gap-1 text-primary hover:underline font-medium"
                      >
                        <Check size={13} /> Mark all as read
                      </button>
                      <button
                        onClick={clearNotifications}
                        className="flex items-center gap-1 text-gray-400 hover:text-red-500 font-medium transition-colors"
                      >
                        <Trash2 size={13} /> Clear all
                      </button>
                    </div>
                  )}

                  {/* Notifications List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                    {notifications.length === 0 ? (
                      <div className="py-12 text-center text-gray-400">
                        <Bell size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs">No notifications / නිවේදන නොමැත</p>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            markAsRead(n.id);
                            if (n.link) {
                              navigate(n.link);
                              setShowNotifications(false);
                            }
                          }}
                          className={`p-4 transition-colors cursor-pointer flex items-start gap-3 relative
                            ${!n.read ? 'bg-primary/5 dark:bg-primary/10 hover:bg-primary/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                          {getNotifIcon(n.type)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <p className={`text-xs font-semibold text-text dark:text-text-dark truncate ${!n.read ? 'font-bold text-primary' : ''}`}>
                                {n.title}
                              </p>
                              <span className="text-[10px] text-gray-400 shrink-0">
                                {formatDate(n.timestamp)}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-sans leading-tight">
                              {n.titleSi} — {n.message}
                            </p>
                          </div>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* User avatar */}
        <div className="flex items-center gap-2 ml-1 pl-2 border-l border-gray-100">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-text dark:text-text-dark truncate max-w-[120px]">
              {user?.email}
            </p>
            <p className="text-xs text-gray-400">{user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
