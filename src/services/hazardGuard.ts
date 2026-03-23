// HazardGuard API service for disaster prediction
// Integrated with the backend MVC architecture at /api/hazardguard/predict

import { getAuthHeaders } from "./authToken";
import { creditsService } from "./credits";

export interface PredictionResult {
  prediction: string;
  confidence: number;
  latitude: number;
  longitude: number;
  disaster_types?: string[];
  disaster_type_probabilities?: Record<string, number>;
  disaster_type_confidence?: string;
  features?: Record<string, number>;
  emergency_contacts?: Array<{
    name: string;
    number: string;
    type: string;
  }>;
  recommendations?: string[];
}

export interface HazardGuardResponse {
  success: boolean;
  data?: PredictionResult;
  error?: string;
}

class HazardGuardService {
  private baseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_HAZARDGUARD_URL || 'http://127.0.0.1:5000';
  private readonly predictionCost = 10;

  private async ensureCreditsForPrediction(): Promise<{ ok: boolean; error?: string }> {
    try {
      const balance = await creditsService.getBalance();
      if (balance < this.predictionCost) {
        window.dispatchEvent(new CustomEvent('credits:insufficient', {
          detail: {
            required_credits: this.predictionCost,
            remaining_credits: balance,
            model: 'hazardguard',
          }
        }));
        return {
          ok: false,
          error: 'Out of credits. Please buy more credits to run HazardGuard predictions.',
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

  async predictDisaster(latitude: number, longitude: number): Promise<HazardGuardResponse> {
    const creditGate = await this.ensureCreditsForPrediction();
    if (!creditGate.ok) {
      return { success: false, error: creditGate.error };
    }

    try {
      console.log('[HAZARDGUARD_CLIENT] Starting prediction request...');
      console.log('[HAZARDGUARD_CLIENT] Using baseUrl:', this.baseUrl);
      console.log('[HAZARDGUARD_CLIENT] Coordinates:', { latitude, longitude });
      
      // Calculate reference date accounting for:
      // - 60 days of historical data needed (59 days before + 1 prediction day)
      // - 7 days NASA POWER API lag requirement
      // Total: today - 67 days
      const referenceDate = new Date();
      referenceDate.setDate(referenceDate.getDate() - 67); 
      const referenceDateString = referenceDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      console.log('[HAZARDGUARD_CLIENT] Reference date (67 days ago for 60 days data + 7 day lag):', referenceDateString);
      
      const requestUrl = `${this.baseUrl}/api/hazardguard/predict`;
      console.log('[HAZARDGUARD_CLIENT] Request URL:', requestUrl);
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          latitude,
          longitude,
          reference_date: referenceDateString
        }),
      });

      console.log('[HAZARDGUARD_CLIENT] Response status:', response.status);

      if (!response.ok) {
        if (response.status === 402) {
          const insufficient = await response.json().catch(() => ({}));
          const info = insufficient?.credit_info || {};
          window.dispatchEvent(new CustomEvent('credits:insufficient', { detail: info }));
          return {
            success: false,
            error: insufficient?.message || 'Insufficient credits for HazardGuard prediction'
          };
        }
        let backendError = '';
        try {
          const errJson = await response.json();
          backendError = errJson?.error || errJson?.message || '';
        } catch {
          backendError = '';
        }
        console.error('[HAZARDGUARD_CLIENT] Response not OK:', response.status, response.statusText, backendError);
        throw new Error(backendError ? `Prediction service error ${response.status}: ${backendError}` : `Prediction service error ${response.status}`);
      }

      const data = await response.json();
      console.log('[HAZARDGUARD_CLIENT] Response data:', JSON.stringify(data, null, 2));

      if (data.credit_info?.remaining_credits !== undefined) {
        window.dispatchEvent(new CustomEvent('credits:updated', {
          detail: { remaining_credits: data.credit_info.remaining_credits }
        }));
      }
      
      if (!data.success) {
        console.error('[HAZARDGUARD_CLIENT] Prediction failed:', data.error);
        return {
          success: false,
          error: data.error || 'Prediction failed'
        };
      }

      console.log('[HAZARDGUARD_CLIENT] Prediction successful:', data.data?.prediction?.prediction);
      console.log('[HAZARDGUARD_CLIENT] Disaster types from API:', data.data?.disaster_types?.disaster_types);
      console.log('[HAZARDGUARD_CLIENT] Disaster type probabilities:', data.data?.disaster_types?.probabilities);
      return {
        success: true,
        data: {
          prediction: data.data?.prediction?.prediction || 'UNKNOWN',
          confidence: (data.data?.prediction?.confidence || 0) * 100, // Convert to percentage
          latitude,
          longitude,
          disaster_types: data.data?.disaster_types?.disaster_types || [],
          disaster_type_probabilities: data.data?.disaster_types?.probabilities || {},
          disaster_type_confidence: data.data?.disaster_types?.confidence || '',
          features: {
            disaster_probability: (data.data?.prediction?.probability?.disaster || 0) * 100,
            normal_probability: (data.data?.prediction?.probability?.normal || 0) * 100,
            processing_time: data.data?.processing_details?.total_processing_time_seconds || 0,
            data_collection_success: data.data?.data_collection_summary ? 
              (Object.values(data.data.data_collection_summary).every((item: any) => item) ? 1 : 0) : 0
          },
          emergency_contacts: [
            {
              name: "Emergency Services",
              number: "911", 
              type: "emergency"
            },
            {
              name: "Local Emergency Management",
              number: "211",
              type: "disaster"
            }
          ],
          recommendations: this.getDefaultRecommendations(data.data?.prediction?.prediction || 'UNKNOWN')
        }
      };
    } catch (error) {
      console.error('HazardGuard prediction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to HazardGuard service'
      };
    } finally {
      await this.syncCreditBalanceOrConsumeFallback(this.predictionCost);
    }
  }

  private getDefaultRecommendations(prediction: string): string[] {
    if (prediction?.toLowerCase() === 'disaster') {
      return [
        "Stay informed about weather conditions",
        "Prepare emergency supplies and evacuation plan",
        "Monitor local emergency services updates",
        "Avoid unnecessary travel in the area",
        "Keep emergency contacts readily available"
      ];
    } else {
      return [
        "Continue monitoring weather conditions",
        "Maintain standard emergency preparedness",
        "Stay informed about local conditions"
      ];
    }
  }

  /**
   * Generate evenly-spaced sample points within a polygon and
   * run HazardGuard predictions for each to build a heatmap.
   */
  async predictRegion(
    polygon: Array<[number, number]>,
    sampleCount: number = 5
  ): Promise<{
    success: boolean;
    points?: Array<{
      latitude: number;
      longitude: number;
      risk_score: number;
      prediction: string;
      confidence: number;
      disaster_types?: string[];
      disaster_type_probabilities?: Record<string, number>;
    }>;
    summary?: {
      total: number;
      successful: number;
      failed: number;
      avg_risk: number;
      max_risk: number;
      disaster_count: number;
    };
    error?: string;
  }> {
    const creditGate = await this.ensureCreditsForPrediction();
    if (!creditGate.ok) {
      return { success: false, error: creditGate.error };
    }

    try {
      console.log('[HAZARDGUARD_CLIENT] Starting region prediction...');
      console.log('[HAZARDGUARD_CLIENT] Polygon vertices:', polygon.length, 'Sample points:', sampleCount);

      // Generate sample points inside the polygon
      const sampleLocations = this.generateGridPointsInPolygon(polygon, sampleCount);
      console.log('[HAZARDGUARD_CLIENT] Generated', sampleLocations.length, 'sample points');

      if (sampleLocations.length === 0) {
        return { success: false, error: 'Could not generate sample points within the polygon' };
      }

      // Calculate reference date (same logic as single prediction)
      const referenceDate = new Date();
      referenceDate.setDate(referenceDate.getDate() - 67);
      const referenceDateString = referenceDate.toISOString().split('T')[0];

      // Build batch request
      const locations = sampleLocations.map(([lat, lng]) => ({
        latitude: lat,
        longitude: lng,
        reference_date: referenceDateString
      }));

      const requestUrl = `${this.baseUrl}/api/hazardguard/predict/batch`;
      console.log('[HAZARDGUARD_CLIENT] Batch URL:', requestUrl);

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ locations }),
      });

      if (!response.ok) {
        if (response.status === 402) {
          const insufficient = await response.json().catch(() => ({}));
          const info = insufficient?.credit_info || {};
          window.dispatchEvent(new CustomEvent('credits:insufficient', { detail: info }));
          return { success: false, error: insufficient?.message || 'Insufficient credits' };
        }
        throw new Error(`Batch prediction service error ${response.status}`);
      }

      const data = await response.json();
      console.log('[HAZARDGUARD_CLIENT] Batch response:', JSON.stringify(data, null, 2).slice(0, 500));

      if (data.credit_info?.remaining_credits !== undefined) {
        window.dispatchEvent(new CustomEvent('credits:updated', {
          detail: { remaining_credits: data.credit_info.remaining_credits }
        }));
      }

      if (!data.success && (!data.data?.results || data.data.results.length === 0)) {
        return { success: false, error: data.error || 'Batch prediction failed' };
      }

      // Transform results into heatmap points
      const points: Array<{
        latitude: number;
        longitude: number;
        risk_score: number;
        prediction: string;
        confidence: number;
        disaster_types?: string[];
        disaster_type_probabilities?: Record<string, number>;
      }> = [];

      let totalRisk = 0;
      let maxRisk = 0;
      let disasterCount = 0;
      let successfulCount = 0;

      for (const result of (data.data?.results || [])) {
        if (!result.success) continue;
        successfulCount++;

        const prediction = result.prediction?.prediction || 'UNKNOWN';
        const confidence = result.prediction?.confidence || 0;
        const disasterProb = result.prediction?.probability?.disaster || 0;
        const isDisaster = prediction.toLowerCase() === 'disaster';

        // Risk score: use disaster probability as 0-1 intensity
        const risk_score = disasterProb;
        totalRisk += risk_score;
        maxRisk = Math.max(maxRisk, risk_score);
        if (isDisaster) disasterCount++;

        points.push({
          latitude: result.location?.latitude || 0,
          longitude: result.location?.longitude || 0,
          risk_score,
          prediction,
          confidence,
          disaster_types: result.disaster_types?.disaster_types,
          disaster_type_probabilities: result.disaster_types?.probabilities,
        });
      }

      return {
        success: true,
        points,
        summary: {
          total: locations.length,
          successful: successfulCount,
          failed: locations.length - successfulCount,
          avg_risk: successfulCount > 0 ? totalRisk / successfulCount : 0,
          max_risk: maxRisk,
          disaster_count: disasterCount
        }
      };
    } catch (error) {
      console.error('[HAZARDGUARD_CLIENT] Region prediction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Region prediction failed'
      };
    } finally {
      await this.syncCreditBalanceOrConsumeFallback(this.predictionCost);
    }
  }

  /**
   * Generate roughly `count` evenly spaced grid points that fall inside the given polygon.
   * Uses a bounding-box grid and point-in-polygon filtering.
   */
  private generateGridPointsInPolygon(
    polygon: Array<[number, number]>,
    count: number
  ): Array<[number, number]> {
    // Compute bounding box
    const lats = polygon.map(p => p[0]);
    const lngs = polygon.map(p => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // Determine grid dimensions — approximate square grid with `count` cells
    const aspect = (maxLng - minLng) / Math.max(maxLat - minLat, 0.0001);
    const rows = Math.max(1, Math.round(Math.sqrt(count / aspect)));
    const cols = Math.max(1, Math.round(count / rows));

    const latStep = (maxLat - minLat) / (rows + 1);
    const lngStep = (maxLng - minLng) / (cols + 1);

    const points: Array<[number, number]> = [];

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        const lat = minLat + r * latStep;
        const lng = minLng + c * lngStep;
        if (this.pointInPolygon(lat, lng, polygon)) {
          points.push([lat, lng]);
        }
      }
    }

    // If we got fewer than needed (non-convex polygon), try denser grid
    if (points.length < Math.min(count, 3)) {
      const denseRows = rows * 2;
      const denseCols = cols * 2;
      const dLatStep = (maxLat - minLat) / (denseRows + 1);
      const dLngStep = (maxLng - minLng) / (denseCols + 1);
      points.length = 0;
      for (let r = 1; r <= denseRows; r++) {
        for (let c = 1; c <= denseCols; c++) {
          const lat = minLat + r * dLatStep;
          const lng = minLng + c * dLngStep;
          if (this.pointInPolygon(lat, lng, polygon)) {
            points.push([lat, lng]);
          }
        }
      }
    }

    // Trim to target count (pick evenly spaced subset if we have more)
    if (points.length > count) {
      const step = points.length / count;
      const sampled: Array<[number, number]> = [];
      for (let i = 0; i < count; i++) {
        sampled.push(points[Math.floor(i * step)]);
      }
      return sampled;
    }

    return points;
  }

  /** Ray-casting point-in-polygon test */
  private pointInPolygon(lat: number, lng: number, polygon: Array<[number, number]>): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [yi, xi] = polygon[i];
      const [yj, xj] = polygon[j];
      const intersect = ((yi > lat) !== (yj > lat)) &&
        (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const hazardGuardService = new HazardGuardService();