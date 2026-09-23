import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SystemNotification {
  id: string;
  title: string;
  titleSi: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  link?: string;
}

interface NotificationState {
  notifications: SystemNotification[];
  addNotification: (n: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  unreadCount: () => number;
}

const initialNotifications: SystemNotification[] = [
  {
    id: 'notif-1',
    title: 'High-Speed Import Complete',
    titleSi: 'අතිවේගී ආනයනය සාර්ථකයි',
    message: '25,858 members active across all 23 electoral divisions.',
    type: 'success',
    timestamp: new Date().toISOString(),
    read: false,
    link: '/members',
  },
  {
    id: 'notif-2',
    title: 'Divisions Fully Populated',
    titleSi: 'ඡන්ද කොට්ඨාස 23ම සක්‍රීයයි',
    message: 'All 23 divisions (Wambatuwewa, Katagamuwa, Halmillawa, etc.) loaded successfully.',
    type: 'info',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    read: false,
    link: '/divisions',
  },
  {
    id: 'notif-3',
    title: 'System Ready',
    titleSi: 'පද්ධතිය සූදානම්',
    message: 'Cooperative Society Management System is operating normally.',
    type: 'info',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    read: true,
    link: '/dashboard',
  },
];

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: initialNotifications,
      addNotification: (n) => {
        const newNotif: SystemNotification = {
          ...n,
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          timestamp: new Date().toISOString(),
          read: false,
        };
        set((state) => ({
          notifications: [newNotif, ...state.notifications],
        }));
      },
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },
      clearNotifications: () => {
        set({ notifications: [] });
      },
      unreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
    }),
    {
      name: 'coop-notifications-storage',
    }
  )
);
