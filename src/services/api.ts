import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export async function fetchDataset(id: string) {
  // map local ids to backend endpoints
  const mapping: Record<string, string> = {
    ndvi: '/api/gee/ndvi',
    elevation: '/api/gee/elevation',
    nightlights: '/api/gee/lights',
    landcover: '/api/gee/landcover',
    temperature: '/api/gee/temperature',
  };

  const endpoint = mapping[id] || `/api/gee/${id}`;
  const resp = await API.get(endpoint);
  return resp.data;
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
