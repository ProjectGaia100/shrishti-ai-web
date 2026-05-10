import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  X, Brain, MapPin, Loader2, AlertCircle, CheckCircle,
  Sparkles, Shield, CloudRain
} from "lucide-react";
import { cn } from "@/lib/utils";
import { geoVisionService, GeoVisionPrediction } from "@/services/geoVision";
import { useToast } from "@/hooks/use-toast";

interface GeoVisionPanelProps {
  isVisible: boolean;
  onClose: () => void;
  mapCoords?: { lat: number; lon: number } | null;
  availableCredits?: number | null;
}

// Color map for disaster classes
const DISASTER_COLORS: Record<string, string> = {
  Drought: "#f59e0b",
  Flood: "#3b82f6",
  Landslide: "#a16207",
  Normal: "#22c55e",
  Storm: "#8b5cf6",
};

// Color map for weather regimes
const WEATHER_COLORS: Record<string, string> = {
  Cloudy: "#94a3b8",
  Dry: "#f59e0b",
  Humid: "#06b6d4",
  Rainy: "#3b82f6",
  Stormy: "#8b5cf6",
};

export const GeoVisionPanel = ({ isVisible, onClose, mapCoords, availableCredits = 0 }: GeoVisionPanelProps) => {
  const GEOVISION_COST = 15;
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<GeoVisionPrediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (mapCoords) {
      setLatitude(mapCoords.lat.toFixed(6));
      setLongitude(mapCoords.lon.toFixed(6));
    }
  }, [mapCoords]);

  const handlePredict = async () => {
    setError(null);
    setPrediction(null);

    const credits = availableCredits ?? 0;
    if (credits < GEOVISION_COST) {
      window.dispatchEvent(new CustomEvent('credits:insufficient', {
        detail: {
          required_credits: GEOVISION_COST,
          remaining_credits: credits,
          model: 'geovision',
        }
      }));
      const errorMsg = 'Out of credits. Buy more credits to run GeoVision predictions.';
      setError(errorMsg);
      toast({ title: 'Out of credits', description: errorMsg, variant: 'destructive' });
      return;
    }

    if (!latitude || !longitude) {
      setError("Please enter latitude and longitude (or click the map)");
      return;
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || lat < -90 || lat > 90) { setError("Latitude must be between -90 and 90"); return; }
    if (isNaN(lon) || lon < -180 || lon > 180) { setError("Longitude must be between -180 and 180"); return; }

    setIsLoading(true);
    toast({ title: "Running GeoVision", description: "Fetching most recent data & fusing LSTM + Tree Ensemble models..." });

    try {
      const result = await geoVisionService.predictFusion(lat, lon);

      if (result.success && result.data) {
        setPrediction(result.data);
        toast({ title: "Prediction Complete", description: `Disaster: ${result.data.disaster_prediction.predicted_class} | Weather: ${result.data.weather_prediction.predicted_regime}` });
      } else {
        setError(result.error || "Prediction failed");
        toast({ title: "Prediction Failed", description: result.error, variant: "destructive" });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unexpected error";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setLatitude("");
    setLongitude("");
    setPrediction(null);
    setError(null);
  };

  // --- Probability bar helper ---
  const ProbBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-foreground/80">{label}</span>
        <span className="font-mono font-semibold" style={{ color }}>{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.max(value * 100, 1)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );

  if (!isVisible) return null;

  return (
    <Card className={cn(
      "fixed top-4 right-4 w-[400px] max-w-[90vw] max-h-[90vh] overflow-y-auto z-[1600]",
      "bg-background/80 dark:bg-zinc-900/80 border border-border shadow-2xl animate-in slide-in-from-right-4 duration-500 backdrop-blur-xl custom-scrollbar"
    )}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-border/20">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight uppercase">GeoVision</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Multi-modal Analysis</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Input Form */}
        <div className="space-y-4">
          <div className="rounded-lg p-4 space-y-4 bg-muted/30 border border-border">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              <MapPin className="w-4 h-4" />
              <span>Location</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="gv-lat" className="text-xs">Latitude <span className="text-red-500">*</span></Label>
                <Input id="gv-lat" type="number" step="0.0001" placeholder="e.g. 22.9093" value={latitude} onChange={e => setLatitude(e.target.value)} className="bg-background border border-input text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gv-lon" className="text-xs">Longitude <span className="text-red-500">*</span></Label>
                <Input id="gv-lon" type="number" step="0.0001" placeholder="e.g. 76.4246" value={longitude} onChange={e => setLongitude(e.target.value)} className="bg-background border border-input text-sm" />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Click on the map to auto-fill coordinates. Uses the most recent 60 days of weather data automatically.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handlePredict} disabled={isLoading} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running Fusion...</>) : (<><Sparkles className="w-4 h-4 mr-2" />Predict</>)}
            </Button>
            <Button onClick={handleReset} variant="outline" className="border-border/50">Reset</Button>
          </div>

          {/* ========== RESULTS ========== */}
          {prediction && (
            <div className="space-y-4 animate-fade-in pt-2 border-t border-border/50">

              {/* --- Disaster Prediction --- */}
              <div className="rounded-lg p-4 space-y-3 bg-muted/30 border border-border">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  <Shield className="w-4 h-4" />
                  <span>Disaster Prediction</span>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                    style={{ backgroundColor: DISASTER_COLORS[prediction.disaster_prediction.predicted_class] || "#6366f1" }}
                  >
                    {prediction.disaster_prediction.predicted_class.charAt(0)}
                  </div>
                  <div>
                    <div className="text-lg font-bold">{prediction.disaster_prediction.predicted_class}</div>
                    <div className="text-xs text-muted-foreground">
                      Confidence: <span className="font-semibold text-foreground">{(prediction.disaster_prediction.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Probability bars */}
                <div className="space-y-2 pt-1">
                  {Object.entries(prediction.disaster_prediction.probabilities)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cls, prob]) => (
                      <ProbBar key={cls} label={cls} value={prob} color={DISASTER_COLORS[cls] || "#6366f1"} />
                    ))}
                </div>
              </div>

              {/* --- Weather Regime Prediction --- */}
              <div className="rounded-lg p-4 space-y-3 bg-muted/30 border border-border">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  <CloudRain className="w-4 h-4" />
                  <span>Weather Regime</span>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white"
                    style={{ backgroundColor: WEATHER_COLORS[prediction.weather_prediction.predicted_regime] || "#6366f1" }}
                  >
                    {prediction.weather_prediction.predicted_regime.charAt(0)}
                  </div>
                  <div>
                    <div className="text-lg font-bold">{prediction.weather_prediction.predicted_regime}</div>
                    <div className="text-xs text-muted-foreground">
                      Confidence: <span className="font-semibold text-foreground">{(prediction.weather_prediction.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  {Object.entries(prediction.weather_prediction.probabilities)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cls, prob]) => (
                      <ProbBar key={cls} label={cls} value={prob} color={WEATHER_COLORS[cls] || "#6366f1"} />
                    ))}
                </div>
              </div>

              {/* --- Metadata --- */}
              <div className="rounded-lg p-4 bg-muted/30 border border-border">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                  <CheckCircle className="w-3 h-3" />
                  Metadata
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="text-muted-foreground">Location</div>
                    <div className="font-medium">{prediction.metadata.location.latitude.toFixed(4)}, {prediction.metadata.location.longitude.toFixed(4)}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-muted-foreground">Reference Date</div>
                    <div className="font-medium">{prediction.metadata.reference_date}</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-muted-foreground">Processing Time</div>
                    <div className="font-medium">{prediction.metadata.processing_time_seconds.toFixed(2)}s</div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-muted-foreground">Model Version</div>
                    <div className="font-medium">{prediction.metadata.model_version}</div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
