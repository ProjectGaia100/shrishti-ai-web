// Urban Planning API service for GEE-based urban analysis
// Integrated with the backend at /api/urban-planning/*

import { getAuthHeaders } from "./authToken";
import { creditsService } from "./credits";

// ========================================
// TYPES & INTERFACES
// ========================================

export interface PlotAreaResult {
  status: string;
  area_m2: number;
  area_hectares: number;
  area_acres: number;
  area_km2: number;
  perimeter_m: number;
  perimeter_km: number;
  coordinates: number[][];
  num_vertices: number;
}

export interface RoadLengthResult {
  status: string;
  length_m: number;
  length_km: number;
  length_miles: number;
  length_feet: number;
  coordinates: number[][];
  num_points: number;
}

export interface LandUseClassification {
  vegetation: { percentage: number; area_m2: number; color?: string };
  water: { percentage: number; area_m2: number; color?: string };
  built_up: { percentage: number; area_m2: number; color?: string };
  bare_land: { percentage: number; area_m2: number; color?: string };
}

export interface LandUseResult {
  status: string;
  total_area_m2: number;
  total_area_hectares: number;
  classification: LandUseClassification;
  indices: {
    mean_ndvi: number;
    mean_ndwi: number;
    mean_ndbi: number;
  };
  tile_url?: string;  // For map overlay
  legend?: Record<string, string>;
  date_range: { start: string; end: string };
  images_used: number;
}

export interface BuiltUpResult {
  status: string;
  total_area_m2: number;
  total_area_hectares: number;
  ndbi_statistics: {
    mean: number;
    min: number;
    max: number;
    std_dev: number;
  };
  tile_url?: string;  // For NDBI map overlay
  legend?: Record<string, string>;
  date_range: { start: string; end: string };
  images_used: number;
}

export interface UrbanGrowthYear {
  year: number;
  built_up_area_m2: number | null;
  built_up_area_hectares?: number;
  built_up_percentage: number | null;
  images_used?: number;
  data_available: boolean;
  error?: string;
}

export interface UrbanGrowthResult {
  status: string;
  total_area_m2: number;
  total_area_hectares: number;
  timeline: UrbanGrowthYear[];
  growth_statistics: {
    total_growth_m2: number;
    total_growth_hectares: number;
    growth_percentage: number;
    average_annual_growth_m2: number;
  };
  analysis_period: { start_year: number; end_year: number };
  ndbi_threshold: number;
}

export interface SuitabilityFactor {
  score: number;
  display: number;  // Actual condition level (0-100) for progress bar visualization
  weight: number;
  category: string;
  mean_degrees?: number;
  min_degrees?: number;
  max_degrees?: number;
  ndvi_mean?: number;
  ndbi_mean?: number;
  ndwi_mean?: number;
  mndwi_mean?: number;
  water_percentage?: number;
}

export interface SuitabilityResult {
  status: string;
  total_area_m2: number;
  total_area_hectares: number;
  suitability: {
    overall_score: number;
    category: string;
    recommendation: string;
  };
  factors: {
    slope: SuitabilityFactor;
    vegetation: SuitabilityFactor;
    flood_risk: SuitabilityFactor;
  };
  terrain: {
    mean_elevation_m: number;
    min_elevation_m: number;
    max_elevation_m: number;
    elevation_range_m: number;
  };
  has_land_cover_data: boolean;
  date_range: { start: string; end: string };
  images_used: number;
}

export interface UrbanPlanningResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  credit_info?: {
    charged_credits: number;
    remaining_credits?: number;
  };
}

// Feature type for identifying which urban planning tool is active
export type UrbanPlanningFeature = 
  | 'plot_area' 
  | 'road_length' 
  | 'built_up' 
  | 'suitability';

// Credit costs for each feature (must match backend)
export const URBAN_PLANNING_CREDIT_COSTS: Record<UrbanPlanningFeature, number> = {
  plot_area: 2,
  road_length: 2,
  built_up: 5,
  suitability: 8
};

// ========================================
// URBAN PLANNING SERVICE CLASS
// ========================================

class UrbanPlanningService {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

  private async ensureCredits(feature: UrbanPlanningFeature): Promise<{ ok: boolean; error?: string }> {
    try {
      const cost = URBAN_PLANNING_CREDIT_COSTS[feature];
      const balance = await creditsService.getBalance();
      if (balance < cost) {
        window.dispatchEvent(new CustomEvent('credits:insufficient', {
          detail: {
            required_credits: cost,
            remaining_credits: balance,
            feature: `urban_planning_${feature}`,
          }
        }));
        return {
          ok: false,
          error: `Not enough credits. ${feature} requires ${cost} credits.`,
        };
      }
      return { ok: true };
    } catch {
      // If balance check fails, let backend be authoritative
      return { ok: true };
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    body: object
  ): Promise<UrbanPlanningResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/urban-planning${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        if (response.status === 402) {
          const insufficient = await response.json().catch(() => ({}));
          const info = insufficient?.credit_info || {};
          window.dispatchEvent(new CustomEvent('credits:insufficient', { detail: info }));
          return {
            success: false,
            error: insufficient?.message || 'Insufficient credits'
          };
        }
        
        let errorMsg = `Service error ${response.status}`;
        try {
          const errJson = await response.json();
          errorMsg = errJson?.error || errJson?.message || errorMsg;
        } catch { /* ignore */ }
        
        return { success: false, error: errorMsg };
      }

      const data = await response.json();

      // Emit credit update event if present
      if (data.credit_info?.remaining_credits !== undefined) {
        window.dispatchEvent(new CustomEvent('credits:updated', {
          detail: { remaining_credits: data.credit_info.remaining_credits }
        }));
      }

      if (!data.success) {
        return { success: false, error: data.error || 'Request failed' };
      }

      return {
        success: true,
        data: data.data,
        credit_info: data.credit_info
      };
    } catch (error) {
      console.error('[URBAN_PLANNING] Request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to service'
      };
    }
  }

  // ========================================
  // 1. PLOT MEASUREMENT
  // ========================================
  async calculatePlotArea(coordinates: number[][]): Promise<UrbanPlanningResponse<PlotAreaResult>> {
    console.log('[URBAN_PLANNING] Calculating plot area for', coordinates.length, 'vertices');
    
    const creditCheck = await this.ensureCredits('plot_area');
    if (!creditCheck.ok) {
      return { success: false, error: creditCheck.error };
    }

    return this.makeRequest<PlotAreaResult>('/plot-area', { coordinates });
  }

  // ========================================
  // 2. ROAD LENGTH MEASUREMENT
  // ========================================
  async calculateRoadLength(coordinates: number[][]): Promise<UrbanPlanningResponse<RoadLengthResult>> {
    console.log('[URBAN_PLANNING] Calculating road length for', coordinates.length, 'points');
    
    const creditCheck = await this.ensureCredits('road_length');
    if (!creditCheck.ok) {
      return { success: false, error: creditCheck.error };
    }

    return this.makeRequest<RoadLengthResult>('/road-length', { coordinates });
  }

  // ========================================
  // 3. NDBI ANALYSIS (Pure NDBI Index Display)
  // ========================================
  async detectBuiltUp(
    coordinates: number[][],
    date?: string
  ): Promise<UrbanPlanningResponse<BuiltUpResult>> {
    console.log('[URBAN_PLANNING] Analyzing NDBI for area');
    
    const creditCheck = await this.ensureCredits('built_up');
    if (!creditCheck.ok) {
      return { success: false, error: creditCheck.error };
    }

    return this.makeRequest<BuiltUpResult>('/built-up', {
      coordinates,
      date
    });
  }

  // ========================================
  // 4. SUITABILITY ANALYSIS
  // ========================================
  async analyzeSuitability(
    coordinates: number[][],
    date?: string
  ): Promise<UrbanPlanningResponse<SuitabilityResult>> {
    console.log('[URBAN_PLANNING] Analyzing building suitability');
    
    const creditCheck = await this.ensureCredits('suitability');
    if (!creditCheck.ok) {
      return { success: false, error: creditCheck.error };
    }

    return this.makeRequest<SuitabilityResult>('/suitability', { coordinates, date });
  }

  // ========================================
  // UTILITY METHODS
  // ========================================
  
  /**
   * Convert Leaflet LatLng array to [lng, lat] coordinate array for GEE
   */
  static latLngsToCoordinates(latLngs: Array<{ lat: number; lng: number }>): number[][] {
    return latLngs.map(ll => [ll.lng, ll.lat]);
  }

  /**
   * Format area for display
   */
  static formatArea(m2: number): string {
    if (m2 >= 1000000) {
      return `${(m2 / 1000000).toFixed(2)} km²`;
    } else if (m2 >= 10000) {
      return `${(m2 / 10000).toFixed(2)} hectares`;
    } else {
      return `${m2.toFixed(0)} m²`;
    }
  }

  /**
   * Format length for display
   */
  static formatLength(m: number): string {
    if (m >= 1000) {
      return `${(m / 1000).toFixed(2)} km`;
    } else {
      return `${m.toFixed(0)} m`;
    }
  }

  /**
   * Get color for suitability score
   */
  static getSuitabilityColor(score: number): string {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#84cc16'; // lime
    if (score >= 40) return '#eab308'; // yellow
    return '#ef4444'; // red
  }

  /**
   * Get color for land use class
   */
  static getLandUseColor(type: string): string {
    const colors: Record<string, string> = {
      vegetation: '#22c55e',
      water: '#3b82f6',
      built_up: '#6b7280',
      bare_land: '#d4a574'
    };
    return colors[type] || '#888888';
  }

  async checkServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/urban-planning/ping`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getCapabilities(): Promise<object | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/urban-planning/capabilities`, {
        method: 'GET',
      });
      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const urbanPlanningService = new UrbanPlanningService();
