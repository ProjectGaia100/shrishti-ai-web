import { useEffect, useRef, useCallback, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet.heat";
import { 
  ChevronUp, 
  Layers, 
  Map as MapIcon, 
  Mountain, 
  Satellite, 
  Info,
  Maximize
} from "lucide-react";
import type { HazardGuardMode } from "./HazardGuardCard";
import type { UrbanPlanningFeature } from "@/services/urbanPlanning";
import type { ForestDeptFeature } from "@/services/forestDepartment";
import { useToast } from "@/hooks/use-toast";
import { cn, normalizeLongitude } from "@/lib/utils";

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
  const { toast } = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const basemapLayersRef = useRef<Record<BasemapStyle, L.Layer | null>>({
    'map': null,
    'satellite': null,
    'terrain': null,
    'hybrid': null,
  });

  const [selectedBasemap, setSelectedBasemap] = useState<BasemapStyle>('map');
  const [basemapExpanded, setBasemapExpanded] = useState(false);
  
  // keep refs updated
  const latestOnMapClick = useLatest(onMapClick);
  const latestOnPolygonDrawn = useLatest(onPolygonDrawn);
  const latestOnUrbanPlanningDraw = useLatest(onUrbanPlanningDraw);
  const latestOnForestDeptDraw = useLatest(onForestDeptDraw);
  const latestHazardGuardActive = useLatest(hazardGuardActive);
  const latestHazardGuardMode = useLatest(hazardGuardMode);
  const latestWeatherWiseActive = useLatest(weatherWiseActive);
  const latestGeoVisionActive = useLatest(geoVisionActive);

  // internal state for map management
  const heatLayerRef = useRef<L.Layer | null>(null);
  const riskZonesRef = useRef<L.LayerGroup | null>(null);
  const heatMarkersRef = useRef<L.LayerGroup | null>(null);
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const activeDrawHandlerRef = useRef<any>(null);
  const activeDrawTypeRef = useRef<string | null>(null);
  const aoiEditHandlerRef = useRef<any>(null);
  const aoiDblClickZoomWasEnabledRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // fix leaflet icon issues
    (L.Icon.Default as any).prototype._getIconUrl = function (name: string) {
      if (name === "icon") return "/placeholder.svg";
      if (name === "shadow") return "/placeholder.svg";
      return "";
    };

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
      center: [15.4989, 73.8278],
      zoom: 11,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
    });

    const cartoLight = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png');
    const googleSat = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] });
    const googleTerrain = L.tileLayer('https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] });
    const googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] });

    basemapLayersRef.current = {
      'map': cartoLight,
      'satellite': googleSat,
      'terrain': googleTerrain,
      'hybrid': googleHybrid,
    };

    cartoLight.addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomright' }).addTo(map);

    const aoiPane = map.createPane('aoi-draw-pane');
    aoiPane.style.zIndex = '650';

    // initialize global layers store
    window.GEO_LAYERS = window.GEO_LAYERS || {};

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      if (latestHazardGuardActive.current && latestHazardGuardMode.current === 'region') return;
      if ((latestHazardGuardActive.current || latestWeatherWiseActive.current || latestGeoVisionActive.current) && latestOnMapClick.current) {
        const { lat, lng } = e.latlng;
        latestOnMapClick.current(lat, normalizeLongitude(lng));
      }
    };

    map.on('click', handleMapClick);

    riskZonesRef.current = L.layerGroup().addTo(map);
    heatMarkersRef.current = L.layerGroup().addTo(map);
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

    map.on(L.Draw.Event.CREATED, (e: L.DrawEvents.Created) => {
      activeDrawHandlerRef.current = null;
      activeDrawTypeRef.current = null;

      drawnItems.clearLayers();
      const layer = e.layer;
      drawnItems.addLayer(layer);
      
      const layerType = e.layerType;
      
      if (layerType === 'polyline') {
        const polyline = layer as L.Polyline;
        const latlngs = polyline.getLatLngs() as L.LatLng[];
        const coords: Array<[number, number]> = latlngs.map((ll: L.LatLng) => [ll.lng, ll.lat]);
        
        if (latestOnUrbanPlanningDraw.current) {
          latestOnUrbanPlanningDraw.current(coords, 'polyline');
        }
        emitDrawState(false, 'polyline');
        return;
      }

      if (layerType === 'rectangle') {
        const rectangle = layer as L.Rectangle;
        const bounds = rectangle.getBounds();
        const southWestPx = map.latLngToContainerPoint(bounds.getSouthWest());
        const northEastPx = map.latLngToContainerPoint(bounds.getNorthEast());
        const widthPx = Math.abs(northEastPx.x - southWestPx.x);
        const heightPx = Math.abs(northEastPx.y - southWestPx.y);

        if (widthPx < 14 || heightPx < 14) {
          drawnItems.clearLayers();
          const retryHandler = new (L.Draw as any).Rectangle(map, {
            showArea: false,
            shapeOptions: { ...AOI_RECTANGLE_STYLE },
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
        emitDrawState(false, 'rectangle');
        return;
      }

      if (layerType === 'polygon') {
        const polygon = layer as L.Polygon;
        const latlngs = (polygon.getLatLngs() as L.LatLng[][])[0];
        const coords: Array<[number, number]> = latlngs.map((ll: L.LatLng) => [ll.lat, normalizeLongitude(ll.lng)]);

        if (latestOnPolygonDrawn.current) {
          latestOnPolygonDrawn.current(coords);
        }
        
        if (latestOnUrbanPlanningDraw.current) {
          latestOnUrbanPlanningDraw.current(latlngs.map(ll => [ll.lng, ll.lat]), 'polygon');
        }
        if (latestOnForestDeptDraw.current) {
          latestOnForestDeptDraw.current(latlngs.map(ll => [ll.lng, ll.lat]), 'polygon');
        }

        emitDrawState(false, 'polygon');
        return;
      }
    });

    function addLayer(layer: GeoLayerMetadata) {
      if (!layer.url) return;
      removeLayer({ id: layer.id });
      const lLayer = L.tileLayer(layer.url, {
        opacity: layer.opacity,
        zIndex: layer.zIndex || 400,
      });
      lLayer.addTo(map);
      window.GEO_LAYERS[layer.id] = { ...layer, visible: true };
      window.dispatchEvent(new CustomEvent('geo:layers-changed', { detail: window.GEO_LAYERS }));
    }

    function removeLayer({ id }: { id: string }) {
      map.eachLayer((l) => {
        if (l instanceof L.TileLayer && (l as any)._url === window.GEO_LAYERS[id]?.url) {
          map.removeLayer(l);
        }
      });
      delete window.GEO_LAYERS[id];
      window.dispatchEvent(new CustomEvent('geo:layers-changed', { detail: window.GEO_LAYERS }));
    }

    function toggleLayer({ id, visible }: { id: string, visible: boolean }) {
      const layer = window.GEO_LAYERS[id];
      if (!layer) return;
      if (visible) {
        addLayer(layer);
      } else {
        map.eachLayer((l) => {
          if (l instanceof L.TileLayer && (l as any)._url === layer.url) {
            map.removeLayer(l);
          }
        });
        window.GEO_LAYERS[id].visible = false;
        window.dispatchEvent(new CustomEvent('geo:layers-changed', { detail: window.GEO_LAYERS }));
      }
    }

    function updateOpacity({ id, opacity }: { id: string, opacity: number }) {
      const layer = window.GEO_LAYERS[id];
      if (!layer) return;
      map.eachLayer((l) => {
        if (l instanceof L.TileLayer && (l as any)._url === layer.url) {
          l.setOpacity(opacity);
        }
      });
      window.GEO_LAYERS[id].opacity = opacity;
    }

    function onStartDraw(event: Event) {
      const { type: drawType } = (event as CustomEvent).detail;
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
          shapeOptions: { color: '#0f766e', weight: 3 },
        });
      } else if (drawType === 'rectangle') {
        handler = new (L.Draw as any).Rectangle(map, {
          showArea: false,
          shapeOptions: { ...AOI_RECTANGLE_STYLE },
        });
      } else {
        handler = new (L.Draw as any).Polygon(map, {
          allowIntersection: false,
          shapeOptions: { color: '#0f766e', weight: 2, fillOpacity: 0.15, fillColor: '#0f766e' },
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

    const onAddEvt = (e: Event) => addLayer((e as CustomEvent).detail);
    const onRemoveEvt = (e: Event) => removeLayer((e as CustomEvent).detail);
    const onToggleEvt = (e: Event) => toggleLayer((e as CustomEvent).detail);
    const onOpacityEvt = (e: Event) => updateOpacity((e as CustomEvent).detail);
    const onStartDrawEvt = (e: Event) => onStartDraw(e);
    const onCancelDrawEvt = () => onCancelDraw();

    window.addEventListener('geo:add-layer', onAddEvt);
    window.addEventListener('geo:remove-layer', onRemoveEvt);
    window.addEventListener('geo:toggle-layer', onToggleEvt);
    window.addEventListener('geo:update-opacity', onOpacityEvt);
    window.addEventListener('geo:start-draw', onStartDrawEvt);
    window.addEventListener('geo:cancel-draw', onCancelDrawEvt);

    mapInstanceRef.current = map;

    return () => {
      window.removeEventListener('geo:add-layer', onAddEvt);
      window.removeEventListener('geo:remove-layer', onRemoveEvt);
      window.removeEventListener('geo:toggle-layer', onToggleEvt);
      window.removeEventListener('geo:update-opacity', onOpacityEvt);
      window.removeEventListener('geo:start-draw', onStartDrawEvt);
      window.removeEventListener('geo:cancel-draw', onCancelDrawEvt);
      map.remove();
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !basemapLayersRef.current) return;
    const map = mapInstanceRef.current;
    Object.values(basemapLayersRef.current).forEach(layer => {
      if (layer && map.hasLayer(layer)) map.removeLayer(layer);
    });
    const nextLayer = basemapLayersRef.current[selectedBasemap];
    if (nextLayer) nextLayer.addTo(map);
  }, [selectedBasemap]);

  useEffect(() => {
    if (!mapInstanceRef.current || !riskZonesRef.current) return;
    riskZonesRef.current.clearLayers();

    if (predictionResult && hazardGuardActive) {
      const { latitude, longitude, prediction, confidence } = predictionResult;
      const isDisaster = prediction.toLowerCase() === 'disaster';
      const color = isDisaster ? '#dc2626' : '#f59e0b';
      
      const zone = L.circle([latitude, longitude], {
        radius: isDisaster ? 5000 : 2000,
        fillColor: color,
        color: color,
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.15
      }).addTo(riskZonesRef.current);

      L.circleMarker([latitude, longitude], {
        radius: 8,
        fillColor: '#1f2937',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 1
      }).addTo(riskZonesRef.current);

      mapInstanceRef.current.fitBounds(zone.getBounds(), { padding: [50, 50] });
    }
  }, [predictionResult, hazardGuardActive]);

  const selectedBasemapOption = BASEMAP_OPTIONS.find(o => o.id === selectedBasemap)!;

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="hazard-map w-full h-full z-0" />

      {/* Map Style Switcher */}
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
          <ChevronUp className="h-3 w-3 map-style-caret" />
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
