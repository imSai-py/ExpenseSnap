import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, AlertTriangle, TrendingUp } from 'lucide-react';
import { api } from '../services/api';
import { useIsMobile } from '../hooks/useIsMobile';
import type { NotificationHistoryItem } from '../types';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Prevent body scroll when mobile bottom sheet is open
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isMobile, isOpen]);

  const fetchUnreadCount = async () => {
    try {
      const count = await api.getUnreadNotificationCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getNotificationHistory(false, 20);
      setNotifications(response.notifications);
      setUnreadCount(response.unread_count);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markNotificationAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteNotification(id);
      const deleted = notifications.find(n => n.id === id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (deleted && !deleted.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'budget_alert':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'daily_reminder':
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const NotificationContent = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
        <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Notifications</h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
          {isMobile && (
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`overflow-y-auto ${isMobile ? 'max-h-[60vh]' : 'max-h-80'}`}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--color-brand)' }}></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-sm" style={{ color: 'var(--color-danger)' }}>{error}</div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>
            <Bell className="w-8 h-8 opacity-20 mb-3" />
            <p className="font-medium">No notifications</p>
            <p className="text-sm text-opacity-80">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-divider)' }}>
            {notifications.map(notification => (
              <div
                key={notification.id}
                className={`flex gap-3 p-4 border-b last:border-0 transition-colors ${notification.is_read ? '' : 'font-medium'}`}
                style={{
                  backgroundColor: notification.is_read ? 'transparent' : 'var(--color-brand-bg)',
                  borderColor: 'var(--color-divider)'
                }}
              >
                <div className="flex-shrink-0 mt-1">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm leading-snug" style={{ color: notification.is_read ? 'var(--color-text-secondary)' : 'var(--color-text-primary)' }}>
                      {notification.title}
                    </p>
                    <span className="text-xs mt-1 font-normal" style={{ color: 'var(--color-text-tertiary)' }}>
                      {formatTimeAgo(notification.created_at)}
                    </span>
                  </div>
                  <p className="text-sm mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>{notification.message}</p>
                  {notification.data?.percentage && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
                          <div
                            className={`h-full rounded-full ${
                              notification.data.percentage >= 100
                                ? 'bg-red-500'
                                : notification.data.percentage >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(notification.data.percentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                          {notification.data.percentage}%
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {!notification.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="p-1.5 rounded-lg transition-colors group relative"
                        style={{ color: 'var(--color-brand)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-brand-bg)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notification.id)}
                      className="p-1.5 rounded-lg transition-colors group relative"
                      style={{ color: 'var(--color-text-secondary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleBellClick}
        className={`relative p-2 rounded-xl transition-all ${className} ${isOpen ? 'bg-black/5 dark:bg-white/10' : ''}`}
        style={isOpen ? { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-brand)' } : { color: 'var(--color-text-secondary)' }}
        onMouseEnter={(e) => { if (!isOpen) { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; e.currentTarget.style.color = 'var(--color-text-primary)'; } }}
        onMouseLeave={(e) => { if (!isOpen) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-secondary)'; } }}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-5 h-5 md:w-6 md:h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 transform translate-x-1/4 -translate-y-1/4 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white rounded-full border-2"
            style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-bg-primary)' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Desktop Dropdown */}
      {isOpen && !isMobile && (
        <div
          className="absolute right-0 mt-2 w-80 md:w-96 rounded-2xl shadow-xl border overflow-hidden z-50 transform origin-top-right transition-all animate-in fade-in slide-in-from-top-2"
          style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
        >
          <NotificationContent />
        </div>
      )}

      {/* Mobile Bottom Sheet */}
      {isOpen && isMobile && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            onClick={() => setIsOpen(false)}
          />
          {/* Bottom Sheet */}
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl shadow-xl animate-slide-up" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <div className="w-12 h-1.5 rounded-full mx-auto mt-3 mb-1" style={{ backgroundColor: 'var(--color-border)' }} />
            <NotificationContent />
            {/* Safe area padding for iOS */}
            <div className="h-safe-area-inset-bottom" />
          </div>
        </>
      )}
    </div>
  );
}
