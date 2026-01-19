import { useState } from 'react';
import { User, Bell, Lock, HelpCircle, LogOut, ChevronRight, Mail, ChevronDown, Check } from 'lucide-react';
import { useExpenses } from '../../../shared/context/ExpenseContext';
import { EditProfileModal } from './EditProfileModal';
import { NotificationsSettings } from '../../settings/components/NotificationsSettings';
import { PrivacySecuritySettings } from '../../settings/components/PrivacySecuritySettings';
import { HelpSupportSettings } from '../../settings/components/HelpSupportSettings';

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
      <div className="flex flex-col h-screen bg-[#F9FAFB]">
        <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
          <div className="bg-white px-4 py-6 shadow-sm md:hidden">
            <div className="max-w-md mx-auto">
              <h1 className="text-2xl font-semibold text-[#111827]">Profile</h1>
            </div>
          </div>
          <div className="hidden md:block bg-white px-8 py-6 border-b border-[#E5E7EB]">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-3xl font-semibold text-[#111827]">Profile & Settings</h1>
              <p className="text-[#6B7280] mt-1">Manage your account and preferences.</p>
            </div>
          </div>
          <div className="max-w-md md:max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-4 md:gap-6">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-[#4F46E5] flex items-center justify-center">
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
                  <h2 className="text-xl md:text-2xl font-semibold text-[#111827]">{user?.username || 'User'}</h2>
                  {user?.email && (
                    <div className="flex items-center gap-2 mt-1 text-[#6B7280] text-sm">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                  )}
                  <div className="mt-2 relative">
                    <button
                      onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                      className="flex items-center gap-1 text-xs bg-[#EEF2FF] text-[#4F46E5] px-3 py-1.5 rounded-full hover:bg-[#E0E7FF] transition-colors"
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
                  className="hidden md:block px-4 py-2 bg-[#4F46E5] text-white rounded-xl font-medium hover:bg-[#4338CA] transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 md:gap-4">
              <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm text-center">
                <p className="text-2xl md:text-3xl font-semibold text-[#4F46E5]">{user?.total_expenses || expenses.length}</p>
                <p className="text-xs md:text-sm text-[#6B7280] mt-1">Total Expenses</p>
              </div>
              <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm text-center">
                <p className="text-2xl md:text-3xl font-semibold text-[#16A34A]">{expenses.length}</p>
                <p className="text-xs md:text-sm text-[#6B7280] mt-1">This Month</p>
              </div>
              <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm text-center">
                <p className="text-2xl md:text-3xl font-semibold text-[#F59E0B]">{uniqueCategories}</p>
                <p className="text-xs md:text-sm text-[#6B7280] mt-1">Categories</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F3F4F6]">
                <h3 className="text-lg font-semibold text-[#111827]">Settings</h3>
              </div>
              <div className="divide-y divide-[#F3F4F6]">
                {settingsItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[#F9FAFB] transition-colors"
                    >
                      <div className="w-10 h-10 bg-[#F3F4F6] rounded-xl flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#6B7280]" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-[#111827] font-medium">{item.label}</p>
                        <p className="text-[#6B7280] text-sm mt-0.5 hidden md:block">{item.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-[#6B7280]" />
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full bg-white border border-[#E5E7EB] rounded-2xl px-6 py-4 flex items-center justify-center gap-2 text-[#DC2626] font-semibold hover:bg-[#FEF2F2] transition-colors shadow-sm"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
            <div className="text-center py-4">
              <p className="text-[#6B7280] text-sm">ExpenseSnap v1.0.0</p>
              <p className="text-[#9CA3AF] text-xs mt-1">2026 ExpenseSnap. All rights reserved.</p>
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
        <div className="fixed inset-0 z-50 bg-[#F9FAFB]">
          <NotificationsSettings onClose={() => setShowNotifications(false)} />
        </div>
      )}

      {/* Privacy & Security Settings */}
      {showPrivacySecurity && (
        <div className="fixed inset-0 z-50 bg-[#F9FAFB]">
          <PrivacySecuritySettings onClose={() => setShowPrivacySecurity(false)} />
        </div>
      )}

      {/* Help & Support Settings */}
      {showHelpSupport && (
        <div className="fixed inset-0 z-50 bg-[#F9FAFB]">
          <HelpSupportSettings onClose={() => setShowHelpSupport(false)} />
        </div>
      )}
    </>
  );
}
