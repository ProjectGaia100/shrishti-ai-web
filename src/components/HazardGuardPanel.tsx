import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Shield, AlertTriangle, Info, MapPin, Clock, Phone, Zap, Droplets, CloudRain, Mountain, Sun, Hexagon, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HazardGuardMode } from "./HazardGuardCard";
import type { HeatmapPoint } from "./MapView";

interface PredictionResult {
  prediction: string;
  confidence: number;
  latitude: number;
  longitude: number;
  disaster_types?: string[];
  disaster_type_probabilities?: Record<string, number>;
  disaster_type_confidence?: string;
  features?: Record<string, number>;
  emergency_contacts?: Array<{
    name: string;
    number: string;
    type: string;
  }>;
  recommendations?: string[];
}

interface HazardGuardPanelProps {
  isVisible: boolean;
  onClose: () => void;
  result: PredictionResult | null;
  loading: boolean;
  error: string | null;
  mapCoords?: { lat: number; lon: number } | null;
  onRunAnalysis?: (latitude: number, longitude: number) => void | Promise<void>;
  availableCredits?: number | null;
  mode?: HazardGuardMode;
  heatmapData?: HeatmapPoint[] | null;
  heatmapSummary?: {
    total: number;
    successful: number;
    failed: number;
    avg_risk: number;
    max_risk: number;
    disaster_count: number;
  } | null;
}

export const HazardGuardPanel = ({
  isVisible,
  onClose,
  result,
  loading,
  error,
  mapCoords,
  onRunAnalysis,
  availableCredits,
  mode = 'point',
  heatmapData,
  heatmapSummary
}: HazardGuardPanelProps) => {
  const HAZARDGUARD_COST = 10;
  const [animatedConfidence, setAnimatedConfidence] = useState(0);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  useEffect(() => {
    if (result?.confidence) {
      // Animate confidence percentage
      const timer = setTimeout(() => {
        setAnimatedConfidence(result.confidence);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [result?.confidence]);

  useEffect(() => {
    if (mapCoords) {
      setLatitude(mapCoords.lat.toFixed(6));
      setLongitude(mapCoords.lon.toFixed(6));
    }
  }, [mapCoords]);

  // Fly to location when prediction result arrives
  useEffect(() => {
    if (result?.latitude && result?.longitude) {
      window.dispatchEvent(new CustomEvent('geo:jump-to', {
        detail: { lat: result.latitude, lon: result.longitude, zoom: 11 }
      }));
    }
  }, [result?.latitude, result?.longitude]);

  const handleRunAnalysis = async () => {
    if (!onRunAnalysis || loading) return;

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return;
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) return;

    await onRunAnalysis(lat, lon);
  };

  if (!isVisible) return null;

  const getRiskLevel = (prediction: string) => {
    switch (prediction.toLowerCase()) {
      case 'disaster':
      case 'flood':
      case 'storm':
      case 'wildfire':
      case 'drought':
      case 'mass movement (wet)':
      case 'mass movement':
        return { level: 'High Risk', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' };
      case 'normal':
        return { level: 'Low Risk', color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' };
      default:
        return { level: 'Moderate Risk', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20' };
    }
  };

  const riskInfo = result ? getRiskLevel(result.prediction) : null;
  const isDisasterPrediction = result?.prediction?.toLowerCase() === 'disaster';

  return (
    <Card className={cn(
      "fixed top-4 right-4 w-[calc(100vw-32px)] md:w-[380px] max-h-[90vh] z-[1600] bg-background border border-border shadow-2xl overflow-hidden flex flex-col",
      "animate-in slide-in-from-right-4 duration-500 backdrop-blur-xl"
    )}>
      <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-border/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight">HazardGuard</h3>
              <p className="text-[11px] text-muted-foreground leading-none mt-1">
                {mode === 'region' ? 'Regional Risk Analysis' : 'Location Status Analysis'}
              </p>
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

        {/* Loading State */}
        {mode === 'point' && (
          <div className="rounded-xl p-4 mb-4 space-y-3 bg-muted/25 border border-border/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="w-4 h-4" />
                <span>Location Input</span>
              </div>
              {mapCoords && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-background border border-border rounded-full px-2 py-1">
                  Map Synced
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="hg-latitude" className="text-sm font-medium">
                  Latitude <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="hg-latitude"
                  type="number"
                  step="0.0001"
                  placeholder="e.g., 22.9093"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  className="bg-background border border-input text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hg-longitude" className="text-sm font-medium">
                  Longitude <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="hg-longitude"
                  type="number"
                  step="0.0001"
                  placeholder="e.g., 76.4246"
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  className="bg-background border border-input text-sm"
                />
              </div>
            </div>

            <Button
              onClick={() => {
                void handleRunAnalysis();
              }}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? 'Running Analysis...' : 'Run Analysis'}
            </Button>

            {(availableCredits ?? 0) < HAZARDGUARD_COST && (
              <p className="text-[11px] text-red-500">
                Need {HAZARDGUARD_COST} credits to run HazardGuard analysis.
              </p>
            )}
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100 mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground animate-pulse uppercase tracking-widest text-[10px] font-bold">
              {mode === 'region' ? 'Generating risk heatmap...' : 'Analyzing location...'}
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-6">
            <AlertTriangle className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
            <p className="text-sm font-bold uppercase tracking-tight text-foreground mb-2">Prediction Failed</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Heatmap Summary (Region Mode) */}
        {mode === 'region' && heatmapData && heatmapSummary && !loading && !error && (
          <div className="space-y-4">
            {/* Region header */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hexagon className="w-4 h-4 text-zinc-400" />
              <span>Region Analysis &middot; {heatmapSummary.successful} sample points</span>
            </div>

            {/* Overall prediction — show Normal/Disaster with confidence */}
            {(() => {
              const avgRisk = heatmapSummary.avg_risk;
              const isRegionDisaster = avgRisk >= 0.5;
              const overallLabel = isRegionDisaster ? 'Disaster Likely' : 'Normal';
              const overallConfidence = isRegionDisaster ? avgRisk * 100 : (1 - avgRisk) * 100;
              return (
                <div className={cn(
                  "p-4 rounded-xl border",
                  isRegionDisaster
                    ? "bg-zinc-950 dark:bg-zinc-50 border-zinc-900 dark:border-zinc-200"
                    : "bg-background border-border"
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={cn(
                      "font-bold text-sm uppercase tracking-tight",
                      isRegionDisaster ? "text-zinc-50 dark:text-zinc-950" : "text-muted-foreground"
                    )}>
                      Composite Prediction
                    </span>
                    <div className={cn(
                      "text-[10px] font-black py-0.5 px-2 rounded uppercase tracking-widest",
                      isRegionDisaster 
                        ? "bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50" 
                        : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                    )}>
                      {overallLabel}
                    </div>
                  </div>
                  <div className="flex items-end justify-between mb-2">
                    <span className={cn(
                      "text-2xl font-black tracking-tighter leading-none",
                      isRegionDisaster ? "text-white dark:text-zinc-900" : "text-foreground"
                    )}>
                      {overallConfidence.toFixed(0)}<span className="text-[10px] ml-0.5 opacity-50 uppercase font-black">% Conf</span>
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800/50 overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-1000 ease-out",
                        isRegionDisaster ? "bg-white dark:bg-zinc-900" : "bg-zinc-950 dark:bg-zinc-50"
                      )}
                      style={{ width: `${Math.min(overallConfidence, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-3 text-center bg-muted/50 border border-border">
                <p className="text-lg font-bold text-foreground">{heatmapSummary.disaster_count}</p>
                <p className="text-[10px] text-muted-foreground">Disaster Zones</p>
              </div>
              <div className="rounded-lg p-3 text-center bg-muted/50 border border-border">
                <p className="text-lg font-bold text-foreground">{heatmapSummary.successful - heatmapSummary.disaster_count}</p>
                <p className="text-[10px] text-muted-foreground">Safe Zones</p>
              </div>
              <div className="rounded-lg p-3 text-center bg-muted/50 border border-border">
                <p className="text-lg font-bold text-foreground">{(heatmapSummary.max_risk * 100).toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground">Peak Risk</p>
              </div>
              <div className="rounded-lg p-3 text-center bg-muted/50 border border-border">
                <p className="text-lg font-bold text-foreground">{heatmapSummary.successful}/{heatmapSummary.total}</p>
                <p className="text-[10px] text-muted-foreground">Points Analyzed</p>
              </div>
            </div>

            {/* Individual point results */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-sm">Sample Point Results</span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-border/50">
                {heatmapData
                  .sort((a, b) => b.risk_score - a.risk_score)
                  .map((pt, i) => {
                    const isDisaster = pt.prediction.toLowerCase() === 'disaster';
                    const ptLabel = isDisaster ? 'Disaster' : 'Normal';
                    const ptConf = isDisaster ? pt.risk_score * 100 : (1 - pt.risk_score) * 100;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex items-center justify-between p-2 rounded-md border text-xs",
                          isDisaster
                            ? "bg-red-500/10 border-red-500/20"
                            : "bg-green-500/5 border-border/30"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            isDisaster ? "bg-red-500" : "bg-green-500"
                          )} />
                          <span className="text-muted-foreground">
                            {pt.latitude.toFixed(3)}, {pt.longitude.toFixed(3)}
                          </span>
                        </div>
                        <span className={cn(
                          "font-semibold tabular-nums",
                          isDisaster ? "text-red-400" : "text-green-400"
                        )}>
                          {ptLabel} {ptConf.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Timestamp */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
              <Clock className="w-3 h-3" />
              <span>Heatmap generated at {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && !error && (
          <div className="space-y-4">
            {/* Risk Assessment */}
            <div className={cn(
              "p-4 rounded-xl border",
              riskInfo?.bgColor,
              riskInfo?.borderColor
            )}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-base">Risk Assessment</span>
                <span className={cn("font-bold", riskInfo?.color)}>
                  {riskInfo?.level}
                </span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Prediction:</span>
                  <span className={cn("font-semibold capitalize", riskInfo?.color)}>
                    {result.prediction}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Confidence:</span>
                    <span className="font-semibold">{animatedConfidence.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all duration-1000 ease-out",
                        result.prediction.toLowerCase() === 'disaster' ? 'bg-red-500' : 'bg-green-500'
                      )}
                      style={{ width: `${animatedConfidence}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Location Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}</span>
            </div>

            {/* Professional concise output for normal predictions */}
            {!isDisasterPrediction && (
              <div className="p-3.5 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Status Note</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  No immediate escalation required. Continue passive monitoring and run a new assessment only if local conditions change.
                </p>
              </div>
            )}

            {/* Disaster Type Analysis - shown when disaster is detected */}
            {result.prediction.toLowerCase() === 'disaster' && result.disaster_type_probabilities && 
             Object.keys(result.disaster_type_probabilities).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-orange-500/10 rounded-md">
                    <Zap className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm">Specialized Model Analysis</span>
                    {result.disaster_type_confidence && (
                      <span className={cn(
                        "ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        result.disaster_type_confidence === 'high' ? 'bg-red-500/15 text-red-400' :
                        result.disaster_type_confidence === 'medium' ? 'bg-yellow-500/15 text-yellow-400' :
                        'bg-gray-500/15 text-gray-400'
                      )}>
                        {result.disaster_type_confidence} confidence
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(result.disaster_type_probabilities)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, probability]) => {
                      const prob = probability * 100;
                      const isDetected = result.disaster_types?.includes(type);
                      const getIcon = (t: string) => {
                        switch (t.toLowerCase()) {
                          case 'flood': return <Droplets className="w-3.5 h-3.5" />;
                          case 'storm': return <CloudRain className="w-3.5 h-3.5" />;
                          case 'drought': return <Sun className="w-3.5 h-3.5" />;
                          case 'landslide': return <Mountain className="w-3.5 h-3.5" />;
                          default: return <AlertTriangle className="w-3.5 h-3.5" />;
                        }
                      };
                      const getColor = (t: string) => {
                        switch (t.toLowerCase()) {
                          case 'flood': return { bar: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
                          case 'storm': return { bar: 'bg-purple-500', text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
                          case 'drought': return { bar: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
                          case 'landslide': return { bar: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
                          default: return { bar: 'bg-gray-500', text: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' };
                        }
                      };
                      const colors = getColor(type);
                      
                      return (
                        <div
                          key={type}
                          className={cn(
                            "p-2.5 rounded-lg border transition-all",
                            isDetected ? `${colors.bg} ${colors.border}` : 'bg-muted/30 border-border/30'
                          )}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className={cn(isDetected ? colors.text : 'text-muted-foreground')}>
                                {getIcon(type)}
                              </span>
                              <span className={cn(
                                "text-sm font-medium",
                                isDetected ? colors.text : 'text-muted-foreground'
                              )}>
                                {type}
                              </span>
                              {isDetected && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 font-semibold">
                                  DETECTED
                                </span>
                              )}
                            </div>
                            <span className={cn(
                              "text-sm font-bold tabular-nums",
                              prob >= 50 ? 'text-red-400' : prob >= 30 ? 'text-yellow-400' : 'text-muted-foreground'
                            )}>
                              {prob.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-700/30 rounded-full h-1.5">
                            <div
                              className={cn(
                                "h-1.5 rounded-full transition-all duration-1000 ease-out",
                                isDetected ? colors.bar : 'bg-gray-500/50'
                              )}
                              style={{ width: `${Math.min(prob, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
                {result.disaster_types && result.disaster_types.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-2 italic">
                    {result.disaster_types.length} disaster type{result.disaster_types.length > 1 ? 's' : ''} detected: {result.disaster_types.join(', ')}
                  </p>
                )}
                {result.disaster_types && result.disaster_types.length === 0 && (
                  <p className="text-[11px] text-muted-foreground mt-2 italic">
                    No specific disaster type exceeded the detection threshold
                  </p>
                )}
              </div>
            )}

            {/* Recommendations */}
            {isDisasterPrediction && result.recommendations && result.recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-sm">Recommendations</span>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Emergency Contacts */}
            {isDisasterPrediction && result.emergency_contacts && result.emergency_contacts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-red-500/10 rounded-md">
                    <Phone className="w-4 h-4 text-red-500" />
                  </div>
                  <span className="font-semibold text-sm">Emergency Contacts</span>
                </div>
                <div className="space-y-2">
                  {result.emergency_contacts.map((contact, index) => (
                    <div key={index} className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:shadow-md",
                      "bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20",
                      "border-red-200 dark:border-red-800/50 hover:border-red-300 dark:hover:border-red-700"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/10 rounded-full">
                          <Phone className="w-3 h-3 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                            {contact.name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                            {contact.type} Services
                          </p>
                        </div>
                      </div>
                      <a 
                        href={`tel:${contact.number}`}
                        className={cn(
                          "px-3 py-1.5 rounded-md font-medium text-sm transition-all duration-200",
                          "bg-red-500 hover:bg-red-600 text-white",
                          "hover:shadow-lg hover:scale-105 active:scale-95",
                          "flex items-center gap-1.5"
                        )}
                      >
                        <Phone className="w-3 h-3" />
                        {contact.number}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamp */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border/50">
              <Clock className="w-3 h-3" />
              <span>Analysis completed at {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};