import { useState, useEffect, useCallback, useRef } from "react";
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
import { UserMenu } from "@/components/UserMenu";
import { hazardGuardService, PredictionResult } from "@/services/hazardGuard";
import type { HazardGuardMode } from "@/components/HazardGuardCard";
import type { TimelapseFrame } from "@/services/api";
import type { UrbanPlanningFeature } from "@/services/urbanPlanning";
import type { ForestDeptFeature } from "@/services/forestDepartment";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { creditsService, CreditBundle } from "@/services/credits";

const FALLBACK_CREDIT_BUNDLES: CreditBundle[] = [
  { id: 'plus_1000', credits: 1000, price_inr: 999, label: '1000 Credits' },
  { id: 'plus_10000', credits: 10000, price_inr: 7999, label: '10000 Credits' },
  { id: 'plus_100000', credits: 100000, price_inr: 59999, label: '100000 Credits' },
];

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
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[] | null>(null);
  const [heatmapLoading, setHeatmapLoading] = useState(false);
  const [heatmapSummary, setHeatmapSummary] = useState<any>(null);
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
  const resetTimerRef = useRef<number | null>(null);
  const resetTriggeredRef = useRef(false);

  // Timelapse state
  const [timelapseFrames, setTimelapseFrames] = useState<TimelapseFrame[]>([]);
  const [timelapseTitle, setTimelapseTitle] = useState('');
  const [timelapseActive, setTimelapseActive] = useState(false);

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
    }
    // Clear heatmap when switching modes
    if (mode === 'point') {
      setHeatmapData(null);
      setHeatmapSummary(null);
    } else {
      setPredictionResult(null);
    }
  }, []);

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

    if (credits === null || credits < HAZARDGUARD_COST) {
      setShowBuyCredits(true);
      toast({
        title: 'Out of credits',
        description: 'HazardGuard needs 10 credits. Buy more credits to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
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
        activeUrbanPlanningFeature={activeUrbanPlanningFeature}
        onUrbanPlanningFeatureChange={handleUrbanPlanningFeatureChange}
        activeForestDeptFeature={activeForestDeptFeature}
        onForestDeptFeatureChange={handleForestDeptFeatureChange}
      />
      <main className="flex-1 relative">
        {/* Top-left credits card */}
        <div className="absolute left-4 top-4 z-[1300]">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background/95 px-3 py-2 text-sm font-semibold text-foreground shadow-sm backdrop-blur">
            <span className="text-muted-foreground">Credits:</span>{' '}
            <span className={credits !== null && credits <= 0 ? 'text-red-500' : 'text-foreground'}>
              {credits !== null ? credits : '...'}
            </span>
            <button
              type="button"
              onClick={() => setShowBuyCredits(true)}
              className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded border border-primary/30 bg-primary/10 text-base leading-none text-primary hover:bg-primary/20"
              aria-label="Buy credits"
            >
              +
            </button>
          </div>
        </div>

        {/* Top-right user menu */}
        <div className="absolute top-3 right-3 z-[1100]">
          <div className="flex items-center gap-2">
            <UserMenu />
          </div>
        </div>

        {showBuyCredits && (
          <div className="absolute inset-0 z-[1500] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-primary/40 bg-gradient-to-b from-card to-card/95 p-5 shadow-2xl">
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
                      <path d="M12 18V6"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Buy Credits</h3>
                    <p className="text-xs text-muted-foreground">
                      Balance: <span className="font-semibold text-primary">{credits !== null ? credits.toLocaleString('en-IN') : '...'}</span> credits
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBuyCredits(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                  </svg>
                </button>
              </div>

              {/* Credit Bundles */}
              <div className="space-y-2.5">
                {creditBundles.map((bundle, index) => (
                  <button
                    key={bundle.id}
                    type="button"
                    onClick={() => handlePurchaseBundle(bundle.id)}
                    disabled={buyingBundleId !== null}
                    className={`group flex w-full items-center justify-between rounded-xl border bg-background px-4 py-3.5 text-left transition-all hover:scale-[1.01] hover:shadow-md disabled:opacity-60 ${
                      index === 1 
                        ? 'border-primary/50 ring-1 ring-primary/20' 
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${
                        index === 0 ? 'bg-blue-500/15 text-blue-500' :
                        index === 1 ? 'bg-primary/15 text-primary' :
                        'bg-amber-500/15 text-amber-500'
                      }`}>
                        {index === 0 ? '1K' : index === 1 ? '10K' : '100K'}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{bundle.credits.toLocaleString('en-IN')} Credits</div>
                        <div className="text-xs text-muted-foreground">
                          {index === 1 && <span className="mr-1 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">POPULAR</span>}
                          {(bundle.price_inr / bundle.credits).toFixed(2)}/credit
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {buyingBundleId === bundle.id ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </div>
                      ) : (
                        <div className="text-base font-bold text-primary">
                          ₹{bundle.price_inr.toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer Info */}
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3">
                <div className="mb-1.5 text-xs font-medium text-foreground">Credit Usage</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  <span>HazardGuard: <span className="font-medium text-foreground">10</span> credits</span>
                  <span>WeatherWise: <span className="font-medium text-foreground">10</span> credits</span>
                  <span>GeoVision: <span className="font-medium text-foreground">15</span> credits</span>
                </div>
              </div>
            </div>
          </div>
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
        />
        <ForestDeptPanel
          isVisible={showForestDeptPanel}
          onClose={handleCloseForestDeptPanel}
          activeFeature={activeForestDeptFeature}
          drawnCoordinates={forestDeptCoords}
          availableCredits={credits}
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
      </main>
    </div>
  );
};

export default Index;
