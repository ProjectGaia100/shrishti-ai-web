import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Ruler, Route, Building2, Target,
  MapPin, Eye, Loader2, ChevronDown, ChevronUp, HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UrbanPlanningFeature, URBAN_PLANNING_CREDIT_COSTS } from "@/services/urbanPlanning";
import { fetchDataset } from "@/services/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    color: 'text-zinc-700 dark:text-zinc-300',
    bgColor: 'bg-zinc-100/70 dark:bg-zinc-800/70',
    borderColor: 'border-zinc-300/70 dark:border-zinc-700/70',
    drawType: 'global'
  },
  // === POLYGON/POLYLINE-BASED FEATURES ===
  {
    id: 'plot_area',
    title: 'Plot Measurement',
    description: 'Calculate area of a drawn polygon',
    icon: <Ruler className="w-4 h-4" />,
    color: 'text-zinc-700 dark:text-zinc-300',
    bgColor: 'bg-zinc-100/70 dark:bg-zinc-800/70',
    borderColor: 'border-zinc-300/70 dark:border-zinc-700/70',
    drawType: 'polygon'
  },
  {
    id: 'road_length',
    title: 'Road/Line Length',
    description: 'Measure length of roads or paths',
    icon: <Route className="w-4 h-4" />,
    color: 'text-zinc-700 dark:text-zinc-300',
    bgColor: 'bg-zinc-100/70 dark:bg-zinc-800/70',
    borderColor: 'border-zinc-300/70 dark:border-zinc-700/70',
    drawType: 'polyline'
  },
  {
    id: 'suitability',
    title: 'Suitability Analysis',
    description: 'Score areas for building suitability',
    icon: <Target className="w-4 h-4" />,
    color: 'text-zinc-700 dark:text-zinc-300',
    bgColor: 'bg-zinc-100/70 dark:bg-zinc-800/70',
    borderColor: 'border-zinc-300/70 dark:border-zinc-700/70',
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
    const handleLayerRemoved = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.id === 'ndbi') {
        setNdbiLoaded(false);
      }
    };

    window.addEventListener('geo:layer-removed', handleLayerRemoved);
    return () => {
      window.removeEventListener('geo:layer-removed', handleLayerRemoved);
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
                      Global
                    </span>
                  </div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 mt-0.5">Built-up Index</p>
                </div>

                {!ndbiLoaded ? (
                  <Button
                    onClick={handleLoadNdbi}
                    disabled={ndbiLoading}
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[10px] font-bold uppercase tracking-wider transition-all shrink-0"
                  >
                    {ndbiLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Load"
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnloadNdbi}
                    className="h-7 px-2 text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground shrink-0"
                  >
                    Unload
                  </Button>
                )}
              </div>

              {ndbiLoaded && (
                <div className="mt-2 pt-2 border-t border-border/20">
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
            )}
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
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 mt-0.5">Measurement Tool</p>
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
