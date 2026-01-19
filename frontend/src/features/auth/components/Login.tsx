import { useState } from 'react';
import { useExpenses } from '../../../shared/context/ExpenseContext';
import { Wallet, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
    onNavigateToRegister: () => void;
}

export function Login({ onNavigateToRegister }: LoginProps) {
    const { login } = useExpenses();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const validateUsername = (val: string) => {
        if (!val.trim()) {
            setUsernameError('Username is required');
            return false;
        }
        setUsernameError('');
        return true;
    };

    const validatePassword = (val: string) => {
        if (!val) {
            setPasswordError('Password is required');
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

        if (!isUsernameValid || !isPasswordValid) {
            return; // Stop submission if any validation fails
        }

        setError('');
        setLoading(true);
        try {
            await login(username.trim(), password);
            // Login successful - isAuthenticated will be set to true in context
            // which triggers the redirect in App.tsx
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center px-4">
            <div className="bg-white p-8 rounded-2xl shadow-sm w-full max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 bg-[#4F46E5] rounded-xl flex items-center justify-center">
                        <Wallet className="w-7 h-7 text-white" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-center text-[#111827] mb-2">Welcome Back</h2>
                <p className="text-[#6B7280] text-center mb-8">Login to manage your expenses.</p>

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
                                if (error) setError('');
                                if (usernameError) validateUsername(e.target.value);
                            }}
                            onBlur={(e) => validateUsername(e.target.value)}
                            className={`w-full px-4 py-3 bg-white rounded-xl border ${usernameError ? 'border-red-500' : 'border-[#E5E7EB]'} focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all`}
                            placeholder="Enter your username"
                            required
                        />
                        {usernameError && <p className="text-red-500 text-xs mt-1">{usernameError}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#111827] mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (error) setError('');
                                    if (passwordError) validatePassword(e.target.value);
                                }}
                                onBlur={(e) => validatePassword(e.target.value)}
                                className={`w-full px-4 py-3 pr-12 bg-white rounded-xl border ${passwordError ? 'border-red-500' : 'border-[#E5E7EB]'} focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent outline-none transition-all`}
                                placeholder="••••••••"
                                required
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
                        disabled={loading || !!usernameError || !!passwordError}
                        className="w-full bg-[#4F46E5] text-white py-3 rounded-xl font-semibold hover:bg-[#4338CA] transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <p className="text-center mt-6 text-[#6B7280] text-sm">
                    Don't have an account?{' '}
                    <button onClick={onNavigateToRegister} className="text-[#4F46E5] font-semibold hover:underline">
                        Register
                    </button>
                </p>
            </div>
        </div>
    );
}
