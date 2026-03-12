const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

export type ActivityType =
  | 'login'
  | 'logout'
  | 'signup'
  | 'prediction_run'
  | 'weather_forecast'
  | 'chatbot_query'
  | 'profile_update'
  | 'settings_change'
  | 'dataset_view';

interface LogActivityParams {
  activityType: ActivityType;
  description?: string;
  metadata?: Record<string, unknown>;
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
 * Log a user activity event via the backend.
 * Silently fails — never blocks the caller.
 */
export async function logActivity({ activityType, description, metadata }: LogActivityParams): Promise<void> {
  try {
    const token = getToken();
    if (!token) return;

    await fetch(`${API_URL}/api/auth/activity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        activity_type: activityType,
        description: description || null,
        metadata: metadata || {},
      }),
    });
  } catch (err) {
    // Activity logging must never break the app
    console.warn('[ACTIVITY_LOG] Failed to log activity:', err);
  }
}

/**
 * Fetch recent activity logs for the current user via the backend.
 */
export async function getActivityLogs(limit = 50) {
  try {
    const token = getToken();
    if (!token) return [];

    const res = await fetch(`${API_URL}/api/auth/activity?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return [];
    const json = await res.json();
    return json.logs ?? [];
  } catch (err) {
    console.error('[ACTIVITY_LOG] Failed to fetch logs:', err);
    return [];
  }
}
