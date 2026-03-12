import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { UserMenu } from '@/components/UserMenu';
import { getProfile, updateProfile, type UserProfile } from '@/services/profileService';
import { getActivityLogs } from '@/services/activityLogger';
import { logActivity } from '@/services/activityLogger';

// ── Verification Badge ─────────────────────────────────────────────────────

function VerificationBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      Unverified
    </span>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const ACTIVITY_ICONS: Record<string, string> = {
  login: '🔓', logout: '🔒', signup: '🎉',
  prediction_run: '🎯', weather_forecast: '🌦️',
  chatbot_query: '💬', profile_update: '✏️',
  settings_change: '⚙️', dataset_view: '🗺️',
};

// ════════════════════════════════════════════════════════════════════════════

export default function Profile() {
  const { user, isAuthenticated, isLoading: authLoading, resendVerification } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Editable fields
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [purpose, setPurpose] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/');
  }, [isAuthenticated, authLoading, navigate]);

  // Fetch data
  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      setLoading(true);
      const [p, l] = await Promise.all([getProfile(), getActivityLogs(30)]);
      if (p) {
        setProfile(p);
        setFullName(p.full_name);
        setOrganization(p.organization || '');
        setPurpose(p.purpose || '');
      }
      setLogs(l);
      setLoading(false);
    })();
  }, [isAuthenticated]);

  const handleSave = async () => {
    setError('');
    setSuccess('');
    if (!fullName.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    const res = await updateProfile({
      full_name: fullName.trim(),
      organization: organization.trim() || undefined,
      purpose: purpose.trim() || undefined,
    });
    setSaving(false);
    if (res.success) {
      setSuccess('Profile updated successfully.');
      logActivity({ activityType: 'profile_update', description: 'Profile info updated' });
    } else {
      setError(res.error || 'Update failed.');
    }
  };

  const handleResendVerification = async () => {
    setResendMsg(null);
    setResending(true);
    const result = await resendVerification();
    setResending(false);
    if (result.success) {
      setResendMsg({ type: 'success', text: 'Verification email sent! Check your inbox (and spam folder).' });
    } else {
      setResendMsg({ type: 'error', text: result.error || 'Failed to send verification email.' });
    }
  };

  const emailConfirmed = user?.email_confirmed ?? false;

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav bar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/shrishti-icon.png" alt="Shrishti AI" className="w-9 h-9 object-contain" />
            <span className="text-lg font-bold">
              <span className="text-foreground">SHRISHTI</span>
              <span className="text-primary"> AI</span>
            </span>
          </button>

          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/dashboard')} className="px-3 py-1.5 rounded-xl bg-muted border border-border hover:border-border text-sm text-muted-foreground hover:text-foreground transition-all">
              Dashboard
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* ── Profile Card ──────────────────────────────────────────────── */}
        <section className="bg-background border border-border rounded-xl p-8">
          <h2 className="text-xl font-bold text-foreground mb-1">User Profile</h2>
          <p className="text-sm text-muted-foreground mb-6">Manage your account information</p>

          {/* Avatar + meta row */}
          <div className="flex items-center gap-5 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-sm">
              {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-lg font-semibold text-foreground">{fullName || 'User'}</p>
                <VerificationBadge verified={emailConfirmed} />
              </div>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Member since {profile ? formatDate(profile.created_at) : '—'}
              </p>
            </div>
          </div>

          {/* Verification warning banner */}
          {!emailConfirmed && (
            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 flex-1">
                <svg className="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-amber-300">Your email is not verified. Please verify to access all features.</p>
              </div>
              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="px-4 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-all border border-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap"
              >
                {resending ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                    Resend Verification Email
                  </>
                )}
              </button>
            </div>
          )}

          {/* Resend feedback */}
          {resendMsg && (
            <div className={`mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${
              resendMsg.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                : 'bg-red-500/10 border border-red-500/20 text-red-300'
            }`}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                {resendMsg.type === 'success' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                )}
              </svg>
              {resendMsg.text}
            </div>
          )}

          {/* Editable fields */}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full Name *" value={fullName} onChange={setFullName} placeholder="Your name" />
            <Field label="Email" value={user?.email || ''} onChange={() => {}} placeholder="" disabled />
            <Field label="Organization / Institution" value={organization} onChange={setOrganization} placeholder="Optional" />
            <Field label="Purpose" value={purpose} onChange={setPurpose} placeholder="Research, monitoring, etc." />
          </div>

          {/* Feedback */}
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          {success && <p className="mt-4 text-sm text-emerald-400">{success}</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-6 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : 'Save Changes'}
          </button>
        </section>

        {/* ── Activity Logs ─────────────────────────────────────────────── */}
        <section className="bg-background border border-border rounded-xl p-8">
          <h2 className="text-xl font-bold text-foreground mb-1">Recent Activity</h2>
          <p className="text-sm text-muted-foreground mb-6">Your last 30 dashboard actions</p>

          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground/60 text-center py-8">No activity recorded yet.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scroll">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {ACTIVITY_ICONS[log.activity_type] || '📋'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground capitalize">
                        {log.activity_type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-muted-foreground/50">
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    {log.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ── Reusable field ─────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground/70">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-2.5 rounded-xl bg-background border border-input text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed"
      />
    </div>
  );
}
