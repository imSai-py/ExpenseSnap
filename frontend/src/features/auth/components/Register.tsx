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
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
            <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md">
                <button
                    onClick={onNavigateToLogin}
                    className="flex items-center text-[#6B7280] hover:text-[#111827] mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-1" />
                    Back to Login
                </button>

                <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 bg-[#4F46E5] rounded-xl flex items-center justify-center">
                        <Wallet className="w-7 h-7 text-white" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-center text-[#111827] mb-2">Create Account</h2>
                <p className="text-[#6B7280] text-center mb-8">Join ExpenseSnap to track your finances.</p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#111827] mb-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value);
                                if (usernameError) validateUsername(e.target.value); // Re-validate on change if there's an error
                            }}
                            onBlur={(e) => validateUsername(e.target.value)} // Validate on blur
                            className={`w-full px-4 py-3 bg-white rounded-xl border ${usernameError ? 'border-red-500' : 'border-[#E5E7EB]'} focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all`}
                            placeholder="Min 3 characters, letters/numbers/underscores"
                            required
                        />
                        {usernameError && <p className="text-red-500 text-xs mt-1">{usernameError}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#111827] mb-1">Email <span className="text-[#9CA3AF] font-normal">(Optional)</span></label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (emailError) validateEmail(e.target.value); // Re-validate on change if there's an error
                            }}
                            onBlur={(e) => validateEmail(e.target.value)} // Validate on blur
                            className={`w-full px-4 py-3 bg-white rounded-xl border ${emailError ? 'border-red-500' : 'border-[#E5E7EB]'} focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all`}
                            placeholder="you@example.com"
                        />
                        {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#111827] mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (passwordError) validatePassword(e.target.value); // Re-validate on change if there's an error
                                }}
                                onBlur={(e) => validatePassword(e.target.value)} // Validate on blur
                                className={`w-full px-4 py-3 pr-12 bg-white rounded-xl border ${passwordError ? 'border-red-500' : 'border-[#E5E7EB]'} focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all`}
                                placeholder="Min 6 characters"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#111827] transition-colors focus:outline-none"
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
                        {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !!usernameError || !!emailError || !!passwordError}
                        className="w-full bg-[#4F46E5] text-white py-3 rounded-xl font-semibold hover:bg-[#4338CA] transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                </form>
            </div>
        </div>
    );
}
