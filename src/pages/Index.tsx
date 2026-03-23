import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { MapView } from "@/components/MapView";
import type { HeatmapPoint } from "@/components/MapView";
import { ChatButton } from "@/components/ChatButton";
import { HazardGuardPanel } from "@/components/HazardGuardPanel";
import { WeatherWisePanel } from "@/components/WeatherWisePanel";
import { GeoVisionPanel } from "@/components/GeoVisionPanel";
import { TimelinePlayer } from "@/components/TimelinePlayer";
import { UserMenu } from "@/components/UserMenu";
import { hazardGuardService, PredictionResult } from "@/services/hazardGuard";
import type { HazardGuardMode } from "@/components/HazardGuardCard";
import type { TimelapseFrame } from "@/services/api";
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

  // Credits state
  const [credits, setCredits] = useState<number>(30);
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
        const [balance, bundles] = await Promise.all([
          creditsService.getBalance(),
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

    if (credits < HAZARDGUARD_COST) {
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

    if (credits < HAZARDGUARD_COST) {
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
  };

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
        onWeatherWiseOpen={() => setShowWeatherWise(true)}
        onGeoVisionOpen={() => setShowGeoVision(true)}
        onTimelapseLoaded={handleTimelapseLoaded}
        onTimelapseClose={handleTimelapseClose}
        isTimelapseActive={timelapseActive}
      />
      <main className="flex-1 relative">
        {/* Top-left credits card */}
        <div className="absolute left-4 top-4 z-[1300]">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background/95 px-3 py-2 text-sm font-semibold text-foreground shadow-sm backdrop-blur">
            <span className="text-muted-foreground">Credits:</span>{' '}
            <span className={credits <= 0 ? 'text-red-500' : 'text-foreground'}>{credits}</span>
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
          <div className="absolute inset-0 z-[1500] flex items-center justify-center bg-black/55 p-4">
            <div className="w-full max-w-md rounded-2xl border border-primary/30 bg-card p-4 shadow-2xl">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold">Buy Credits</h3>
                  <p className="text-xs text-muted-foreground">Current balance: <span className="font-semibold text-primary">{credits}</span></p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBuyCredits(false)}
                  className="rounded-md border border-border px-2 py-1 text-xs"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2">
                {creditBundles.map((bundle) => (
                  <button
                    key={bundle.id}
                    type="button"
                    onClick={() => handlePurchaseBundle(bundle.id)}
                    disabled={buyingBundleId !== null}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-3 text-left hover:border-primary/50"
                  >
                    <div>
                      <div className="text-sm font-semibold">{bundle.label}</div>
                      <div className="text-xs text-muted-foreground">{bundle.credits} credits</div>
                    </div>
                    <div className="text-sm font-bold text-primary">
                      {buyingBundleId === bundle.id ? 'Processing payment...' : `Rs ${bundle.price_inr}`}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-3 rounded-lg border border-border bg-muted/30 p-2 text-[11px] text-muted-foreground">
                Cost per prediction: HazardGuard 10 credits, WeatherWise 10 credits, GeoVision 15 credits.
              </div>
            </div>
          </div>
        )}

        <MapView 
          hazardGuardActive={hazardGuardActive}
          hazardGuardMode={hazardGuardMode}
          weatherWiseActive={showWeatherWise}
          geoVisionActive={showGeoVision}
          onMapClick={handleMapClick}
          onPolygonDrawn={handlePolygonDrawn}
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
