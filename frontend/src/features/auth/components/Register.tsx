import { useState } from 'react';
import { useExpenses } from '../../../shared/context/ExpenseContext';
import { Wallet, ArrowLeft, Eye, EyeOff } from 'lucide-react';

interface RegisterProps {
    onNavigateToLogin: () => void;
}

export function Register({ onNavigateToLogin }: RegisterProps) {
    const { register } = useExpenses();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [usernameError, setUsernameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const validateUsername = (val: string) => {
        if (!val.trim()) {
            setUsernameError('Username is required');
            return false;
        }
        if (val.trim().length < 3) {
            setUsernameError('Username must be at least 3 characters');
            return false;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(val.trim())) {
            setUsernameError('Username can only contain letters, numbers, and underscores');
            return false;
        }
        setUsernameError('');
        return true;
    };

    const validateEmail = (val: string) => {
        if (val && !/\S+@\S+\.\S+/.test(val)) {
            setEmailError('Please enter a valid email address');
            return false;
        }
        setEmailError('');
        return true;
    };

    const validatePassword = (val: string) => {
        if (!val) {
            setPasswordError('Password is required');
            return false;
        }
        if (val.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return false;
        }
        setPasswordError('');
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Validate all fields before submission
        const isUsernameValid = validateUsername(username);
        const isPasswordValid = validatePassword(password);
        const isEmailValid = email ? validateEmail(email) : true; // Email is optional, only validate if present

        if (!isUsernameValid || !isPasswordValid || !isEmailValid) {
            return; // Stop submission if any validation fails
        }

        setError('');
        setLoading(true);
        try {
            await register(username.trim(), password, email.trim() || undefined);
            // Registration successful - isAuthenticated will be set to true in context
            // which triggers the redirect in App.tsx
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 transition-colors" style={{ backgroundColor: 'var(--color-bg-primary)' }}>
            <div className="p-8 rounded-2xl shadow-sm w-full max-w-md transition-colors" style={{ backgroundColor: 'var(--color-bg-card)' }}>
                <button
                    onClick={onNavigateToLogin}
                    className="flex items-center mb-6 transition-colors"
                    style={{ color: 'var(--color-text-secondary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                >
                    <ArrowLeft className="w-5 h-5 mr-1" />
                    Back to Login
                </button>

                <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--color-brand)' }}>
                        <Wallet className="w-7 h-7 text-white" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--color-text-primary)' }}>Create Account</h2>
                <p className="text-center mb-8" style={{ color: 'var(--color-text-secondary)' }}>Join ExpenseSnap to track your finances.</p>

                {error && (
                    <div className="p-3 rounded-lg text-sm mb-6" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                if (usernameError) validateUsername(e.target.value); // Re-validate on change if there's an error
                            }}
                            onBlur={(e) => validateUsername(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                            style={{ 
                                backgroundColor: 'var(--color-bg-input)', 
                                borderColor: usernameError ? 'var(--color-danger)' : 'var(--color-border)', 
                                color: 'var(--color-text-primary)', 
                                '--tw-ring-color': 'var(--color-brand)' 
                            } as React.CSSProperties}
                            placeholder="Min 3 characters, letters/numbers/underscores"
                            required
                        />
                        {usernameError && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{usernameError}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Email <span className="font-normal" style={{ color: 'var(--color-text-secondary)' }}>(Optional)</span></label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (emailError) validateEmail(e.target.value); // Re-validate on change if there's an error
                            }}
                            onBlur={(e) => validateEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                            style={{ 
                                backgroundColor: 'var(--color-bg-input)', 
                                borderColor: emailError ? 'var(--color-danger)' : 'var(--color-border)', 
                                color: 'var(--color-text-primary)', 
                                '--tw-ring-color': 'var(--color-brand)' 
                            } as React.CSSProperties}
                            placeholder="you@example.com"
                        />
                        {emailError && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{emailError}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (passwordError) validatePassword(e.target.value); // Re-validate on change if there's an error
                                }}
                                onBlur={(e) => validatePassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 rounded-xl border focus:ring-2 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                                style={{ 
                                    backgroundColor: 'var(--color-bg-input)', 
                                    borderColor: passwordError ? 'var(--color-danger)' : 'var(--color-border)', 
                                    color: 'var(--color-text-primary)', 
                                    '--tw-ring-color': 'var(--color-brand)' 
                                } as React.CSSProperties}
                                placeholder="Min 6 characters"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors focus:outline-none"
                                style={{ color: 'var(--color-text-secondary)' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                                tabIndex={-1}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-5 h-5" />
                                ) : (
                                    <Eye className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        {passwordError && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{passwordError}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !!usernameError || !!emailError || !!passwordError}
                        className="w-full text-white px-4 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50 text-sm"
                        style={{ backgroundColor: 'var(--color-brand)' }}
                        onMouseEnter={(e) => { if (!loading && !usernameError && !emailError && !passwordError) e.currentTarget.style.backgroundColor = 'var(--color-brand-hover)' }}
                        onMouseLeave={(e) => { if (!loading && !usernameError && !emailError && !passwordError) e.currentTarget.style.backgroundColor = 'var(--color-brand)' }}
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t" style={{ borderColor: 'var(--color-divider)' }}></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2" style={{ backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-secondary)' }}>or</span>
                    </div>
                </div>

                {/* Google Sign Up Button */}
                <button
                    type="button"
                    onClick={() => {
                        const backendUrl = import.meta.env.VITE_API_URL || '';
                        window.location.href = `${backendUrl}/login/google`;
                    }}
                    className="w-full flex items-center justify-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
                    style={{ backgroundColor: 'var(--color-bg-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-card)'}
                >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Continue with Google
                </button>
            </div>
        </div>
    );
}
