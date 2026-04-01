// State Data Services - Fetches state-specific geospatial data
// Covers: India, Karnataka, Kerala, Maharashtra, Tamil Nadu, Andhra Pradesh

import { getAuthHeaders } from "./authToken";

// ========================================
// SHARED TYPES & INTERFACES
// ========================================

export interface StateLayer {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  source: string;
  available: boolean;
  file_size: number;
}

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  properties: Record<string, unknown>;
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJSONFeature[];
  _metadata?: {
    layer_id: string;
    title: string;
    description: string;
    source: string;
    color: string;
  };
  _truncated?: boolean;
}

export interface StateLayerStats {
  layer_id: string;
  title: string;
  feature_count: number;
  file_size_bytes: number;
  file_size_mb: number;
}

export interface StateResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

// ========================================
// BASE SERVICE CLASS
// ========================================

class StateDataService {
  protected baseUrl: string;
  protected stateName: string;

  constructor(stateSlug: string, stateName: string) {
    this.baseUrl = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/${stateSlug}`;
    this.stateName = stateName;
  }

  protected async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET'
  ): Promise<StateResponse<T>> {
    try {
      const headers = getAuthHeaders();
      
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const response = await fetch(`${this.baseUrl}${endpoint}`, options);
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `Request failed with status ${response.status}`
        };
      }

      return {
        success: data.success,
        data: data.data,
        count: data.count,
        error: data.error
      };
    } catch (error) {
      console.error(`${this.stateName} API error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getLayers(): Promise<StateResponse<StateLayer[]>> {
    return this.makeRequest<StateLayer[]>('/layers');
  }

  async getLayerData(layerId: string): Promise<StateResponse<GeoJSONFeatureCollection>> {
    return this.makeRequest<GeoJSONFeatureCollection>(`/layer/${layerId}`);
  }

  async getLayerStats(layerId: string): Promise<StateResponse<StateLayerStats>> {
    return this.makeRequest<StateLayerStats>(`/layer/${layerId}/stats`);
  }

  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// ========================================
// STATE-SPECIFIC SERVICE INSTANCES
// ========================================

// India Service
class IndiaService extends StateDataService {
  constructor() {
    super('india', 'India');
  }
}

// Karnataka Service
class KarnatakaService extends StateDataService {
  constructor() {
    super('karnataka', 'Karnataka');
  }
}

// Kerala Service
class KeralaService extends StateDataService {
  constructor() {
    super('kerala', 'Kerala');
  }
}

// Maharashtra Service
class MaharashtraService extends StateDataService {
  constructor() {
    super('maharashtra', 'Maharashtra');
  }
}

// Tamil Nadu Service
class TamilNaduService extends StateDataService {
  constructor() {
    super('tamilnadu', 'Tamil Nadu');
  }
}

// Andhra Pradesh Service
class AndhraPradeshService extends StateDataService {
  constructor() {
    super('andhrapradesh', 'Andhra Pradesh');
  }
}

// ========================================
// EXPORT SINGLETON INSTANCES
// ========================================

export const indiaService = new IndiaService();
export const karnatakaService = new KarnatakaService();
export const keralaService = new KeralaService();
export const maharashtraService = new MaharashtraService();
export const tamilnaduService = new TamilNaduService();
export const andhrapradeshService = new AndhraPradeshService();
