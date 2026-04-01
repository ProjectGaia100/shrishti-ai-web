// Goa Data Service - Fetches Goa-specific geospatial data from AMCHE.IN/IndianOpenMaps
// Integrated with the backend at /api/goa/*

import { getAuthHeaders } from "./authToken";

// ========================================
// TYPES & INTERFACES
// ========================================

export type GoaLayerId = 
  | 'water_bodies'
  | 'local_body_boundaries'
  | 'private_forests'
  | 'steep_plots'
  | 'mining_leases'
  | 'fire_trucks'
  | 'mhadei_project'
  | 'communidade_plots'
  | 'schools'
  | 'hazard_lines';

export type GoaCategoryId = 
  | 'environment'
  | 'administrative'
  | 'terrain'
  | 'industry'
  | 'emergency'
  | 'infrastructure'
  | 'land'
  | 'facilities'
  | 'regulatory';

export interface GoaLayer {
  id: GoaLayerId;
  title: string;
  description: string;
  category: GoaCategoryId;
  icon: string;
  color: string;
  source: string;
  available: boolean;
  file_size: number;
}

export interface GoaCategory {
  id: GoaCategoryId;
  title: string;
  description: string;
  icon: string;
  color: string;
  layers: GoaLayer[];
  layer_count: number;
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

export interface GoaLayerStats {
  layer_id: string;
  title: string;
  feature_count: number;
  file_size_bytes: number;
  file_size_mb: number;
}

// Generic response wrapper
export interface GoaResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

// ========================================
// SERVICE CLASS
// ========================================

class GoaService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/goa`;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET'
  ): Promise<GoaResponse<T>> {
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
      console.error('Goa API error:', error);
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
   * Get list of all available Goa data layers
   */
  async getLayers(): Promise<GoaResponse<GoaLayer[]>> {
    return this.makeRequest<GoaLayer[]>('/layers');
  }

  /**
   * Get layers grouped by category
   */
  async getCategories(): Promise<GoaResponse<GoaCategory[]>> {
    return this.makeRequest<GoaCategory[]>('/categories');
  }

  /**
   * Get GeoJSON data for a specific layer
   */
  async getLayerData(layerId: GoaLayerId): Promise<GoaResponse<GeoJSONFeatureCollection>> {
    return this.makeRequest<GeoJSONFeatureCollection>(`/layer/${layerId}`);
  }

  /**
   * Get statistics for a layer without loading full data
   */
  async getLayerStats(layerId: GoaLayerId): Promise<GoaResponse<GoaLayerStats>> {
    return this.makeRequest<GoaLayerStats>(`/layer/${layerId}/stats`);
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get a Lucide icon name based on the layer's icon string
   */
  static getIconName(iconStr: string): string {
    const iconMap: Record<string, string> = {
      'droplets': 'Droplets',
      'map': 'Map',
      'trees': 'Trees',
      'mountain': 'Mountain',
      'pickaxe': 'Pickaxe',
      'flame': 'Flame',
      'construction': 'Construction',
      'landmark': 'Landmark',
      'school': 'School',
      'alert-triangle': 'AlertTriangle',
      'leaf': 'Leaf',
      'factory': 'Factory',
      'siren': 'Siren',
      'building': 'Building',
      'building-2': 'Building2',
      'shield': 'Shield',
      'folder': 'Folder'
    };
    return iconMap[iconStr] || 'Folder';
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Get category display info
   */
  static getCategoryInfo(categoryId: GoaCategoryId): { title: string; color: string } {
    const categories: Record<GoaCategoryId, { title: string; color: string }> = {
      environment: { title: 'Environment', color: '#22C55E' },
      administrative: { title: 'Administrative', color: '#8B5CF6' },
      terrain: { title: 'Terrain', color: '#F97316' },
      industry: { title: 'Industry', color: '#78716C' },
      emergency: { title: 'Emergency Services', color: '#EF4444' },
      infrastructure: { title: 'Infrastructure', color: '#06B6D4' },
      land: { title: 'Land Records', color: '#A855F7' },
      facilities: { title: 'Facilities', color: '#F59E0B' },
      regulatory: { title: 'Regulatory', color: '#DC2626' }
    };
    return categories[categoryId] || { title: categoryId, color: '#6B7280' };
  }
}

// Export singleton instance
export const goaService = new GoaService();
