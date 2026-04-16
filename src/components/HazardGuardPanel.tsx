import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

export const HazardGuardPanel = ({ isVisible, onClose, result, loading, error, mode = 'point', heatmapData, heatmapSummary }: HazardGuardPanelProps) => {
  const [animatedConfidence, setAnimatedConfidence] = useState(0);

  useEffect(() => {
    if (result?.confidence) {
      // Animate confidence percentage
      const timer = setTimeout(() => {
        setAnimatedConfidence(result.confidence);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [result?.confidence]);

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
        return { level: 'High Stress', color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' };
      case 'normal':
        return { level: 'Optimal', color: 'text-green-500', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' };
      default:
        return { level: 'Moderate Stress', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20' };
    }
  };

  const riskInfo = result ? getRiskLevel(result.prediction) : null;

  return (
    <Card className={cn(
      "fixed top-4 right-4 w-96 max-w-[90vw] max-h-[90vh] z-[1100] bg-background border border-border shadow-xl overflow-hidden flex flex-col",
      "animate-slide-in-from-right"
    )}>
      <div className="p-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-border/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">AgriShield</h3>
              <p className="text-xs text-muted-foreground">Agricultural Risk Analysis</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 hover:bg-red-500/10 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-sm text-muted-foreground">
              {mode === 'region' ? 'Generating risk heatmap...' : 'Analyzing location...'}
            </p>
            {mode === 'region' && (
              <p className="text-[10px] text-muted-foreground mt-1">Running predictions for sample points</p>
            )}
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-6">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-sm text-red-500 mb-2">Prediction Failed</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Heatmap Summary (Region Mode) */}
        {mode === 'region' && heatmapData && heatmapSummary && !loading && !error && (
          <div className="space-y-4">
            {/* Region header */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Hexagon className="w-4 h-4 text-purple-400" />
              <span>Region Analysis &middot; {heatmapSummary.successful} sample points</span>
            </div>

            {/* Overall prediction — show Normal/Disaster with confidence */}
            {(() => {
              const avgRisk = heatmapSummary.avg_risk;
              const isRegionDisaster = avgRisk >= 0.5;
              const overallLabel = isRegionDisaster ? 'Crop Stress Likely' : 'Optimal Conditions';
              const overallConfidence = isRegionDisaster ? avgRisk * 100 : (1 - avgRisk) * 100;
              return (
                <div className={cn(
                  "p-4 rounded-lg border",
                  isRegionDisaster
                    ? "bg-red-500/10 border-red-500/20"
                    : "bg-green-500/10 border-green-500/20"
                )}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-lg">Overall Prediction</span>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-xl font-bold",
                      isRegionDisaster ? "text-red-500" : "text-green-500"
                    )}>
                      {overallLabel}
                    </span>
                    <span className={cn(
                      "text-lg font-bold tabular-nums",
                      isRegionDisaster ? "text-red-400" : "text-green-400"
                    )}>
                      {overallConfidence.toFixed(1)}% confidence
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all duration-1000 ease-out",
                        isRegionDisaster ? "bg-red-500" : "bg-green-500"
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
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{heatmapSummary.disaster_count}</p>
                <p className="text-[10px] text-muted-foreground">Stressed Zones</p>
              </div>
              <div className="rounded-lg p-3 text-center bg-muted/50 border border-border">
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{heatmapSummary.successful - heatmapSummary.disaster_count}</p>
                <p className="text-[10px] text-muted-foreground">Optimal Zones</p>
              </div>
              <div className="rounded-lg p-3 text-center bg-muted/50 border border-border">
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{(heatmapSummary.max_risk * 100).toFixed(1)}%</p>
                <p className="text-[10px] text-muted-foreground">Peak Risk</p>
              </div>
              <div className="rounded-lg p-3 text-center bg-muted/50 border border-border">
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{heatmapSummary.successful}/{heatmapSummary.total}</p>
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
                    const isStress = pt.prediction.toLowerCase() === 'stress';
                    const ptLabel = isStress ? 'Stress' : 'Optimal';
                    const ptConf = isStress ? pt.risk_score * 100 : (1 - pt.risk_score) * 100;
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
            {/* Location Info */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}</span>
            </div>

            {/* Risk Assessment */}
            <div className={cn(
              "p-4 rounded-lg border",
              riskInfo?.bgColor,
              riskInfo?.borderColor
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Risk Assessment</span>
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

            {/* Disaster Type Analysis - shown when disaster is detected */}
            {result.prediction.toLowerCase() === 'stress' && result.agri_shield && 
             Object.keys(result.agri_shield.probabilities).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-orange-500/10 rounded-md">
                    <Zap className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <span className="font-semibold text-sm">Crop Stress Analysis</span>
                    {result.agri_shield.confidence && (
                      <span className={cn(
                        "ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                        result.agri_shield.confidence === 'high' ? 'bg-emerald-500/15 text-emerald-400' :
                        result.agri_shield.confidence === 'medium' ? 'bg-yellow-500/15 text-yellow-400' :
                        'bg-gray-500/15 text-gray-400'
                      )}>
                        {result.agri_shield.confidence} confidence
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {Object.entries(result.agri_shield.probabilities)
                    .sort(([, a], [, b]) => b - a)
                    .map(([type, probability]) => {
                      const prob = probability * 100;
                      const isDetected = result.agri_shield.risk_types?.includes(type);
                      const getIcon = (t: string) => {
                        switch (t.toLowerCase()) {
                          case 'waterlogging / washout': return <Droplets className="w-3.5 h-3.5" />;
                          case 'wind & hail stress': return <CloudRain className="w-3.5 h-3.5" />;
                          case 'soil moisture deficit': return <Sun className="w-3.5 h-3.5" />;
                          case 'soil erosion risk': return <Mountain className="w-3.5 h-3.5" />;
                          default: return <AlertTriangle className="w-3.5 h-3.5" />;
                        }
                      };
                      const getColor = (t: string) => {
                        switch (t.toLowerCase()) {
                          case 'waterlogging / washout': return { bar: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
                          case 'wind & hail stress': return { bar: 'bg-purple-500', text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
                          case 'soil moisture deficit': return { bar: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
                          case 'soil erosion risk': return { bar: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' };
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
                {result.agri_shield.risk_types && result.agri_shield.risk_types.length > 0 && (
                  <p className="text-[11px] text-muted-foreground mt-2 italic">
                    {result.agri_shield.risk_types.length} risk factor{result.agri_shield.risk_types.length > 1 ? 's' : ''} detected: {result.agri_shield.risk_types.join(', ')}
                  </p>
                )}
                {result.agri_shield.risk_types && result.agri_shield.risk_types.length === 0 && (
                  <p className="text-[11px] text-muted-foreground mt-2 italic">
                    No specific crop stress factors exceeded the detection threshold
                  </p>
                )}
              </div>
            )}

            {/* Recommendations */}
            {result.agri_shield?.recommendations && result.agri_shield.recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-sm">Agricultural Guidance</span>
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {result.agri_shield.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Agricultural Support */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-emerald-500/10 rounded-md">
                  <Phone className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="font-semibold text-sm">Agricultural Support</span>
              </div>
              <div className="space-y-2">
                {[
                  { name: 'District Ag-Extension', number: '1800-425-1556', type: 'Advisory' },
                  { name: 'Kisan Call Centre', number: '1551', type: 'Expert Support' }
                ].map((contact, index) => (
                  <div key={index} className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:shadow-md",
                    "bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20",
                    "border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-300 dark:hover:border-emerald-700"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-full">
                        <Phone className="w-3 h-3 text-emerald-600" />
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
                        "bg-emerald-500 hover:bg-emerald-600 text-white",
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