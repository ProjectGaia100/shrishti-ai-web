// GeoVision Fusion API service
// Cross-stacked ensemble fusion: LSTM MIMO + Tree Ensemble + CNN ResNet50 + Meta-Learner
// Integrated with the backend MVC architecture at /api/geovision/

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

  async predictFusion(
    latitude: number,
    longitude: number
  ): Promise<GeoVisionResponse> {
    try {
      console.log('[GEOVISION_CLIENT] Starting fusion prediction...');
      console.log('[GEOVISION_CLIENT] Parameters:', { latitude, longitude });

      const requestUrl = `${this.baseUrl}/api/geovision/predict`;
      const requestBody = {
        latitude,
        longitude,
      };

      console.log('[GEOVISION_CLIENT] POST', requestUrl);

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('[GEOVISION_CLIENT] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[GEOVISION_CLIENT] Error:', response.status, errorText);
        throw new Error(`GeoVision service error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.success) {
        console.error('[GEOVISION_CLIENT] Prediction failed:', data.error || data.message);
        return {
          success: false,
          error: data.error || data.message || 'Fusion prediction failed',
        };
      }

      console.log('[GEOVISION_CLIENT] Prediction successful');

      // Reshape backend flat response into the GeoVisionPrediction interface
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

      console.log('[GEOVISION_CLIENT] Disaster:', shaped.disaster_prediction.predicted_class);
      console.log('[GEOVISION_CLIENT] Weather:', shaped.weather_prediction.predicted_regime);

      return { success: true, data: shaped };
    } catch (error) {
      console.error('[GEOVISION_CLIENT] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to GeoVision service',
      };
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
