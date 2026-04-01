import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Ruler, Route, Building2, Target,
  MapPin, Eye, Loader2, ChevronDown, ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UrbanPlanningFeature, URBAN_PLANNING_CREDIT_COSTS } from "@/services/urbanPlanning";
import { fetchDataset } from "@/services/api";

interface UrbanPlanningCardsProps {
  activeFeature: UrbanPlanningFeature | null;
  onSelectFeature: (feature: UrbanPlanningFeature | null) => void;
}

// Feature definitions (4 features total)
const FEATURES: Array<{
  id: UrbanPlanningFeature;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  drawType: 'polygon' | 'polyline' | 'global';
}> = [
  // === GLOBAL LAYER (at the top) ===
  {
    id: 'built_up',
    title: 'NDBI Analysis',
    description: 'Global heatmap showing built-up areas',
    icon: <Building2 className="w-4 h-4" />,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-500/10',
    borderColor: 'border-gray-200 dark:border-gray-500/30',
    drawType: 'global'
  },
  // === POLYGON/POLYLINE-BASED FEATURES ===
  {
    id: 'plot_area',
    title: 'Plot Measurement',
    description: 'Calculate area of a drawn polygon',
    icon: <Ruler className="w-4 h-4" />,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    borderColor: 'border-blue-200 dark:border-blue-500/30',
    drawType: 'polygon'
  },
  {
    id: 'road_length',
    title: 'Road/Line Length',
    description: 'Measure length of roads or paths',
    icon: <Route className="w-4 h-4" />,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-500/10',
    borderColor: 'border-orange-200 dark:border-orange-500/30',
    drawType: 'polyline'
  },
  {
    id: 'suitability',
    title: 'Suitability Analysis',
    description: 'Score areas for building suitability',
    icon: <Target className="w-4 h-4" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
    borderColor: 'border-emerald-200 dark:border-emerald-500/30',
    drawType: 'polygon'
  }
];

// NDBI Legend
const NDBI_LEGEND = [
  { color: '#0000FF', label: 'Water bodies' },
  { color: '#00FFFF', label: 'Low reflectance' },
  { color: '#00FF00', label: 'Vegetation' },
  { color: '#FFFF00', label: 'Mixed/Bare' },
  { color: '#FFA500', label: 'Built-up' },
  { color: '#FF0000', label: 'Dense built-up' },
];

export const UrbanPlanningCards = ({ activeFeature, onSelectFeature }: UrbanPlanningCardsProps) => {
  const [ndbiLoaded, setNdbiLoaded] = useState(false);
  const [ndbiLoading, setNdbiLoading] = useState(false);
  const [showNdbiLegend, setShowNdbiLegend] = useState(false);

  // Listen for layer removal from Active Layers panel
  useEffect(() => {
    const handleLayerRemoved = (e: CustomEvent) => {
      if (e.detail?.id === 'ndbi') {
        setNdbiLoaded(false);
      }
    };

    window.addEventListener('geo:layer-removed' as any, handleLayerRemoved);
    return () => {
      window.removeEventListener('geo:layer-removed' as any, handleLayerRemoved);
    };
  }, []);

  const handleLoadNdbi = async () => {
    setNdbiLoading(true);
    try {
      const data = await fetchDataset('ndbi');
      const tileUrl = data?.tile_url;

      if (tileUrl) {
        window.dispatchEvent(new CustomEvent('geo:add-layer', {
          detail: {
            id: 'ndbi',
            name: 'NDBI Analysis',
            url: tileUrl,
            metadata: data.metadata || data,
            opacity: 0.7,
          }
        }));
        setNdbiLoaded(true);
      }
    } catch (err) {
      console.error('Failed to load NDBI layer', err);
    } finally {
      setNdbiLoading(false);
    }
  };

  const handleUnloadNdbi = () => {
    window.dispatchEvent(new CustomEvent('geo:remove-layer', { detail: { id: 'ndbi' } }));
    setNdbiLoaded(false);
  };

  return (
    <div className="space-y-2 px-3">
      {FEATURES.map((feature) => {
        const isActive = activeFeature === feature.id;
        const creditCost = URBAN_PLANNING_CREDIT_COSTS[feature.id];
        
        // NDBI global layer
        if (feature.id === 'built_up') {
          return (
            <div
              key={feature.id}
              className={cn(
                "rounded-xl p-3 transition-all duration-200 border",
                ndbiLoaded
                  ? `${feature.borderColor} ${feature.bgColor}`
                  : "border-border bg-background hover:bg-muted/50"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg", `${feature.color} ${feature.bgColor}`)}>
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm leading-tight">{feature.title}</h4>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      Global
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{feature.description}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {!ndbiLoaded ? (
                  <Button
                    onClick={handleLoadNdbi}
                    disabled={ndbiLoading}
                    variant="outline"
                    className="w-full h-8 text-xs font-semibold transition-all duration-300 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 dark:text-gray-300 border border-gray-500/50 shadow-[0_0_10px_rgba(156,163,175,0.15)] hover:shadow-[0_0_20px_rgba(156,163,175,0.3)] hover:border-gray-400/70 hover:scale-[1.02]"
                  >
                    {ndbiLoading ? (
                      <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Loading...</>
                    ) : (
                      <><Eye className="w-3 h-3 mr-1.5" />Load Layer</>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleUnloadNdbi}
                    className="w-full h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    Unload Layer
                  </Button>
                )}

                {/* Legend Toggle */}
                <button
                  onClick={() => setShowNdbiLegend(!showNdbiLegend)}
                  className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
                >
                  <span>Legend</span>
                  {showNdbiLegend ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showNdbiLegend && (
                  <div className="space-y-1 pt-1 animate-fade-in">
                    {NDBI_LEGEND.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[10px] text-muted-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        }

        // Polygon/Polyline features
        return (
          <div
            key={feature.id}
            className={cn(
              "rounded-xl p-3 transition-all duration-200 border cursor-pointer",
              isActive
                ? `${feature.borderColor} ${feature.bgColor}`
                : "border-border bg-background hover:bg-muted/50"
            )}
            onClick={() => onSelectFeature(isActive ? null : feature.id)}
          >
            <div className="flex items-start gap-3">
              <div className={cn("p-2 rounded-lg", `${feature.color} ${feature.bgColor}`)}>
                {feature.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm leading-tight">{feature.title}</h4>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {creditCost} cr
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{feature.description}</p>
              </div>
            </div>

            {isActive && (
              <div className="mt-3 pt-3 border-t border-border/50 animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                    {feature.drawType === 'polygon' ? 'Draw Polygon Mode' : 'Draw Line Mode'}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">
                  {feature.drawType === 'polygon'
                    ? 'Draw a polygon on the map, then click Analyze.'
                    : 'Draw a line on the map, then click Analyze.'}
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>Click the panel to draw and analyze</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default UrbanPlanningCards;
