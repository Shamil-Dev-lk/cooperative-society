import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Sun, Bell, Plus, ChevronRight } from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';

const routeTitles: Record<string, { title: string; titleSi: string }> = {
  '/dashboard': { title: 'Dashboard', titleSi: 'ප්‍රධාන පිටුව' },
  '/members': { title: 'Members', titleSi: 'සාමාජිකයන්' },
  '/members/add': { title: 'Add Member', titleSi: 'සාමාජිකයෙකු එක් කරන්න' },
  '/members/import': { title: 'Import Members', titleSi: 'සාමාජිකයන් ආනයනය කරන්න' },
  '/categories': { title: 'Categories', titleSi: 'කාණ්ඩ' },
  '/divisions': { title: 'Electoral Divisions', titleSi: 'ආසන' },
  '/reports': { title: 'Reports', titleSi: 'වාර්තා' },
  '/users': { title: 'User Management', titleSi: 'පරිශීලකයන්' },
  '/settings': { title: 'Settings', titleSi: 'සැකසීම්' },
};

export const TopNav: React.FC = () => {
  const { toggleSidebar, toggleDarkMode, darkMode } = useUIStore();
  const { user, isAdmin } = useAuthStore((s) => ({ user: s.user, isAdmin: s.isAdmin() }));
  const location = useLocation();
  const navigate = useNavigate();

  const isEditRoute = location.pathname.includes('/edit');
  const routeKey = isEditRoute ? '/members' : location.pathname;
  const pageInfo = routeTitles[routeKey] || { title: 'Page', titleSi: '' };

  return (
    <header className="h-16 bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-700
      flex items-center justify-between px-3 sm:px-6 shadow-sm flex-shrink-0">
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

        <button
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>

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
