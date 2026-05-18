import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  X, MapPin, Loader2, AlertCircle, CheckCircle,
  Wheat, Droplets, Flame, TreePine, TreeDeciduous, Clock, Sprout,
  BarChart3, Eye, TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  forestDeptService,
  ForestDeptFeature,
  CropClassificationResult,
  SoilMoistureResult,
  FireRiskResult,
  PlantationSuitabilityResult,
  CompensatoryPlantationResult,
  TreeGrowthResult,
  SpeciesRecommendationResult,
  FOREST_DEPT_CREDIT_COSTS
} from "@/services/forestDepartment";
import { useToast } from "@/hooks/use-toast";

// Result type union (excluding NDVI which is global)
type ForestDeptResult =
  | CropClassificationResult
  | SoilMoistureResult
  | FireRiskResult
  | PlantationSuitabilityResult
  | CompensatoryPlantationResult
  | TreeGrowthResult
  | SpeciesRecommendationResult;

interface ForestDeptPanelProps {
  isVisible: boolean;
  onClose: () => void;
  activeFeature: ForestDeptFeature | null;
  drawnCoordinates: number[][] | null;
  availableCredits?: number | null;
  onRequestDraw?: (type: 'polygon' | 'polyline') => void;
  onClearDraw?: () => void;
}

// Feature metadata (excluding NDVI)
const FEATURE_INFO: Record<Exclude<ForestDeptFeature, 'ndvi'>, {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}> = {
  crop_classification: {
    title: 'Crop Classification',
    description: 'Classify crops using K-means clustering on spectral indices',
    icon: <Wheat className="w-5 h-5" />,
    color: 'text-zinc-600'
  },
  soil_moisture: {
    title: 'Soil Moisture Analysis',
    description: 'Analyze moisture status and irrigation distribution',
    icon: <Droplets className="w-5 h-5" />,
    color: 'text-zinc-700'
  },
  fire_risk: {
    title: 'Fire Risk Assessment',
    description: 'Evaluate wildfire risk based on temperature and vegetation',
    icon: <Flame className="w-5 h-5" />,
    color: 'text-zinc-900'
  },
  plantation_suitability: {
    title: 'Plantation Suitability',
    description: 'Find suitable areas for tree plantation',
    icon: <TreePine className="w-5 h-5" />,
    color: 'text-zinc-800'
  },
  compensatory_plantation: {
    title: 'Compensatory Plantation',
    description: 'Plan replacement planting for forest loss',
    icon: <TreeDeciduous className="w-5 h-5" />,
    color: 'text-zinc-500'
  },
  tree_growth: {
    title: 'Vegetation Trend Analysis',
    description: '10-year NDVI trend analysis with historical charts',
    icon: <Clock className="w-5 h-5" />,
    color: 'text-zinc-400'
  },
  species_recommendation: {
    title: 'Species Recommendation',
    description: 'Get suitable species based on environmental conditions',
    icon: <Sprout className="w-5 h-5" />,
    color: 'text-zinc-300'
  }
};

export const ForestDeptPanel = ({
  isVisible,
  onClose,
  activeFeature,
  drawnCoordinates,
  availableCredits = 0,
  onRequestDraw,
  onClearDraw
}: ForestDeptPanelProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ForestDeptResult | null>(null);
  const [resultFeature, setResultFeature] = useState<ForestDeptFeature | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // State for compensatory plantation's second polygon (search area)
  const [searchAreaCoordinates, setSearchAreaCoordinates] = useState<number[][] | null>(null);
  const [drawingSearchArea, setDrawingSearchArea] = useState(false);
  const [compMode, setCompMode] = useState<'removal' | 'search' | 'both'>('removal');

  // Reset when feature changes
  useEffect(() => {
    setResult(null);
    setResultFeature(null);
    setError(null);
    setSearchAreaCoordinates(null);
    setDrawingSearchArea(false);
    setCompMode('removal');
  }, [activeFeature]);

  // Listen for search area polygon completion
  useEffect(() => {
    const handleSearchAreaComplete = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (drawingSearchArea && customEvent.detail?.coordinates) {
        setSearchAreaCoordinates(customEvent.detail.coordinates);
        setDrawingSearchArea(false);
      }
    };

    window.addEventListener('geo:polygon-complete', handleSearchAreaComplete);
    return () => {
      window.removeEventListener('geo:polygon-complete', handleSearchAreaComplete);
    };
  }, [drawingSearchArea]);

  const handleDrawSearchArea = () => {
    setDrawingSearchArea(true);
    if (onRequestDraw) {
      onRequestDraw('polygon');
    }
    toast({ title: "Draw Search Area", description: "Draw a polygon to define the search area for compensatory plantation" });
  };

  const handleAnalyze = async () => {
    if (!activeFeature || activeFeature === 'ndvi') return;

    // Compensatory plantation: validate based on mode
    if (activeFeature === 'compensatory_plantation') {
      const needsRemoval = compMode === 'removal' || compMode === 'both';
      const needsSearch = compMode === 'search' || compMode === 'both';
      if (needsRemoval && (!drawnCoordinates || drawnCoordinates.length < 3)) {
        setError("Please draw the removal area on the map first");
        return;
      }
      if (needsSearch && (!searchAreaCoordinates || searchAreaCoordinates.length < 3)) {
        setError("Please draw the search area on the map first");
        return;
      }
    } else if (!drawnCoordinates || drawnCoordinates.length < 3) {
      setError("Please draw a polygon on the map first (at least 3 points)");
      return;
    }

    const cost = FOREST_DEPT_CREDIT_COSTS[activeFeature];
    const credits = availableCredits ?? 0;

    if (credits < cost) {
      window.dispatchEvent(new CustomEvent('credits:insufficient', {
        detail: {
          required_credits: cost,
          remaining_credits: credits,
          feature: `forest_dept_${activeFeature}`,
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

    const featureInfo = FEATURE_INFO[activeFeature];
    toast({ title: "Analyzing...", description: `Running ${featureInfo.title}...` });

    try {
      let response;

      switch (activeFeature) {
        case 'crop_classification':
          response = await forestDeptService.classifyCrops(drawnCoordinates);
          break;
        case 'soil_moisture':
          response = await forestDeptService.analyzeSoilMoisture(drawnCoordinates);
          break;
        case 'fire_risk':
          response = await forestDeptService.analyzeFireRisk(drawnCoordinates);
          break;
        case 'plantation_suitability':
          response = await forestDeptService.analyzePlantationSuitability(drawnCoordinates);
          break;
        case 'compensatory_plantation':
          response = await forestDeptService.planCompensatoryPlantation(
            (compMode === 'removal' || compMode === 'both') ? drawnCoordinates! : undefined,
            (compMode === 'search' || compMode === 'both') ? searchAreaCoordinates! : undefined
          );
          break;
        case 'tree_growth':
          response = await forestDeptService.estimateTreeGrowth(drawnCoordinates);
          break;
        case 'species_recommendation':
          response = await forestDeptService.recommendSpecies(drawnCoordinates);
          break;
        default:
          throw new Error('Unknown feature');
      }

      if (response.success && response.data) {
        setResult(response.data);
        setResultFeature(activeFeature);
        toast({ title: "Analysis Complete", description: `${featureInfo.title} finished successfully` });
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
    if (onRequestDraw) {
      onRequestDraw('polygon');
    }
  };

  // Don't show panel for NDVI (it's a global layer) or when not visible
  if (!isVisible || !activeFeature || activeFeature === 'ndvi') return null;

  const featureInfo = FEATURE_INFO[activeFeature];
  const creditCost = FOREST_DEPT_CREDIT_COSTS[activeFeature];

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
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Forestry Intelligence</p>
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
              <span>{activeFeature === 'compensatory_plantation' ? 'Define Areas' : 'Draw Area on Map'}</span>
            </div>

            {/* Special UI for Compensatory Plantation - Mode selector */}
            {activeFeature === 'compensatory_plantation' ? (
              <div className="space-y-3">
                {/* Mode selector */}
                <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-muted/40 border border-border/50">
                  {(['removal', 'search', 'both'] as const).map(mode => (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => { setCompMode(mode); setSearchAreaCoordinates(null); }}
                      className={`py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                        compMode === mode
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {mode === 'removal' ? 'Removal' : mode === 'search' ? 'Search' : 'Both'}
                    </button>
                  ))}
                </div>

                {/* Removal Area */}
                {(compMode === 'removal' || compMode === 'both') && (
                  <div className="p-2 rounded bg-muted/30 border border-border/60">
                    <div className="text-xs font-semibold text-foreground mb-1">
                      Removal Area {compMode === 'both' ? '(Required)' : ''}
                    </div>
                    {drawnCoordinates && drawnCoordinates.length >= 3 ? (
                      <div className="flex items-center gap-2 text-xs text-foreground">
                        <CheckCircle className="w-3 h-3" />
                        <span>Polygon with {drawnCoordinates.length} vertices</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">Area where trees will be removed</p>
                        <Button type="button" variant="outline" size="sm" onClick={handleDrawClick} className="w-full h-7 text-xs">
                          <MapPin className="w-3 h-3 mr-1" />Draw Removal Area
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Search Area */}
                {(compMode === 'search' || compMode === 'both') && (
                  <div className="p-2 rounded bg-muted/30 border border-border/60">
                    <div className="text-xs font-semibold text-foreground mb-1">
                      Search Area {compMode === 'both' ? '(Optional)' : ''}
                    </div>
                    {searchAreaCoordinates && searchAreaCoordinates.length >= 3 ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-foreground">
                          <CheckCircle className="w-3 h-3" />
                          <span>Polygon with {searchAreaCoordinates.length} vertices</span>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setSearchAreaCoordinates(null)} className="h-6 text-[10px] text-red-500 hover:text-red-600">Clear</Button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground">
                          {compMode === 'both' ? 'Where to search for sites (or skip for 5km buffer)' : 'Area to search for plantation sites'}
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleDrawSearchArea}
                          disabled={compMode === 'both' && (!drawnCoordinates || drawnCoordinates.length < 3)}
                          className="w-full h-7 text-xs"
                        >
                          <MapPin className="w-3 h-3 mr-1" />Draw Search Area
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // Standard single polygon UI for other features
              drawnCoordinates && drawnCoordinates.length >= 3 ? (
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle className="w-4 h-4" />
                  <span>Polygon with {drawnCoordinates.length} vertices</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Draw a polygon on the map to define the analysis area.
                  </p>
                  <Button variant="outline" size="sm" onClick={handleDrawClick} className="w-full">
                    <MapPin className="w-4 h-4 mr-2" />
                    Draw Polygon
                  </Button>
                </div>
              )
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
              disabled={isLoading || !drawnCoordinates || drawnCoordinates.length < 3}
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
              onClick={() => { setResult(null); setResultFeature(null); setError(null); setSearchAreaCoordinates(null); if (onClearDraw) onClearDraw(); }}
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

const ResultsDisplay = ({ feature, result }: { feature: ForestDeptFeature; result: ForestDeptResult }) => {
  switch (feature) {
    case 'crop_classification':
      return <CropClassificationResults data={result as CropClassificationResult} />;
    case 'soil_moisture':
      return <SoilMoistureResults data={result as SoilMoistureResult} />;
    case 'fire_risk':
      return <FireRiskResults data={result as FireRiskResult} />;
    case 'plantation_suitability':
      return <PlantationSuitabilityResults data={result as PlantationSuitabilityResult} />;
    case 'compensatory_plantation':
      return <CompensatoryPlantationResults data={result as CompensatoryPlantationResult} />;
    case 'tree_growth':
      return <TreeGrowthResults data={result as TreeGrowthResult} />;
    case 'species_recommendation':
      return <SpeciesRecommendationResults data={result as SpeciesRecommendationResult} />;
    default:
      return null;
  }
};

// ========================================
// INDIVIDUAL RESULT COMPONENTS
// ========================================

const CropClassificationResults = ({ data }: { data: CropClassificationResult }) => {
  const handleViewOnMap = () => {
    if (data.tile_url) {
      window.dispatchEvent(new CustomEvent('geo:add-layer', {
        detail: {
          id: 'crop-classification-overlay',
          name: 'Crop Classification',
          type: 'tile',
          url: data.tile_url,
          visible: true,
          legend: data.legend
        }
      }));
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-border/50 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-500">
          <CheckCircle className="w-4 h-4" />
          <span>Crop Classification Results</span>
        </div>
        {data.tile_url && (
          <Button variant="outline" size="sm" onClick={handleViewOnMap} className="text-xs h-7">
            <Eye className="w-3 h-3 mr-1" />
            View on Map
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total Area" value={`${data.total_area_hectares.toFixed(2)} ha`} />
        <StatCard label="Season" value={data.season} />
      </div>

      {/* Classification breakdown */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Classification Breakdown</div>
        {Object.entries(data.classification).map(([className, info]) => (
          <div key={className} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: info.color }}
            />
            <span className="text-xs flex-1">{className}</span>
            <span className="text-xs text-muted-foreground">{info.percentage.toFixed(1)}%</span>
            <span className="text-[10px] text-muted-foreground">({info.area_hectares.toFixed(2)} ha)</span>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-muted-foreground text-center">
        Data from {data.date_range.start} to {data.date_range.end} ({data.images_used} images)
        {data.note && <span className="block text-amber-500 mt-1">{data.note}</span>}
      </div>
    </div>
  );
};

const SoilMoistureResults = ({ data }: { data: SoilMoistureResult }) => {
  const handleViewOnMap = () => {
    if (data.tile_url) {
      window.dispatchEvent(new CustomEvent('geo:add-layer', {
        detail: {
          id: 'soil-moisture-overlay',
          name: 'Soil Moisture',
          type: 'tile',
          url: data.tile_url,
          visible: true,
          legend: data.legend
        }
      }));
    }
  };

  const statusColor = data.overall_status === 'Good' ? 'text-green-500' :
    data.overall_status === 'Moderate' ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="space-y-3 pt-3 border-t border-border/50 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-500">
          <CheckCircle className="w-4 h-4" />
          <span>Soil Moisture Results</span>
        </div>
        {data.tile_url && (
          <Button variant="outline" size="sm" onClick={handleViewOnMap} className="text-xs h-7">
            <Eye className="w-3 h-3 mr-1" />
            View on Map
          </Button>
        )}
      </div>

      {/* Overall Status */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
        <div className={cn("text-2xl font-bold", statusColor)}>
          {data.overall_status}
        </div>
        <div className="text-xs text-muted-foreground">
          Moisture Index: {data.moisture_index.mean.toFixed(3)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Min" value={data.moisture_index.min.toFixed(3)} />
        <StatCard label="Mean" value={data.moisture_index.mean.toFixed(3)} />
        <StatCard label="Max" value={data.moisture_index.max.toFixed(3)} />
      </div>

      {/* Irrigation Distribution */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Irrigation Distribution</div>
        <ProgressBar label="Dry" value={data.irrigation_distribution.dry.percentage} color={data.irrigation_distribution.dry.color} />
        <ProgressBar label="Moderate" value={data.irrigation_distribution.moderate.percentage} color={data.irrigation_distribution.moderate.color} />
        <ProgressBar label="Well Irrigated" value={data.irrigation_distribution.well_irrigated.percentage} color={data.irrigation_distribution.well_irrigated.color} />
      </div>

      {/* Water Stress */}
      <div className="p-2 rounded bg-muted/30 text-xs">
        <span className="text-muted-foreground">Water Stress: </span>
        <span className={data.water_stress.severity === 'Low' ? 'text-green-500' : 'text-red-500'}>
          {data.water_stress.percentage.toFixed(1)}% ({data.water_stress.severity})
        </span>
      </div>
    </div>
  );
};

const FireRiskResults = ({ data }: { data: FireRiskResult }) => {
  const handleViewOnMap = () => {
    if (data.tile_url) {
      window.dispatchEvent(new CustomEvent('geo:add-layer', {
        detail: {
          id: 'fire-risk-overlay',
          name: 'Fire Risk',
          type: 'tile',
          url: data.tile_url,
          visible: true,
          legend: data.legend
        }
      }));
    }
  };

  const riskColor = forestDeptService.constructor.prototype.constructor.name === 'ForestDepartmentService' 
    ? { 'Low': '#4CAF50', 'Moderate': '#FFEB3B', 'High': '#FF9800', 'Extreme': '#F44336' }[data.overall_risk] || '#9E9E9E'
    : '#9E9E9E';

  return (
    <div className="space-y-3 pt-3 border-t border-border/50 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-500">
          <CheckCircle className="w-4 h-4" />
          <span>Fire Risk Assessment</span>
        </div>
        {data.tile_url && (
          <Button variant="outline" size="sm" onClick={handleViewOnMap} className="text-xs h-7">
            <Eye className="w-3 h-3 mr-1" />
            View on Map
          </Button>
        )}
      </div>

      {/* Risk Score */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: riskColor }}
        >
          {data.risk_score.toFixed(0)}
        </div>
        <div>
          <div className="text-lg font-bold">{data.overall_risk} Risk</div>
          <div className="text-xs text-muted-foreground">
            {data.total_area_hectares.toFixed(2)} hectares analyzed
          </div>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Risk Distribution</div>
        <ProgressBar label="Low" value={data.risk_distribution.low.percentage} color={data.risk_distribution.low.color} />
        <ProgressBar label="Moderate" value={data.risk_distribution.moderate.percentage} color={data.risk_distribution.moderate.color} />
        <ProgressBar label="High" value={data.risk_distribution.high.percentage} color={data.risk_distribution.high.color} />
        <ProgressBar label="Extreme" value={data.risk_distribution.extreme.percentage} color={data.risk_distribution.extreme.color} />
      </div>

      {/* Factors */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded bg-muted/30">
          <div className="text-muted-foreground">Mean Temperature</div>
          <div className="font-semibold">{data.factors.temperature.mean_celsius.toFixed(1)}°C</div>
        </div>
        <div className="p-2 rounded bg-muted/30">
          <div className="text-muted-foreground">Dry Vegetation</div>
          <div className="font-semibold">{data.factors.dry_vegetation.percentage.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  );
};

const PlantationSuitabilityResults = ({ data }: { data: PlantationSuitabilityResult }) => {
  const [showMethodology, setShowMethodology] = useState(false);
  
  const handleViewOnMap = () => {
    if (data.tile_url) {
      window.dispatchEvent(new CustomEvent('geo:add-layer', {
        detail: {
          id: 'plantation-suitability-overlay',
          name: 'Plantation Suitability',
          type: 'tile',
          url: data.tile_url,
          visible: true,
          legend: data.legend
        }
      }));
    }
  };

  const scoreColor = data.suitability_score >= 70 ? '#4CAF50' :
    data.suitability_score >= 50 ? '#8BC34A' :
    data.suitability_score >= 30 ? '#FFEB3B' : '#F44336';

  return (
    <div className="space-y-3 pt-3 border-t border-border/50 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-500">
          <CheckCircle className="w-4 h-4" />
          <span>Plantation Suitability</span>
        </div>
        {data.tile_url && (
          <Button variant="outline" size="sm" onClick={handleViewOnMap} className="text-xs h-7">
            <Eye className="w-3 h-3 mr-1" />
            View on Map
          </Button>
        )}
      </div>

      {/* Suitability Score */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/30">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: scoreColor }}
        >
          {data.suitability_score.toFixed(0)}
        </div>
        <div>
          <div className="text-lg font-bold">{data.overall_suitability}</div>
          <div className="text-xs text-muted-foreground">
            {data.suitable_area.percentage.toFixed(1)}% suitable ({data.suitable_area.hectares.toFixed(2)} ha)
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground">Suitability Legend</div>
        <div className="grid grid-cols-5 gap-1">
          {data.legend.map((item, idx) => (
            <div key={idx} className="text-center">
              <div
                className="w-full h-3 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[8px] text-muted-foreground">{item.label.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Exclusion Factors */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Exclusion Factors</div>
        {Object.entries(data.exclusion_factors).map(([factor, info]) => (
          <div key={factor} className="flex items-center justify-between text-xs p-2 rounded bg-muted/20">
            <span className="capitalize">{factor.replace('_', ' ')}</span>
            <span className="text-muted-foreground">{info.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      {/* Methodology Toggle */}
      <button
        onClick={() => setShowMethodology(!showMethodology)}
        className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors p-2 rounded bg-muted/20"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Info className="w-3 h-3" />
          How is this calculated?
        </span>
        {showMethodology ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {showMethodology && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-2 animate-fade-in">
          <div className="font-semibold text-emerald-600 dark:text-emerald-400">Methodology</div>
          <p className="text-muted-foreground leading-relaxed">
            The suitability score is calculated using a weighted combination of factors derived from satellite imagery:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li><strong>Slope (30%)</strong>: Gentle slopes (&lt;15°) are preferred for ease of planting and water retention</li>
            <li><strong>Soil Moisture (25%)</strong>: Areas with adequate moisture (NDMI &gt; -0.2) support better growth</li>
            <li><strong>Not Built-up (20%)</strong>: Urban/developed areas (NDBI &gt; 0.2) are excluded</li>
            <li><strong>Not Water (15%)</strong>: Water bodies (NDWI &gt; 0.3) are excluded</li>
            <li><strong>Not Already Forested (10%)</strong>: Existing forest (NDVI &gt; 0.6) doesn't need planting</li>
          </ul>
          <p className="text-muted-foreground italic pt-1 border-t border-emerald-500/20">
            Data source: Sentinel-2 imagery, SRTM elevation data
          </p>
        </div>
      )}
    </div>
  );
};

const CompensatoryPlantationResults = ({ data }: { data: CompensatoryPlantationResult }) => {
  const [showMethodology, setShowMethodology] = useState(false);
  
  const handleViewOnMap = (layer: 'removal' | 'priority') => {
    const url = layer === 'removal' ? data.tile_urls.removal_forest : data.tile_urls.priority_areas;
    if (url) {
      window.dispatchEvent(new CustomEvent('geo:add-layer', {
        detail: {
          id: `compensatory-${layer}-overlay`,
          name: layer === 'removal' ? 'Forest in Removal Area' : 'Priority Plantation Areas',
          type: 'tile',
          url: url,
          visible: true,
          legend: data.legend
        }
      }));
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-border/50 animate-fade-in">
      <div className="flex items-center gap-2 text-sm font-semibold text-teal-500">
        <CheckCircle className="w-4 h-4" />
        <span>Compensatory Plantation Plan</span>
      </div>

      {/* Legend */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground">Map Legend</div>
        <div className="flex gap-2">
          {data.legend.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Removal Area */}
      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <div className="text-xs font-semibold text-red-500 mb-2">Removal Area Analysis</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Total Area: </span>
            <span>{data.removal_area.total_hectares.toFixed(2)} ha</span>
          </div>
          <div>
            <span className="text-muted-foreground">Forest: </span>
            <span>{data.removal_area.forest_percentage.toFixed(1)}%</span>
          </div>
          <div className="col-span-2">
            <span className="text-muted-foreground">Forest Loss: </span>
            <span className="text-red-500 font-semibold">{data.removal_area.forest_loss_hectares.toFixed(2)} ha</span>
          </div>
        </div>
        {data.tile_urls.removal_forest && (
          <Button variant="outline" size="sm" onClick={() => handleViewOnMap('removal')} className="w-full mt-2 text-xs h-7">
            <Eye className="w-3 h-3 mr-1" /> View Forest Area
          </Button>
        )}
      </div>

      {/* Compensation Required */}
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="text-xs font-semibold text-amber-500 mb-2">Compensation Required</div>
        <div className="text-lg font-bold">{data.compensation_required.required_hectares.toFixed(2)} ha</div>
        <div className="text-xs text-muted-foreground">Ratio: {data.compensation_required.ratio}</div>
      </div>

      {/* Search Area */}
      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
        <div className="text-xs font-semibold text-green-500 mb-2">Suitable Areas Found</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Search Area: </span>
            <span>{data.search_area.total_hectares.toFixed(2)} ha</span>
          </div>
          <div>
            <span className="text-muted-foreground">Suitable: </span>
            <span className="text-green-500 font-semibold">{data.search_area.suitable_hectares.toFixed(2)} ha</span>
          </div>
        </div>
        {data.tile_urls.priority_areas && (
          <Button variant="outline" size="sm" onClick={() => handleViewOnMap('priority')} className="w-full mt-2 text-xs h-7">
            <Eye className="w-3 h-3 mr-1" /> View Priority Areas
          </Button>
        )}
      </div>

      {/* Feasibility */}
      <div className={cn(
        "p-3 rounded-lg border",
        data.feasibility.can_compensate 
          ? "bg-green-500/10 border-green-500/20" 
          : "bg-red-500/10 border-red-500/20"
      )}>
        <div className="flex items-center gap-2">
          {data.feasibility.can_compensate ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <span className="text-sm font-semibold">
            {data.feasibility.can_compensate ? "Compensation Feasible" : "Compensation Challenging"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{data.feasibility.message}</p>
      </div>

      {/* Methodology Toggle */}
      <button
        onClick={() => setShowMethodology(!showMethodology)}
        className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors p-2 rounded bg-muted/20"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Info className="w-3 h-3" />
          How is this calculated?
        </span>
        {showMethodology ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {showMethodology && (
        <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs space-y-2 animate-fade-in">
          <div className="font-semibold text-teal-600 dark:text-teal-400">Methodology</div>
          <p className="text-muted-foreground leading-relaxed">
            Compensatory plantation analysis follows regulatory guidelines for forest loss compensation:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li><strong>Forest Detection</strong>: Areas with NDVI &gt; 0.5 are classified as forest</li>
            <li><strong>Compensation Ratio (2:1)</strong>: For every hectare of forest removed, 2 hectares must be planted</li>
            <li><strong>Suitable Areas</strong>: Must have gentle slope (&lt;15°), adequate moisture, no existing development or water</li>
            <li><strong>Priority Ranking</strong>: Closer areas to the removal site are prioritized</li>
          </ul>
          <p className="text-muted-foreground italic pt-1 border-t border-teal-500/20">
            If you provided a custom search area, that region was analyzed. Otherwise, a 5km buffer around the removal area was used.
          </p>
        </div>
      )}
    </div>
  );
};

const TreeGrowthResults = ({ data }: { data: TreeGrowthResult }) => {
  const getTrendIcon = (trend: string) => {
    if (trend === 'Improving') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'Declining') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-yellow-500" />;
  };

  const trendColor = data.growth_analysis.trend === 'Improving' ? 'text-green-500' :
    data.growth_analysis.trend === 'Declining' ? 'text-red-500' : 'text-yellow-500';

  // Calculate chart dimensions
  const chartHeight = 120;
  const chartWidth = 340;
  const padding = { top: 10, right: 10, bottom: 25, left: 40 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Prepare chart data
  const chartData = data.chart_data || Object.entries(data.historical_ndvi).map(([year, ndvi]) => ({
    year: parseInt(year),
    ndvi: ndvi,
    label: year
  }));

  // Calculate scales
  const ndviValues = chartData.map(d => d.ndvi);
  const minNdvi = Math.min(...ndviValues) - 0.05;
  const maxNdvi = Math.max(...ndviValues) + 0.05;
  const ndviRange = maxNdvi - minNdvi;

  // Create SVG path for line chart
  const points = chartData.map((d, i) => {
    const x = padding.left + (i / (chartData.length - 1)) * plotWidth;
    const y = padding.top + plotHeight - ((d.ndvi - minNdvi) / ndviRange) * plotHeight;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Create area path for gradient fill
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${padding.left} ${padding.top + plotHeight} Z`;

  // Get color based on trend
  const chartColor = data.growth_analysis.trend === 'Improving' ? '#22c55e' :
    data.growth_analysis.trend === 'Declining' ? '#ef4444' : '#eab308';

  return (
    <div className="space-y-3 pt-3 border-t border-border/50 animate-fade-in">
      <div className="flex items-center gap-2 text-sm font-semibold text-purple-500">
        <CheckCircle className="w-4 h-4" />
        <span>Vegetation Trend Analysis</span>
      </div>

      {/* Current Status */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-500">{data.current_ndvi.toFixed(3)}</div>
          <div className="text-[10px] text-muted-foreground">Current NDVI</div>
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">{data.current_status}</div>
          <div className="text-xs text-muted-foreground">{data.total_area_hectares} hectares analyzed</div>
        </div>
      </div>

      {/* 10-Year NDVI Chart */}
      {chartData.length > 1 && (
        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            10-Year NDVI Trend ({data.statistics?.start_year || chartData[0].year} - {data.statistics?.end_year || chartData[chartData.length - 1].year})
          </div>
          
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="overflow-visible">
            {/* Gradient definition */}
            <defs>
              <linearGradient id="ndviGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={chartColor} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Y-axis grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + plotHeight - (ratio * plotHeight);
              const value = minNdvi + ratio * ndviRange;
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={chartWidth - padding.right}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity="0.1"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={padding.left - 5}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-muted-foreground"
                    fontSize="8"
                  >
                    {value.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* Area fill */}
            <path d={areaPath} fill="url(#ndviGradient)" />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke={chartColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="4"
                  fill={chartColor}
                  stroke="white"
                  strokeWidth="1.5"
                />
                {/* X-axis labels (show every other year for 10 years) */}
                {(i % 2 === 0 || i === points.length - 1) && (
                  <text
                    x={p.x}
                    y={chartHeight - 5}
                    textAnchor="middle"
                    className="fill-muted-foreground"
                    fontSize="8"
                  >
                    {p.year}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      )}

      {/* Statistics Summary */}
      {data.statistics && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded bg-muted/30 text-center">
            <div className="text-xs font-semibold text-green-500">{data.statistics.max_ndvi.toFixed(3)}</div>
            <div className="text-[10px] text-muted-foreground">Peak ({data.statistics.best_year})</div>
          </div>
          <div className="p-2 rounded bg-muted/30 text-center">
            <div className="text-xs font-semibold">{data.statistics.avg_ndvi.toFixed(3)}</div>
            <div className="text-[10px] text-muted-foreground">Average</div>
          </div>
          <div className="p-2 rounded bg-muted/30 text-center">
            <div className="text-xs font-semibold text-red-500">{data.statistics.min_ndvi.toFixed(3)}</div>
            <div className="text-[10px] text-muted-foreground">Low ({data.statistics.worst_year})</div>
          </div>
        </div>
      )}

      {/* Growth Analysis */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 rounded bg-muted/30 text-center">
          <div className="flex items-center justify-center gap-1">
            {getTrendIcon(data.growth_analysis.trend)}
            <span className={cn("font-semibold", trendColor)}>{data.growth_analysis.trend}</span>
          </div>
          <div className="text-[10px] text-muted-foreground">10-Year Trend</div>
        </div>
        <div className="p-2 rounded bg-muted/30 text-center">
          <div className={cn("font-semibold", data.growth_analysis.annual_ndvi_change >= 0 ? "text-green-500" : "text-red-500")}>
            {data.growth_analysis.annual_ndvi_change >= 0 ? '+' : ''}{data.growth_analysis.annual_ndvi_change.toFixed(4)}
          </div>
          <div className="text-[10px] text-muted-foreground">Annual Change</div>
        </div>
      </div>

      {/* Total Change Summary */}
      {data.statistics && (
        <div className={cn(
          "p-3 rounded-lg border",
          data.statistics.total_change_percent >= 0 
            ? "bg-green-500/10 border-green-500/20" 
            : "bg-red-500/10 border-red-500/20"
        )}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">10-Year Change</span>
            <span className={cn(
              "text-sm font-bold",
              data.statistics.total_change_percent >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {data.statistics.total_change_percent >= 0 ? '+' : ''}{data.statistics.total_change_percent.toFixed(1)}%
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {data.statistics.total_change_percent >= 0 
              ? "Vegetation health has improved over the analysis period"
              : "Vegetation health has declined over the analysis period"}
          </div>
        </div>
      )}

      {/* Data Years Footer */}
      <div className="text-[10px] text-muted-foreground text-center">
        Analysis based on {data.years_analyzed} years of Sentinel-2 satellite imagery
      </div>
    </div>
  );
};

const SpeciesRecommendationResults = ({ data }: { data: SpeciesRecommendationResult }) => {
  return (
    <div className="space-y-3 pt-3 border-t border-border/50 animate-fade-in">
      <div className="flex items-center gap-2 text-sm font-semibold text-lime-500">
        <CheckCircle className="w-4 h-4" />
        <span>Species Recommendations</span>
      </div>

      {/* Environmental Profile - Improved layout */}
      <div className="p-3 rounded-lg bg-muted/30">
        <div className="text-xs font-semibold mb-3">Environmental Profile</div>
        <div className="space-y-2">
          {/* Rainfall */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex-shrink-0">Rainfall</span>
            <div className="text-right">
              <span className="font-medium">{data.environmental_profile.rainfall_mm.toFixed(0)} mm</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400">
                {data.environmental_profile.rainfall_category.split(' ')[0]}
              </span>
            </div>
          </div>
          {/* Temperature */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex-shrink-0">Temperature</span>
            <div className="text-right">
              <span className="font-medium">{data.environmental_profile.temperature_celsius.toFixed(1)}°C</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-600 dark:text-orange-400">
                {data.environmental_profile.temperature_category.split(' ')[0]}
              </span>
            </div>
          </div>
          {/* Slope */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex-shrink-0">Slope</span>
            <div className="text-right">
              <span className="font-medium">{data.environmental_profile.slope_degrees.toFixed(1)}°</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400">
                {data.environmental_profile.slope_category.split(' ')[0]}
              </span>
            </div>
          </div>
          {/* Moisture */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex-shrink-0">Moisture</span>
            <div className="text-right">
              <span className="font-medium">{data.environmental_profile.moisture_index.toFixed(2)}</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-600 dark:text-cyan-400">
                {data.environmental_profile.moisture_category}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations - Improved cards */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">Recommended Species ({data.recommendations.length})</div>
        {data.recommendations.map((rec, idx) => (
          <div key={idx} className="p-3 rounded-lg bg-lime-500/10 border border-lime-500/20">
            {/* Header row with species name and confidence */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="font-semibold text-sm leading-tight">{rec.species}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-lime-500/20 text-lime-600 dark:text-lime-400 flex-shrink-0 whitespace-nowrap">
                {(rec.confidence * 100).toFixed(0)}%
              </span>
            </div>
            {/* Reason - full width with proper wrapping */}
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{rec.reason}</p>
            {/* Growth info - inline badges */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-muted/50">
                <span className="text-muted-foreground mr-1">Growth:</span>
                <span className="font-medium capitalize">{rec.growth_rate}</span>
              </span>
              <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-muted/50">
                <span className="text-muted-foreground mr-1">Maturity:</span>
                <span className="font-medium">{rec.time_to_maturity}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="text-[10px] text-muted-foreground text-center italic p-2 bg-muted/20 rounded">
        {data.note}
      </div>
    </div>
  );
};

// ========================================
// HELPER COMPONENTS
// ========================================

const StatCard = ({ label, value }: { label: string; value: string }) => (
  <div className="p-3 rounded-lg bg-muted/30 border border-border">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-lg font-bold">{value}</div>
  </div>
);

const ProgressBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-foreground/80">{label}</span>
      <span className="text-muted-foreground">{value.toFixed(1)}%</span>
    </div>
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

export default ForestDeptPanel;
