// @refresh reset
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  email_confirmed?: boolean;
}

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  organization?: string;
  purpose?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignUpData) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
  logout: () => Promise<void>;
  resendVerification: (email?: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Constants ──────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
const STORAGE_KEY = 'geovision_auth';

interface StoredAuth {
  user: User;
  access_token: string;
  refresh_token: string;
}

function loadStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveStored(data: StoredAuth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function clearStored() {
  localStorage.removeItem(STORAGE_KEY);
}

function isJwtExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) return true;
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    const exp = Number(payload?.exp);
    if (!Number.isFinite(exp)) return true;
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}

// ── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tryRefresh = useCallback(async (rt: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) return false;
      const json = await res.json();
      if (json.status !== 'success') return false;
      const u: User = json.user;
      setUser(u);
      setAccessToken(json.access_token);
      setRefreshToken(json.refresh_token);
      saveStored({ user: u, access_token: json.access_token, refresh_token: json.refresh_token });
      return true;
    } catch { return false; }
  }, []);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      // Verify the stored token is still valid
      fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${stored.access_token}` },
      })
        .then(async (res) => {
          if (res.ok) {
            const json = await res.json();
            const u = json.user || stored.user;
            setUser(u);
            setAccessToken(stored.access_token);
            setRefreshToken(stored.refresh_token);
          } else {
            // Try refreshing
            const refreshed = await tryRefresh(stored.refresh_token);
            if (!refreshed) clearStored();
          }
        })
        .catch(() => {
          // Backend offline — trust stored session for now
          setUser(stored.user);
          setAccessToken(stored.access_token);
          setRefreshToken(stored.refresh_token);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [tryRefresh]);

  // ── Login ──────────────────────────────────────────────────────────────

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();

      if (json.status !== 'success') {
        return { success: false, error: json.error || 'Login failed' };
      }

      const u: User = json.user;
      setUser(u);
      setAccessToken(json.access_token);
      setRefreshToken(json.refresh_token);
      saveStored({ user: u, access_token: json.access_token, refresh_token: json.refresh_token });
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }, []);

  // ── Sign Up ────────────────────────────────────────────────────────────

  const signup = useCallback(async ({ email, password, fullName, organization, purpose }: SignUpData) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName, organization, purpose }),
      });
      const json = await res.json();

      if (json.status !== 'success') {
        return { success: false, error: json.error || 'Signup failed' };
      }

      const needsVerification = json.needs_verification ?? false;

      if (json.access_token && json.user) {
        const u: User = json.user;
        setUser(u);
        setAccessToken(json.access_token);
        setRefreshToken(json.refresh_token);
        saveStored({ user: u, access_token: json.access_token, refresh_token: json.refresh_token });
      }

      return { success: true, needsVerification };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────

  const logout = useCallback(async () => {
    if (accessToken && !isJwtExpired(accessToken)) {
      try {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch { /* ignore */ }
    }
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    clearStored();
  }, [accessToken]);

  // Periodically check token validity & check when returning to tab
  useEffect(() => {
    if (!accessToken) return;

    const checkToken = async () => {
      if (isJwtExpired(accessToken)) {
        if (refreshToken) {
          const refreshed = await tryRefresh(refreshToken);
          if (!refreshed) {
            logout();
          }
        } else {
          logout();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkToken();
      }
    };

    const handleFocus = () => {
      checkToken();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // Also check every minute
    const intervalId = setInterval(checkToken, 60000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [accessToken, refreshToken, tryRefresh, logout]);

  // ── Resend Verification ────────────────────────────────────────────────

  const resendVerification = useCallback(async (email?: string) => {
    const targetEmail = email || user?.email;
    if (!targetEmail) return { success: false, error: 'Email is required' };
    try {
      const res = await fetch(`${API_URL}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const json = await res.json();
      if (json.status !== 'success') {
        return { success: false, error: json.error || 'Failed to send verification email' };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Network error' };
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && !!accessToken,
        isLoading,
        accessToken,
        login,
        signup,
        logout,
        resendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
