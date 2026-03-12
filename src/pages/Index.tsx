import { useState, useEffect, useCallback } from "react";
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

const Index = () => {
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
  }, [hazardGuardActive, hazardGuardMode, hazardGuardSamplePoints, toast]);

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
        {/* Top-right user menu */}
        <div className="absolute top-3 right-3 z-[1100]">
          <div className="flex items-center gap-2">
            <UserMenu />
          </div>
        </div>

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
        />
        <GeoVisionPanel
          isVisible={showGeoVision}
          onClose={() => { setShowGeoVision(false); setGeoVisionCoords(null); }}
          mapCoords={geoVisionCoords}
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
