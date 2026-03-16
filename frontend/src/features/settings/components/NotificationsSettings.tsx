import { useState, useEffect } from 'react';
import { ArrowLeft, Bell, AlertCircle, CheckCircle, XCircle, Smartphone, Loader2, Send } from 'lucide-react';
import { api } from '../../../shared/services/api';
import { usePushNotifications } from '../../../shared/hooks/usePushNotifications';

interface NotificationsSettingsProps {
  onClose: () => void;
}

type PermissionUIState = 'idle' | 'explaining' | 'requesting';

export function NotificationsSettings({ onClose }: NotificationsSettingsProps) {
  const [dailyReminders, setDailyReminders] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [permissionUIState, setPermissionUIState] = useState<PermissionUIState>('idle');

  const {
    permission,
    isSubscribed,
    isLoading: pushLoading,
    error: pushError,
    serviceWorkerReady,
    isPushSupported,
    subscribe,
    unsubscribe,
    sendTestNotification,
    clearError,
  } = usePushNotifications();

  useEffect(() => {
    loadNotifications();
  }, []);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const notifications = await api.getNotifications();
      setDailyReminders(notifications.daily_reminders);
      setBudgetAlerts(notifications.budget_alerts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: 'daily_reminders' | 'budget_alerts', value: boolean) => {
    // If turning on a notification and we don't have push permission, show permission UI
    if (value && !isSubscribed && permission !== 'granted') {
      setPermissionUIState('explaining');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      clearError();

      if (key === 'daily_reminders') {
        setDailyReminders(value);
      } else {
        setBudgetAlerts(value);
      }

      await api.updateNotifications({ [key]: value });

      // If enabling and not subscribed, subscribe to push
      if (value && !isSubscribed && permission === 'granted') {
        await subscribe();
      }
    } catch (err) {
      // Revert on error
      if (key === 'daily_reminders') {
        setDailyReminders(!value);
      } else {
        setBudgetAlerts(!value);
      }
      setError(err instanceof Error ? err.message : 'Failed to update notification');
    } finally {
      setSaving(false);
    }
  };

  const handleEnablePushNotifications = async () => {
    setPermissionUIState('requesting');
    clearError();

    const success = await subscribe();

    if (success) {
      setSuccessMessage('Push notifications enabled successfully!');
      setPermissionUIState('idle');
    } else {
      // Permission was denied or there was an error
      setPermissionUIState('idle');
    }
  };

  const handleDisablePushNotifications = async () => {
    setSaving(true);
    clearError();

    const success = await unsubscribe();

    if (success) {
      // Also turn off notification preferences
      try {
        await api.updateNotifications({ daily_reminders: false, budget_alerts: false });
        setDailyReminders(false);
        setBudgetAlerts(false);
        setSuccessMessage('Push notifications disabled');
      } catch (err) {
        setError('Failed to update preferences');
      }
    }

    setSaving(false);
  };

  const handleSendTestNotification = async () => {
    setSaving(true);
    clearError();

    const success = await sendTestNotification();

    if (success) {
      setSuccessMessage('Test notification sent! Check your notifications.');
    }

    setSaving(false);
  };

  // Permission explanation modal
  const renderPermissionExplanation = () => (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'var(--color-overlay)' }}>
      <div className="rounded-2xl max-w-md w-full p-6 shadow-xl" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand-bg)' }}>
            <Bell className="w-6 h-6" style={{ color: 'var(--color-brand)' }} />
          </div>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Enable Notifications</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Stay on top of your finances</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
            To receive reminders and alerts, ExpenseSnap needs permission to send you notifications.
          </p>

          <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-success)' }} />
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>Daily Reminders</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Get reminded to log your expenses</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-success)' }} />
              <div>
                <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>Budget Alerts</p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Know when you're approaching your limits</p>
              </div>
            </div>
          </div>

          {permission === 'denied' && (
            <div className="border rounded-xl p-4" style={{ backgroundColor: 'var(--color-danger-bg)', borderColor: 'var(--color-danger)' }}>
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--color-danger)' }}>Permission Previously Denied</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                    You'll need to enable notifications in your browser settings. Click the lock icon in your address bar and allow notifications for this site.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setPermissionUIState('idle')}
            className="flex-1 px-4 py-3 border rounded-xl font-medium transition-colors"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Not Now
          </button>
          {permission !== 'denied' && (
            <button
              onClick={handleEnablePushNotifications}
              disabled={pushLoading}
              className="flex-1 px-4 py-3 rounded-xl text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--color-brand)' }}
            >
              {pushLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enabling...
                </>
              ) : (
                'Enable Notifications'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Push status indicator
  const renderPushStatus = () => {
    // Show loading state while service worker is initializing
    if (pushLoading && !serviceWorkerReady) {
      return (
        <div className="border rounded-xl p-4 flex items-center gap-3" style={{ backgroundColor: 'var(--color-bg-subtle)', borderColor: 'var(--color-border)' }}>
          <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} />
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>Initializing...</p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Setting up push notifications</p>
          </div>
        </div>
      );
    }

    if (!isPushSupported) {
      return (
        <div className="bg-[#FEF3C7] border border-[#FCD34D] rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[#92400E] font-medium text-sm">Browser Not Supported</p>
            <p className="text-[#B45309] text-xs mt-1">
              Your browser doesn't support push notifications. Try Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      );
    }

    if (permission === 'denied') {
      return (
        <div className="border rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: 'var(--color-danger-bg)', borderColor: 'var(--color-danger)' }}>
          <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
          <div>
            <p className="font-medium text-sm" style={{ color: 'var(--color-danger)' }}>Notifications Blocked</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
              Enable notifications in your browser settings to receive reminders and alerts.
            </p>
          </div>
        </div>
      );
    }

    if (isSubscribed) {
      return (
        <div className="border rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: 'var(--color-success-bg)', borderColor: 'var(--color-success)' }}>
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-success)' }} />
          <div className="flex-1">
            <p className="font-medium text-sm" style={{ color: 'var(--color-success)' }}>Notifications Enabled</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-success)' }}>
              You'll receive push notifications on this device.
            </p>
          </div>
          <button
            onClick={handleSendTestNotification}
            disabled={saving || pushLoading}
            className="p-2 rounded-lg transition-colors disabled:opacity-50"
            style={{ color: 'var(--color-success)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-success-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Send test notification"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => setPermissionUIState('explaining')}
        className="w-full border rounded-xl p-4 flex items-center gap-3 transition-colors"
        style={{ backgroundColor: 'var(--color-brand-bg)', borderColor: 'var(--color-brand)' }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand)' }}>
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium text-sm" style={{ color: 'var(--color-brand)' }}>Enable Push Notifications</p>
          <p className="text-xs" style={{ color: 'var(--color-brand)' }}>Tap to receive reminders on this device</p>
        </div>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="px-4 py-4 shadow-sm flex items-center gap-3" style={{ backgroundColor: 'var(--color-bg-card)' }}>
          <button onClick={onClose} className="p-2 -ml-2 rounded-xl transition-colors" style={{ color: 'var(--color-text-primary)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Notifications</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-brand)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
      {/* Permission Modal */}
      {permissionUIState !== 'idle' && renderPermissionExplanation()}

      {/* Header */}
      <div className="px-4 py-4 shadow-sm flex items-center gap-3" style={{ backgroundColor: 'var(--color-bg-card)' }}>
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-xl transition-colors"
          style={{ color: 'var(--color-text-primary)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Notifications</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-md mx-auto px-4 py-6 space-y-4">
          {/* Error Message */}
          {(error || pushError) && (
            <div className="border rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: 'var(--color-danger-bg)', borderColor: 'var(--color-danger)' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
              <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error || pushError}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="border rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: 'var(--color-success-bg)', borderColor: 'var(--color-success)' }}>
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-success)' }} />
              <p className="text-sm" style={{ color: 'var(--color-success)' }}>{successMessage}</p>
            </div>
          )}

          {/* Push Status Card */}
          {renderPushStatus()}

          {/* Notification Preferences */}
          <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Notification Preferences</h3>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                Control how and when you receive notifications.
              </p>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--color-divider)' }}>
              {/* Daily Reminders Toggle */}
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand-bg)' }}>
                    <Bell className="w-5 h-5" style={{ color: 'var(--color-brand)' }} />
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Daily Reminders</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Get reminded to log your expenses daily</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('daily_reminders', !dailyReminders)}
                  disabled={saving || pushLoading}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${saving || pushLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{ backgroundColor: dailyReminders ? 'var(--color-brand)' : 'var(--color-border)' }}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${dailyReminders ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>

              {/* Budget Alerts Toggle */}
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#FEF3C7] rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Budget Alerts</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Get notified when approaching budget limits</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('budget_alerts', !budgetAlerts)}
                  disabled={saving || pushLoading}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${saving || pushLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{ backgroundColor: budgetAlerts ? 'var(--color-brand)' : 'var(--color-border)' }}
                >
                  <span
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${budgetAlerts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Disable Push Notifications Button */}
          {isSubscribed && (
            <button
              onClick={handleDisablePushNotifications}
              disabled={saving || pushLoading}
              className="w-full py-3 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
              style={{ color: 'var(--color-danger)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {saving ? 'Disabling...' : 'Disable Push Notifications on This Device'}
            </button>
          )}

          <p className="text-center text-xs px-4" style={{ color: 'var(--color-text-tertiary)' }}>
            Push notifications are sent to each device separately. Enable them on all devices where you want to receive alerts.
          </p>
        </div>
      </div>
    </div>
  );
}
