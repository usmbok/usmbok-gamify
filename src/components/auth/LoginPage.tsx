import { useState } from 'react';
import { Eye, EyeOff, ChevronDown, Shield, User, Zap, UserPlus, ArrowLeft, CheckCircle, KeyRound, Mail } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DemoCredential {
  label: string;
  email: string;
  password: string;
  role: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const DEMO_CREDENTIALS: DemoCredential[] = [
  {
    label: 'Admin User',
    email: 'admin@usmbok.com',
    password: 'Sarasota2026!@',
    role: 'Administrator',
    description: 'Full access to all admin controls, system configuration, and user management',
    icon: <Shield className="w-4 h-4" />,
    color: 'border-blue-500 bg-blue-50 dark:bg-blue-950/30',
  },
  {
    label: 'Test Subscriber',
    email: 'subscriber@usmbok.com',
    password: 'Sarasota2026!@',
    role: 'Subscriber',
    description: 'Standard user experience with quests, badges, challenges and rewards',
    icon: <User className="w-4 h-4" />,
    color: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30',
  },
];

interface LoginPageProps {
  onAuthSuccess: () => void;
  onBypass: () => void;
}

type Mode = 'signin' | 'signup' | 'reset';

export function LoginPage({ onAuthSuccess, onBypass }: LoginPageProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showDemoPanel, setShowDemoPanel] = useState(true);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setUsername('');
    setError(null);
    setSignupSuccess(false);
    setResetSuccess(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    resetForm();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError(authError.message);
      else onAuthSuccess();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            username: username || email.split('@')[0],
          },
        },
      });
      if (authError) {
        setError(authError.message);
      } else if (data.session) {
        onAuthSuccess();
      } else {
        setSignupSuccess(true);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      });
      if (authError) setError(authError.message);
      else setResetSuccess(true);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const prefillCredentials = (cred: DemoCredential) => {
    setEmail(cred.email);
    setPassword(cred.password);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/USMBOK_2025_white_logo.png"
              alt="USMBOK"
              className="h-14 object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-bold text-white">USMBOK: Gamify</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Engage, achieve, and earn rewards through professional excellence
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tab switcher — only show for signin / signup */}
          {mode !== 'reset' && (
            <div className="flex border-b border-white/10">
              <button
                onClick={() => switchMode('signin')}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
                  mode === 'signin'
                    ? 'bg-white/10 text-white border-b-2 border-cyan-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => switchMode('signup')}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                  mode === 'signup'
                    ? 'bg-white/10 text-white border-b-2 border-cyan-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Subscribe / Sign Up
              </button>
            </div>
          )}

          <div className="p-8">

            {/* ── SIGN IN ── */}
            {mode === 'signin' && (
              <>
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
                )}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium text-slate-300">Password</label>
                      <button
                        type="button"
                        onClick={() => switchMode('reset')}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        placeholder="Enter your password"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/20 mt-2"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Signing in...
                      </span>
                    ) : 'Sign In'}
                  </button>
                </form>

                <p className="text-center text-sm text-slate-400 mt-4">
                  Don&apos;t have an account?{' '}
                  <button onClick={() => switchMode('signup')} className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                    Subscribe now
                  </button>
                </p>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={onBypass}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/60 transition-all duration-200 text-sm font-medium"
                  >
                    <Shield className="w-4 h-4" />
                    Dev Bypass — Enter as Admin (no login required)
                  </button>
                  <p className="text-xs text-center text-slate-600 mt-2">
                    Use this if login is failing — provides full admin access for testing
                  </p>
                </div>

                <div className="mt-4">
                  <button
                    onClick={() => setShowDemoPanel(!showDemoPanel)}
                    className="flex items-center justify-between w-full text-sm text-slate-400 hover:text-slate-300 transition-colors py-2"
                  >
                    <span className="font-medium">Demo Credentials</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showDemoPanel ? 'rotate-180' : ''}`} />
                  </button>
                  {showDemoPanel && (
                    <div className="mt-2 space-y-3">
                      <p className="text-xs text-slate-500 mb-3">Click a credential set to auto-fill the login form</p>
                      {DEMO_CREDENTIALS.map(cred => (
                        <button
                          key={cred.email}
                          onClick={() => prefillCredentials(cred)}
                          className={`w-full text-left p-3.5 rounded-xl border-2 transition-all duration-200 hover:scale-[1.01] ${cred.color} ${email === cred.email ? 'ring-2 ring-offset-1 ring-offset-transparent ring-blue-500/50' : ''}`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-slate-700 dark:text-slate-300">{cred.icon}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{cred.label}</span>
                            <span className="ml-auto text-xs px-2 py-0.5 bg-white/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 rounded-full">{cred.role}</span>
                          </div>
                          <div className="text-xs text-slate-600 dark:text-slate-400 font-mono mb-1">{cred.email}</div>
                          <p className="text-xs text-slate-500 dark:text-slate-500 leading-relaxed">{cred.description}</p>
                        </button>
                      ))}
                      <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <p className="text-xs text-center text-slate-400 font-medium mb-1">Both accounts share the same password</p>
                        <p className="text-xs text-center text-slate-300 font-mono tracking-wide">Sarasota2026!@</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── SIGN UP ── */}
            {mode === 'signup' && (
              <>
                {signupSuccess ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">You're registered!</h3>
                    <p className="text-slate-400 text-sm mb-6">
                      Your account has been created. You can now sign in with your credentials.
                    </p>
                    <button
                      onClick={() => switchMode('signin')}
                      className="flex items-center gap-2 mx-auto text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Sign In
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-400 text-sm mb-5">
                      Create your free account to access quests, earn badges, and climb the leaderboard.
                    </p>
                    {error && (
                      <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
                    )}
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1.5">Full Name</label>
                          <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="Jane Smith"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
                          <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="janesmith"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                          placeholder="you@example.com"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            placeholder="Min. 8 characters"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          required
                          placeholder="Re-enter your password"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/20 mt-2 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Creating account...
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            Create Account
                          </>
                        )}
                      </button>
                    </form>
                    <p className="text-center text-sm text-slate-400 mt-4">
                      Already have an account?{' '}
                      <button onClick={() => switchMode('signin')} className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                        Sign in
                      </button>
                    </p>
                  </>
                )}
              </>
            )}

            {/* ── PASSWORD RESET ── */}
            {mode === 'reset' && (
              <>
                <div className="flex items-center gap-2 mb-5">
                  <button
                    onClick={() => switchMode('signin')}
                    className="text-slate-400 hover:text-slate-300 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-cyan-400" />
                      Reset Password
                    </h3>
                  </div>
                </div>

                {resetSuccess ? (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                      <Mail className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Check your email</h3>
                    <p className="text-slate-400 text-sm mb-6">
                      We sent a password reset link to <strong className="text-white">{email}</strong>. Click the link in the email to set a new password.
                    </p>
                    <button
                      onClick={() => switchMode('signin')}
                      className="flex items-center gap-2 mx-auto text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Sign In
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-400 text-sm mb-5">
                      Enter the email address associated with your account and we'll send you a link to reset your password.
                    </p>
                    {error && (
                      <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>
                    )}
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                          placeholder="you@example.com"
                          autoFocus
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Sending reset link...
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4" />
                            Send Reset Link
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </>
            )}

          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          USMBOK Gamification Platform &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
