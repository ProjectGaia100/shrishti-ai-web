/**
 * API Key Management Service
 * Handles CRUD operations for API keys
 */

import { getAuthHeaders } from './authToken';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

export interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  is_active: boolean;
  last_used_at: string | null;
  usage_count: number;
  credits_consumed: number;
  created_at: string;
  expires_at: string | null;
}

export interface CreateKeyResponse {
  api_key: string;  // Only shown once!
  key_id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  created_at: string;
  expires_at: string | null;
}

export interface APIUsageStats {
  total_calls: number;
  total_credits: number;
  endpoint_breakdown: Record<string, { calls: number; credits: number }>;
  recent_logs: Array<{
    endpoint: string;
    credits_charged: number;
    created_at: string;
    status_code: number;
  }>;
}

export interface APICosts {
  hazardguard: number;
  weatherwise: number;
  geovision: number;
  data_layers: number;
  chatbot: number;
  timelapse: number;
}

class APIKeyService {
  /**
   * List all API keys for the current user
   */
  async listKeys(): Promise<APIKey[]> {
    const response = await fetch(`${API_URL}/api/api-keys`, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch API keys');
    }

    return data.data.keys;
  }

  /**
   * Create a new API key
   */
  async createKey(
    name: string,
    permissions?: string[],
    expiresAt?: string
  ): Promise<CreateKeyResponse> {
    const response = await fetch(`${API_URL}/api/api-keys`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        permissions,
        expires_at: expiresAt,
      }),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to create API key');
    }

    return data.data;
  }

  /**
   * Revoke an API key (soft delete)
   */
  async revokeKey(keyId: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/api-keys/${keyId}/revoke`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to revoke API key');
    }
  }

  /**
   * Permanently delete an API key
   */
  async deleteKey(keyId: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/api-keys/${keyId}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete API key');
    }
  }

  /**
   * Get API usage statistics
   */
  async getUsageStats(keyId?: string, days: number = 30): Promise<APIUsageStats> {
    const params = new URLSearchParams();
    if (keyId) params.set('key_id', keyId);
    params.set('days', days.toString());

    const response = await fetch(`${API_URL}/api/api-keys/usage?${params}`, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch usage stats');
    }

    return data.data;
  }

  /**
   * Get API costs (public endpoint)
   */
  async getCosts(): Promise<APICosts> {
    const response = await fetch(`${API_URL}/api/api-keys/costs`);
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Failed to fetch API costs');
    }

    return data.data.costs;
  }
}

export const apiKeyService = new APIKeyService();
