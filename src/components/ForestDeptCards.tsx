import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Leaf, Wheat, Droplets, Flame, TreePine, TreeDeciduous, Clock, Sprout,
  Eye, Loader2, ChevronDown, ChevronUp, MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ForestDeptFeature, FOREST_DEPT_CREDIT_COSTS } from "@/services/forestDepartment";
import { fetchDataset } from "@/services/api";

interface ForestDeptCardsProps {
  activeFeature: ForestDeptFeature | null;
  onSelectFeature: (feature: ForestDeptFeature | null) => void;
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
    id: 'ndvi',
    title: 'NDVI Analysis',
    description: 'Global vegetation health heatmap',
    icon: <Leaf className="w-4 h-4" />,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-500/10',
    borderColor: 'border-green-200 dark:border-green-500/30',
    type: 'global',
    layerId: 'ndvi'
  },
  {
    id: 'fire_risk',
    title: 'Active Fires (FIRMS)',
    description: 'Real-time fire hotspots & thermal anomalies',
    icon: <Flame className="w-4 h-4" />,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-500/10',
    borderColor: 'border-red-200 dark:border-red-500/30',
    type: 'global',
    layerId: 'active-fires'
  },
  {
    id: 'soil_moisture',
    title: 'Soil Moisture',
    description: 'Global moisture heatmap (NDMI)',
    icon: <Droplets className="w-4 h-4" />,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    borderColor: 'border-blue-200 dark:border-blue-500/30',
    type: 'global',
    layerId: 'soil-moisture'
  },
  // === POLYGON-BASED FEATURES ===
  {
    id: 'crop_classification',
    title: 'Crop Classification',
    description: 'Classify crops (rice, wheat, etc.)',
    icon: <Wheat className="w-4 h-4" />,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-500/10',
    borderColor: 'border-amber-200 dark:border-amber-500/30',
    type: 'polygon'
  },
  {
    id: 'plantation_suitability',
    title: 'Plantation Suitability',
    description: 'Best areas for tree plantation',
    icon: <TreePine className="w-4 h-4" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
    borderColor: 'border-emerald-200 dark:border-emerald-500/30',
    type: 'polygon'
  },
  {
    id: 'compensatory_plantation',
    title: 'Compensatory Plantation',
    description: 'Plan replacement planting areas',
    icon: <TreeDeciduous className="w-4 h-4" />,
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-500/10',
    borderColor: 'border-teal-200 dark:border-teal-500/30',
    type: 'polygon'
  },
  {
    id: 'tree_growth',
    title: 'Vegetation Trend',
    description: '10-year NDVI analysis with charts',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-500/10',
    borderColor: 'border-purple-200 dark:border-purple-500/30',
    type: 'polygon'
  },
  {
    id: 'species_recommendation',
    title: 'Species Recommendation',
    description: 'Suggest suitable plant species',
    icon: <Sprout className="w-4 h-4" />,
    color: 'text-lime-600 dark:text-lime-400',
    bgColor: 'bg-lime-50 dark:bg-lime-500/10',
    borderColor: 'border-lime-200 dark:border-lime-500/30',
    type: 'polygon'
  }
];

// Legends
const LEGENDS: Record<string, Array<{ color: string; label: string }>> = {
  ndvi: [
    { color: '#A52A2A', label: 'No vegetation (0.0-0.3)' },
    { color: '#FFFF00', label: 'Sparse vegetation (0.3-0.6)' },
    { color: '#008000', label: 'Healthy vegetation (0.6-1.0)' },
  ],
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

export const ForestDeptCards = ({ activeFeature, onSelectFeature }: ForestDeptCardsProps) => {
  // State for global layers
  const [loadedLayers, setLoadedLayers] = useState<Record<string, boolean>>({});
  const [loadingLayers, setLoadingLayers] = useState<Record<string, boolean>>({});
  const [showLegend, setShowLegend] = useState<Record<string, boolean>>({});

  // Listen for layer removal from Active Layers panel
  useEffect(() => {
    const handleLayerRemoved = (e: CustomEvent) => {
      const { id } = e.detail;
      if (id && (id === 'ndvi' || id === 'soil-moisture' || id === 'active-fires')) {
        setLoadedLayers(prev => ({ ...prev, [id]: false }));
      }
    };

    window.addEventListener('geo:layer-removed' as any, handleLayerRemoved);
    return () => {
      window.removeEventListener('geo:layer-removed' as any, handleLayerRemoved);
    };
  }, []);

  // Load global layer
  const handleLoadGlobalLayer = async (feature: typeof FEATURES[0]) => {
    if (!feature.layerId) return;
    
    setLoadingLayers(prev => ({ ...prev, [feature.layerId!]: true }));
    
    try {
      let tileUrl: string | null = null;
      
      if (feature.layerId === 'ndvi') {
        const data = await fetchDataset('ndvi');
        tileUrl = data?.tile_url;
      } else if (feature.layerId === 'soil-moisture') {
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
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg", `${feature.color} ${feature.bgColor}`)}>
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm leading-tight">{feature.title}</h4>
                    <span className="text-[10px] text-green-600 bg-green-100 dark:bg-green-500/20 px-1.5 py-0.5 rounded">
                      Free
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{feature.description}</p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {!isLoaded ? (
                  <Button
                    onClick={() => handleLoadGlobalLayer(feature)}
                    disabled={isLoading}
                    variant="outline"
                    className={cn("w-full h-8 text-xs font-semibold transition-all duration-300 hover:scale-[1.02]", {
                      'bg-green-500/20 hover:bg-green-500/30 text-green-500 dark:text-green-400 border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.15)] hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:border-green-400/70': feature.id === 'ndvi',
                      'bg-red-500/20 hover:bg-red-500/30 text-red-500 dark:text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.15)] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:border-red-400/70': feature.id === 'fire_risk',
                      'bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 dark:text-blue-400 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:border-blue-400/70': feature.id === 'soil_moisture',
                    })}
                  >
                    {isLoading ? (
                      <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Loading...</>
                    ) : (
                      <><Eye className="w-3 h-3 mr-1.5" />Load Layer</>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => handleUnloadGlobalLayer(layerId)}
                    className="w-full h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    Unload Layer
                  </Button>
                )}

                {/* Legend Toggle */}
                {legend && (
                  <>
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
                  </>
                )}
              </div>
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
    </div>
  );
};

export default ForestDeptCards;
