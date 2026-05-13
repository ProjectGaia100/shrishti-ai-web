// Forest Department API service for GEE-based forestry analysis
// Integrated with the backend at /api/forest-dept/*

import { getAuthHeaders } from "./authToken";
import { creditsService } from "./credits";

// ========================================
// TYPES & INTERFACES
// ========================================

export type ForestDeptFeature = 
  | 'ndvi'
  | 'crop_classification'
  | 'soil_moisture'
  | 'fire_risk'
  | 'plantation_suitability'
  | 'compensatory_plantation'
  | 'tree_growth'
  | 'species_recommendation';

// Credit costs for each feature
export const FOREST_DEPT_CREDIT_COSTS: Record<ForestDeptFeature, number> = {
  ndvi: 0,  // Free global layer
  crop_classification: 8,
  soil_moisture: 0,  // Free global layer
  fire_risk: 0,  // Free global layer (will be updated)
  plantation_suitability: 8,
  compensatory_plantation: 10,
  tree_growth: 5,
  species_recommendation: 5
};

// Result interfaces
export interface CropClassificationResult {
  status: string;
  total_area_hectares: number;
  season: string;
  classification: Record<string, {
    percentage: number;
    area_hectares: number;
    color: string;
  }>;
  cluster_ndvi: Record<string, number>;
  tile_url?: string;
  legend: Array<{ color: string; label: string }>;
  date_range: { start: string; end: string };
  images_used: number;
  data_source?: string;
  note?: string;
}

export interface SoilMoistureResult {
  status: string;
  total_area_hectares: number;
  overall_status: string;
  moisture_index: {
    mean: number;
    min: number;
    max: number;
  };
  irrigation_distribution: {
    dry: { percentage: number; color: string };
    moderate: { percentage: number; color: string };
    well_irrigated: { percentage: number; color: string };
  };
  water_stress: {
    percentage: number;
    severity: string;
  };
  tile_url?: string;
  legend: Array<{ color: string; label: string }>;
  date_range: { start: string; end: string };
  has_lst_data: boolean;
}

export interface FireRiskResult {
  status: string;
  total_area_hectares: number;
  overall_risk: string;
  risk_score: number;
  risk_distribution: {
    low: { percentage: number; color: string };
    moderate: { percentage: number; color: string };
    high: { percentage: number; color: string };
    extreme: { percentage: number; color: string };
  };
  factors: {
    temperature: { mean_celsius: number };
    dry_vegetation: { percentage: number };
  };
  tile_url?: string;
  legend: Array<{ color: string; label: string }>;
  date_range: { start: string; end: string };
}

export interface PlantationSuitabilityResult {
  status: string;
  total_area_hectares: number;
  overall_suitability: string;
  suitability_score: number;
  suitable_area: {
    percentage: number;
    hectares: number;
  };
  exclusion_factors: {
    built_up: { percentage: number; reason: string };
    water_bodies: { percentage: number; reason: string };
    steep_slope: { percentage: number; reason: string };
    existing_forest: { percentage: number; reason: string };
  };
  tile_url?: string;
  legend: Array<{ color: string; label: string }>;
  date_range: { start: string; end: string };
}

export interface CompensatoryPlantationResult {
  status: string;
  removal_area: {
    total_hectares: number;
    forest_percentage: number;
    forest_loss_hectares: number;
  };
  compensation_required: {
    ratio: string;
    required_hectares: number;
  };
  search_area: {
    total_hectares: number;
    suitable_hectares: number;
    suitable_percentage: number;
  };
  feasibility: {
    can_compensate: boolean;
    message: string;
  };
  tile_urls: {
    removal_forest?: string;
    priority_areas?: string;
  };
  legend: Array<{ color: string; label: string }>;
  date_range: { start: string; end: string };
}

export interface TreeGrowthResult {
  status: string;
  total_area_hectares: number;
  current_status: string;
  current_ndvi: number;
  growth_analysis: {
    status: string;
    annual_ndvi_change: number;
    trend: string;
  };
  historical_ndvi: Record<string, number>;
  years_analyzed: number;
  // New fields for chart visualization
  chart_data: Array<{
    year: number;
    ndvi: number;
    label: string;
  }>;
  statistics: {
    min_ndvi: number;
    max_ndvi: number;
    avg_ndvi: number;
    best_year: number;
    worst_year: number;
    total_change_percent: number;
    start_year: number;
    end_year: number;
  };
}

export interface SpeciesRecommendation {
  species: string;
  confidence: number;
  reason: string;
  growth_rate: string;
  time_to_maturity: string;
}

export interface SpeciesRecommendationResult {
  status: string;
  total_area_hectares: number;
  environmental_profile: {
    rainfall_mm: number;
    rainfall_category: string;
    temperature_celsius: number;
    temperature_category: string;
    slope_degrees: number;
    slope_category: string;
    moisture_index: number;
    moisture_category: string;
  };
  recommendations: SpeciesRecommendation[];
  note: string;
}

// Generic response wrapper
export interface ForestDeptResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  remaining_credits?: number;
}

// ========================================
// SERVICE CLASS
// ========================================

class ForestDepartmentService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/forest-dept`;
  }

  private async ensureCredits(feature: ForestDeptFeature): Promise<boolean> {
    const cost = FOREST_DEPT_CREDIT_COSTS[feature];
    if (cost === 0) return true; // Free feature
    
    const credits = await creditsService.getBalance();
    return credits >= cost;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: object
  ): Promise<ForestDeptResponse<T>> {
    try {
      const headers = getAuthHeaders();
      
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (body && method === 'POST') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `Request failed with status ${response.status}`
        };
      }

      // Update credits if returned
      if (data.remaining_credits !== undefined) {
        window.dispatchEvent(new CustomEvent('credits:updated', {
          detail: { remaining_credits: data.remaining_credits }
        }));
      }

      return {
        success: true,
        data: data.data || data,
        remaining_credits: data.remaining_credits
      };
    } catch (error) {
      console.error('Forest Department API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // ========================================
  // API METHODS
  // ========================================

  /**
   * Get global NDVI tiles (FREE)
   */
  async getNdviTiles(): Promise<ForestDeptResponse<{
    tile_url: string;
    metadata: object;
    legend: Array<{ color: string; label: string; value: string }>;
  }>> {
    return this.makeRequest('/ndvi', 'GET');
  }

  /**
   * Classify crops in the specified area
   */
  async classifyCrops(
    coordinates: number[][],
    season: 'kharif' | 'rabi' | 'zaid' = 'kharif'
  ): Promise<ForestDeptResponse<CropClassificationResult>> {
    if (!await this.ensureCredits('crop_classification')) {
      return { success: false, error: 'Insufficient credits' };
    }
    return this.makeRequest('/crop-classification', 'POST', { coordinates, season });
  }

  /**
   * Analyze soil moisture and irrigation
   */
  async analyzeSoilMoisture(
    coordinates: number[][]
  ): Promise<ForestDeptResponse<SoilMoistureResult>> {
    if (!await this.ensureCredits('soil_moisture')) {
      return { success: false, error: 'Insufficient credits' };
    }
    return this.makeRequest('/soil-moisture', 'POST', { coordinates });
  }

  /**
   * Analyze fire risk
   */
  async analyzeFireRisk(
    coordinates: number[][]
  ): Promise<ForestDeptResponse<FireRiskResult>> {
    if (!await this.ensureCredits('fire_risk')) {
      return { success: false, error: 'Insufficient credits' };
    }
    return this.makeRequest('/fire-risk', 'POST', { coordinates });
  }

  /**
   * Analyze plantation suitability
   */
  async analyzePlantationSuitability(
    coordinates: number[][]
  ): Promise<ForestDeptResponse<PlantationSuitabilityResult>> {
    if (!await this.ensureCredits('plantation_suitability')) {
      return { success: false, error: 'Insufficient credits' };
    }
    return this.makeRequest('/plantation-suitability', 'POST', { coordinates });
  }

  /**
   * Plan compensatory plantation
   */
  async planCompensatoryPlantation(
    removalCoordinates?: number[][],
    searchCoordinates?: number[][]
  ): Promise<ForestDeptResponse<CompensatoryPlantationResult>> {
    if (!await this.ensureCredits('compensatory_plantation')) {
      return { success: false, error: 'Insufficient credits' };
    }
    return this.makeRequest('/compensatory-plantation', 'POST', {
      removal_coordinates: removalCoordinates,
      search_coordinates: searchCoordinates
    });
  }

  /**
   * Estimate tree growth / regrowth
   */
  async estimateTreeGrowth(
    coordinates: number[][]
  ): Promise<ForestDeptResponse<TreeGrowthResult>> {
    if (!await this.ensureCredits('tree_growth')) {
      return { success: false, error: 'Insufficient credits' };
    }
    return this.makeRequest('/tree-growth', 'POST', { coordinates });
  }

  /**
   * Get species recommendations
   */
  async recommendSpecies(
    coordinates: number[][]
  ): Promise<ForestDeptResponse<SpeciesRecommendationResult>> {
    if (!await this.ensureCredits('species_recommendation')) {
      return { success: false, error: 'Insufficient credits' };
    }
    return this.makeRequest('/species-recommendation', 'POST', { coordinates });
  }

  /**
   * Check service health
   */
  async checkServiceHealth(): Promise<{ healthy: boolean; status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      return { healthy: data.success, status: data.status || 'unknown' };
    } catch {
      return { healthy: false, status: 'unreachable' };
    }
  }

  /**
   * Get service capabilities
   */
  async getCapabilities(): Promise<{
    features: Array<{
      id: string;
      name: string;
      description: string;
      credit_cost: number;
      type: string;
    }>;
  } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/capabilities`);
      const data = await response.json();
      return data.success ? data : null;
    } catch {
      return null;
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  static latLngsToCoordinates(latLngs: Array<{ lat: number; lng: number }>): number[][] {
    return latLngs.map(ll => [ll.lng, ll.lat]);
  }

  static getRiskColor(risk: string): string {
    const colors: Record<string, string> = {
      'Low': '#4CAF50',
      'Moderate': '#FFEB3B',
      'High': '#FF9800',
      'Extreme': '#F44336'
    };
    return colors[risk] || '#9E9E9E';
  }

  static getSuitabilityColor(score: number): string {
    if (score >= 70) return '#4CAF50';
    if (score >= 50) return '#8BC34A';
    if (score >= 30) return '#FFEB3B';
    return '#F44336';
  }

  static getGrowthTrendColor(trend: string): string {
    const colors: Record<string, string> = {
      'Improving': '#4CAF50',
      'Stable': '#FFEB3B',
      'Declining': '#F44336'
    };
    return colors[trend] || '#9E9E9E';
  }
}

// Export singleton instance
export const forestDeptService = new ForestDepartmentService();
