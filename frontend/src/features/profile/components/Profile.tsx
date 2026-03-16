import { useState } from 'react';
import { User, Bell, Lock, HelpCircle, LogOut, ChevronRight, Mail, ChevronDown, Check } from 'lucide-react';
import { useExpenses } from '../../../shared/context/ExpenseContext';
import { EditProfileModal } from './EditProfileModal';
import { NotificationsSettings } from '../../settings/components/NotificationsSettings';
import { PrivacySecuritySettings } from '../../settings/components/PrivacySecuritySettings';
import { HelpSupportSettings } from '../../settings/components/HelpSupportSettings';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
];

export function Profile() {
  const { user, expenses, loading, error, logout, updateCurrency } = useExpenses();
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [updatingCurrency, setUpdatingCurrency] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPrivacySecurity, setShowPrivacySecurity] = useState(false);
  const [showHelpSupport, setShowHelpSupport] = useState(false);

  const handleCurrencyChange = async (currencyCode: string) => {
    if (currencyCode === user?.preferred_currency) {
      setShowCurrencyPicker(false);
      return;
    }

    try {
      setUpdatingCurrency(true);
      await updateCurrency(currencyCode);
      setShowCurrencyPicker(false);
    } catch (err) {
      console.error('Failed to update currency:', err);
    } finally {
      setUpdatingCurrency(false);
    }
  };

  const currentCurrency = CURRENCIES.find(c => c.code === user?.preferred_currency) || CURRENCIES[0];

  const settingsItems = [
    { icon: User, label: 'Edit Profile', description: 'Update your personal information', onClick: () => setShowEditProfile(true) },
    { icon: Bell, label: 'Notifications', description: 'Manage notification preferences', onClick: () => setShowNotifications(true) },
    { icon: Lock, label: 'Privacy & Security', description: 'Control your privacy settings', onClick: () => setShowPrivacySecurity(true) },
    { icon: HelpCircle, label: 'Help & Support', description: 'Get help with the app', onClick: () => setShowHelpSupport(true) },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-[#6B7280]">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-[#DC2626]">Error: {error}</div>
      </div>
    );
  }

  const initials = user?.username?.slice(0, 2).toUpperCase() || 'U';
  const uniqueCategories = new Set(expenses.map(e => e.category)).size;

  return (
    <>
      <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
        <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
          <div className="px-4 py-6 shadow-sm md:hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <div className="max-w-md mx-auto">
              <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Profile</h1>
            </div>
          </div>
          <div className="hidden md:block px-8 py-6 border-b" style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Profile & Settings</h1>
              <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>Manage your account and preferences.</p>
            </div>
          </div>
          <div className="max-w-md md:max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-6">
            <div className="rounded-2xl p-6 shadow-sm" style={{ backgroundColor: 'var(--color-bg-card)' }}>
              <div className="flex items-center gap-4 md:gap-6">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand)' }}>
                  {user?.profile_photo ? (
                    <img
                      src={user.profile_photo}
                      alt={user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-2xl md:text-3xl">{initials}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>{user?.username || 'User'}</h2>
                  {user?.email && (
                    <div className="flex items-center gap-2 mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                  )}
                  <div className="mt-2 relative">
                    <button
                      onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full transition-colors"
                      style={{ backgroundColor: 'var(--color-brand-bg)', color: 'var(--color-brand)' }}
                    >
                      <span>{currentCurrency.symbol} {currentCurrency.code}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {showCurrencyPicker && (
                      <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-[#E5E7EB] py-2 z-50 min-w-[200px]">
                        <div className="px-3 py-2 border-b border-[#F3F4F6]">
                          <p className="text-xs font-medium text-[#6B7280]">Select Currency</p>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                          {CURRENCIES.map((currency) => (
                            <button
                              key={currency.code}
                              onClick={() => handleCurrencyChange(currency.code)}
                              disabled={updatingCurrency}
                              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
                            >
                              <span className="w-6 text-center font-medium text-[#111827]">{currency.symbol}</span>
                              <span className="flex-1 text-left text-sm text-[#111827]">{currency.name}</span>
                              {user?.preferred_currency === currency.code && (
                                <Check className="w-4 h-4 text-[#4F46E5]" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowEditProfile(true)}
                    className="hidden md:block px-4 py-2 text-white rounded-xl font-medium transition-colors"
                    style={{ backgroundColor: 'var(--color-brand)' }}
                >
                  Edit
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <div className="rounded-2xl p-4 md:p-6 shadow-sm text-center" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                <p className="text-2xl md:text-3xl font-semibold" style={{ color: 'var(--color-brand)' }}>{user?.total_expenses || expenses.length}</p>
                <p className="text-xs md:text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Total Expenses</p>
              </div>
              <div className="rounded-2xl p-4 md:p-6 shadow-sm text-center" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                <p className="text-2xl md:text-3xl font-semibold" style={{ color: 'var(--color-success)' }}>{expenses.length}</p>
                <p className="text-xs md:text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>This Month</p>
              </div>
              <div className="rounded-2xl p-4 md:p-6 shadow-sm text-center" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                <p className="text-2xl md:text-3xl font-semibold" style={{ color: 'var(--color-warning)' }}>{uniqueCategories}</p>
                <p className="text-xs md:text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Categories</p>
              </div>
            </div>
            {/* Appearance / Theme Toggle */}
            <ThemeToggle variant="full" />

            <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
              <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
                <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Settings</h3>
              </div>
              <div className="divide-y divide-[#F3F4F6]">
                {settingsItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className="w-full flex items-center gap-4 px-6 py-4 transition-colors"
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-subtle)' }}>
                        <Icon className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.label}</p>
                        <p className="text-sm mt-0.5 hidden md:block" style={{ color: 'var(--color-text-secondary)' }}>{item.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full border rounded-2xl px-6 py-4 flex items-center justify-center gap-2 font-semibold transition-colors shadow-sm"
              style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-danger)' }}
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
            <div className="text-center py-4">
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>ExpenseSnap v1.0.0</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>2026 ExpenseSnap. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={showEditProfile}
        onClose={() => setShowEditProfile(false)}
      />

      {/* Notifications Settings */}
      {showNotifications && (
        <div className="fixed inset-0 z-50" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <NotificationsSettings onClose={() => setShowNotifications(false)} />
        </div>
      )}

      {/* Privacy & Security Settings */}
      {showPrivacySecurity && (
        <div className="fixed inset-0 z-50" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <PrivacySecuritySettings onClose={() => setShowPrivacySecurity(false)} />
        </div>
      )}

      {/* Help & Support Settings */}
      {showHelpSupport && (
        <div className="fixed inset-0 z-50" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
          <HelpSupportSettings onClose={() => setShowHelpSupport(false)} />
        </div>
      )}
    </>
  );
}
