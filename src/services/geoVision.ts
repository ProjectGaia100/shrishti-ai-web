// GeoVision Fusion API service
// Cross-stacked ensemble fusion: LSTM MIMO + Tree Ensemble + CNN ResNet50 + Meta-Learner
// Integrated with the backend MVC architecture at /api/geovision/

import { getAuthHeaders } from "./authToken";
import { creditsService } from "./credits";

export interface GeoVisionPrediction {
  disaster_prediction: {
    predicted_class: string;
    confidence: number;
    probabilities: Record<string, number>;
  };
  weather_prediction: {
    predicted_regime: string;
    confidence: number;
    probabilities: Record<string, number>;
  };
  intermediate: {
    lstm_disaster_probs: Record<string, number>;
    lstm_weather_probs: Record<string, number>;
    ensemble_disaster_probs: Record<string, number>;
    models_used: string[];
  };
  metadata: {
    location: { latitude: number; longitude: number };
    reference_date: string;
    processing_time_seconds: number;
    model_version: string;
  };
}

export interface GeoVisionResponse {
  success: boolean;
  data?: GeoVisionPrediction;
  error?: string;
  message?: string;
}

export interface GeoVisionHealthResponse {
  success: boolean;
  data?: {
    service_status: string;
    models_loaded: Record<string, boolean>;
  };
}

class GeoVisionService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';
  private readonly predictionCost = 15;

  private async ensureCreditsForPrediction(): Promise<{ ok: boolean; error?: string }> {
    try {
      const balance = await creditsService.getBalance();
      if (balance < this.predictionCost) {
        window.dispatchEvent(new CustomEvent('credits:insufficient', {
          detail: {
            required_credits: this.predictionCost,
            remaining_credits: balance,
            model: 'geovision',
          }
        }));
        return {
          ok: false,
          error: 'Out of credits. Please buy more credits to run GeoVision predictions.',
        };
      }
      return { ok: true };
    } catch {
      // If balance check fails, let backend be authoritative.
      return { ok: true };
    }
  }

  private async syncCreditBalanceOrConsumeFallback(consumeAmount: number): Promise<void> {
    try {
      const balance = await creditsService.consume(consumeAmount);
      window.dispatchEvent(new CustomEvent('credits:updated', {
        detail: { remaining_credits: balance }
      }));
    } catch {
      // Fallback keeps UI responsive when balance endpoint is unavailable.
      window.dispatchEvent(new CustomEvent('credits:consume', {
        detail: { amount: consumeAmount }
      }));
    }
  }

  async predictFusion(
    latitude: number,
    longitude: number
  ): Promise<GeoVisionResponse> {
    const creditGate = await this.ensureCreditsForPrediction();
    if (!creditGate.ok) {
      return { success: false, error: creditGate.error };
    }

    let predictionSucceeded = false;
    try {
      console.log('[GEOVISION_CLIENT] Starting fusion prediction...');

      const requestUrl = `${this.baseUrl}/api/geovision/predict`;
      const requestBody = {
        latitude,
        longitude,
      };

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        if (response.status === 402) {
          const insufficient = await response.json().catch(() => ({}));
          const info = insufficient?.credit_info || {};
          window.dispatchEvent(new CustomEvent('credits:insufficient', { detail: info }));
          return {
            success: false,
            error: insufficient?.message || 'Insufficient credits for GeoVision prediction',
          };
        }
        const errorText = await response.text();
        throw new Error(`GeoVision service error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.credit_info?.remaining_credits !== undefined) {
        window.dispatchEvent(new CustomEvent('credits:updated', {
          detail: { remaining_credits: data.credit_info.remaining_credits }
        }));
      }

      if (!data.success) {
        return {
          success: false,
          error: data.error || data.message || 'Fusion prediction failed',
        };
      }

      predictionSucceeded = true;

      const raw = data.data;
      const pred = raw?.prediction || raw;
      const shaped: GeoVisionPrediction = {
        disaster_prediction: {
          predicted_class: pred.disaster_prediction || 'Unknown',
          confidence: pred.disaster_confidence ?? 0,
          probabilities: pred.disaster_probabilities || {},
        },
        weather_prediction: {
          predicted_regime: pred.weather_prediction || 'Unknown',
          confidence: pred.weather_confidence ?? 0,
          probabilities: pred.weather_probabilities || {},
        },
        intermediate: raw?.intermediate || { lstm_disaster_probs: {}, lstm_weather_probs: {}, ensemble_disaster_probs: {}, models_used: [] },
        metadata: {
          location: raw?.location || { latitude: 0, longitude: 0 },
          reference_date: raw?.location?.reference_date || '',
          processing_time_seconds: raw?.processing_time_seconds ?? raw?.metadata?.processing_time_seconds ?? 0,
          model_version: raw?.metadata?.model_version || 'v3',
        },
      };

      return { success: true, data: shaped };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to GeoVision service',
      };
    } finally {
      if (predictionSucceeded) {
        await this.syncCreditBalanceOrConsumeFallback(this.predictionCost);
      }
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geovision/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async getModels(): Promise<GeoVisionHealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geovision/models`);
      if (!response.ok) return { success: false };
      const data = await response.json();
      return { success: true, data: data.data };
    } catch {
      return { success: false };
    }
  }
}

export const geoVisionService = new GeoVisionService();
