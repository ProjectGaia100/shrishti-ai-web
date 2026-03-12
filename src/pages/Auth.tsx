import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// ── Shared SVG icons ─────────────────────────────────────────────────────

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const EyeOffIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);
const SpinnerIcon = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ── Input component ──────────────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon: React.ReactNode;
  required?: boolean;
  autoComplete?: string;
  showPasswordToggle?: boolean;
}

function InputField({ label, type = 'text', value, onChange, placeholder, icon, required, autoComplete, showPasswordToggle }: InputFieldProps) {
  const [showPw, setShowPw] = useState(false);
  const effectiveType = showPasswordToggle ? (showPw ? 'text' : 'password') : type;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground/80">{label}</label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
        <input
          type={effectiveType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoComplete={autoComplete}
          className="w-full pl-10 pr-12 py-3 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
        />
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPw ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Icons for form fields ────────────────────────────────────────────────

const EmailIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);
const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);
const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
  </svg>
);
const OrgIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
  </svg>
);
const PurposeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
  </svg>
);

// ════════════════════════════════════════════════════════════════════════════
// Auth Page — full-screen login / register
// ════════════════════════════════════════════════════════════════════════════

type AuthTab = 'login' | 'register';

export default function Auth() {
  const [tab, setTab] = useState<AuthTab>('login');
  const navigate = useNavigate();
  const { login, signup, isAuthenticated, isLoading: authLoading, resendVerification } = useAuth();

  // ── form state ─────────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendMsgType, setResendMsgType] = useState<'success' | 'error'>('success');

  // Redirect if already authenticated
  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setOrganization('');
    setPurpose('');
    setError('');
    setSuccess('');
    setShowVerificationPanel(false);
    setResendMsg('');
  };

  const switchTab = (t: AuthTab) => {
    resetForm();
    setTab(t);
  };

  // ── Login handler ──────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(result.error || 'Login failed.');
    }
  };

  // ── Register handler ──────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const result = await signup({ email, password, fullName, organization, purpose });
    setLoading(false);

    if (result.success) {
      if (result.needsVerification) {
        setVerificationEmail(email);
        setShowVerificationPanel(true);
        setSuccess('Account created! Please check your email to verify your account.');
      } else {
        navigate('/dashboard', { replace: true });
      }
    } else {
      setError(result.error || 'Registration failed.');
    }
  };

  // ── Resend verification handler ────────────────────────────────────────
  const handleResendVerification = async () => {
    setResendMsg('');
    setResending(true);
    const result = await resendVerification(verificationEmail || email);
    setResending(false);
    if (result.success) {
      setResendMsgType('success');
      setResendMsg('Verification email sent! Check your inbox and spam folder.');
    } else {
      setResendMsgType('error');
      setResendMsg(result.error || 'Failed to send verification email.');
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 animate-pulse" />
          <p className="text-sm text-muted-foreground">Checking session...</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      {/* Background grid + glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.04),transparent_70%)]" />
        <div className="absolute inset-0 dark:bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:72px_72px]" />
      </div>

      <div className="relative w-full max-w-md mx-4 animate-fade-in">
        <div className="relative bg-background border border-border rounded-2xl shadow-xl overflow-hidden">
          {/* Gradient accent top */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />

          <div className="p-8 pt-10">
            {/* Logo */}
            <div className="text-center space-y-3 mb-6">
              <button onClick={() => navigate('/')} className="inline-flex items-center justify-center mb-2 hover:scale-105 transition-transform">
                <img src="/shrishti-icon.png" alt="Shrishti AI" className="w-16 h-16 object-contain" />
              </button>
              <h2 className="text-2xl font-bold text-foreground">
                {tab === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {tab === 'login' ? 'Sign in to access the Shrishti AI platform' : 'Join the Shrishti AI intelligence platform'}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex rounded-xl overflow-hidden border border-border mb-6">
              <button
                onClick={() => switchTab('login')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  tab === 'login'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => switchTab('register')}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  tab === 'register'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                Register
              </button>
            </div>

            {/* ── Login Form ────────────────────────────────────────────── */}
            {tab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <InputField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  icon={<EmailIcon />}
                  required
                  autoComplete="email"
                />
                <InputField
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Enter your password"
                  icon={<LockIcon />}
                  required
                  autoComplete="current-password"
                  showPasswordToggle
                />

                {/* Error / Success */}
                {error && <AlertBox type="error" message={error} />}
                {success && <AlertBox type="success" message={success} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (<><SpinnerIcon /> Signing in...</>) : 'Sign In'}
                </button>
              </form>
            )}

            {/* ── Register Form ─────────────────────────────────────────── */}
            {tab === 'register' && !showVerificationPanel && (
              <form onSubmit={handleRegister} className="space-y-4">
                <InputField
                  label="Full Name *"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="John Doe"
                  icon={<UserIcon />}
                  required
                  autoComplete="name"
                />
                <InputField
                  label="Email *"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  icon={<EmailIcon />}
                  required
                  autoComplete="email"
                />
                <InputField
                  label="Password *"
                  value={password}
                  onChange={setPassword}
                  placeholder="At least 6 characters"
                  icon={<LockIcon />}
                  required
                  autoComplete="new-password"
                  showPasswordToggle
                />
                <InputField
                  label="Organization / Institution"
                  value={organization}
                  onChange={setOrganization}
                  placeholder="University, company, etc."
                  icon={<OrgIcon />}
                  autoComplete="organization"
                />
                <InputField
                  label="Purpose"
                  value={purpose}
                  onChange={setPurpose}
                  placeholder="Research, monitoring, etc."
                  icon={<PurposeIcon />}
                />

                {/* Error / Success */}
                {error && <AlertBox type="error" message={error} />}
                {success && <AlertBox type="success" message={success} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all duration-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? (<><SpinnerIcon /> Creating account...</>) : 'Create Account'}
                </button>
              </form>
            )}

            {/* ── Verification Panel (after registration) ───────────────── */}
            {tab === 'register' && showVerificationPanel && (
              <div className="space-y-5 animate-fade-in">
                {/* Success icon */}
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-foreground">Check Your Email</h3>
                  <p className="text-sm text-muted-foreground">
                    We've sent a verification link to
                  </p>
                  <p className="text-sm font-semibold text-primary">{verificationEmail}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    Click the link in the email to verify your account. Don't forget to check your spam folder!
                  </p>
                </div>

                {/* Resend button */}
                <button
                  onClick={handleResendVerification}
                  disabled={resending}
                  className="w-full py-3 rounded-xl bg-muted border border-border text-foreground text-sm font-medium hover:bg-muted/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {resending ? (
                    <><SpinnerIcon /> Sending...</>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                      </svg>
                      Resend Verification Email
                    </>
                  )}
                </button>

                {/* Resend feedback */}
                {resendMsg && (
                  <AlertBox type={resendMsgType} message={resendMsg} />
                )}

                {/* Go to sign in */}
                <button
                  onClick={() => switchTab('login')}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all duration-300 shadow-sm flex items-center justify-center gap-2"
                >
                  Go to Sign In
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground/50">
                Secure access to Shrishti AI Intelligence Platform
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Alert component ────────────────────────────────────────────────────────

function AlertBox({ type, message }: { type: 'error' | 'success'; message: string }) {
  const isError = type === 'error';
  return (
    <div
      className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-fade-in ${
        isError
          ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-300'
          : 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
      }`}
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        {isError ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        )}
      </svg>
      {message}
    </div>
  );
}
