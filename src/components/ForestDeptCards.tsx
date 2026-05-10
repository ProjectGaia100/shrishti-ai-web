import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Wheat, Droplets, Flame, TreePine, TreeDeciduous, Clock, Sprout,
  Ruler, Route, Target,
  Eye, Loader2, ChevronDown, ChevronUp, MapPin, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ForestDeptFeature, FOREST_DEPT_CREDIT_COSTS } from "@/services/forestDepartment";
import { UrbanPlanningFeature, URBAN_PLANNING_CREDIT_COSTS } from "@/services/urbanPlanning";
import { fetchDataset } from "@/services/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ForestDeptCardsProps {
  activeFeature: ForestDeptFeature | null;
  onSelectFeature: (feature: ForestDeptFeature | null) => void;
  activeUrbanFeature?: UrbanPlanningFeature | null;
  onOpenUrbanFeature?: (feature: UrbanPlanningFeature | null) => void;
}

// Feature definitions (8 features total)
const FEATURES: Array<{
  id: ForestDeptFeature;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  type: 'global' | 'polygon';
  layerId?: string;
}> = [
  // === GLOBAL LAYERS (at the top) ===
  {
    id: 'fire_risk',
    title: 'Active Fires (FIRMS)',
    description: 'Real-time fire hotspots & thermal anomalies',
    icon: <Flame className="w-4 h-4" />,
    color: 'text-zinc-700 dark:text-zinc-300',
    bgColor: 'bg-zinc-100/70 dark:bg-zinc-800/70',
    borderColor: 'border-zinc-300/70 dark:border-zinc-700/70',
    type: 'global',
    layerId: 'active-fires'
  },
  {
    id: 'soil_moisture',
    title: 'Soil Moisture',
    description: 'Global moisture heatmap (NDMI)',
    icon: <Droplets className="w-4 h-4" />,
    color: 'text-zinc-700 dark:text-zinc-300',
    bgColor: 'bg-zinc-100/70 dark:bg-zinc-800/70',
    borderColor: 'border-zinc-300/70 dark:border-zinc-700/70',
    type: 'global',
    layerId: 'soil-moisture'
  },
  // === POLYGON-BASED FEATURES ===
  {
    id: 'crop_classification',
    title: 'Crop Classification',
    description: 'Classify crops (rice, wheat, etc.)',
    icon: <Wheat className="w-4 h-4" />,
    color: 'text-zinc-700 dark:text-zinc-300',
    bgColor: 'bg-zinc-100/70 dark:bg-zinc-800/70',
    borderColor: 'border-zinc-300/70 dark:border-zinc-700/70',
    type: 'polygon'
  },
  {
    id: 'plantation_suitability',
    title: 'Plantation Suitability',
    description: 'Best areas for tree plantation',
    icon: <TreePine className="w-4 h-4" />,
    color: 'text-zinc-700 dark:text-zinc-300',
    bgColor: 'bg-zinc-100/70 dark:bg-zinc-800/70',
    borderColor: 'border-zinc-300/70 dark:border-zinc-700/70',
    type: 'polygon'
  },
  {
    id: 'compensatory_plantation',
    title: 'Compensatory Plantation',
    description: 'Plan replacement planting areas',
    icon: <TreeDeciduous className="w-4 h-4" />,
    color: 'text-zinc-700 dark:text-zinc-300',
    bgColor: 'bg-zinc-100/70 dark:bg-zinc-800/70',
    borderColor: 'border-zinc-300/70 dark:border-zinc-700/70',
    type: 'polygon'
  },
  {
    id: 'tree_growth',
    title: 'Vegetation Trend',
    description: '10-year NDVI analysis with charts',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-zinc-700 dark:text-zinc-300',
    bgColor: 'bg-zinc-100/70 dark:bg-zinc-800/70',
    borderColor: 'border-zinc-300/70 dark:border-zinc-700/70',
    type: 'polygon'
  },
  {
    id: 'species_recommendation',
    title: 'Species Recommendation',
    description: 'Suggest suitable plant species',
    icon: <Sprout className="w-4 h-4" />,
    color: 'text-zinc-700 dark:text-zinc-300',
    bgColor: 'bg-zinc-100/70 dark:bg-zinc-800/70',
    borderColor: 'border-zinc-300/70 dark:border-zinc-700/70',
    type: 'polygon'
  }
];

const URBAN_TOOLS: Array<{
  id: UrbanPlanningFeature;
  title: string;
  description: string;
  icon: React.ReactNode;
  drawType: 'polygon' | 'polyline';
}> = [
  {
    id: 'plot_area',
    title: 'Plot Measurement',
    description: 'Calculate area of a drawn polygon',
    icon: <Ruler className="w-4 h-4" />,
    drawType: 'polygon',
  },
  {
    id: 'road_length',
    title: 'Road/Line Length',
    description: 'Measure length of roads or paths',
    icon: <Route className="w-4 h-4" />,
    drawType: 'polyline',
  },
  {
    id: 'suitability',
    title: 'Suitability Analysis',
    description: 'Score areas for building suitability',
    icon: <Target className="w-4 h-4" />,
    drawType: 'polygon',
  },
];

// Legends
const LEGENDS: Record<string, Array<{ color: string; label: string }>> = {
  'soil-moisture': [
    { color: '#8B4513', label: 'Very Dry (-0.5 to -0.2)' },
    { color: '#D2691E', label: 'Dry (-0.2 to 0.0)' },
    { color: '#FFD700', label: 'Moderate (0.0 to 0.2)' },
    { color: '#90EE90', label: 'Good Moisture (0.2 to 0.4)' },
    { color: '#006400', label: 'High Moisture (0.4+)' },
  ],
  'active-fires': [
    { color: '#FFFF00', label: 'Low (thermal anomaly)' },
    { color: '#FFA500', label: 'Moderate (fire likely)' },
    { color: '#FF4500', label: 'High (confirmed fire)' },
    { color: '#FF0000', label: 'Very High (intense)' },
    { color: '#8B0000', label: 'Extreme (major fire)' },
  ],
};

export const ForestDeptCards = ({
  activeFeature,
  onSelectFeature,
  activeUrbanFeature = null,
  onOpenUrbanFeature,
}: ForestDeptCardsProps) => {
  // State for global layers
  const [loadedLayers, setLoadedLayers] = useState<Record<string, boolean>>({});
  const [loadingLayers, setLoadingLayers] = useState<Record<string, boolean>>({});
  const [showLegend, setShowLegend] = useState<Record<string, boolean>>({});

  // Listen for layer removal from Active Layers panel
  useEffect(() => {
    const handleLayerRemoved = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { id } = customEvent.detail || {};
      if (id && (id === 'soil-moisture' || id === 'active-fires')) {
        setLoadedLayers(prev => ({ ...prev, [id]: false }));
      }
    };

    window.addEventListener('geo:layer-removed', handleLayerRemoved);
    return () => {
      window.removeEventListener('geo:layer-removed', handleLayerRemoved);
    };
  }, []);

  // Load global layer
  const handleLoadGlobalLayer = async (feature: typeof FEATURES[0]) => {
    if (!feature.layerId) return;
    
    setLoadingLayers(prev => ({ ...prev, [feature.layerId!]: true }));
    
    try {
      let tileUrl: string | null = null;
      
      if (feature.layerId === 'soil-moisture') {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/forest-dept/soil-moisture-tiles`);
        const data = await response.json();
        tileUrl = data?.tile_url;
      } else if (feature.layerId === 'active-fires') {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/forest-dept/active-fires-tiles`);
        const data = await response.json();
        tileUrl = data?.tile_url;
      }

      if (tileUrl) {
        window.dispatchEvent(new CustomEvent('geo:add-layer', {
          detail: {
            id: feature.layerId,
            name: feature.title,
            url: tileUrl,
            opacity: 0.7,
          }
        }));
        setLoadedLayers(prev => ({ ...prev, [feature.layerId!]: true }));
      }
    } catch (err) {
      console.error(`Failed to load ${feature.layerId} layer`, err);
    } finally {
      setLoadingLayers(prev => ({ ...prev, [feature.layerId!]: false }));
    }
  };

  // Unload global layer
  const handleUnloadGlobalLayer = (layerId: string) => {
    window.dispatchEvent(new CustomEvent('geo:remove-layer', { detail: { id: layerId } }));
    setLoadedLayers(prev => ({ ...prev, [layerId]: false }));
  };

  return (
    <div className="space-y-2 px-3">
      {FEATURES.map((feature) => {
        const isActive = activeFeature === feature.id;
        const creditCost = FOREST_DEPT_CREDIT_COSTS[feature.id];
        const isGlobal = feature.type === 'global';
        const layerId = feature.layerId;
        const isLoaded = layerId ? loadedLayers[layerId] : false;
        const isLoading = layerId ? loadingLayers[layerId] : false;
        const legendVisible = layerId ? showLegend[layerId] : false;
        const legend = layerId ? LEGENDS[layerId] : null;

        // Global layer card
        if (isGlobal && layerId) {
          return (
            <div
              key={feature.id}
              className={cn(
                "rounded-xl p-3 transition-all duration-200 border",
                isLoaded
                  ? `${feature.borderColor} ${feature.bgColor}`
                  : "border-border bg-background hover:bg-muted/50"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg shrink-0", `${feature.color} ${feature.bgColor}`)}>
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-semibold text-sm leading-tight">{feature.title}</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                            <HelpCircle className="w-3 h-3" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-[200px] text-[11px] leading-relaxed">
                          {feature.description}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-auto shrink-0">
                      Free
                    </span>
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 mt-0.5">Global Layer</p>
                </div>

                {!isLoaded ? (
                  <Button
                    onClick={() => handleLoadGlobalLayer(feature)}
                    disabled={isLoading}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider transition-all shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Load"
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnloadGlobalLayer(layerId)}
                    className="h-7 px-2 text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground shrink-0"
                  >
                    Unload
                  </Button>
                )}
              </div>

              {/* Legend Toggle */}
              {isLoaded && legend && (
                <div className="mt-2 pt-2 border-t border-border/20">
                    <button
                      onClick={() => setShowLegend(prev => ({ ...prev, [layerId]: !legendVisible }))}
                      className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
                    >
                      <span>Legend</span>
                      {legendVisible ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {legendVisible && (
                      <div className="space-y-1 pt-1 animate-fade-in">
                        {legend.map((item, idx) => (
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
                )}
            </div>
          );
        }

        // Polygon feature card
        return (
          <div
            key={feature.id}
            className={cn(
              "rounded-xl p-3 transition-all duration-200 border cursor-pointer",
              isActive
                ? `${feature.borderColor} ${feature.bgColor} ring-1 ring-zinc-500/20`
                : "border-border bg-background hover:bg-muted/50"
            )}
            onClick={() => onSelectFeature(isActive ? null : feature.id)}
          >
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg shrink-0", `${feature.color} ${feature.bgColor}`)}>
                {feature.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-semibold text-sm leading-tight truncate">{feature.title}</h4>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-muted-foreground/40 hover:text-muted-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
                          <HelpCircle className="w-3 h-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[200px] text-[11px] leading-relaxed">
                        {feature.description}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-auto shrink-0">
                    {creditCost} cr
                  </span>
                </div>
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 mt-0.5">Polygon Task</p>
              </div>
              
              <div className={cn(
                "h-7 px-3 flex items-center justify-center rounded-lg text-[9px] uppercase font-black tracking-widest transition-all shrink-0",
                isActive 
                  ? "bg-foreground text-background" 
                  : "bg-muted text-muted-foreground"
              )}>
                {isActive ? "Active" : "Select"}
              </div>
            </div>

            {isActive && (
              <div className="mt-3 pt-3 border-t border-border/50 animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 bg-zinc-500 rounded-full"></div>
                  <span className="text-xs font-medium text-foreground">
                    Draw Polygon Mode
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Draw a polygon on the map, then click Analyze in the panel.
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

      {/* Urban tools moved from Urban Planning section */}
      <div className="pt-1">
        <p className="px-1 text-[10px] uppercase font-black tracking-widest text-muted-foreground/70 mb-2">Planning Tools</p>
        <div className="space-y-2">
          {URBAN_TOOLS.map((tool) => {
            const isActive = activeUrbanFeature === tool.id;
            const creditCost = URBAN_PLANNING_CREDIT_COSTS[tool.id];

            return (
              <div
                key={tool.id}
                className={cn(
                  "rounded-xl p-3 transition-all duration-200 border cursor-pointer",
                  isActive
                    ? "border-zinc-500/50 bg-zinc-100/70 dark:bg-zinc-800/70 ring-1 ring-zinc-500/20"
                    : "border-border bg-background hover:bg-muted/50"
                )}
                onClick={() => onOpenUrbanFeature?.(isActive ? null : tool.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg shrink-0 text-zinc-700 dark:text-zinc-300 bg-zinc-100/70 dark:bg-zinc-800/70">
                    {tool.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-semibold text-sm leading-tight truncate">{tool.title}</h4>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="text-muted-foreground/40 hover:text-muted-foreground transition-colors" onClick={(e) => e.stopPropagation()}>
                              <HelpCircle className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-[200px] text-[11px] leading-relaxed">
                            {tool.description}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-auto shrink-0">{creditCost} cr</span>
                    </div>
                    <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 mt-0.5">{tool.drawType === 'polyline' ? 'Polyline Task' : 'Polygon Task'}</p>
                  </div>

                  <div className={cn(
                    "h-7 px-3 flex items-center justify-center rounded-lg text-[9px] uppercase font-black tracking-widest transition-all shrink-0",
                    isActive ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                  )}>
                    {isActive ? "Active" : "Select"}
                  </div>
                </div>

                {isActive && (
                  <div className="mt-3 pt-3 border-t border-border/50 animate-fade-in">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-zinc-500 rounded-full"></div>
                      <span className="text-xs font-medium text-foreground">Draw {tool.drawType === 'polyline' ? 'Line' : 'Polygon'} Mode</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-2">Draw on map, then click Analyze in panel.</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>Use panel to start drawing</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ForestDeptCards;
