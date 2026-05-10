import { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet.heat";
import { ChevronUp, Layers, Map as MapIcon, Mountain, Satellite } from "lucide-react";
import type { HazardGuardMode } from "./HazardGuardCard";
import type { UrbanPlanningFeature } from "@/services/urbanPlanning";
import type { ForestDeptFeature } from "@/services/forestDepartment";

// Helper hook: keep a ref always in sync with the latest value
function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

// Extend L namespace for heat layer
declare module "leaflet" {
  interface HeatLayerOptions {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    max?: number;
    minOpacity?: number;
    gradient?: Record<number, string>;
  }
  function heatLayer(latlngs: Array<[number, number, number]>, options?: HeatLayerOptions): L.Layer;
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
  urbanPlanningFeature?: UrbanPlanningFeature | null;
  forestDeptFeature?: ForestDeptFeature | null;
  onMapClick?: (latitude: number, longitude: number) => void;
  onPolygonDrawn?: (polygon: Array<[number, number]>) => void;
  onUrbanPlanningDraw?: (coordinates: number[][], type: 'polygon' | 'polyline') => void;
  onForestDeptDraw?: (coordinates: number[][], type: 'polygon' | 'polyline') => void;
  predictionResult?: {
    prediction: string;
    confidence: number;
    latitude: number;
    longitude: number;
  } | null;
  heatmapData?: HeatmapPoint[] | null;
  heatmapLoading?: boolean;
}

interface GeoLayerMetadata {
  id: string;
  name: string;
  url: string;
  metadata?: Record<string, unknown>;
  visible: boolean;
  opacity: number;
  zIndex?: number;
  type?: 'tile' | 'geojson';
  category?: string;
  color?: string;
  featureCount?: number;
}

type BasemapStyle = 'map' | 'satellite' | 'terrain' | 'hybrid';

const AOI_RECTANGLE_STYLE: L.PathOptions = {
  className: 'aoi-rectangle',
  color: '#f59e0b',
  weight: 3,
  opacity: 1,
  fillColor: '#f59e0b',
  fillOpacity: 0.2,
  dashArray: '8 6',
  pane: 'aoi-draw-pane',
};

const BASEMAP_OPTIONS: Array<{
  id: BasemapStyle;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  thumbnail: string;
}> = [
  {
    id: 'satellite',
    label: 'Satellite',
    Icon: Satellite,
    thumbnail: "url('/map-switcher/satellite.png')",
  },
  {
    id: 'terrain',
    label: 'Terrain',
    Icon: Mountain,
    thumbnail: "url('/map-switcher/terrain.png')",
  },
  {
    id: 'map',
    label: 'Map',
    Icon: MapIcon,
    thumbnail: "url('/map-switcher/map.png')",
  },
  {
    id: 'hybrid',
    label: 'Hybrid',
    Icon: Layers,
    thumbnail: "url('/map-switcher/hybrid.png')",
  },
];

declare global {
  interface Window {
    GEO_LAYERS: Record<string, GeoLayerMetadata>;
    __GEO_AOI_BBOX?: {
      minLon: number;
      minLat: number;
      maxLon: number;
      maxLat: number;
    } | null;
    __GEO_AOI_ACTIVE?: boolean;
  }
}

export const MapView = ({ 
  hazardGuardActive = false, 
  hazardGuardMode = 'point', 
  weatherWiseActive = false, 
  geoVisionActive = false,
  urbanPlanningFeature = null,
  forestDeptFeature = null,
  onMapClick, 
  onPolygonDrawn,
  onUrbanPlanningDraw,
  onForestDeptDraw,
  predictionResult, 
  heatmapData, 
  heatmapLoading 
}: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const basemapLayersRef = useRef<Record<BasemapStyle, L.Layer | null>>({
    map: null,
    satellite: null,
    terrain: null,
    hybrid: null,
  });
  const riskZonesRef = useRef<L.LayerGroup | null>(null);
  const drawControlRef = useRef<L.Control | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const activeDrawHandlerRef = useRef<any>(null);
  const activeDrawTypeRef = useRef<'polygon' | 'polyline' | 'rectangle' | null>(null);
  const aoiEditHandlerRef = useRef<any>(null);
  const aoiDblClickZoomWasEnabledRef = useRef<boolean | null>(null);
  const heatLayerRef = useRef<L.Layer | null>(null);
  const heatMarkersRef = useRef<L.LayerGroup | null>(null);
  const jumpMarkerRef = useRef<L.CircleMarker | null>(null);
  const [selectedBasemap, setSelectedBasemap] = useState<BasemapStyle>('satellite');
  const [basemapExpanded, setBasemapExpanded] = useState(false);

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
  const latestUrbanPlanningFeature = useLatest(urbanPlanningFeature);
  const latestOnUrbanPlanningDraw = useLatest(onUrbanPlanningDraw);
  const latestForestDeptFeature = useLatest(forestDeptFeature);
  const latestOnForestDeptDraw = useLatest(onForestDeptDraw);

  // One-time map initialisation — never re-runs, callbacks read via refs
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [20, 0],
      zoom: 3,
      zoomControl: false,
      attributionControl: false,
    });

    // Google Maps-style basemap options.
    const esriAttribution = '&copy; Esri, DigitalGlobe, CNES/Airbus, USDA, USGS, AeroGRID, IGN';
    const labelsUrl = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

    const mapLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: esriAttribution,
      maxZoom: 18,
      crossOrigin: true,
    });

    const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: esriAttribution,
      maxZoom: 18,
      crossOrigin: true,
    });

    const terrainLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: esriAttribution,
      maxZoom: 18,
      crossOrigin: true,
    });

    const hybridLayer = L.layerGroup([
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: esriAttribution,
        maxZoom: 18,
        crossOrigin: true,
      }),
      L.tileLayer(labelsUrl, {
        opacity: 0.85,
        maxZoom: 18,
        crossOrigin: true,
      }),
    ]);

    basemapLayersRef.current = {
      map: mapLayer,
      satellite: satelliteLayer,
      terrain: terrainLayer,
      hybrid: hybridLayer,
    };

    // Default selected basemap.
    satelliteLayer.addTo(map);

    // Standard Leaflet Zoom Control in bottom-left.
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    L.control.attribution({ position: 'bottomright' }).addTo(map);

    const aoiPane = map.createPane('aoi-draw-pane');
    aoiPane.style.zIndex = '650';

    // initialize global layers store
    window.GEO_LAYERS = window.GEO_LAYERS || {};

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

    const emitDrawState = (active: boolean, type: 'polygon' | 'polyline' | 'rectangle' | null) => {
      window.dispatchEvent(new CustomEvent('geo:draw-state', {
        detail: { active, type },
      }));
    };

    const restoreAoiDoubleClickZoom = () => {
      if (aoiDblClickZoomWasEnabledRef.current === true) {
        map.doubleClickZoom.enable();
      }
      aoiDblClickZoomWasEnabledRef.current = null;
    };

    const disableAoiEditMode = () => {
      if (aoiEditHandlerRef.current && typeof aoiEditHandlerRef.current.disable === 'function') {
        aoiEditHandlerRef.current.disable();
      }
      aoiEditHandlerRef.current = null;
    };

    const clearAoiState = () => {
      window.__GEO_AOI_BBOX = null;
      window.__GEO_AOI_ACTIVE = false;
      window.dispatchEvent(new CustomEvent('geo:aoi-cleared'));
    };

    const emitAoiFromRectangle = (rectangle: L.Rectangle) => {
      rectangle.setStyle(AOI_RECTANGLE_STYLE);
      rectangle.bringToFront();

      const bounds = rectangle.getBounds();
      const southWest = bounds.getSouthWest();
      const northEast = bounds.getNorthEast();

      const bbox = {
        minLon: normalizeLongitude(Math.min(southWest.lng, northEast.lng)),
        minLat: Math.min(southWest.lat, northEast.lat),
        maxLon: normalizeLongitude(Math.max(southWest.lng, northEast.lng)),
        maxLat: Math.max(southWest.lat, northEast.lat),
      };

      const aoiCoords: Array<[number, number]> = [
        [bbox.minLon, bbox.minLat],
        [bbox.maxLon, bbox.minLat],
        [bbox.maxLon, bbox.maxLat],
        [bbox.minLon, bbox.maxLat],
        [bbox.minLon, bbox.minLat],
      ];

      window.__GEO_AOI_BBOX = bbox;
      window.__GEO_AOI_ACTIVE = true;

      window.dispatchEvent(new CustomEvent('geo:aoi-updated', {
        detail: {
          bbox,
          coordinates: aoiCoords,
        },
      }));
    };

    const enableAoiEditMode = () => {
      if (!drawnItemsRef.current) return;

      const EditCtor = (L as any).EditToolbar?.Edit;
      if (!EditCtor) return;

      disableAoiEditMode();
      aoiEditHandlerRef.current = new EditCtor(map, {
        featureGroup: drawnItemsRef.current,
        selectedPathOptions: false,
      });
      aoiEditHandlerRef.current.enable();
    };

    // Handle polygon/rectangle/polyline drawn
    map.on(L.Draw.Event.CREATED, (e: L.DrawEvents.Created) => {
      activeDrawHandlerRef.current = null;
      const activeType = activeDrawTypeRef.current;
      activeDrawTypeRef.current = null;

      drawnItems.clearLayers();
      const layer = e.layer;
      drawnItems.addLayer(layer);
      
      const layerType = e.layerType;
      
      // Handle polyline (for road width measurement)
      if (layerType === 'polyline') {
        const polyline = layer as L.Polyline;
        const latlngs = polyline.getLatLngs() as L.LatLng[];
        const coords: Array<[number, number]> = latlngs.map((ll: L.LatLng) => [ll.lng, ll.lat]); // [lon, lat] for GEE
        
        if (latestOnUrbanPlanningDraw.current) {
          latestOnUrbanPlanningDraw.current(coords, 'polyline');
        }
        emitDrawState(false, 'polyline');
        return;
      }

      // Handle AOI rectangle draw
      if (layerType === 'rectangle') {
        const rectangle = layer as L.Rectangle;
        const bounds = rectangle.getBounds();
        const southWestPx = map.latLngToContainerPoint(bounds.getSouthWest());
        const northEastPx = map.latLngToContainerPoint(bounds.getNorthEast());
        const widthPx = Math.abs(northEastPx.x - southWestPx.x);
        const heightPx = Math.abs(northEastPx.y - southWestPx.y);

        // Ignore accidental tiny rectangles from double-clicks; keep draw active.
        if (widthPx < 14 || heightPx < 14) {
          drawnItems.clearLayers();
          const retryHandler = new (L.Draw as any).Rectangle(map, {
            showArea: false,
            shapeOptions: {
              ...AOI_RECTANGLE_STYLE,
            },
          });
          activeDrawHandlerRef.current = retryHandler;
          activeDrawTypeRef.current = 'rectangle';
          emitDrawState(true, 'rectangle');
          retryHandler.enable();
          return;
        }

        rectangle.on('edit', () => {
          emitAoiFromRectangle(rectangle);
        });

        emitAoiFromRectangle(rectangle);
        enableAoiEditMode();
        restoreAoiDoubleClickZoom();

        emitDrawState(false, 'rectangle');
        return;
      }
      
      // Handle polygon
      const polygon = layer as L.Polygon;
      const latlngsRaw = polygon.getLatLngs();
      const latlngs = (Array.isArray(latlngsRaw[0]) ? latlngsRaw[0] : latlngsRaw) as L.LatLng[];
      const coords: Array<[number, number]> = latlngs.map((ll: L.LatLng) => [ll.lat, normalizeLongitude(ll.lng)]);
      const geeCoords: Array<[number, number]> = latlngs.map((ll: L.LatLng) => [normalizeLongitude(ll.lng), ll.lat]);

      // Notify panels that a polygon has been completed.
      window.dispatchEvent(new CustomEvent('geo:polygon-complete', {
        detail: { coordinates: geeCoords }
      }));
      
      // Check if this is for Forest Department (polygon features, excluding NDVI which is global)
      if (latestForestDeptFeature.current && latestForestDeptFeature.current !== 'ndvi') {
        if (latestOnForestDeptDraw.current) {
          latestOnForestDeptDraw.current(geeCoords, 'polygon');
        }
        return;
      }
      
      // Check if this is for urban planning (polygon features)
      if (latestUrbanPlanningFeature.current) {
        if (latestOnUrbanPlanningDraw.current) {
          latestOnUrbanPlanningDraw.current(geeCoords, 'polygon');
        }
        return;
      }
      
      // Default: HazardGuard polygon
      if (latestOnPolygonDrawn.current) {
        latestOnPolygonDrawn.current(coords);
      }

      emitDrawState(false, activeType ?? 'polygon');
    });

    map.on(L.Draw.Event.DRAWSTOP, () => {
      const lastType = activeDrawTypeRef.current;
      activeDrawHandlerRef.current = null;
      activeDrawTypeRef.current = null;
      emitDrawState(false, lastType);
    });

    const layerRefs: Record<string, L.TileLayer> = {};
    const geoJSONLayerRefs: Record<string, L.GeoJSON> = {};

    function addLayer(detail: { id: string; name: string; url: string; metadata?: Record<string, unknown>; opacity?: number }) {
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
      window.GEO_LAYERS[id] = { id, name, url, metadata, visible: true, opacity, type: 'tile' };
      window.dispatchEvent(new CustomEvent('geo:layers-changed', { detail: window.GEO_LAYERS }));
    }

    function removeLayer(detail: { id: string }) {
      const { id } = detail;
      if (!id) return;
      // Check tile layers
      if (layerRefs[id]) {
        map.removeLayer(layerRefs[id]);
        delete layerRefs[id];
      }
      // Check GeoJSON layers
      if (geoJSONLayerRefs[id]) {
        map.removeLayer(geoJSONLayerRefs[id]);
        delete geoJSONLayerRefs[id];
      }
      if (window.GEO_LAYERS?.[id]) {
        delete window.GEO_LAYERS[id];
      }
      window.dispatchEvent(new CustomEvent('geo:layers-changed', { detail: window.GEO_LAYERS }));
    }

    function toggleLayer(detail: { id: string; visible: boolean }) {
      const { id, visible } = detail;
      // Check tile layers
      const tile = layerRefs[id];
      if (tile) {
        if (visible) {
          tile.addTo(map);
        } else {
          map.removeLayer(tile);
        }
      }
      // Check GeoJSON layers
      const geoLayer = geoJSONLayerRefs[id];
      if (geoLayer) {
        if (visible) {
          geoLayer.addTo(map);
        } else {
          map.removeLayer(geoLayer);
        }
      }
      if (window.GEO_LAYERS?.[id]) {
        window.GEO_LAYERS[id].visible = visible;
      }
      window.dispatchEvent(new CustomEvent('geo:layers-changed', { detail: window.GEO_LAYERS }));
    }

    function updateOpacity(detail: { id: string; opacity: number }) {
      const { id, opacity } = detail;
      // Check tile layers
      const tile = layerRefs[id];
      if (tile && typeof tile.setOpacity === 'function') {
        tile.setOpacity(opacity);
      }
      // Check GeoJSON layers
      const geoLayer = geoJSONLayerRefs[id];
      if (geoLayer) {
        geoLayer.setStyle({ fillOpacity: opacity * 0.3, opacity: opacity });
      }
      if (window.GEO_LAYERS?.[id]) {
        window.GEO_LAYERS[id].opacity = opacity;
      }
      window.dispatchEvent(new CustomEvent('geo:layers-changed', { detail: window.GEO_LAYERS }));
    }

    function reorderLayers(detail: { orderedIds?: string[] }) {
      const orderedIds = Array.isArray(detail?.orderedIds) ? detail.orderedIds : [];
      if (!orderedIds.length) return;

      // UI sends top -> bottom order; apply bottom -> top so top layer is drawn last.
      const bottomToTop = [...orderedIds].reverse();
      bottomToTop.forEach((id, index) => {
        const zIndex = 300 + index;

        const tileLayer = layerRefs[id];
        if (tileLayer && map.hasLayer(tileLayer)) {
          tileLayer.setZIndex(zIndex);
          tileLayer.bringToFront();
        }

        const geoLayer = geoJSONLayerRefs[id];
        if (geoLayer && map.hasLayer(geoLayer)) {
          geoLayer.bringToFront();
        }

        if (window.GEO_LAYERS?.[id]) {
          window.GEO_LAYERS[id].zIndex = zIndex;
        }
      });

      window.dispatchEvent(new CustomEvent('geo:layers-changed', { detail: window.GEO_LAYERS }));
    }

    // ── GeoJSON Layer Management ──────────────────────────────────────────────
    function addGeoJSONLayer(detail: { id: string; name: string; data: GeoJSON.FeatureCollection; color?: string; opacity?: number; category?: string }) {
      const { id, name, data, color = '#3B82F6', opacity = 0.7, category } = detail;
      if (!id || !data) return;

      // Remove existing layer with same ID
      if (geoJSONLayerRefs[id]) {
        map.removeLayer(geoJSONLayerRefs[id]);
        delete geoJSONLayerRefs[id];
      }

      // Create GeoJSON layer with styling
      const geoLayer = L.geoJSON(data, {
        style: (feature) => {
          const geomType = feature?.geometry?.type;
          // Style based on geometry type
          if (geomType === 'Point' || geomType === 'MultiPoint') {
            return {};  // Points use pointToLayer
          }
          return {
            color: color,
            weight: 2,
            opacity: opacity,
            fillColor: color,
            fillOpacity: opacity * 0.3
          };
        },
        pointToLayer: (feature, latlng) => {
          // Create circle markers for points
          return L.circleMarker(latlng, {
            radius: 6,
            fillColor: color,
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
          });
        },
        onEachFeature: (feature, layer) => {
          // Add popup with properties
          if (feature.properties) {
            const props = feature.properties;
            const popupContent = Object.entries(props)
              .filter(([key, value]) => value !== null && value !== undefined && value !== '')
              .slice(0, 10)  // Limit to first 10 properties
              .map(([key, value]) => `<b>${key}:</b> ${value}`)
              .join('<br>');
            if (popupContent) {
              layer.bindPopup(`<div style="max-width: 300px; max-height: 200px; overflow: auto; font-size: 12px;">${popupContent}</div>`);
            }
          }
        }
      });

      geoLayer.addTo(map);
      geoJSONLayerRefs[id] = geoLayer;

      // Store metadata
      window.GEO_LAYERS[id] = { 
        id, 
        name, 
        url: '', // GeoJSON doesn't have a tile_url
        type: 'geojson',
        category,
        color,
        visible: true, 
        opacity,
        featureCount: data.features?.length || 0
      };
      window.dispatchEvent(new CustomEvent('geo:layers-changed', { detail: window.GEO_LAYERS }));

      // Fit map to layer bounds if it has features
      if (data.features && data.features.length > 0) {
        try {
          const bounds = geoLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
          }
        } catch (e) {
          console.warn('Could not fit bounds for GeoJSON layer:', e);
        }
      }
    }

    function removeGeoJSONLayer(id: string) {
      if (geoJSONLayerRefs[id]) {
        map.removeLayer(geoJSONLayerRefs[id]);
        delete geoJSONLayerRefs[id];
      }
      if (window.GEO_LAYERS?.[id]) {
        delete window.GEO_LAYERS[id];
      }
      window.dispatchEvent(new CustomEvent('geo:layers-changed', { detail: window.GEO_LAYERS }));
    }

    function toggleGeoJSONLayer(id: string, visible: boolean) {
      const geoLayer = geoJSONLayerRefs[id];
      if (!geoLayer) return;
      if (visible) {
        geoLayer.addTo(map);
      } else {
        map.removeLayer(geoLayer);
      }
      if (window.GEO_LAYERS?.[id]) {
        window.GEO_LAYERS[id].visible = visible;
      }
      window.dispatchEvent(new CustomEvent('geo:layers-changed', { detail: window.GEO_LAYERS }));
    }

    // ── Timelapse: pre-loaded layer pool ──────────────────────────────────────
    // All frame tile layers are created upfront at opacity 0 so tiles download
    // in the background. Showing a frame is then just a setOpacity() call —
    // no network round-trip, no blank-map flicker.
    const timelapseLayerRefs: L.TileLayer[] = [];

    function timelapseInit(detail: { frames: Array<{ tile_url: string }>; opacity?: number }) {
      const { frames, opacity = 0.85 } = detail;
      // Tear down any previous timelapse
      timelapseLayerRefs.forEach(l => { try { map.removeLayer(l); } catch (_) {} });
      timelapseLayerRefs.length = 0;
      // Pre-create one tile layer per frame, all invisible. Adding them to the
      // map triggers tile fetching immediately so they're ready before playback.
      frames.forEach((frame, i) => {
        const tile = L.tileLayer(frame.tile_url, {
          opacity: i === 0 ? opacity : 0,
          crossOrigin: true,
          keepBuffer: 4,
        });
        tile.addTo(map);
        timelapseLayerRefs.push(tile);
      });
    }

    function timelapseShowFrame(detail: { index: number; opacity?: number }) {
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

    function jumpToLocation(detail: { lat: number; lon: number; zoom?: number; label?: string }) {
      const lat = Number(detail?.lat);
      const lon = Number(detail?.lon);
      const zoom = Number.isFinite(Number(detail?.zoom)) ? Number(detail.zoom) : 10;
      const label = typeof detail?.label === 'string' ? detail.label : '';

      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      const clampedLat = Math.max(-90, Math.min(90, lat));
      const normalizedLon = normalizeLongitude(lon);
      map.flyTo([clampedLat, normalizedLon], Math.max(2, Math.min(18, zoom)), {
        animate: true,
        duration: 1.1,
      });

      if (jumpMarkerRef.current && map.hasLayer(jumpMarkerRef.current)) {
        map.removeLayer(jumpMarkerRef.current);
      }

      jumpMarkerRef.current = L.circleMarker([clampedLat, normalizedLon], {
        radius: 7,
        fillColor: '#2563eb',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95,
      }).addTo(map);

      if (label) {
        jumpMarkerRef.current.bindTooltip(label, {
          direction: 'top',
          offset: [0, -10],
          permanent: false,
          opacity: 0.95,
        }).openTooltip();
      }
    }

    function onStartDraw(e: Event) {
      const detail = (e as CustomEvent<{ type?: 'polygon' | 'polyline' | 'rectangle' }>).detail;
      const drawType = detail?.type;
      if (!drawType) return;

      disableAoiEditMode();
      if (drawType === 'rectangle') {
        clearAoiState();
      }
      drawnItems.clearLayers();

      if (activeDrawHandlerRef.current && typeof activeDrawHandlerRef.current.disable === 'function') {
        activeDrawHandlerRef.current.disable();
      }

      let handler: any;

      if (drawType === 'polyline') {
        handler = new (L.Draw as any).Polyline(map, {
          shapeOptions: {
            color: '#0f766e',
            weight: 3,
          },
        });
      } else if (drawType === 'rectangle') {
        handler = new (L.Draw as any).Rectangle(map, {
          showArea: false,
          shapeOptions: {
            ...AOI_RECTANGLE_STYLE,
          },
        });
      } else {
        handler = new (L.Draw as any).Polygon(map, {
          allowIntersection: false,
          shapeOptions: {
            color: '#0f766e',
            weight: 2,
            fillOpacity: 0.15,
            fillColor: '#0f766e',
          },
        });
      }

      activeDrawHandlerRef.current = handler;
      activeDrawTypeRef.current = drawType;
      if (drawType === 'rectangle') {
        aoiDblClickZoomWasEnabledRef.current = map.doubleClickZoom.enabled();
        map.doubleClickZoom.disable();
      }
      emitDrawState(true, drawType);
      handler.enable();
    }

    function onCancelDraw() {
      if (activeDrawHandlerRef.current && typeof activeDrawHandlerRef.current.disable === 'function') {
        activeDrawHandlerRef.current.disable();
      }
      restoreAoiDoubleClickZoom();
      const lastType = activeDrawTypeRef.current;
      activeDrawHandlerRef.current = null;
      activeDrawTypeRef.current = null;
      if (lastType === 'rectangle') {
        const hasDrawnAoi = Boolean(drawnItemsRef.current && drawnItemsRef.current.getLayers().length > 0);
        if (!hasDrawnAoi) {
          clearAoiState();
        }
      }
      emitDrawState(false, lastType);
    }

    // event listeners
    const onAdd = (e: Event) => addLayer((e as CustomEvent).detail);
    const onAddGeoJSON = (e: Event) => addGeoJSONLayer((e as CustomEvent).detail);
    const onRemove = (e: Event) => removeLayer((e as CustomEvent).detail);
    const onToggle = (e: Event) => toggleLayer((e as CustomEvent).detail);
    const onOpacity = (e: Event) => updateOpacity((e as CustomEvent).detail);
    const onOpacityGeoJSON = (e: Event) => updateOpacity((e as CustomEvent).detail); // Update for GeoJSON
    const onReorderLayers = (e: Event) => reorderLayers((e as CustomEvent).detail);
    const onTimelapseInit = (e: Event) => timelapseInit((e as CustomEvent).detail);
    const onTimelapseFrame = (e: Event) => timelapseShowFrame((e as CustomEvent).detail);
    const onTimelapseDestroy = () => timelapseDestroy();
    const onJumpToLocation = (e: Event) => jumpToLocation((e as CustomEvent).detail);

    window.addEventListener('geo:add-layer', onAdd);
    window.addEventListener('geo:add-geojson-layer', onAddGeoJSON);
    window.addEventListener('geo:remove-layer', onRemove);
    window.addEventListener('geo:toggle-layer', onToggle);
    window.addEventListener('geo:update-opacity', onOpacity);
    window.addEventListener('geo:reorder-layers', onReorderLayers);
    window.addEventListener('geo:timelapse-init', onTimelapseInit);
    window.addEventListener('geo:timelapse-frame', onTimelapseFrame);
    window.addEventListener('geo:timelapse-destroy', onTimelapseDestroy);
    window.addEventListener('geo:jump-to', onJumpToLocation);
    window.addEventListener('geo:start-draw', onStartDraw as EventListener);
    window.addEventListener('geo:cancel-draw', onCancelDraw as EventListener);

  mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        window.removeEventListener('geo:add-layer', onAdd);
        window.removeEventListener('geo:add-geojson-layer', onAddGeoJSON);
        window.removeEventListener('geo:remove-layer', onRemove);
        window.removeEventListener('geo:toggle-layer', onToggle);
        window.removeEventListener('geo:update-opacity', onOpacity);
        window.removeEventListener('geo:reorder-layers', onReorderLayers);
        window.removeEventListener('geo:timelapse-init', onTimelapseInit);
        window.removeEventListener('geo:timelapse-frame', onTimelapseFrame);
        window.removeEventListener('geo:timelapse-destroy', onTimelapseDestroy);
        window.removeEventListener('geo:jump-to', onJumpToLocation);
        window.removeEventListener('geo:start-draw', onStartDraw as EventListener);
        window.removeEventListener('geo:cancel-draw', onCancelDraw as EventListener);
        disableAoiEditMode();
        restoreAoiDoubleClickZoom();
        timelapseDestroy();
        mapInstanceRef.current.off('click', handleMapClick);
        if (riskZonesRef.current) {
          riskZonesRef.current.clearLayers();
        }
        if (jumpMarkerRef.current && mapInstanceRef.current.hasLayer(jumpMarkerRef.current)) {
          mapInstanceRef.current.removeLayer(jumpMarkerRef.current);
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
        jumpMarkerRef.current = null;
        drawnItemsRef.current = null;
        drawControlRef.current = null;
        basemapLayersRef.current = {
          map: null,
          satellite: null,
          terrain: null,
          hybrid: null,
        };
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // intentionally empty — callbacks & state read via stable refs

  // Effect to switch active basemap layer from custom switcher
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const basemapLayers = basemapLayersRef.current;
    (Object.keys(basemapLayers) as BasemapStyle[]).forEach((style) => {
      const layer = basemapLayers[style];
      if (!layer) return;
      const shouldShow = style === selectedBasemap;
      const isVisible = map.hasLayer(layer);
      if (shouldShow && !isVisible) {
        layer.addTo(map);
      } else if (!shouldShow && isVisible) {
        map.removeLayer(layer);
      }
    });
  }, [selectedBasemap]);

  // Effect to toggle draw control based on mode (HazardGuard region, Urban Planning, or Forest Dept)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing draw control
    if (drawControlRef.current) {
      map.removeControl(drawControlRef.current);
      drawControlRef.current = null;
    }

    // Determine which features need polyline vs polygon
    const needsPolyline = urbanPlanningFeature === 'road_length';
    const needsPolygon = urbanPlanningFeature && urbanPlanningFeature !== 'road_length';
    const isHazardGuardRegion = hazardGuardActive && hazardGuardMode === 'region';
    // Forest Dept features that need polygon (all except 'ndvi' which is global)
    const needsForestDeptPolygon = forestDeptFeature && forestDeptFeature !== 'ndvi';

    // Add draw control for urban planning, forest dept, or HazardGuard region mode
    if ((urbanPlanningFeature || needsForestDeptPolygon || isHazardGuardRegion) && drawnItemsRef.current) {
      // Use one professional accent for all draw interactions.
      const polygonColor = '#0f766e';

      const drawControl = new (L.Control as any).Draw({
        position: 'topleft',
        draw: {
          polygon: (needsPolygon || needsForestDeptPolygon || isHazardGuardRegion) ? {
            allowIntersection: false,
            shapeOptions: {
              color: polygonColor,
              weight: 2,
              fillOpacity: 0.15,
              fillColor: polygonColor
            }
          } : false,
          polyline: needsPolyline ? {
            shapeOptions: {
              color: '#0f766e',
              weight: 3
            }
          } : false,
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false
        },
        edit: {
          featureGroup: drawnItemsRef.current
        }
      });
      map.addControl(drawControl);
      drawControlRef.current = drawControl;
    } else {
      // Clear drawn items when no draw mode is active
      if (drawnItemsRef.current) {
        drawnItemsRef.current.clearLayers();
      }
    }
  }, [hazardGuardActive, hazardGuardMode, urbanPlanningFeature, forestDeptFeature]);

  const selectedBasemapOption = BASEMAP_OPTIONS.find(option => option.id === selectedBasemap) ?? BASEMAP_OPTIONS[0];

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

    heatLayerRef.current = L.heatLayer(heatPoints, {
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

      <div className={`map-style-switcher ${basemapExpanded ? 'is-open' : ''}`}>
        <button
          type="button"
          className="map-style-selected"
          onClick={() => setBasemapExpanded(prev => !prev)}
          aria-expanded={basemapExpanded}
          aria-label="Toggle map styles"
        >
          <span className="map-style-thumb" style={{ backgroundImage: selectedBasemapOption.thumbnail }} />
          <span className="map-style-selected-label">{selectedBasemapOption.label}</span>
          <ChevronUp className="h-3.5 w-3.5 map-style-caret" />
        </button>

        {basemapExpanded && (
          <div className="map-style-strip" role="menu" aria-label="Map styles">
            {BASEMAP_OPTIONS.filter(option => option.id !== selectedBasemap).map(({ id, label, Icon, thumbnail }) => (
              <button
                key={id}
                type="button"
                className="map-style-chip"
                onClick={() => {
                  setSelectedBasemap(id);
                  setBasemapExpanded(false);
                }}
                role="menuitem"
                aria-label={`Switch to ${label}`}
              >
                <span className="map-style-chip-thumb" style={{ backgroundImage: thumbnail }} />
                <span className="map-style-chip-label">{label}</span>
                <Icon className="h-3.5 w-3.5 map-style-chip-icon" />
              </button>
            ))}
          </div>
        )}
      </div>
      
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

    </div>
  );
};
