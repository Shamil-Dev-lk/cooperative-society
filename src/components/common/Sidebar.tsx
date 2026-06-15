import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Upload,
  Tag,
  MapPin,
  FileBarChart,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  UserCog,
  X,
  Megaphone,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { authService } from '@/services/authService';
import toast from 'react-hot-toast';

interface NavItem {
  to: string;
  label: string;
  labelSi: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', labelSi: 'ප්‍රධාන පිටුව', icon: <LayoutDashboard size={20} /> },
  { to: '/members', label: 'Members', labelSi: 'සාමාජිකයන්', icon: <Users size={20} /> },
  { to: '/members/import', label: 'Import', labelSi: 'ආනයනය', icon: <Upload size={20} /> },
  { to: '/categories', label: 'Categories', labelSi: 'කාණ්ඩ', icon: <Tag size={20} /> },
  { to: '/divisions', label: 'Divisions', labelSi: 'ආසන', icon: <MapPin size={20} /> },
  { to: '/reports', label: 'Reports', labelSi: 'වාර්තා', icon: <FileBarChart size={20} /> },
  { to: '/broadcast', label: 'Broadcast', labelSi: 'විකාශනය', icon: <Megaphone size={20} />, adminOnly: true },
  { to: '/users', label: 'Users', labelSi: 'පරිශීලකයන්', icon: <UserCog size={20} />, adminOnly: true },
  { to: '/settings', label: 'Settings', labelSi: 'සැකසීම්', icon: <Settings size={20} />, adminOnly: true },
];

export const Sidebar: React.FC = () => {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const { user, isAdmin, setUser } = useAuthStore();
  const { settings } = useSettingsStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Close sidebar on mobile route change
  useEffect(() => {
    const isMobile = window.innerWidth < 1024;
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, setSidebarOpen]);

  // Update CSS variable for main content margin on desktop
  useEffect(() => {
    const update = () => {
      const isMobile = window.innerWidth < 1024;
      if (isMobile) {
        document.documentElement.style.setProperty('--sidebar-width', '0px');
      } else {
        document.documentElement.style.setProperty('--sidebar-width', sidebarOpen ? '260px' : '72px');
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [sidebarOpen]);

  const handleLogout = async () => {
    try {
      await authService.signOut();
      setUser(null);
      navigate('/login');
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="hidden lg:flex fixed left-0 top-0 h-full z-40 flex-col shadow-xl overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #CC0000 0%, #8B0000 100%)' }}
      >
        <SidebarContent
          sidebarOpen={sidebarOpen}
          user={user}
          isAdmin={isAdmin}
          settings={settings}
          toggleSidebar={toggleSidebar}
          handleLogout={handleLogout}
          showToggle
        />
      </motion.aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            key="sidebar-mobile-drawer"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="lg:hidden fixed left-0 top-0 h-full z-40 flex flex-col shadow-2xl overflow-hidden"
            style={{
              width: 260,
              background: 'linear-gradient(180deg, #CC0000 0%, #8B0000 100%)',
            }}
          >
            <SidebarContent
              sidebarOpen={true}
              user={user}
              isAdmin={isAdmin}
              settings={settings}
              toggleSidebar={toggleSidebar}
              handleLogout={handleLogout}
              showToggle={false}
              showClose
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

/* ---- Shared sidebar inner content ---- */
interface SidebarContentProps {
  sidebarOpen: boolean;
  user: { email: string; role: string } | null;
  isAdmin: () => boolean;
  settings: { logo_url?: string; society_name?: string };
  toggleSidebar: () => void;
  handleLogout: () => void;
  showToggle?: boolean;
  showClose?: boolean;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  sidebarOpen,
  user,
  isAdmin,
  settings,
  toggleSidebar,
  handleLogout,
  showToggle = false,
  showClose = false,
}) => (
  <>
    {/* Logo / Header */}
    <div className="flex items-center px-4 py-5 border-b border-white/10">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/20 flex-shrink-0">
        {settings.logo_url ? (
          <img src={settings.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded" />
        ) : (
          <Building2 size={22} className="text-white" />
        )}
      </div>
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="sidebar-logo-text"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="ml-3 overflow-hidden flex-1"
          >
            <p className="text-white font-bold text-sm leading-tight truncate max-w-[150px]">
              {settings.society_name}
            </p>
            <p className="text-white/60 text-xs truncate">Management System</p>
          </motion.div>
        )}
      </AnimatePresence>
      {showClose && (
        <button
          onClick={toggleSidebar}
          className="ml-auto p-1 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      )}
    </div>

    {/* Navigation */}
    <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
      {navItems.map((item) => {
        if (item.adminOnly && !isAdmin()) return null;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/members'}
            className={({ isActive }) =>
              `flex items-center mx-2 mb-1 rounded-xl transition-all duration-200 group relative
              ${isActive
                ? 'bg-white/20 text-white shadow-sm'
                : 'text-white/70 hover:bg-white/10 hover:text-white'
              }
              ${sidebarOpen ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'}`
            }
          >
            <span className="flex-shrink-0 flex items-center justify-center w-6">
              {item.icon}
            </span>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.div
                  key={`sidebar-item-text-${item.to}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="ml-3 overflow-hidden"
                >
                  <p className="text-sm font-medium whitespace-nowrap">{item.label}</p>
                  <p className="text-xs text-white/60 whitespace-nowrap">{item.labelSi}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tooltip when collapsed (desktop only) */}
            {!sidebarOpen && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg
                opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </div>
            )}
          </NavLink>
        );
      })}
    </nav>

    {/* User info & logout */}
    <div className="border-t border-white/10 p-3">
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="sidebar-user"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-2 px-2"
          >
            <p className="text-white/80 text-xs truncate">{user?.email}</p>
            <span className="inline-block bg-white/20 text-white text-xs px-2 py-0.5 rounded-full mt-1">
              {user?.role}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={handleLogout}
        className={`flex items-center w-full text-white/70 hover:text-white hover:bg-white/10
          rounded-xl transition-all duration-200 py-2.5 ${sidebarOpen ? 'px-3' : 'justify-center px-0'}`}
      >
        <LogOut size={18} className="flex-shrink-0" />
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              key="sidebar-logout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="ml-3 text-sm font-medium"
            >
              Logout / පිටවීම
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </div>

    {/* Desktop toggle button */}
    {showToggle && (
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 bg-white rounded-full shadow-lg border border-gray-200
          flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all duration-200 z-50"
      >
        {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    )}
  </>
);
