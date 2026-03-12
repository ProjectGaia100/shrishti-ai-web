// WeatherWise API service for LSTM weather forecasting
// Integrated with the backend MVC architecture at /api/weatherwise/

export interface WeatherForecast {
  forecast: {
    temperature_C: number[];
    precipitation_mm: number[];
    'humidity_%': number[];
    wind_speed_mps: number[];
    surface_pressure_hPa: number[];
    solar_radiation_wm2: number[];
  };
  forecast_dates: string[];
  forecast_variables: string[];
  model_context: string;
  location: {
    latitude: number;
    longitude: number;
  };
  forecast_summary: {
    horizon_days: number;
    variables_count: number;
    model_used: string;
  };
}

export interface WeatherWiseResponse {
  success: boolean;
  data?: WeatherForecast;
  error?: string;
  message?: string;
}

class WeatherWiseService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

  async generateForecast(
    latitude: number,
    longitude: number,
    referenceDate: string,
    disasterType: string = 'Normal',
    forecastDays: number = 60
  ): Promise<WeatherWiseResponse> {
    try {
      console.log('[WEATHERWISE_CLIENT] Starting forecast request...');
      console.log('[WEATHERWISE_CLIENT] Using baseUrl:', this.baseUrl);
      console.log('[WEATHERWISE_CLIENT] Parameters:', {
        latitude,
        longitude,
        referenceDate,
        disasterType,
        forecastDays
      });
      
      const requestUrl = `${this.baseUrl}/api/weatherwise/forecast`;
      console.log('[WEATHERWISE_CLIENT] Request URL:', requestUrl);
      
      const requestBody = {
        latitude,
        longitude,
        reference_date: referenceDate,
        disaster_type: disasterType,
        forecast_days: forecastDays
      };
      console.log('[WEATHERWISE_CLIENT] Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('[WEATHERWISE_CLIENT] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WEATHERWISE_CLIENT] Response not OK:', response.status, response.statusText);
        console.error('[WEATHERWISE_CLIENT] Error response body:', errorText);
        throw new Error(`WeatherWise service error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[WEATHERWISE_CLIENT] Response data:', JSON.stringify(data, null, 2));
      
      if (!data.success) {
        console.error('[WEATHERWISE_CLIENT] Forecast failed:', data.error || data.message);
        return {
          success: false,
          error: data.error || data.message || 'Forecast generation failed'
        };
      }

      console.log('[WEATHERWISE_CLIENT] Forecast successful');
      console.log('[WEATHERWISE_CLIENT] Model used:', data.data?.model_context);
      console.log('[WEATHERWISE_CLIENT] Forecast days:', data.data?.forecast_summary?.horizon_days);
      
      return {
        success: true,
        data: data.data
      };
    } catch (error) {
      console.error('[WEATHERWISE_CLIENT] Forecast error:', error);
      console.error('[WEATHERWISE_CLIENT] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to WeatherWise service'
      };
    }
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      console.log('[WEATHERWISE_CLIENT] Checking service health...');
      const response = await fetch(`${this.baseUrl}/api/weatherwise/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('[WEATHERWISE_CLIENT] Health check status:', response.status);
      return response.ok;
    } catch (error) {
      console.error('[WEATHERWISE_CLIENT] Health check failed:', error);
      return false;
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      console.log('[WEATHERWISE_CLIENT] Fetching available models...');
      const response = await fetch(`${this.baseUrl}/api/weatherwise/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('[WEATHERWISE_CLIENT] Failed to fetch models:', response.status);
        return ['Normal', 'Flood', 'Drought', 'Storm', 'Landslide'];
      }

      const data = await response.json();
      console.log('[WEATHERWISE_CLIENT] Available models:', data.data?.available_disaster_contexts);
      return data.data?.available_disaster_contexts || ['Normal', 'Flood', 'Drought', 'Storm', 'Landslide'];
    } catch (error) {
      console.error('[WEATHERWISE_CLIENT] Error fetching models:', error);
      return ['Normal', 'Flood', 'Drought', 'Storm', 'Landslide'];
    }
  }
}

export const weatherWiseService = new WeatherWiseService();
