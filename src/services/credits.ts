/**
 * Credits Service
 * Handles credit balance, purchases, and deductions via backend API.
 * Falls back to localStorage when not authenticated.
 */

import { getAccessToken } from './authToken';

const LOCAL_CREDITS_KEY = 'geovision_local_credits_balance';
const DEFAULT_CREDITS = 30;
const API_BASE = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_API_URL ||
  'http://127.0.0.1:5000'
).replace(/\/+$/, '');

export interface CreditBundle {
  id: string;
  credits: number;
  price_inr: number;
  label: string;
}

export interface InsufficientCreditDetail {
  remaining_credits: number;
  required_credits: number;
  model: string;
}

/**
 * Get the auth token using the shared authToken service
 */
function getAuthToken(): string | null {
  return getAccessToken();
}

/**
 * Check if user is authenticated
 */
function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

class CreditsService {
  // Local fallback methods
  private readLocalBalance(): number {
    const raw = localStorage.getItem(LOCAL_CREDITS_KEY);
    if (!raw) return DEFAULT_CREDITS;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_CREDITS;
  }

  private writeLocalBalance(value: number): void {
    const safe = Math.max(0, Math.floor(value));
    localStorage.setItem(LOCAL_CREDITS_KEY, String(safe));
  }

  /**
   * Get credit balance - from backend if authenticated, localStorage otherwise
   * IMPORTANT: When authenticated, ALWAYS use database value, never stale localStorage
   */
  async getBalance(): Promise<number> {
    const token = getAuthToken();
    
    if (!token) {
      // Not authenticated, use localStorage for anonymous users
      return this.readLocalBalance();
    }

    try {
      const response = await fetch(`${API_BASE}/api/credits/balance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn('[CREDITS] Failed to fetch balance from API:', response.status, errorText);
        // When authenticated but API fails, return cached localStorage value
        // This prevents showing wrong default value
        const cached = this.readLocalBalance();
        console.log('[CREDITS] Using cached balance:', cached);
        return cached;
      }

      const data = await response.json();
      console.log('[CREDITS] API response:', data);
      const balance = data?.data?.credits ?? data?.credits ?? DEFAULT_CREDITS;
      
      // Sync local storage with server (for offline fallback only)
      this.writeLocalBalance(balance);
      
      return balance;
    } catch (error) {
      console.error('[CREDITS] Error fetching balance:', error);
      // When authenticated but fetch fails, return cached localStorage value
      const cached = this.readLocalBalance();
      console.log('[CREDITS] Using cached balance after error:', cached);
      return cached;
    }
  }

  /**
   * Get available credit bundles
   */
  async getBundles(): Promise<CreditBundle[]> {
    try {
      const response = await fetch(`${API_BASE}/api/credits/bundles`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bundles');
      }

      const data = await response.json();
      return data?.data?.bundles || data?.bundles || [];
    } catch (error) {
      console.error('[CREDITS] Error fetching bundles:', error);
      // Return default bundles as fallback
      return [
        { id: 'plus_1000', credits: 1000, price_inr: 999, label: '1000 Credits' },
        { id: 'plus_10000', credits: 10000, price_inr: 7999, label: '10000 Credits' },
        { id: 'plus_100000', credits: 100000, price_inr: 59999, label: '100000 Credits' },
      ];
    }
  }

  /**
   * Purchase a credit bundle
   */
  async purchase(bundleId: string): Promise<{ remaining_credits: number } | null> {
    const token = getAuthToken();
    
    if (!token) {
      // Not authenticated - simulate purchase locally
      const bundles: Record<string, number> = {
        'plus_1000': 1000,
        'plus_10000': 10000,
        'plus_100000': 100000,
      };
      
      const amount = bundles[bundleId];
      if (!amount) throw new Error('Invalid bundle');
      
      const current = this.readLocalBalance();
      const next = current + amount;
      this.writeLocalBalance(next);
      
      return { remaining_credits: next };
    }

    try {
      const response = await fetch(`${API_BASE}/api/credits/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bundle_id: bundleId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.error || 'Purchase failed');
      }

      const data = await response.json();
      const remaining = data?.data?.remaining_credits ?? data?.remaining_credits;
      
      // Sync local storage
      if (typeof remaining === 'number') {
        this.writeLocalBalance(remaining);
      }
      
      return { remaining_credits: remaining };
    } catch (error) {
      console.error('[CREDITS] Purchase error:', error);
      throw error;
    }
  }

  /**
   * Consume/deduct credits
   */
  async consume(amount: number): Promise<number> {
    const token = getAuthToken();
    
    if (!token) {
      // Not authenticated - deduct locally
      const current = this.readLocalBalance();
      const next = Math.max(0, current - Math.max(0, Math.floor(amount)));
      this.writeLocalBalance(next);
      return next;
    }

    try {
      const response = await fetch(`${API_BASE}/api/credits/deduct`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, description: 'Model prediction' }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        if (response.status === 402) {
          // Insufficient credits
          const remaining = error?.remaining_credits ?? 0;
          this.writeLocalBalance(remaining);
          
          // Dispatch insufficient credits event
          window.dispatchEvent(new CustomEvent('credits:insufficient', {
            detail: {
              remaining_credits: remaining,
              required_credits: error?.required_credits ?? amount,
            }
          }));
          
          return remaining;
        }
        
        throw new Error(error?.error || 'Deduction failed');
      }

      const data = await response.json();
      const remaining = data?.data?.remaining_credits ?? data?.remaining_credits;
      
      // Sync local storage
      if (typeof remaining === 'number') {
        this.writeLocalBalance(remaining);
      }
      
      return remaining;
    } catch (error) {
      console.error('[CREDITS] Consume error:', error);
      // Fallback to local deduction
      const current = this.readLocalBalance();
      const next = Math.max(0, current - Math.max(0, Math.floor(amount)));
      this.writeLocalBalance(next);
      return next;
    }
  }

  /**
   * Reset credits to default (30) - for demo/testing
   */
  async resetToDefault(): Promise<number> {
    const token = getAuthToken();
    
    if (!token) {
      // Not authenticated - reset locally
      this.writeLocalBalance(DEFAULT_CREDITS);
      return DEFAULT_CREDITS;
    }

    try {
      const response = await fetch(`${API_BASE}/api/credits/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('[CREDITS] Failed to reset on server, using local');
        this.writeLocalBalance(DEFAULT_CREDITS);
        return DEFAULT_CREDITS;
      }

      const data = await response.json();
      const credits = data?.data?.credits ?? DEFAULT_CREDITS;
      
      // Sync local storage
      this.writeLocalBalance(credits);
      
      return credits;
    } catch (error) {
      console.error('[CREDITS] Reset error:', error);
      this.writeLocalBalance(DEFAULT_CREDITS);
      return DEFAULT_CREDITS;
    }
  }

  /**
   * Check if user has enough credits
   */
  async hasEnoughCredits(required: number): Promise<boolean> {
    const balance = await this.getBalance();
    return balance >= required;
  }

  /**
   * Clear stale localStorage cache (call on login to ensure fresh DB values)
   */
  clearLocalCache(): void {
    localStorage.removeItem(LOCAL_CREDITS_KEY);
    console.log('[CREDITS] Local cache cleared');
  }

  /**
   * Sync local credits with server (call after login)
   * Clears stale localStorage first to ensure database value is used
   */
  async syncWithServer(): Promise<number> {
    // Clear any stale cached value first
    this.clearLocalCache();
    return this.getBalance();
  }
}

export const creditsService = new CreditsService();
