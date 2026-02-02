import { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const { theme } = useTheme();
    const { login, register } = useAuth();
    const isDark = theme === 'dark';

    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        fullName: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isLogin) {
                await login(formData.username, formData.password);
                toast.success('Welcome back!');
            } else {
                await register(formData.username, formData.email, formData.password, formData.fullName);
                toast.success('Account created! Logging in...');
                await login(formData.username, formData.password);
            }
        } catch (error) {
            const message = error.response?.data?.detail || 'Something went wrong';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        color: isDark ? '#ffffff' : '#0f172a',
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ backgroundColor: isDark ? '#0b1020' : '#f1f5f9' }}
        >
            <div
                className="w-full max-w-md rounded-2xl p-8 backdrop-blur-xl border"
                style={{
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                }}
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <h1
                        className="text-3xl font-bold mb-2"
                        style={{ color: isDark ? '#ffffff' : '#0f172a' }}
                    >
                        🤖 Jarvis
                    </h1>
                    <p style={{ color: isDark ? '#9ca3af' : '#64748b' }}>
                        Smart Factory Monitoring
                    </p>
                </div>

                {/* Toggle */}
                <div
                    className="flex rounded-xl p-1 mb-6"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}
                >
                    <button
                        onClick={() => setIsLogin(true)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
              ${isLogin ? 'bg-blue-500 text-white' : ''}`}
                        style={{ color: !isLogin ? (isDark ? '#9ca3af' : '#64748b') : undefined }}
                    >
                        Login
                    </button>
                    <button
                        onClick={() => setIsLogin(false)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all
              ${!isLogin ? 'bg-blue-500 text-white' : ''}`}
                        style={{ color: isLogin ? (isDark ? '#9ca3af' : '#64748b') : undefined }}
                    >
                        Register
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Username */}
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Username"
                            required
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition-colors
                       focus:border-blue-500"
                            style={inputStyle}
                        />
                    </div>

                    {/* Email (register only) */}
                    {!isLogin && (
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="email"
                                placeholder="Email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition-colors
                         focus:border-blue-500"
                                style={inputStyle}
                            />
                        </div>
                    )}

                    {/* Full Name (register only) */}
                    {!isLogin && (
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Full Name (optional)"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="w-full pl-11 pr-4 py-3 rounded-xl border outline-none transition-colors
                         focus:border-blue-500"
                                style={inputStyle}
                            />
                        </div>
                    )}

                    {/* Password */}
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            required
                            minLength={6}
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full pl-11 pr-11 py-3 rounded-xl border outline-none transition-colors
                       focus:border-blue-500"
                            style={inputStyle}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 rounded-xl bg-blue-500 text-white font-medium
                     hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {isLogin ? 'Logging in...' : 'Creating account...'}
                            </>
                        ) : (
                            isLogin ? 'Login' : 'Create Account'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <p
                    className="text-center text-sm mt-6"
                    style={{ color: isDark ? '#6b7280' : '#94a3b8' }}
                >
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-blue-500 hover:underline"
                    >
                        {isLogin ? 'Register' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    );
}
