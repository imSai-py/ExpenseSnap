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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-[#EEF2FF] rounded-xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-[#4F46E5]" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[#111827]">Enable Notifications</h3>
            <p className="text-sm text-[#6B7280]">Stay on top of your finances</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-[#374151] text-sm">
            To receive reminders and alerts, ExpenseSnap needs permission to send you notifications.
          </p>

          <div className="bg-[#F9FAFB] rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#111827] font-medium text-sm">Daily Reminders</p>
                <p className="text-[#6B7280] text-xs">Get reminded to log your expenses</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[#111827] font-medium text-sm">Budget Alerts</p>
                <p className="text-[#6B7280] text-xs">Know when you're approaching your limits</p>
              </div>
            </div>
          </div>

          {permission === 'denied' && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[#DC2626] font-medium text-sm">Permission Previously Denied</p>
                  <p className="text-[#B91C1C] text-xs mt-1">
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
            className="flex-1 px-4 py-3 border border-[#E5E7EB] rounded-xl text-[#374151] font-medium hover:bg-[#F9FAFB] transition-colors"
          >
            Not Now
          </button>
          {permission !== 'denied' && (
            <button
              onClick={handleEnablePushNotifications}
              disabled={pushLoading}
              className="flex-1 px-4 py-3 bg-[#4F46E5] rounded-xl text-white font-medium hover:bg-[#4338CA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
        <div className="bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-[#6B7280] animate-spin flex-shrink-0" />
          <div>
            <p className="text-[#374151] font-medium text-sm">Initializing...</p>
            <p className="text-[#6B7280] text-xs">Setting up push notifications</p>
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
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[#DC2626] font-medium text-sm">Notifications Blocked</p>
            <p className="text-[#B91C1C] text-xs mt-1">
              Enable notifications in your browser settings to receive reminders and alerts.
            </p>
          </div>
        </div>
      );
    }

    if (isSubscribed) {
      return (
        <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[#065F46] font-medium text-sm">Notifications Enabled</p>
            <p className="text-[#047857] text-xs mt-1">
              You'll receive push notifications on this device.
            </p>
          </div>
          <button
            onClick={handleSendTestNotification}
            disabled={saving || pushLoading}
            className="p-2 hover:bg-[#D1FAE5] rounded-lg transition-colors disabled:opacity-50"
            title="Send test notification"
          >
            <Send className="w-4 h-4 text-[#10B981]" />
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => setPermissionUIState('explaining')}
        className="w-full bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl p-4 flex items-center gap-3 hover:bg-[#E0E7FF] transition-colors"
      >
        <div className="w-10 h-10 bg-[#4F46E5] rounded-xl flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-[#4F46E5] font-medium text-sm">Enable Push Notifications</p>
          <p className="text-[#6366F1] text-xs">Tap to receive reminders on this device</p>
        </div>
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-[#F9FAFB]">
        <div className="bg-white px-4 py-4 shadow-sm flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-[#F3F4F6] rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-[#111827]" />
          </button>
          <h1 className="text-xl font-semibold text-[#111827]">Notifications</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F9FAFB]">
      {/* Permission Modal */}
      {permissionUIState !== 'idle' && renderPermissionExplanation()}

      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-2 -ml-2 hover:bg-[#F3F4F6] rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#111827]" />
        </button>
        <h1 className="text-xl font-semibold text-[#111827]">Notifications</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-md mx-auto px-4 py-6 space-y-4">
          {/* Error Message */}
          {(error || pushError) && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
              <p className="text-[#DC2626] text-sm">{error || pushError}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="bg-[#ECFDF5] border border-[#A7F3D0] rounded-xl p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-[#10B981] flex-shrink-0 mt-0.5" />
              <p className="text-[#065F46] text-sm">{successMessage}</p>
            </div>
          )}

          {/* Push Status Card */}
          {renderPushStatus()}

          {/* Notification Preferences */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F3F4F6]">
              <h3 className="text-lg font-semibold text-[#111827]">Notification Preferences</h3>
              <p className="text-sm text-[#6B7280] mt-1">
                Control how and when you receive notifications.
              </p>
            </div>

            <div className="divide-y divide-[#F3F4F6]">
              {/* Daily Reminders Toggle */}
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5 text-[#4F46E5]" />
                  </div>
                  <div>
                    <p className="text-[#111827] font-medium">Daily Reminders</p>
                    <p className="text-[#6B7280] text-sm">Get reminded to log your expenses daily</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('daily_reminders', !dailyReminders)}
                  disabled={saving || pushLoading}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${dailyReminders ? 'bg-[#4F46E5]' : 'bg-[#D1D5DB]'
                    } ${saving || pushLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                    <p className="text-[#111827] font-medium">Budget Alerts</p>
                    <p className="text-[#6B7280] text-sm">Get notified when approaching budget limits</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle('budget_alerts', !budgetAlerts)}
                  disabled={saving || pushLoading}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${budgetAlerts ? 'bg-[#4F46E5]' : 'bg-[#D1D5DB]'
                    } ${saving || pushLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
              className="w-full py-3 text-[#DC2626] text-sm font-medium hover:bg-[#FEF2F2] rounded-xl transition-colors disabled:opacity-50"
            >
              {saving ? 'Disabling...' : 'Disable Push Notifications on This Device'}
            </button>
          )}

          <p className="text-center text-[#9CA3AF] text-xs px-4">
            Push notifications are sent to each device separately. Enable them on all devices where you want to receive alerts.
          </p>
        </div>
      </div>
    </div>
  );
}
