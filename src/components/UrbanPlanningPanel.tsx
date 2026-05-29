import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  X, MapPin, Loader2, AlertCircle, CheckCircle,
  Ruler, Route, Building2, Target,
  BarChart3, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  urbanPlanningService,
  UrbanPlanningFeature,
  PlotAreaResult,
  RoadLengthResult,
  BuiltUpResult,
  SuitabilityResult,
  URBAN_PLANNING_CREDIT_COSTS
} from "@/services/urbanPlanning";
import { useToast } from "@/hooks/use-toast";

// Result type union
type UrbanPlanningResult =
  | PlotAreaResult
  | RoadLengthResult
  | BuiltUpResult
  | SuitabilityResult;

interface UrbanPlanningPanelProps {
  isVisible: boolean;
  onClose: () => void;
  activeFeature: UrbanPlanningFeature | null;
  drawnCoordinates: number[][] | null;
  availableCredits?: number | null;
  onRequestDraw?: (type: 'polygon' | 'polyline') => void;
  onClearDraw?: () => void;
}

// Feature metadata
const FEATURE_INFO: Record<UrbanPlanningFeature, {
  title: string;
  description: string;
  icon: React.ReactNode;
  drawType: 'polygon' | 'polyline';
  color: string;
}> = {
  plot_area: {
    title: 'Plot Measurement',
    description: 'Calculate area of a polygon in m², hectares, acres',
    icon: <Ruler className="w-5 h-5" />,
    drawType: 'polygon',
    color: 'text-zinc-600 dark:text-zinc-400'
  },
  road_length: {
    title: 'Road/Line Measurement',
    description: 'Calculate length of a line in meters, km, miles',
    icon: <Route className="w-5 h-5" />,
    drawType: 'polyline',
    color: 'text-zinc-700 dark:text-zinc-300'
  },
  built_up: {
    title: 'NDBI Analysis',
    description: 'View NDBI (Normalized Difference Built-up Index) values',
    icon: <Building2 className="w-5 h-5" />,
    drawType: 'polygon',
    color: 'text-zinc-500'
  },
  suitability: {
    title: 'Suitability Analysis',
    description: 'Score locations for building suitability (slope, vegetation, flood risk)',
    icon: <Target className="w-5 h-5" />,
    drawType: 'polygon',
    color: 'text-zinc-900 dark:text-zinc-100'
  }
};

export const UrbanPlanningPanel = ({
  isVisible,
  onClose,
  activeFeature,
  drawnCoordinates,
  availableCredits = 0,
  onRequestDraw,
  onClearDraw
}: UrbanPlanningPanelProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<UrbanPlanningResult | null>(null);
  const [resultFeature, setResultFeature] = useState<UrbanPlanningFeature | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Reset when feature changes
  useEffect(() => {
    setResult(null);
    setResultFeature(null);
    setError(null);
  }, [activeFeature]);

  const handleAnalyze = async () => {
    if (!activeFeature || !drawnCoordinates || drawnCoordinates.length < 2) {
      setError("Please draw a shape on the map first");
      return;
    }

    const cost = URBAN_PLANNING_CREDIT_COSTS[activeFeature];
    const credits = availableCredits ?? 0;

    if (credits < cost) {
      window.dispatchEvent(new CustomEvent('credits:insufficient', {
        detail: {
          required_credits: cost,
          remaining_credits: credits,
          feature: `urban_planning_${activeFeature}`,
        }
      }));
      setError(`Not enough credits. This feature requires ${cost} credits.`);
      toast({ title: 'Insufficient Credits', description: `You need ${cost} credits`, variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setResultFeature(null);

    toast({ title: "Analyzing...", description: `Running ${FEATURE_INFO[activeFeature].title}...` });

    try {
      let response;

      switch (activeFeature) {
        case 'plot_area':
          response = await urbanPlanningService.calculatePlotArea(drawnCoordinates);
          break;
        case 'road_length':
          response = await urbanPlanningService.calculateRoadLength(drawnCoordinates);
          break;
        case 'built_up':
          response = await urbanPlanningService.detectBuiltUp(drawnCoordinates);
          break;
        case 'suitability':
          response = await urbanPlanningService.analyzeSuitability(drawnCoordinates);
          break;
        default:
          throw new Error('Unknown feature');
      }

      if (response.success && response.data) {
        setResult(response.data);
        setResultFeature(activeFeature);
        toast({ title: "Analysis Complete", description: `${FEATURE_INFO[activeFeature].title} finished successfully` });
      } else {
        setError(response.error || "Analysis failed");
        toast({ title: "Analysis Failed", description: response.error, variant: "destructive" });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unexpected error";
      setError(errorMsg);
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrawClick = () => {
    if (activeFeature && onRequestDraw) {
      onRequestDraw(FEATURE_INFO[activeFeature].drawType);
    }
  };

  if (!isVisible || !activeFeature) return null;

  const featureInfo = FEATURE_INFO[activeFeature];
  const creditCost = URBAN_PLANNING_CREDIT_COSTS[activeFeature];

  return (
    <Card className={cn(
      "fixed top-24 right-4 w-[calc(100vw-32px)] md:w-[420px] max-h-[calc(100vh-7rem)] overflow-y-auto z-[1600]",
      "bg-background/80 dark:bg-zinc-900/80 border border-border shadow-2xl animate-in slide-in-from-right-4 duration-500 backdrop-blur-xl custom-scrollbar"
    )}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-border/20">
              {featureInfo.icon}
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight uppercase leading-none">{featureInfo.title}</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Urban Analysis</p>
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

        <div className="space-y-4">
          {/* Drawing Instructions */}
          <div className="rounded-xl p-4 space-y-3 bg-background/50 border border-border/70">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
              <MapPin className="w-4 h-4" />
              <span>Draw Area on Map</span>
            </div>

            {drawnCoordinates && drawnCoordinates.length >= 2 ? (
              <div className="flex items-center gap-2 text-sm text-foreground">
                <CheckCircle className="w-4 h-4" />
                <span>
                  {featureInfo.drawType === 'polygon'
                    ? `Polygon with ${drawnCoordinates.length} vertices`
                    : `Line with ${drawnCoordinates.length} points`}
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {featureInfo.drawType === 'polygon'
                    ? 'Draw a polygon on the map to define the analysis area.'
                    : 'Draw a line on the map to measure length.'}
                </p>
                <Button variant="outline" size="sm" onClick={handleDrawClick} className="w-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  Draw {featureInfo.drawType === 'polygon' ? 'Polygon' : 'Line'}
                </Button>
              </div>
            )}
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
            <Button
              onClick={handleAnalyze}
              disabled={isLoading || !drawnCoordinates || drawnCoordinates.length < 2}
              className="flex-1 bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
              ) : (
                <><BarChart3 className="w-4 h-4 mr-2" />Analyze ({creditCost} credits)</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setResult(null); setResultFeature(null); setError(null); if (onClearDraw) onClearDraw(); }}
              className="border-border/50"
            >
              Reset
            </Button>
          </div>

          {/* Results */}
          {result && resultFeature === activeFeature && <ResultsDisplay feature={activeFeature} result={result} />}
        </div>
      </div>
    </Card>
  );
};

// ========================================
// RESULTS DISPLAY COMPONENT
// ========================================

const ResultsDisplay = ({ feature, result }: { feature: UrbanPlanningFeature; result: UrbanPlanningResult }) => {
  switch (feature) {
    case 'plot_area':
      return <PlotAreaResults data={result as PlotAreaResult} />;
    case 'road_length':
      return <RoadLengthResults data={result as RoadLengthResult} />;
    case 'built_up':
      return <BuiltUpResults data={result as BuiltUpResult} />;
    case 'suitability':
      return <SuitabilityResults data={result as SuitabilityResult} />;
    default:
      return null;
  }
};

// Individual result components
const PlotAreaResults = ({ data }: { data: PlotAreaResult }) => (
  <div className="space-y-3 pt-3 border-t border-border/50 animate-fade-in">
    <div className="flex items-center gap-2 text-sm font-semibold text-blue-500">
      <CheckCircle className="w-4 h-4" />
      <span>Plot Measurement Results</span>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="Area" value={`${data.area_m2.toLocaleString()} m²`} />
      <StatCard label="Hectares" value={data.area_hectares.toFixed(4)} />
      <StatCard label="Acres" value={data.area_acres.toFixed(4)} />
      <StatCard label="Perimeter" value={`${data.perimeter_m.toLocaleString()} m`} />
    </div>
  </div>
);

const RoadLengthResults = ({ data }: { data: RoadLengthResult }) => (
  <div className="space-y-3 pt-3 border-t border-border/50 animate-fade-in">
    <div className="flex items-center gap-2 text-sm font-semibold text-orange-500">
      <CheckCircle className="w-4 h-4" />
      <span>Line Measurement Results</span>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <StatCard label="Length" value={`${data.length_m.toLocaleString()} m`} />
      <StatCard label="Kilometers" value={data.length_km.toFixed(4)} />
      <StatCard label="Miles" value={data.length_miles.toFixed(4)} />
      <StatCard label="Feet" value={data.length_feet.toLocaleString()} />
    </div>
  </div>
);

const BuiltUpResults = ({ data }: { data: BuiltUpResult }) => {
  // Get NDBI color based on value (negative = blue/green, positive = orange/red)
  const getNdbiColor = (value: number) => {
    if (value >= 0.2) return '#ef4444'; // High built-up (red)
    if (value >= 0) return '#f97316'; // Moderate built-up (orange)
    if (value >= -0.1) return '#eab308'; // Mixed (yellow)
    if (value >= -0.2) return '#22c55e'; // Vegetation (green)
    return '#3b82f6'; // Water/low reflectance (blue)
  };

  const handleViewOnMap = () => {
    if (data.tile_url) {
      window.dispatchEvent(new CustomEvent('geo:add-layer', {
        detail: {
          id: 'ndbi-overlay',
          name: 'NDBI Analysis',
          type: 'tile',
          url: data.tile_url,
          visible: true,
          legend: data.legend
        }
      }));
    }
  };

  const ndbiMean = data.ndbi_statistics.mean;
  const ndbiColor = getNdbiColor(ndbiMean);

  return (
    <div className="space-y-3 pt-3 border-t border-border/50 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
          <CheckCircle className="w-4 h-4" />
          <span>NDBI Analysis Results</span>
        </div>
        {data.tile_url && (
          <Button variant="outline" size="sm" onClick={handleViewOnMap} className="text-xs h-7">
            <Eye className="w-3 h-3 mr-1" />
            View on Map
          </Button>
        )}
      </div>

      {/* NDBI Value Display */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
        <div 
          className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: ndbiColor }}
        >
          {ndbiMean.toFixed(3)}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold mb-1">Mean NDBI</div>
          <div className="text-xs text-muted-foreground">
            {ndbiMean >= 0.2 ? 'High built-up density' :
             ndbiMean >= 0 ? 'Moderate built-up area' :
             ndbiMean >= -0.1 ? 'Mixed land cover' :
             ndbiMean >= -0.2 ? 'Vegetation dominant' :
             'Water or low reflectance'}
          </div>
        </div>
      </div>

      {/* NDBI Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Min NDBI" value={data.ndbi_statistics.min.toFixed(4)} />
        <StatCard label="Max NDBI" value={data.ndbi_statistics.max.toFixed(4)} />
        <StatCard label="Std Dev" value={data.ndbi_statistics.std_dev.toFixed(4)} />
        <StatCard label="Area" value={`${(data.total_area_hectares).toFixed(2)} ha`} />
      </div>

      {/* NDBI Scale Legend */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">NDBI Scale</div>
        <div className="flex h-3 rounded-full overflow-hidden">
          <div className="flex-1 bg-blue-500" title="Water/Low (-1 to -0.2)"></div>
          <div className="flex-1 bg-green-500" title="Vegetation (-0.2 to -0.1)"></div>
          <div className="flex-1 bg-yellow-500" title="Mixed (-0.1 to 0)"></div>
          <div className="flex-1 bg-orange-500" title="Built-up (0 to 0.2)"></div>
          <div className="flex-1 bg-red-500" title="High Built-up (0.2 to 1)"></div>
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>-1 (Water)</span>
          <span>0</span>
          <span>+1 (Built-up)</span>
        </div>
      </div>

      {/* Date info */}
      <div className="text-[10px] text-muted-foreground text-center">
        Data from {data.date_range.start} to {data.date_range.end} ({data.images_used} images)
      </div>
    </div>
  );
};

const SuitabilityResults = ({ data }: { data: SuitabilityResult }) => {
  const scoreColor = data.suitability.overall_score >= 80 ? 'text-green-500' :
    data.suitability.overall_score >= 60 ? 'text-lime-500' :
    data.suitability.overall_score >= 40 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="space-y-3 pt-3 border-t border-border/50 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-500">
          <CheckCircle className="w-4 h-4" />
          <span>Suitability Analysis</span>
        </div>
      </div>

      {/* Overall Score */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
        <div className={cn("text-4xl font-bold", scoreColor)}>
          {data.suitability.overall_score.toFixed(0)}
        </div>
        <div>
          <div className="font-semibold">{data.suitability.category}</div>
          <div className="text-xs text-muted-foreground">{data.suitability.recommendation}</div>
        </div>
      </div>

      {/* Factor Scores - using display values for intuitive visualization */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Factor Breakdown</div>
        <FactorBar label="Slope" display={data.factors.slope.display} category={data.factors.slope.category} />
        <FactorBar label="Vegetation" display={data.factors.vegetation.display} category={data.factors.vegetation.category} />
        <FactorBar label="Flood Risk" display={data.factors.flood_risk.display} category={data.factors.flood_risk.category} />
      </div>

      {/* Terrain Info */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 rounded bg-muted/30">
          <div className="text-muted-foreground">Elevation</div>
          <div className="font-semibold">{data.terrain.mean_elevation_m.toFixed(0)}m</div>
        </div>
        <div className="p-2 rounded bg-muted/30">
          <div className="text-muted-foreground">Min/Max</div>
          <div className="font-semibold">{data.terrain.min_elevation_m.toFixed(0)}-{data.terrain.max_elevation_m.toFixed(0)}m</div>
        </div>
        <div className="p-2 rounded bg-muted/30">
          <div className="text-muted-foreground">Slope</div>
          <div className="font-semibold">{data.factors.slope.mean_degrees?.toFixed(1)}°</div>
        </div>
      </div>

      {/* Date info */}
      <div className="text-[10px] text-muted-foreground text-center">
        Data from {data.date_range.start} to {data.date_range.end} ({data.images_used} images)
      </div>
    </div>
  );
};

// Helper components
const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="p-3 rounded-lg bg-muted/30 border border-border">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-lg font-bold">{value}</div>
  </div>
);

const FactorBar = ({ label, display, category }: { label: string; display: number; category: string }) => {
  const getColor = (val: number) => {
    if (val >= 70) return '#ef4444';
    if (val >= 40) return '#eab308';
    if (val >= 20) return '#84cc16';
    return '#22c55e';
  };
  const color = getColor(display);
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-foreground/80">{label}</span>
        <span className="text-muted-foreground text-[10px]">{category}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${display}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};
