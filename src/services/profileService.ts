const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  organization: string | null;
  purpose: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

/**
 * Helper to read the stored access token.
 */
function getToken(): string | null {
  try {
    const raw = localStorage.getItem('geovision_auth');
    if (!raw) return null;
    return JSON.parse(raw).access_token ?? null;
  } catch { return null; }
}

/**
 * Fetch the current user's profile via the backend.
 */
export async function getProfile(): Promise<UserProfile | null> {
  try {
    const token = getToken();
    if (!token) return null;

    const res = await fetch(`${API_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json.profile ?? null;
  } catch (err) {
    console.error('[PROFILE] Fetch error:', err);
    return null;
  }
}

/**
 * Update the current user's profile fields via the backend.
 */
export async function updateProfile(updates: Partial<Pick<UserProfile, 'full_name' | 'organization' | 'purpose'>>): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getToken();
    if (!token) return { success: false, error: 'Not authenticated' };

    const res = await fetch(`${API_URL}/api/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    const json = await res.json();
    if (json.status !== 'success') {
      return { success: false, error: json.error || 'Update failed' };
    }
    return { success: true };
  } catch (err) {
    console.error('[PROFILE] Update error:', err);
    return { success: false, error: 'Network error' };
  }
}
