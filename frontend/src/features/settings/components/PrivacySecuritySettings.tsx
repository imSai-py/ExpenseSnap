import { useState } from 'react';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../../../shared/services/api';

interface PrivacySecuritySettingsProps {
  onClose: () => void;
}

export function PrivacySecuritySettings({ onClose }: PrivacySecuritySettingsProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one digit';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate old password is provided
    if (!oldPassword.trim()) {
      setError('Please enter your current password');
      return;
    }

    // Validate new password
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Confirm passwords match
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // Make sure new password is different from old
    if (oldPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    try {
      setLoading(true);
      const message = await api.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setSuccess(message);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    oldPassword.trim() !== '' &&
    newPassword.trim() !== '' &&
    confirmPassword.trim() !== '' &&
    newPassword === confirmPassword;

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
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
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>Privacy & Security</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
        <div className="max-w-md mx-auto px-4 py-6 space-y-4">
          {/* Success Message */}
          {success && (
            <div className="border rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: 'var(--color-success-bg)', borderColor: 'var(--color-success)' }}>
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-success)' }} />
              <p className="text-sm" style={{ color: 'var(--color-success)' }}>{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="border rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: 'var(--color-danger-bg)', borderColor: 'var(--color-danger)' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
              <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
            </div>
          )}

          {/* Change Password Form */}
          <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--color-divider)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand-bg)' }}>
                  <Lock className="w-5 h-5" style={{ color: 'var(--color-brand)' }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Change Password</h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Update your account password</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                    style={{ backgroundColor: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-brand)' } as React.CSSProperties}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {showOldPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
                    style={{ backgroundColor: 'var(--color-bg-input)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-brand)' } as React.CSSProperties}
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Must be at least 8 characters with uppercase, lowercase, and a number
                </p>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-4 py-3 pr-12 border rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors`}
                    style={{ backgroundColor: 'var(--color-bg-input)', borderColor: confirmPassword && newPassword !== confirmPassword ? 'var(--color-danger)' : 'var(--color-border)', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-brand)' } as React.CSSProperties}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs mt-2" style={{ color: 'var(--color-danger)' }}>Passwords do not match</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={loading || !isFormValid ? { backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-tertiary)' } : { backgroundColor: 'var(--color-brand)', color: 'white' }}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
