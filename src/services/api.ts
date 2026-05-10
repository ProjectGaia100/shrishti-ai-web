import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export interface AoiBbox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export async function fetchDataset(
  id: string,
  options?: { timeoutMs?: number; retries?: number; aoiBbox?: AoiBbox }
) {
  // Map local frontend IDs to potential legacy backend specific routes
  const legacyMapping: Record<string, string> = {
    vegetation: '/api/gee/ndvi',
    ndvi: '/api/gee/ndvi',
    ndbi: '/api/gee/ndbi',
    terrain: '/api/gee/elevation',
    elevation: '/api/gee/elevation',
    nightlights: '/api/gee/lights',
    lights: '/api/gee/lights',
    landcover: '/api/gee/landcover',
    temperature: '/api/gee/temperature',
  };

  const timeoutMs = options?.timeoutMs ?? 120000;
  const retries = options?.retries ?? 1;
  const params = options?.aoiBbox
    ? {
        aoi_bbox: `${options.aoiBbox.minLon},${options.aoiBbox.minLat},${options.aoiBbox.maxLon},${options.aoiBbox.maxLat}`,
      }
    : undefined;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      // Try the legacy mapping first for core layers, otherwise use the dynamic engine endpoint
      const endpoint = (attempt === 0 && legacyMapping[id]) || `/api/gee/dataset/${id}`;
      
      const resp = await API.get(endpoint, { 
        params,
        timeout: timeoutMs 
      });
      return resp.data;
    } catch (error) {
      lastError = error;
      console.warn(`[API] fetchDataset attempt ${attempt + 1} failed for ${id}:`, error);
      
      // If the first attempt with legacy mapping failed (404), second attempt will automatically try the dynamic endpoint
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

export interface TimelapseFrame {
  date_label: string;
  start_date: string;
  end_date: string;
  tile_url: string;
}

export async function fetchTimelapse(
  dataset: string = 'sentinel2',
  frames: number = 4,
  startYearMonth?: string,   // 'YYYY-MM'
  endYearMonth?: string,     // 'YYYY-MM'
): Promise<{
  success: boolean;
  dataset: string;
  frames: TimelapseFrame[];
  metadata: { title: string; description: string; source: string };
  error?: string;
}> {
  const params: Record<string, any> = { dataset, frames };
  if (startYearMonth) params.start_year_month = startYearMonth;
  if (endYearMonth)   params.end_year_month   = endYearMonth;
  const resp = await API.get('/api/gee/timelapse', { params, timeout: 180000 });
  return resp.data;
}

export async function sendChatMessage(message: string, history: any[] = []) {
  // Call the Flask backend directly for full GEE functionality
  const resp = await API.post('/api/chat', { 
    message, 
    history 
  });
  return resp.data;
}

export default API;
