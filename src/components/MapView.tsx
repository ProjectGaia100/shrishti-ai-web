import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet.heat";
import { ActiveLayers } from "./ActiveLayers";
import type { HazardGuardMode } from "./HazardGuardCard";

// Helper hook: keep a ref always in sync with the latest value
function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

// Extend L namespace for heat layer
declare module "leaflet" {
  function heatLayer(latlngs: Array<[number, number, number]>, options?: any): any;
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  risk_score: number; // 0-1
  prediction: string;
  confidence: number;
}

interface MapViewProps {
  hazardGuardActive?: boolean;
  hazardGuardMode?: HazardGuardMode;
  weatherWiseActive?: boolean;
  geoVisionActive?: boolean;
  onMapClick?: (latitude: number, longitude: number) => void;
  onPolygonDrawn?: (polygon: Array<[number, number]>) => void;
  predictionResult?: {
    prediction: string;
    confidence: number;
    latitude: number;
    longitude: number;
  } | null;
  heatmapData?: HeatmapPoint[] | null;
  heatmapLoading?: boolean;
}

export const MapView = ({ hazardGuardActive = false, hazardGuardMode = 'point', weatherWiseActive = false, geoVisionActive = false, onMapClick, onPolygonDrawn, predictionResult, heatmapData, heatmapLoading }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const riskZonesRef = useRef<L.LayerGroup | null>(null);
  const drawControlRef = useRef<any>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const heatLayerRef = useRef<any>(null);
  const heatMarkersRef = useRef<L.LayerGroup | null>(null);

  // --- Stable refs for values used inside the one-time map init effect ---
  const latestOnMapClick = useLatest(onMapClick);
  const latestOnPolygonDrawn = useLatest(onPolygonDrawn);
    const normalizeLongitude = (lng: number) => {
      // Leaflet can return wrapped world longitudes outside [-180, 180].
      return ((lng + 180) % 360 + 360) % 360 - 180;
    };
  const latestHazardGuardActive = useLatest(hazardGuardActive);
  const latestHazardGuardMode = useLatest(hazardGuardMode);
  const latestWeatherWiseActive = useLatest(weatherWiseActive);
  const latestGeoVisionActive = useLatest(geoVisionActive);

  // One-time map initialisation — never re-runs, callbacks read via refs
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 3,
      zoomControl: false,
    });

    // Add tile layer
    const base = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: '&copy; Esri, DigitalGlobe, CNES/Airbus, USDA, USGS, AeroGRID, IGN',
      maxZoom: 18,
      crossOrigin: true,
    }).addTo(map);

    // Optional labels overlay
    const labels = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
      opacity: 0.75,
      maxZoom: 18,
      crossOrigin: true,
    }).addTo(map);

    // initialize global layers store
    (window as any).GEO_LAYERS = (window as any).GEO_LAYERS || {};

    // Add click handler for HazardGuard (point mode only) and WeatherWise
    const handleMapClick = (e: L.LeafletMouseEvent) => {
      // In region mode, drawing handles interaction — skip point clicks
      if (latestHazardGuardActive.current && latestHazardGuardMode.current === 'region') return;
      if ((latestHazardGuardActive.current || latestWeatherWiseActive.current || latestGeoVisionActive.current) && latestOnMapClick.current) {
        const { lat, lng } = e.latlng;
        latestOnMapClick.current(lat, normalizeLongitude(lng));
      }
    };

    map.on('click', handleMapClick);

    // Initialize risk zones layer group
    riskZonesRef.current = L.layerGroup().addTo(map);

    // Initialize heatmap markers layer group
    heatMarkersRef.current = L.layerGroup().addTo(map);

    // Initialize drawing layer for region mode
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);
    drawnItemsRef.current = drawnItems;

    // Handle polygon/rectangle drawn
    map.on(L.Draw.Event.CREATED, (e: any) => {
      drawnItems.clearLayers();
      const layer = e.layer;
      drawnItems.addLayer(layer);
      
      // Extract polygon coordinates
      const latlngs = layer.getLatLngs()[0] as L.LatLng[];
      const coords: Array<[number, number]> = latlngs.map((ll: L.LatLng) => [ll.lat, normalizeLongitude(ll.lng)]);
      
      if (latestOnPolygonDrawn.current) {
        latestOnPolygonDrawn.current(coords);
      }
    });

    const layerRefs: Record<string, L.TileLayer> = {};

    function addLayer(detail: any) {
      const { id, name, url, metadata, opacity = 0.8 } = detail;
      if (!id || !url) return;
      // if existing remove
      if (layerRefs[id]) {
        map.removeLayer(layerRefs[id]);
      }
      const tile = L.tileLayer(url, { opacity, crossOrigin: true });
      tile.addTo(map);
      layerRefs[id] = tile;
      // store metadata
      (window as any).GEO_LAYERS[id] = { id, name, url, metadata, visible: true, opacity };
      window.dispatchEvent(new CustomEvent('geo:layers-changed', { detail: (window as any).GEO_LAYERS }));
    }

    function removeLayer(detail: any) {
      const { id } = detail;
      if (!id) return;
      if (layerRefs[id]) {
        map.removeLayer(layerRefs[id]);
        delete layerRefs[id];
      }
      if ((window as any).GEO_LAYERS?.[id]) {
        delete (window as any).GEO_LAYERS[id];
      }
      window.dispatchEvent(new CustomEvent('geo:layers-changed', { detail: (window as any).GEO_LAYERS }));
    }

    function toggleLayer(detail: any) {
      const { id, visible } = detail;
      const tile = layerRefs[id];
      if (!tile) return;
      if (visible) {
        tile.addTo(map);
      } else {
        map.removeLayer(tile);
      }
      if ((window as any).GEO_LAYERS?.[id]) {
        (window as any).GEO_LAYERS[id].visible = visible;
      }
      window.dispatchEvent(new CustomEvent('geo:layers-changed', { detail: (window as any).GEO_LAYERS }));
    }

    function updateOpacity(detail: any) {
      const { id, opacity } = detail;
      const tile = layerRefs[id];
      if (tile && typeof (tile as any).setOpacity === 'function') {
        (tile as any).setOpacity(opacity);
      }
      if ((window as any).GEO_LAYERS?.[id]) {
        (window as any).GEO_LAYERS[id].opacity = opacity;
      }
      window.dispatchEvent(new CustomEvent('geo:layers-changed', { detail: (window as any).GEO_LAYERS }));
    }

    // ── Timelapse: pre-loaded layer pool ──────────────────────────────────────
    // All frame tile layers are created upfront at opacity 0 so tiles download
    // in the background. Showing a frame is then just a setOpacity() call —
    // no network round-trip, no blank-map flicker.
    const timelapseLayerRefs: L.TileLayer[] = [];

    function timelapseInit(detail: any) {
      const { frames, opacity = 0.85 } = detail;
      // Tear down any previous timelapse
      timelapseLayerRefs.forEach(l => { try { map.removeLayer(l); } catch (_) {} });
      timelapseLayerRefs.length = 0;
      // Pre-create one tile layer per frame, all invisible. Adding them to the
      // map triggers tile fetching immediately so they're ready before playback.
      (frames as any[]).forEach((frame, i) => {
        const tile = L.tileLayer(frame.tile_url, {
          opacity: i === 0 ? opacity : 0,
          crossOrigin: true,
          keepBuffer: 4,
        });
        tile.addTo(map);
        timelapseLayerRefs.push(tile);
      });
    }

    function timelapseShowFrame(detail: any) {
      const { index, opacity = 0.85 } = detail;
      timelapseLayerRefs.forEach((layer, i) => {
        layer.setOpacity(i === index ? opacity : 0);
      });
    }

    function timelapseDestroy() {
      timelapseLayerRefs.forEach(l => { try { map.removeLayer(l); } catch (_) {} });
      timelapseLayerRefs.length = 0;
    }
    // ── end timelapse ──────────────────────────────────────────────────────────

    // event listeners
    const onAdd = (e: any) => addLayer(e.detail);
    const onRemove = (e: any) => removeLayer(e.detail);
    const onToggle = (e: any) => toggleLayer(e.detail);
    const onOpacity = (e: any) => updateOpacity(e.detail);
    const onTimelapseInit = (e: any) => timelapseInit(e.detail);
    const onTimelapseFrame = (e: any) => timelapseShowFrame(e.detail);
    const onTimelapseDestroy = () => timelapseDestroy();

    window.addEventListener('geo:add-layer', onAdd);
    window.addEventListener('geo:remove-layer', onRemove);
    window.addEventListener('geo:toggle-layer', onToggle);
    window.addEventListener('geo:update-opacity', onOpacity);
    window.addEventListener('geo:timelapse-init', onTimelapseInit);
    window.addEventListener('geo:timelapse-frame', onTimelapseFrame);
    window.addEventListener('geo:timelapse-destroy', onTimelapseDestroy);

  mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        window.removeEventListener('geo:add-layer', onAdd);
        window.removeEventListener('geo:remove-layer', onRemove);
        window.removeEventListener('geo:toggle-layer', onToggle);
        window.removeEventListener('geo:update-opacity', onOpacity);
        window.removeEventListener('geo:timelapse-init', onTimelapseInit);
        window.removeEventListener('geo:timelapse-frame', onTimelapseFrame);
        window.removeEventListener('geo:timelapse-destroy', onTimelapseDestroy);
        timelapseDestroy();
        mapInstanceRef.current.off('click', handleMapClick);
        if (riskZonesRef.current) {
          riskZonesRef.current.clearLayers();
        }
        if (heatMarkersRef.current) {
          heatMarkersRef.current.clearLayers();
        }
        if (heatLayerRef.current && mapInstanceRef.current.hasLayer(heatLayerRef.current)) {
          mapInstanceRef.current.removeLayer(heatLayerRef.current);
        }
        if (drawnItemsRef.current) {
          drawnItemsRef.current.clearLayers();
        }
        if (drawControlRef.current) {
          mapInstanceRef.current.removeControl(drawControlRef.current);
        }
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        riskZonesRef.current = null;
        heatMarkersRef.current = null;
        heatLayerRef.current = null;
        drawnItemsRef.current = null;
        drawControlRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // intentionally empty — callbacks & state read via stable refs

  // Effect to toggle draw control based on mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing draw control
    if (drawControlRef.current) {
      map.removeControl(drawControlRef.current);
      drawControlRef.current = null;
    }

    // Add draw control only in region mode
    if (hazardGuardActive && hazardGuardMode === 'region' && drawnItemsRef.current) {
      const drawControl = new (L.Control as any).Draw({
        position: 'topleft',
        draw: {
          polygon: {
            allowIntersection: false,
            shapeOptions: {
              color: '#8b5cf6',
              weight: 2,
              fillOpacity: 0.15,
              fillColor: '#8b5cf6'
            }
          },
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false,
          polyline: false
        },
        edit: {
          featureGroup: drawnItemsRef.current
        }
      });
      map.addControl(drawControl);
      drawControlRef.current = drawControl;
    } else {
      // Clear drawn polygons when leaving region mode
      if (drawnItemsRef.current) {
        drawnItemsRef.current.clearLayers();
      }
    }
  }, [hazardGuardActive, hazardGuardMode]);

  // Effect to render heatmap from prediction results
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing heatmap
    if (heatLayerRef.current && map.hasLayer(heatLayerRef.current)) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    if (heatMarkersRef.current) {
      heatMarkersRef.current.clearLayers();
    }

    if (!heatmapData || heatmapData.length === 0) return;

    // Use the raw sample points directly — no interpolation grid.
    // leaflet.heat is additive, so dense grids always blow up.
    // With the actual sparse sample points + a large radius/blur we get a
    // smooth, correctly-coloured heatmap.
    const heatPoints: Array<[number, number, number]> = heatmapData.map(pt => [
      pt.latitude,
      pt.longitude,
      pt.risk_score   // 0 = safe, 1 = disaster
    ]);

    heatLayerRef.current = (L as any).heatLayer(heatPoints, {
      radius: 80,
      blur: 60,
      maxZoom: 17,
      max: 1.0,          // risk_score is already 0-1
      minOpacity: 0.35,
      gradient: {
        0.0:  '#22c55e',  // green  – safe
        0.2:  '#4ade80',  // light green
        0.4:  '#eab308',  // yellow – moderate
        0.6:  '#f97316',  // orange – elevated
        0.8:  '#ef4444',  // red    – high
        1.0:  '#dc2626'   // deep red – disaster
      }
    }).addTo(map);

    // No sample-point markers — keep the map clean

    // Fit bounds
    const lats = heatmapData.map(p => p.latitude);
    const lngs = heatmapData.map(p => p.longitude);
    const padLat = (Math.max(...lats) - Math.min(...lats)) * 0.25 || 0.02;
    const padLng = (Math.max(...lngs) - Math.min(...lngs)) * 0.25 || 0.02;
    const bounds = L.latLngBounds(
      [Math.min(...lats) - padLat, Math.min(...lngs) - padLng],
      [Math.max(...lats) + padLat, Math.max(...lngs) + padLng]
    );
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [heatmapData]);

  // Effect to handle risk zones visualization
  useEffect(() => {
    if (!mapInstanceRef.current || !riskZonesRef.current) return;

    // Clear existing risk zones
    riskZonesRef.current.clearLayers();

    if (predictionResult && hazardGuardActive) {
      const { latitude, longitude, prediction, confidence } = predictionResult;
      
      // Calculate risk zone radii based on confidence and prediction type
      const baseRadius = prediction.toLowerCase() === 'disaster' ? 5000 : 2000; // meters
      const confidenceMultiplier = confidence / 100;
      
      const criticalRadius = baseRadius * confidenceMultiplier;
      const moderateRadius = criticalRadius * 1.5;
      const warningRadius = criticalRadius * 2.2;

      // Define colors based on prediction type
      const isDisaster = prediction.toLowerCase() === 'disaster';
      const criticalColor = isDisaster ? '#dc2626' : '#f59e0b'; // red or amber
      const moderateColor = isDisaster ? '#ea580c' : '#eab308'; // orange or yellow
      const warningColor = isDisaster ? '#f59e0b' : '#84cc16'; // amber or lime

      // Create risk zones (outermost first so they layer correctly)
      const warningZone = L.circle([latitude, longitude], {
        radius: warningRadius,
        fillColor: warningColor,
        color: warningColor,
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.1
      }).bindPopup(`
        <div class="text-center">
          <h4 class="font-bold">Warning Zone</h4>
          <p class="text-sm">Stay Alert</p>
          <p class="text-xs">Radius: ${(warningRadius / 1000).toFixed(1)}km</p>
        </div>
      `);

      const moderateZone = L.circle([latitude, longitude], {
        radius: moderateRadius,
        fillColor: moderateColor,
        color: moderateColor,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.15
      }).bindPopup(`
        <div class="text-center">
          <h4 class="font-bold">Moderate Risk Zone</h4>
          <p class="text-sm">Exercise Caution</p>
          <p class="text-xs">Radius: ${(moderateRadius / 1000).toFixed(1)}km</p>
        </div>
      `);

      const criticalZone = L.circle([latitude, longitude], {
        radius: criticalRadius,
        fillColor: criticalColor,
        color: criticalColor,
        weight: 3,
        opacity: 1.0,
        fillOpacity: 0.25
      }).bindPopup(`
        <div class="text-center">
          <h4 class="font-bold">${isDisaster ? 'Critical' : 'Elevated'} Risk Zone</h4>
          <p class="text-sm">${isDisaster ? 'Immediate Action Required' : 'Monitor Closely'}</p>
          <p class="text-xs">Radius: ${(criticalRadius / 1000).toFixed(1)}km</p>
          <p class="text-xs">Confidence: ${confidence.toFixed(1)}%</p>
        </div>
      `);

      // Add center marker
      const centerMarker = L.circleMarker([latitude, longitude], {
        radius: 8,
        fillColor: '#1f2937',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 1
      }).bindPopup(`
        <div class="text-center">
          <h4 class="font-bold">Prediction Point</h4>
          <p class="text-sm">${prediction}: ${confidence.toFixed(1)}%</p>
          <p class="text-xs">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</p>
        </div>
      `);

      // Add all zones to the layer group
      riskZonesRef.current.addLayer(warningZone);
      riskZonesRef.current.addLayer(moderateZone);
      riskZonesRef.current.addLayer(criticalZone);
      riskZonesRef.current.addLayer(centerMarker);

      // Auto-fit map to show all risk zones
      const bounds = warningZone.getBounds();
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [predictionResult, hazardGuardActive]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="hazard-map w-full h-full z-0" />
      
      {/* Heatmap loading overlay */}
      {heatmapLoading && (
        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-background/90 backdrop-blur-sm rounded-2xl p-6 text-center border border-border shadow-lg">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-sm font-medium text-foreground">Generating Risk Heatmap...</p>
            <p className="text-xs text-muted-foreground mt-1">Running predictions for sample points</p>
          </div>
        </div>
      )}

      <ActiveLayers />
    </div>
  );
};
