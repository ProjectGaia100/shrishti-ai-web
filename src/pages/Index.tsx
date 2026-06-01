import { FormEvent, useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { MapView } from "@/components/MapView";
import type { HeatmapPoint } from "@/components/MapView";
import { ChatButton } from "@/components/ChatButton";
import { HazardGuardPanel } from "@/components/HazardGuardPanel";
import { WeatherWisePanel } from "@/components/WeatherWisePanel";
import { GeoVisionPanel } from "@/components/GeoVisionPanel";
import { UrbanPlanningPanel } from "@/components/UrbanPlanningPanel";
import { ForestDeptPanel } from "@/components/ForestDeptPanel";
import { TimelinePlayer } from "@/components/TimelinePlayer";
import { ChangeDetectionOverlay } from "@/components/ChangeDetectionOverlay";
import { DatasetExplorerModal } from "@/components/DatasetExplorerModal";
import { UserMenu } from "@/components/UserMenu";
import { hazardGuardService, PredictionResult, HeatmapSummary } from "@/services/hazardGuard";
import type { HazardGuardMode } from "@/components/HazardGuardCard";
import { fetchDataset } from "@/services/api";
import type { AoiBbox, TimelapseFrame } from "@/services/api";
import type { UrbanPlanningFeature } from "@/services/urbanPlanning";
import type { ForestDeptFeature } from "@/services/forestDepartment";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { creditsService, CreditBundle } from "@/services/credits";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, GripVertical, Layers, Square, Trash2, X, Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, normalizeLongitude } from "@/lib/utils";
import { GLOBAL_DATASETS } from "@/services/datasetService";

const FALLBACK_CREDIT_BUNDLES: CreditBundle[] = [
  { id: 'plus_1000', credits: 1000, price_inr: 999, label: '1000 Credits' },
  { id: 'plus_10000', credits: 10000, price_inr: 7999, label: '10000 Credits' },
  { id: 'plus_100000', credits: 100000, price_inr: 59999, label: '100000 Credits' },
];

const DEFAULT_SIDEBAR_LAYERS: Array<{ id: string; name: string }> = [
  { id: 'vegetation', name: 'Vegetation' },
  { id: 'nightlights', name: 'Nighttime Lights' },
  { id: 'terrain', name: 'Elevation' },
  { id: 'temperature', name: 'Temperature' },
  { id: 'landcover', name: 'Landcover' },
];

const ARCGIS_GEOCODE_URL = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates";

interface DashboardLayerItem {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  type?: string;
  zIndex?: number;
}

function parseCoordinateQuery(input: string): { lat: number; lon: number } | null {
  const match = input.trim().match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const first = Number(match[1]);
  const second = Number(match[2]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;

  if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
    return { lat: first, lon: second };
  }

  if (Math.abs(first) <= 180 && Math.abs(second) <= 90) {
    return { lat: second, lon: first };
  }

  return null;
}

async function geocodePlace(query: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const params = new URLSearchParams({
    f: "pjson",
    maxLocations: "1",
    outFields: "Match_addr",
    singleLine: query,
  });

  const response = await fetch(`${ARCGIS_GEOCODE_URL}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Geocoder request failed with status ${response.status}`);
  }

  const data = await response.json();
  const candidate = data?.candidates?.[0];
  if (!candidate?.location) return null;

  const lat = Number(candidate.location.y);
  const lon = Number(candidate.location.x);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    lat,
    lon,
    label: String(candidate.address || query),
  };
}

const Index = () => {
  const HAZARDGUARD_COST = 10;

  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [hazardGuardActive, setHazardGuardActive] = useState(false);
  const [hazardGuardMode, setHazardGuardMode] = useState<HazardGuardMode>('point');
  const [hazardGuardSamplePoints, setHazardGuardSamplePoints] = useState(5);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [hazardGuardCoords, setHazardGuardCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[] | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapSummary, setHeatmapSummary] = useState<HeatmapSummary | null>(null);
  const [showWeatherWise, setShowWeatherWise] = useState(false);
  const [weatherWiseCoords, setWeatherWiseCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [showGeoVision, setShowGeoVision] = useState(false);
  const [geoVisionCoords, setGeoVisionCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Urban Planning state
  const [activeUrbanPlanningFeature, setActiveUrbanPlanningFeature] = useState<UrbanPlanningFeature | null>(null);
  const [showUrbanPlanningPanel, setShowUrbanPlanningPanel] = useState(false);
  const [urbanPlanningCoords, setUrbanPlanningCoords] = useState<number[][] | null>(null);

  // Forest Department state
  const [activeForestDeptFeature, setActiveForestDeptFeature] = useState<ForestDeptFeature | null>(null);
  const [showForestDeptPanel, setShowForestDeptPanel] = useState(false);
  const [forestDeptCoords, setForestDeptCoords] = useState<number[][] | null>(null);

  // Credits state - null until fetched from server
  const [credits, setCredits] = useState<number | null>(null);
  const [creditBundles, setCreditBundles] = useState<CreditBundle[]>(FALLBACK_CREDIT_BUNDLES);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [buyingBundleId, setBuyingBundleId] = useState<string | null>(null);
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  const [layersById, setLayersById] = useState<Record<string, DashboardLayerItem>>({});
  const [layerOrder, setLayerOrder] = useState<string[]>([]);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const [expandedLayerIds, setExpandedLayerIds] = useState<Record<string, boolean>>({});
  const [aoiBbox, setAoiBbox] = useState<AoiBbox | null>(null);
  const [isAoiDrawing, setIsAoiDrawing] = useState(false);
  const [refreshingAddedLayers, setRefreshingAddedLayers] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const resetTimerRef = useRef<number | null>(null);
  const resetTriggeredRef = useRef(false);
  const [sidebarLayerCatalog, setSidebarLayerCatalog] = useState<Array<{ id: string; name: string }>>(DEFAULT_SIDEBAR_LAYERS);

  // Timelapse state
  const [timelapseFrames, setTimelapseFrames] = useState<TimelapseFrame[]>([]);
  const [timelapseTitle, setTimelapseTitle] = useState('');
  const [timelapseActive, setTimelapseActive] = useState(false);
  const [changeDetectionActive, setChangeDetectionActive] = useState(false);
  const [changeDetectionSplit, setChangeDetectionSplit] = useState(50);
  const [changeDetectionBeforeDate, setChangeDetectionBeforeDate] = useState<Date | undefined>();
  const [changeDetectionAfterDate, setChangeDetectionAfterDate] = useState<Date | undefined>();
  const [isDatasetExplorerOpen, setIsDatasetExplorerOpen] = useState(false);
  
  // Layout state
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);

  useEffect(() => {
    setSidebarCollapsed(isMobile);
  }, [isMobile]);

  const isRightPanelVisible =
    showPanel ||
    showWeatherWise ||
    showGeoVision ||
    showUrbanPlanningPanel ||
    showForestDeptPanel;

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const bootstrapCredits = async () => {
      try {
        // Use syncWithServer to clear any stale localStorage and get fresh DB value
        const [balance, bundles] = await Promise.all([
          creditsService.syncWithServer(),
          creditsService.getBundles(),
        ]);
        setCredits(balance);
        setCreditBundles(bundles.length > 0 ? bundles : FALLBACK_CREDIT_BUNDLES);
      } catch (err) {
        console.error('[CREDITS] Failed to initialize credits:', err);
        setCreditBundles(FALLBACK_CREDIT_BUNDLES);
      }
    };

    bootstrapCredits();
  }, [isAuthenticated]);

  const handleSyncSidebarSelection = useCallback((selectedIds: string[]) => {
    const dedupedIds = [...new Set(selectedIds)];
    const selectedIdSet = new Set(dedupedIds);
    const existingById = new Map(sidebarLayerCatalog.map((item) => [item.id, item]));

    const nextCatalog = dedupedIds.map((id) => {
      const existing = existingById.get(id);
      if (existing) return existing;

      const dataset = GLOBAL_DATASETS.find((item) => item.id === id);
      return { id, name: dataset?.name ?? id };
    });

    const removedIds = sidebarLayerCatalog
      .map((item) => item.id)
      .filter((id) => !selectedIdSet.has(id));

    removedIds.forEach((id) => {
      if (layersById[id]) {
        window.dispatchEvent(new CustomEvent('geo:remove-layer', { detail: { id } }));
      }
    });

    setSidebarLayerCatalog(nextCatalog);
    
    if (dedupedIds.length > sidebarLayerCatalog.length) {
      toast({
        title: "Project updated",
        description: `Added ${dedupedIds.length - sidebarLayerCatalog.length} new dataset(s) to sidebar.`,
      });
    }
  }, [layersById, sidebarLayerCatalog, toast]);

  useEffect(() => {
    const onCreditsUpdated = (event: Event) => {
      const custom = event as CustomEvent<{
        remaining_credits?: number | string;
        remainingCredits?: number | string;
        balance?: number | string;
        credit_info?: { remaining_credits?: number | string };
      }>;

      const rawValue =
        custom.detail?.remaining_credits ??
        custom.detail?.remainingCredits ??
        custom.detail?.balance ??
        custom.detail?.credit_info?.remaining_credits;

      const parsed = Number(rawValue);
      if (!Number.isNaN(parsed)) {
        setCredits(parsed);
        return;
      }

      // Fallback for unexpected payload shapes: re-fetch authoritative balance.
      if (isAuthenticated) {
        creditsService
          .getBalance()
          .then((balance) => setCredits(balance))
          .catch((err) => console.error('[CREDITS] Failed to refresh balance:', err));
      }
    };

    const onCreditsConsume = (event: Event) => {
      const custom = event as CustomEvent<{ amount?: number | string }>;
      const parsedAmount = Number(custom.detail?.amount ?? 0);
      if (!Number.isNaN(parsedAmount) && parsedAmount > 0) {
        setCredits((prev) => Math.max(0, prev - parsedAmount));
      }
    };

    const onCreditsInsufficient = (event: Event) => {
      const custom = event as CustomEvent<{ remaining_credits?: number; required_credits?: number; model?: string }>;
      if (typeof custom.detail?.remaining_credits === 'number') {
        setCredits(custom.detail.remaining_credits);
      }
      setShowBuyCredits(true);

      const remaining = custom.detail?.remaining_credits ?? 0;
      const required = custom.detail?.required_credits ?? 0;
      const model = custom.detail?.model ?? 'prediction';
      toast({
        title: remaining <= 0 ? 'Out of credits' : 'Not enough credits',
        description: remaining <= 0
          ? 'You are out of credits. Buy more credits from here to continue predictions.'
          : `Need ${required} credits for ${model}. Buy more credits to continue.`,
        variant: 'destructive',
      });
    };

    window.addEventListener('credits:updated', onCreditsUpdated as EventListener);
    window.addEventListener('credits:insufficient', onCreditsInsufficient as EventListener);
    window.addEventListener('credits:consume', onCreditsConsume as EventListener);

    return () => {
      window.removeEventListener('credits:updated', onCreditsUpdated as EventListener);
      window.removeEventListener('credits:insufficient', onCreditsInsufficient as EventListener);
      window.removeEventListener('credits:consume', onCreditsConsume as EventListener);
    };
  }, [toast, isAuthenticated]);

  useEffect(() => {
    const syncLayers = (incoming?: Record<string, unknown>) => {
      const source = incoming ?? (window as any).GEO_LAYERS ?? {};
      const normalized: Record<string, DashboardLayerItem> = {};

      Object.entries(source).forEach(([id, rawLayer]) => {
        const layer = rawLayer as Record<string, unknown>;
        normalized[id] = {
          id,
          name: typeof layer.name === 'string' && layer.name.trim() ? layer.name : id,
          visible: layer.visible !== false,
          opacity: typeof layer.opacity === 'number' ? layer.opacity : 0.8,
          type: typeof layer.type === 'string' ? layer.type : 'tile',
          zIndex: typeof layer.zIndex === 'number' ? layer.zIndex : undefined,
        };
      });

      setLayersById(normalized);
      setLayerOrder((prev) => {
        const stillThere = prev.filter((id) => normalized[id]);
        const newIds = Object.keys(normalized).filter((id) => !stillThere.includes(id));
        return [...newIds, ...stillThere];
      });
    };

    const onLayersChanged = (event: Event) => {
      syncLayers((event as CustomEvent<Record<string, unknown>>).detail);
    };

    window.addEventListener('geo:layers-changed', onLayersChanged as EventListener);
    syncLayers();

    return () => {
      window.removeEventListener('geo:layers-changed', onLayersChanged as EventListener);
    };
  }, []);

  const visibleLayerIds = layerOrder.filter((id) => layersById[id]);

  const applyLayerOrder = useCallback((nextOrder: string[]) => {
    setLayerOrder(nextOrder);
    window.dispatchEvent(new CustomEvent('geo:reorder-layers', {
      detail: { orderedIds: nextOrder },
    }));
  }, []);

  const handleLayerDrop = useCallback((targetId: string) => {
    if (!draggingLayerId || draggingLayerId === targetId) return;

    const currentOrder = visibleLayerIds;
    const fromIndex = currentOrder.indexOf(draggingLayerId);
    const toIndex = currentOrder.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggingLayerId(null);
      return;
    }

    const nextOrder = [...currentOrder];
    nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, draggingLayerId);
    applyLayerOrder(nextOrder);
    setDraggingLayerId(null);
  }, [applyLayerOrder, draggingLayerId, visibleLayerIds]);

  const handleRemoveLayer = useCallback((id: string) => {
    window.dispatchEvent(new CustomEvent('geo:remove-layer', { detail: { id } }));
    setLayerOrder((prev) => prev.filter((layerId) => layerId !== id));
    setExpandedLayerIds((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const toggleLayerDropdown = useCallback((id: string) => {
    setExpandedLayerIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  const handleLayerOpacityChange = useCallback((id: string, opacityPercent: number) => {
    const clampedPercent = Math.max(0, Math.min(100, opacityPercent));
    const opacity = clampedPercent / 100;

    setLayersById((prev) => {
      const layer = prev[id];
      if (!layer) return prev;
      return {
        ...prev,
        [id]: {
          ...layer,
          opacity,
        },
      };
    });

    window.dispatchEvent(new CustomEvent('geo:update-opacity', {
      detail: { id, opacity },
    }));
  }, []);

  const handleRefreshAddedLayers = useCallback(async () => {
    const currentLayerIds = layerOrder.filter((id) => layersById[id]);
    if (currentLayerIds.length === 0 || refreshingAddedLayers) return;

    const hasActiveAoi = Boolean((window as any).__GEO_AOI_ACTIVE);
    const globalAoi = hasActiveAoi ? ((window as any).__GEO_AOI_BBOX ?? null) : null;
    const effectiveAoi = aoiBbox ?? globalAoi;
    let refreshedCount = 0;

    setRefreshingAddedLayers(true);
    try {
      for (const id of currentLayerIds) {
        const layer = layersById[id];
        if (!layer || layer.type === 'geojson') continue;

        try {
          const data = await fetchDataset(id, {
            timeoutMs: 120000,
            retries: 1,
            aoiBbox: effectiveAoi ?? undefined,
          });
          const tileUrl = data?.tile_url;
          if (!tileUrl) continue;

          window.dispatchEvent(new CustomEvent('geo:add-layer', {
            detail: {
              id,
              name: layer.name,
              url: tileUrl,
              metadata: data.metadata || data,
              opacity: layer.opacity,
            }
          }));

          if (!layer.visible) {
            window.dispatchEvent(new CustomEvent('geo:toggle-layer', {
              detail: { id, visible: false },
            }));
          }

          refreshedCount += 1;
        } catch (err) {
          console.error(`[AOI_REFRESH] Failed to refresh layer ${id}:`, err);
        }
      }

      if (refreshedCount > 0) {
        window.dispatchEvent(new CustomEvent('geo:reorder-layers', {
          detail: { orderedIds: currentLayerIds },
        }));
      }

      toast({
        title: refreshedCount > 0 ? 'Layers refreshed' : 'No layers refreshed',
        description: refreshedCount > 0
          ? (effectiveAoi
              ? `Refreshed ${refreshedCount} layer${refreshedCount > 1 ? 's' : ''} with latest rectangle.`
              : `Refreshed ${refreshedCount} layer${refreshedCount > 1 ? 's' : ''} for global view.`)
          : 'No compatible tile layers found to refresh.',
      });
    } finally {
      setRefreshingAddedLayers(false);
    }
  }, [aoiBbox, layerOrder, layersById, refreshingAddedLayers, toast]);

  const handleToggleAoiDraw = useCallback(() => {
    if (isAoiDrawing) {
      window.dispatchEvent(new CustomEvent('geo:cancel-draw'));
      setIsAoiDrawing(false);
      return;
    }

    window.dispatchEvent(new CustomEvent('geo:start-draw', { detail: { type: 'rectangle' } }));
    setIsAoiDrawing(true);
  }, [isAoiDrawing]);

  useEffect(() => {
    const onAoiUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ bbox?: AoiBbox }>).detail;
      if (!detail?.bbox) return;
      setAoiBbox(detail.bbox);
      setIsAoiDrawing(false);
      
      // Auto-trigger layer refresh with new AOI clipping
      // We wait for the next tick to ensure state is updated or use the detail.bbox
      setTimeout(() => {
        handleRefreshAddedLayers();
      }, 0);
    };

    const onAoiCleared = () => {
      setAoiBbox(null);
      // Revert layers to global view when AOI is removed
      setTimeout(() => {
        handleRefreshAddedLayers();
      }, 0);
    };

    const onDrawState = (event: Event) => {
      const detail = (event as CustomEvent<{ active?: boolean; type?: string }>).detail;
      if (detail?.type === 'rectangle') {
        setIsAoiDrawing(Boolean(detail.active));
      }
    };

    window.addEventListener('geo:aoi-updated', onAoiUpdated as EventListener);
    window.addEventListener('geo:aoi-cleared', onAoiCleared as EventListener);
    window.addEventListener('geo:draw-state', onDrawState as EventListener);

    return () => {
      window.removeEventListener('geo:aoi-updated', onAoiUpdated as EventListener);
      window.removeEventListener('geo:aoi-cleared', onAoiCleared as EventListener);
      window.removeEventListener('geo:draw-state', onDrawState as EventListener);
    };
  }, []);

  useEffect(() => {
    const clearResetTimer = () => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'r') return;
      if (event.repeat) return;
      if (resetTimerRef.current !== null) return;

      resetTriggeredRef.current = false;
      resetTimerRef.current = window.setTimeout(async () => {
        if (resetTriggeredRef.current) return;
        resetTriggeredRef.current = true;

        const next = await creditsService.resetToDefault();
        setCredits(next);
        window.dispatchEvent(new CustomEvent('credits:updated', {
          detail: { remaining_credits: next }
        }));
        toast({
          title: 'Demo reset complete',
          description: 'Credits reset to 30.',
        });
        clearResetTimer();
      }, 10000);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'r') return;
      clearResetTimer();
      resetTriggeredRef.current = false;
    };

    const onWindowBlur = () => {
      clearResetTimer();
      resetTriggeredRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      clearResetTimer();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [toast]);

  const handlePurchaseBundle = useCallback(async (bundleId: string) => {
    setBuyingBundleId(bundleId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1400));
      const result = await creditsService.purchase(bundleId);
      if (result) {
        setCredits(result.remaining_credits);
        setShowBuyCredits(false);
        toast({ title: 'Credits added', description: `New balance: ${result.remaining_credits} credits.` });
      }
    } catch (err) {
      toast({
        title: 'Purchase failed',
        description: err instanceof Error ? err.message : 'Could not purchase credits',
        variant: 'destructive',
      });
    } finally {
      setBuyingBundleId(null);
    }
  }, [toast]);

  const jumpToLocation = useCallback((lat: number, lon: number, label: string) => {
    const normalizedLon = normalizeLongitude(lon);
    window.dispatchEvent(new CustomEvent('geo:jump-to', {
      detail: { lat, lon: normalizedLon, zoom: 10, label }
    }));

    if (showWeatherWise) {
      setWeatherWiseCoords({ lat, lon: normalizedLon });
    }

    if (showGeoVision) {
      setGeoVisionCoords({ lat, lon: normalizedLon });
    }

    if (hazardGuardActive && hazardGuardMode === 'point') {
      setHazardGuardCoords({ lat, lon: normalizedLon });
      setShowPanel(true);
    }
  }, [showWeatherWise, showGeoVision, hazardGuardActive, hazardGuardMode]);

  const handleLocationSearch = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = locationQuery.trim();
    if (!query || locationSearchLoading) return;

    const directCoords = parseCoordinateQuery(query);
    if (directCoords) {
      jumpToLocation(directCoords.lat, directCoords.lon, `${directCoords.lat.toFixed(4)}, ${directCoords.lon.toFixed(4)}`);
      toast({
        title: 'Moved to coordinates',
        description: `${directCoords.lat.toFixed(4)}, ${directCoords.lon.toFixed(4)}`,
      });
      return;
    }

    setLocationSearchLoading(true);
    try {
      const result = await geocodePlace(query);
      if (!result) {
        toast({
          title: 'Location not found',
          description: 'Try a more specific place name or use lat,long format.',
          variant: 'destructive',
        });
        return;
      }

      jumpToLocation(result.lat, result.lon, result.label);
      toast({
        title: 'Location found',
        description: result.label,
      });
    } catch (err) {
      console.error('[LOCATION_SEARCH] Geocode failed:', err);
      toast({
        title: 'Search failed',
        description: 'Could not resolve that location right now.',
        variant: 'destructive',
      });
    } finally {
      setLocationSearchLoading(false);
    }
  }, [jumpToLocation, locationQuery, locationSearchLoading, toast]);

  const handleHazardGuardModeChange = useCallback((isActive: boolean, mode: HazardGuardMode, samplePoints: number) => {
    setHazardGuardActive(isActive);
    setHazardGuardMode(mode);
    setHazardGuardSamplePoints(samplePoints);
    
    // When activating HazardGuard, close other panels
    if (isActive) {
      setShowWeatherWise(false);
      setWeatherWiseCoords(null);
      setShowGeoVision(false);
      setGeoVisionCoords(null);
    }
    
    if (!isActive) {
      setShowPanel(false);
      setPredictionResult(null);
      setError(null);
      setHeatmapData(null);
      setHeatmapSummary(null);
      setHazardGuardCoords(null);
    }
    // Clear heatmap when switching modes
    if (mode === 'point') {
      setHeatmapData(null);
      setHeatmapSummary(null);
      if (isActive) {
        setShowPanel(true);
      }
    } else {
      setPredictionResult(null);
      setShowPanel(false);
    }
  }, []);

  const handleRunHazardGuardAnalysis = useCallback(async (latitude: number, longitude: number) => {
    if (credits === null || credits < HAZARDGUARD_COST) {
      setShowBuyCredits(true);
      toast({
        title: 'Out of credits',
        description: 'HazardGuard needs 10 credits. Buy more credits to continue.',
        variant: 'destructive',
      });
      return;
    }

    setHazardGuardCoords({ lat: latitude, lon: longitude });
    setIsLoading(true);
    setError(null);
    setPredictionResult(null);
    setShowPanel(true);

    try {
      const result = await hazardGuardService.predictDisaster(latitude, longitude);

      if (result.success && result.data) {
        setPredictionResult(result.data);
      } else {
        setError(result.error || 'Prediction failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [credits, toast]);

  const handlePolygonDrawn = useCallback(async (polygon: Array<[number, number]>) => {
    if (!hazardGuardActive || hazardGuardMode !== 'region') return;

    if (credits === null || credits < HAZARDGUARD_COST) {
      setShowBuyCredits(true);
      toast({
        title: 'Out of credits',
        description: 'HazardGuard needs 10 credits. Buy more credits to continue.',
        variant: 'destructive',
      });
      return;
    }

    setHeatmapLoading(true);
    setHeatmapData(null);
    setHeatmapSummary(null);
    setError(null);
    setShowPanel(true);

    try {
      const result = await hazardGuardService.predictRegion(polygon, hazardGuardSamplePoints);

      if (result.success && result.points) {
        setHeatmapData(result.points);
        setHeatmapSummary(result.summary);
        toast({
          title: 'Heatmap Generated',
          description: `${result.summary?.successful}/${result.summary?.total} predictions completed. ${result.summary?.disaster_count} disaster zones found.`,
        });
      } else {
        setError(result.error || 'Region prediction failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Region prediction failed');
    } finally {
      setHeatmapLoading(false);
    }
  }, [hazardGuardActive, hazardGuardMode, hazardGuardSamplePoints, toast, credits]);

  const handleMapClick = async (latitude: number, longitude: number) => {
    // GeoVision map click: auto-fill coordinates
    if (showGeoVision) {
      setGeoVisionCoords({ lat: latitude, lon: longitude });
      return;
    }

    // WeatherWise map click: auto-fill coordinates
    if (showWeatherWise) {
      setWeatherWiseCoords({ lat: latitude, lon: longitude });
      return;
    }

    if (!hazardGuardActive) return;

    if (hazardGuardMode === 'point') {
      setHazardGuardCoords({ lat: latitude, lon: longitude });
      setShowPanel(true);
      return;
    }
  };

  // --- Timelapse handlers ---
  const handleTimelapseLoaded = useCallback((frames: TimelapseFrame[], title: string, _dataset: string) => {
    setTimelapseFrames(frames);
    setTimelapseTitle(title);
    setTimelapseActive(true);
    // Pre-create ALL frame tile layers on the map (opacity 0) so tiles
    // download in the background before playback starts. Frame switching
    // will then only need a setOpacity() — no blank-map flicker.
    window.dispatchEvent(new CustomEvent('geo:timelapse-init', {
      detail: { frames, opacity: 1 }
    }));
  }, []);

  const handleTimelapseClose = useCallback(() => {
    // Tear down all pre-loaded timelapse tile layers
    window.dispatchEvent(new CustomEvent('geo:timelapse-destroy'));
    setTimelapseFrames([]);
    setTimelapseTitle('');
    setTimelapseActive(false);
  }, []);

  const handleTimelapseFrameChange = useCallback((_frame: TimelapseFrame, index: number, opacity: number) => {
    // Just flip the opacity of the pre-loaded layer — instant, no re-download
    window.dispatchEvent(new CustomEvent('geo:timelapse-frame', {
      detail: { index, opacity }
    }));
  }, []);

  const handleClosePanel = () => {
    setShowPanel(false);
    setPredictionResult(null);
    setError(null);
    setHeatmapData(null);
    setHeatmapSummary(null);
    setHazardGuardCoords(null);
    // Deactivate HazardGuard mode when panel is closed via X button
    setHazardGuardActive(false);
    window.dispatchEvent(new CustomEvent('hazardguard:deactivate'));
  };

  // --- Urban Planning handlers ---
  const handleUrbanPlanningFeatureChange = useCallback((feature: UrbanPlanningFeature | null) => {
    setActiveUrbanPlanningFeature(feature);
    if (feature) {
      setShowUrbanPlanningPanel(true);
      // Reset coordinates when switching features
      setUrbanPlanningCoords(null);
    } else {
      setShowUrbanPlanningPanel(false);
      setUrbanPlanningCoords(null);
    }
  }, []);

  const handleUrbanPlanningDraw = useCallback((coordinates: number[][], _type: 'polygon' | 'polyline') => {
    setUrbanPlanningCoords(coordinates);
    setShowUrbanPlanningPanel(true);
  }, []);

  const handleCloseUrbanPlanningPanel = useCallback(() => {
    setShowUrbanPlanningPanel(false);
    setActiveUrbanPlanningFeature(null);
    setUrbanPlanningCoords(null);
    window.dispatchEvent(new CustomEvent('geo:cancel-draw'));
  }, []);

  // --- Forest Department handlers ---
  const handleForestDeptFeatureChange = useCallback((feature: ForestDeptFeature | null) => {
    setActiveForestDeptFeature(feature);
    // NDVI is a global layer, don't show panel for it
    if (feature && feature !== 'ndvi') {
      setShowForestDeptPanel(true);
      setForestDeptCoords(null);
    } else {
      setShowForestDeptPanel(false);
      setForestDeptCoords(null);
    }
  }, []);

  const handleForestDeptDraw = useCallback((coordinates: number[][], _type: 'polygon' | 'polyline') => {
    setForestDeptCoords(coordinates);
    if (activeForestDeptFeature && activeForestDeptFeature !== 'ndvi') {
      setShowForestDeptPanel(true);
    }
  }, [activeForestDeptFeature]);

  const handleCloseForestDeptPanel = useCallback(() => {
    setShowForestDeptPanel(false);
    setActiveForestDeptFeature(null);
    setForestDeptCoords(null);
    window.dispatchEvent(new CustomEvent('geo:cancel-draw'));
  }, []);

  const handleRequestMapDraw = useCallback((type: 'polygon' | 'polyline') => {
    window.dispatchEvent(new CustomEvent('geo:start-draw', { detail: { type } }));
  }, []);

  const handleClearMapDraw = useCallback(() => {
    window.dispatchEvent(new CustomEvent('geo:cancel-draw'));
    setUrbanPlanningCoords(null);
    setForestDeptCoords(null);
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <div className="w-5 h-5 rounded-md bg-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      <Sidebar 
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onHazardGuardModeChange={handleHazardGuardModeChange}
        onWeatherWiseToggle={() => {
          if (showWeatherWise) {
            // Close WeatherWise
            setShowWeatherWise(false);
            setWeatherWiseCoords(null);
          } else {
            // Close other panels when opening WeatherWise
            setShowGeoVision(false);
            setGeoVisionCoords(null);
            setShowPanel(false);
            setPredictionResult(null);
            setHeatmapData(null);
            setHeatmapSummary(null);
            setHazardGuardCoords(null);
            // Deactivate HazardGuard mode
            setHazardGuardActive(false);
            window.dispatchEvent(new CustomEvent('hazardguard:deactivate'));
            // Open WeatherWise
            setShowWeatherWise(true);
          }
        }}
        isWeatherWiseActive={showWeatherWise}
        onGeoVisionToggle={() => {
          if (showGeoVision) {
            // Close GeoVision
            setShowGeoVision(false);
            setGeoVisionCoords(null);
          } else {
            // Close other panels when opening GeoVision
            setShowWeatherWise(false);
            setWeatherWiseCoords(null);
            setShowPanel(false);
            setPredictionResult(null);
            setHeatmapData(null);
            setHeatmapSummary(null);
            setHazardGuardCoords(null);
            // Deactivate HazardGuard mode
            setHazardGuardActive(false);
            window.dispatchEvent(new CustomEvent('hazardguard:deactivate'));
            // Open GeoVision
            setShowGeoVision(true);
          }
        }}
        isGeoVisionActive={showGeoVision}
        onTimelapseLoaded={handleTimelapseLoaded}
        onTimelapseClose={handleTimelapseClose}
        isTimelapseActive={timelapseActive}
        isChangeDetectionActive={changeDetectionActive}
        onChangeDetectionToggle={() => setChangeDetectionActive((prev) => !prev)}
        onUrbanPlanningFeatureChange={(feature) => {
          if (feature) {
            setShowWeatherWise(false);
            setWeatherWiseCoords(null);
            setShowGeoVision(false);
            setGeoVisionCoords(null);
            setShowPanel(false);
            setHazardGuardActive(false);
            setHazardGuardCoords(null);
            window.dispatchEvent(new CustomEvent('hazardguard:deactivate'));
            setActiveForestDeptFeature(null);
          }
          handleUrbanPlanningFeatureChange(feature);
        }}
        activeForestDeptFeature={activeForestDeptFeature}
        onForestDeptFeatureChange={(feature) => {
          if (feature) {
            setShowWeatherWise(false);
            setWeatherWiseCoords(null);
            setShowGeoVision(false);
            setGeoVisionCoords(null);
            setShowPanel(false);
            setHazardGuardActive(false);
            setHazardGuardCoords(null);
            window.dispatchEvent(new CustomEvent('hazardguard:deactivate'));
            setActiveUrbanPlanningFeature(null);
          }
          handleForestDeptFeatureChange(feature);
        }}
        onOpenDatasetDiscovery={() => setIsDatasetExplorerOpen(true)}
        onRefreshAddedLayers={handleRefreshAddedLayers}
        refreshingAddedLayers={refreshingAddedLayers}
        sidebarLayerCatalog={sidebarLayerCatalog}
        aoiBbox={aoiBbox}
      />
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {/* Unified Dashboard Header / Control Bar */}
        <header className="absolute top-0 left-0 right-0 z-[1600] pointer-events-none p-4 flex items-center justify-between">
          {/* Mobile Menu Button */}
          {isMobile && sidebarCollapsed && (
            <div className="pointer-events-auto">
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="flex items-center justify-center bg-background/80 dark:bg-zinc-900/80 border border-border/40 shadow-2xl rounded-xl h-10 w-10 backdrop-blur-xl transition-all active:scale-95"
              >
                <Menu className="h-5 w-5 text-foreground/80" />
              </button>
            </div>
          )}

          {/* Top-Left: Credits (now more integrated) */}
          <div className="pointer-events-auto hidden sm:block">
            <div className="relative flex flex-col gap-2 min-w-[176px]">
              <div className="flex items-center gap-3 rounded-xl bg-background/80 dark:bg-zinc-900/80 border border-border/40 px-3.5 py-2 shadow-2xl animate-fade-in backdrop-blur-xl">
                <div className="flex items-center gap-2 text-foreground/80">
                  <div className="w-5 h-5 rounded bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>
                    </svg>
                  </div>
                  <span className="text-xs font-bold tabular-nums tracking-tight">{credits !== null ? credits.toLocaleString() : '...'}</span>
                </div>
                <div className="w-px h-3 bg-border/20" />
                <button
                  type="button"
                  onClick={() => setShowBuyCredits(true)}
                  className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  Buy Credits
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLayersPanelOpen((prev) => !prev)}
                  className="group inline-flex w-fit items-center gap-1.5 rounded-xl bg-background/80 dark:bg-zinc-900/80 border border-border/40 px-2.5 py-1.5 shadow-xl backdrop-blur-xl transition-colors hover:bg-background/90"
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground/90">
                    <Layers className="h-3.5 w-3.5" />
                    Layers
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">{visibleLayerIds.length}</span>
                  </span>
                  <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", layersPanelOpen && "rotate-180")} />
                </button>

                <button
                  type="button"
                  onClick={handleToggleAoiDraw}
                  className={cn(
                    "group relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 bg-background/80 dark:bg-zinc-900/80 shadow-xl backdrop-blur-xl transition-colors hover:bg-background/90",
                    isAoiDrawing && "border-amber-400/70 text-amber-600 dark:text-amber-300",
                    !isAoiDrawing && aoiBbox && "border-emerald-400/70 text-emerald-600 dark:text-emerald-300"
                  )}
                  aria-label={isAoiDrawing ? "Cancel rectangle draw" : "Draw AOI rectangle"}
                >
                  {isAoiDrawing ? <X className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                  <span className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-border/60 bg-background/95 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-foreground opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {isAoiDrawing ? "Cancel Draw" : "Draw Rectangle"}
                  </span>
                </button>
              </div>

              {layersPanelOpen && (
                <div className="absolute top-full left-0 mt-2 z-[1700] w-[min(280px,calc(100vw-2rem))] min-w-[220px] rounded-xl border border-border/60 bg-background/85 dark:bg-zinc-900/85 shadow-2xl backdrop-blur-xl p-2 max-h-72 overflow-y-auto pointer-events-auto">
                  {visibleLayerIds.length === 0 ? (
                    <div className="px-2 py-4 text-center text-[11px] font-medium text-muted-foreground">
                      No layers added yet.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {visibleLayerIds.map((id) => {
                        const layer = layersById[id];
                        if (!layer) return null;
                        const isExpanded = !!expandedLayerIds[id];
                        const opacityPercent = Math.round((layer.opacity ?? 0.8) * 100);

                        return (
                          <div
                            key={id}
                            draggable={!isExpanded}
                            onDragStart={() => {
                              if (isExpanded) return;
                              setDraggingLayerId(id);
                            }}
                            onDragEnd={() => setDraggingLayerId(null)}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={() => handleLayerDrop(id)}
                            className={cn(
                              "rounded-lg border border-border/60 bg-background/70 px-2 py-1.5",
                              "transition-colors hover:bg-muted/60",
                              draggingLayerId === id && "opacity-60"
                            )}
                          >
                            <div className="flex items-start gap-1.5">
                              <GripVertical className={cn(
                                "h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground cursor-grab active:cursor-grabbing",
                                isExpanded && "opacity-40 cursor-default"
                              )} />
                              <div className="min-w-0 flex-1 pr-0.5">
                                <p
                                  className="text-[11px] font-semibold text-foreground leading-snug line-clamp-2 break-words"
                                  title={layer.name}
                                >
                                  {layer.name}
                                </p>
                                <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
                                  {id.startsWith('ai-')
                                    ? 'AI · Chat'
                                    : layer.type === 'geojson'
                                      ? 'GeoJSON'
                                      : 'Tile'}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleLayerDropdown(id)}
                                className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${layer.name}`}
                              >
                                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveLayer(id)}
                                className="rounded-md p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                aria-label={`Remove ${layer.name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            {isExpanded && (
                              <div className="mt-2 border-t border-border/50 pt-2 space-y-2">
                                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                  <span>Opacity</span>
                                  <span>{opacityPercent}%</span>
                                </div>
                                <Slider
                                  value={[opacityPercent]}
                                  min={0}
                                  max={100}
                                  step={1}
                                  onValueChange={(value) => handleLayerOpacityChange(id, value[0] ?? opacityPercent)}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Top-Center: Smart Search */}
          {(!isMobile || sidebarCollapsed) && (
            <div className={cn(
              "pointer-events-auto transition-all duration-300 mx-2 sm:mx-4",
              isMobile ? "flex-1" : "w-full",
              !isMobile && (isRightPanelVisible
                  ? "max-w-[420px] md:mr-[26rem]"
                  : "max-w-[500px]")
            )}>
              <div className="flex items-center gap-2">
                <form
                  onSubmit={handleLocationSearch}
                  className="flex-1 flex items-center gap-2 rounded-2xl border border-border/40 bg-background shadow-2xl p-1.5 backdrop-blur-xl transition-all focus-within:ring-2 focus-within:ring-primary/20"
                >
                  <div className="flex items-center gap-2 flex-1 pl-3 min-w-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50 shrink-0">
                      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                    </svg>
                    <Input
                      value={locationQuery}
                      onChange={(e) => setLocationQuery(e.target.value)}
                      placeholder="Analyze coords or search places..."
                      aria-label="Search location"
                      className="h-9 border-none bg-transparent shadow-none focus-visible:ring-0 px-0 placeholder:text-muted-foreground/40 text-sm font-medium min-w-0 w-full truncate"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={locationSearchLoading || !locationQuery.trim()}
                    className="rounded-xl h-9 px-5 font-bold transition-all shadow-md active:scale-95 hover:shadow-primary/20"
                  >
                    {locationSearchLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      </div>
                    ) : (
                      <span className="text-[11px] font-bold uppercase tracking-wider">Locate</span>
                    )}
                  </Button>
                </form>
                {isMobile && (
                  <div className="flex-shrink-0">
                    <UserMenu />
                  </div>
                )}
              </div>
          </div>
          )}

          {/* Top-Right: User Profile & Settings */}
          {(!isMobile || sidebarCollapsed) && (
            <div className="pointer-events-auto hidden sm:block">
              <UserMenu />
            </div>
          )}
        </header>

        {showBuyCredits && (
          <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-background/40 p-4 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-2xl p-6 border-b-4 border-b-zinc-900/20 dark:border-b-zinc-100/20 animate-scale-in">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-950 shadow-lg shadow-zinc-900/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-foreground uppercase">Top up Credits</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      Current: <span className="text-foreground underline decoration-1 underline-offset-2">{credits !== null ? credits.toLocaleString('en-IN') : '...'}</span>
                    </p>
                  </div>
                </div>
                  <button
                    type="button"
                    onClick={() => setShowBuyCredits(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-all hover:bg-zinc-900 dark:hover:bg-zinc-100 hover:text-white dark:hover:text-black"
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                {creditBundles.map((bundle, index) => (
                  <button
                    key={bundle.id}
                    type="button"
                    onClick={() => handlePurchaseBundle(bundle.id)}
                    disabled={buyingBundleId !== null}
                    className={`group flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all hover:border-zinc-900 dark:hover:border-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 disabled:opacity-60 ${
                      index === 1 ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900/[0.02] shadow-sm' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center gap-4 text-[11px]">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-black uppercase tracking-tighter ${
                        index === 0 ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' :
                        index === 1 ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' :
                        'bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200'
                      }`}>
                        {index === 0 ? 'Small' : index === 1 ? 'Pro' : 'Max'}
                      </div>
                      <div>
                        <div className="text-sm font-black text-foreground">{bundle.credits.toLocaleString('en-IN')} Credits</div>
                        <div className="font-bold text-muted-foreground uppercase tracking-wider">
                          {index === 1 && <span className="mr-2 text-foreground">Best Choice</span>}
                          ₹{(bundle.price_inr / bundle.credits).toFixed(2)} / unit
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {buyingBundleId === bundle.id ? (
                        <div className="w-5 h-5 border-2 border-zinc-900/30 border-t-zinc-900 dark:border-zinc-100/30 dark:border-t-zinc-100 rounded-full animate-spin ml-auto" />
                      ) : (
                        <div className="text-lg font-black text-foreground">₹{bundle.price_inr.toLocaleString('en-IN')}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-muted/30 border border-border/50">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Usage Rates</p>
                <div className="flex flex-wrap gap-4 text-[10px] font-bold uppercase">
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100" /> Hazard: 10</div>
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-zinc-600 dark:bg-zinc-400" /> Weather: 10</div>
                  <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" /> Vision: 15</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 relative">
          {isAoiDrawing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] pointer-events-auto">
              <div className="flex items-center gap-3 rounded-xl bg-amber-500 text-white px-4 py-2.5 shadow-2xl">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-bold tracking-wide">Draw a rectangle on the map</span>
                <button
                  type="button"
                  onClick={handleToggleAoiDraw}
                  className="ml-1 rounded-lg bg-white/20 hover:bg-white/30 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {changeDetectionActive && (
            <ChangeDetectionOverlay
              beforeDate={changeDetectionBeforeDate}
              afterDate={changeDetectionAfterDate}
              splitPercent={changeDetectionSplit}
              onBeforeDateChange={setChangeDetectionBeforeDate}
              onAfterDateChange={setChangeDetectionAfterDate}
              onSplitChange={setChangeDetectionSplit}
            />
          )}
          <MapView 
            hazardGuardActive={hazardGuardActive}
            hazardGuardMode={hazardGuardMode}
            weatherWiseActive={showWeatherWise}
            geoVisionActive={showGeoVision}
            urbanPlanningFeature={activeUrbanPlanningFeature}
            forestDeptFeature={activeForestDeptFeature}
            onMapClick={handleMapClick}
            onPolygonDrawn={handlePolygonDrawn}
            onUrbanPlanningDraw={handleUrbanPlanningDraw}
            onForestDeptDraw={handleForestDeptDraw}
            predictionResult={predictionResult}
            heatmapData={heatmapData}
            heatmapLoading={heatmapLoading}
          />
          <ChatButton />
          
          <HazardGuardPanel
            isVisible={showPanel}
            onClose={handleClosePanel}
            result={predictionResult}
            loading={isLoading || heatmapLoading}
            error={error}
            mapCoords={hazardGuardCoords}
            onRunAnalysis={handleRunHazardGuardAnalysis}
            availableCredits={credits}
            mode={hazardGuardMode}
            heatmapData={heatmapData}
            heatmapSummary={heatmapSummary}
          />
          <WeatherWisePanel
            isVisible={showWeatherWise}
            onClose={() => { setShowWeatherWise(false); setWeatherWiseCoords(null); }}
            mapCoords={weatherWiseCoords}
            availableCredits={credits}
          />
          <GeoVisionPanel
            isVisible={showGeoVision}
            onClose={() => { setShowGeoVision(false); setGeoVisionCoords(null); }}
            mapCoords={geoVisionCoords}
            availableCredits={credits}
          />
          <UrbanPlanningPanel
            isVisible={showUrbanPlanningPanel}
            onClose={handleCloseUrbanPlanningPanel}
            activeFeature={activeUrbanPlanningFeature}
            drawnCoordinates={urbanPlanningCoords}
            availableCredits={credits}
            onRequestDraw={handleRequestMapDraw}
            onClearDraw={handleClearMapDraw}
          />
          <ForestDeptPanel
            isVisible={showForestDeptPanel}
            onClose={handleCloseForestDeptPanel}
            activeFeature={activeForestDeptFeature}
            drawnCoordinates={forestDeptCoords}
            availableCredits={credits}
            onRequestDraw={handleRequestMapDraw}
            onClearDraw={handleClearMapDraw}
          />
          {timelapseActive && timelapseFrames.length > 0 && (
            <TimelinePlayer
              frames={timelapseFrames}
              title={timelapseTitle}
              onFrameChange={handleTimelapseFrameChange}
              onClose={handleTimelapseClose}
              defaultOpacity={1}
              defaultSpeedMs={1000}
            />
          )}
          <DatasetExplorerModal 
            isOpen={isDatasetExplorerOpen} 
            onClose={() => setIsDatasetExplorerOpen(false)}
            activeLayerIds={Object.keys(layersById)}
            sidebarLayerIds={sidebarLayerCatalog.map((item) => item.id)}
            onSyncSidebarSelection={handleSyncSidebarSelection}
          />
        </div>
      </main>
    </div>
  );
};

export default Index;
