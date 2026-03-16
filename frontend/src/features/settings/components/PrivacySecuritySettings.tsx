import { useState } from 'react';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertCircle, Shield, ExternalLink } from 'lucide-react';
import { api } from '../../../shared/services/api';
import { useExpenses } from '../../../shared/context/ExpenseContext';

interface PrivacySecuritySettingsProps {
  onClose: () => void;
}

export function PrivacySecuritySettings({ onClose }: PrivacySecuritySettingsProps) {
  const { user } = useExpenses();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isOAuthUser = user?.is_oauth_user === true;

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

    if (!oldPassword.trim()) {
      setError('Please enter your current password');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

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

  // ---------- OAuth Info Card ----------
  const renderOAuthCard = () => (
    <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--color-bg-card)' }}>
      {/* Header visual */}
      <div className="px-6 pt-8 pb-6 flex flex-col items-center text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--color-brand-bg)' }}
        >
          <Shield className="w-8 h-8" style={{ color: 'var(--color-brand)' }} />
        </div>
        <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Google Account Linked
        </h3>
        <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Your account is authenticated through Google. Password management is handled by your Google account.
        </p>
      </div>

      {/* Divider */}
      <div className="mx-6 border-t" style={{ borderColor: 'var(--color-divider)' }} />

      {/* Info items */}
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-tertiary)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Password changes are not available
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              Since you signed in with Google, your password is managed by Google's security settings.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-success)' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Your data is secure
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              Google's industry-leading security protects your account with 2-factor authentication and more.
            </p>
          </div>
        </div>

        {/* Signed in as */}
        {user?.email && (
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ backgroundColor: 'var(--color-bg-subtle)' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: 'var(--color-brand)' }}
            >
              G
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                Signed in as
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {user.email}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="px-6 pb-6">
        <a
          href="https://myaccount.google.com/security"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-colors"
          style={{ backgroundColor: 'var(--color-brand)' }}
        >
          Manage Google Account
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );

  // ---------- Password Change Form ----------
  const renderPasswordForm = () => (
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
              {showOldPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
              {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
              className="w-full px-4 py-3 pr-12 border rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
              style={{ backgroundColor: 'var(--color-bg-input)', borderColor: confirmPassword && newPassword !== confirmPassword ? 'var(--color-danger)' : 'var(--color-border)', color: 'var(--color-text-primary)', '--tw-ring-color': 'var(--color-brand)' } as React.CSSProperties}
              placeholder="Confirm new password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
  );

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

          {/* Error Message (only show for password form, not for OAuth) */}
          {error && !isOAuthUser && (
            <div className="border rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: 'var(--color-danger-bg)', borderColor: 'var(--color-danger)' }}>
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--color-danger)' }} />
              <p className="text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p>
            </div>
          )}

          {/* Conditionally render OAuth card or Password form */}
          {isOAuthUser ? renderOAuthCard() : renderPasswordForm()}
        </div>
      </div>
    </div>
  );
}
