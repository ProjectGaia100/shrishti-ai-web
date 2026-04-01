import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Droplets, Map, Trees, Mountain, Flame,
  School, AlertTriangle, Eye, Loader2, Layers, Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { goaService, GoaLayer, GoaLayerId } from "@/services/goa";

// Icon mapping for layers
const LAYER_ICONS: Record<string, React.ReactNode> = {
  'droplets': <Droplets className="w-4 h-4" />,
  'map': <Map className="w-4 h-4" />,
  'trees': <Trees className="w-4 h-4" />,
  'mountain': <Mountain className="w-4 h-4" />,
  'flame': <Flame className="w-4 h-4" />,
  'school': <School className="w-4 h-4" />,
  'alert-triangle': <AlertTriangle className="w-4 h-4" />,
};

interface LayerState {
  loaded: boolean;
  loading: boolean;
}

export const GoaCards = () => {
  const [layers, setLayers] = useState<GoaLayer[]>([]);
  const [layerStates, setLayerStates] = useState<Record<string, LayerState>>({});
  const [loadingLayers, setLoadingLayers] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available layers on mount
  useEffect(() => {
    const fetchLayers = async () => {
      try {
        const response = await goaService.getLayers();
        if (response.success && response.data) {
          setLayers(response.data);
          // Initialize layer states
          const initialStates: Record<string, LayerState> = {};
          response.data.forEach(layer => {
            initialStates[layer.id] = {
              loaded: false,
              loading: false
            };
          });
          setLayerStates(initialStates);
        } else {
          setError(response.error || 'Failed to load layers');
        }
      } catch (err) {
        setError('Failed to connect to Goa data service');
      } finally {
        setLoadingLayers(false);
      }
    };
    fetchLayers();
  }, []);

  // Listen for layer removal from Active Layers panel
  useEffect(() => {
    const handleLayerRemoved = (e: CustomEvent) => {
      const { id } = e.detail;
      // Check if it's a Goa layer
      if (id && id.startsWith('goa-')) {
        const layerId = id.replace('goa-', '');
        setLayerStates(prev => ({
          ...prev,
          [layerId]: { ...prev[layerId], loaded: false }
        }));
      }
    };

    window.addEventListener('geo:layer-removed' as any, handleLayerRemoved);
    return () => {
      window.removeEventListener('geo:layer-removed' as any, handleLayerRemoved);
    };
  }, []);

  // Load a layer onto the map
  const handleLoadLayer = async (layer: GoaLayer) => {
    setLayerStates(prev => ({
      ...prev,
      [layer.id]: { ...prev[layer.id], loading: true }
    }));

    try {
      const response = await goaService.getLayerData(layer.id as GoaLayerId);
      
      if (response.success && response.data) {
        // Dispatch event to add GeoJSON layer to map
        window.dispatchEvent(new CustomEvent('geo:add-geojson-layer', {
          detail: {
            id: `goa-${layer.id}`,
            name: layer.title,
            data: response.data,
            color: layer.color,
            opacity: 0.7,
            category: 'goa'
          }
        }));

        setLayerStates(prev => ({
          ...prev,
          [layer.id]: {
            loaded: true,
            loading: false
          }
        }));
      } else {
        throw new Error(response.error || 'Failed to load layer data');
      }
    } catch (err) {
      console.error(`Failed to load layer ${layer.id}:`, err);
      setLayerStates(prev => ({
        ...prev,
        [layer.id]: { ...prev[layer.id], loading: false }
      }));
    }
  };

  // Unload a layer from the map
  const handleUnloadLayer = (layer: GoaLayer) => {
    window.dispatchEvent(new CustomEvent('geo:remove-layer', {
      detail: { id: `goa-${layer.id}` }
    }));

    setLayerStates(prev => ({
      ...prev,
      [layer.id]: {
        ...prev[layer.id],
        loaded: false
      }
    }));
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loadingLayers) {
    return (
      <div className="flex items-center justify-center py-6 px-3">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mr-2" />
        <span className="text-xs text-muted-foreground">Loading layers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-3">
        <div className="rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 p-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-xs font-medium">Error</span>
          </div>
          <p className="text-[10px] text-red-500 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (layers.length === 0) {
    return (
      <div className="px-3 py-3">
        <div className="rounded-lg bg-muted/50 border border-border p-3 text-center">
          <Database className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">No layers available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 px-3">
      {/* Layers - flat list */}
      {layers.map(layer => {
        const state = layerStates[layer.id] || { loaded: false, loading: false };
        
        return (
          <div
            key={layer.id}
            className={cn(
              "rounded-xl p-3 transition-all duration-200 border",
              state.loaded
                ? "border-green-200 dark:border-green-500/30 bg-green-50/50 dark:bg-green-500/5"
                : "border-border bg-background hover:bg-muted/50"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className="p-2 rounded-lg flex-shrink-0"
                style={{ backgroundColor: `${layer.color}20`, color: layer.color }}
              >
                {LAYER_ICONS[layer.icon] || <Layers className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-sm font-medium truncate">{layer.title}</h5>
                  {!layer.available ? (
                    <span className="text-[10px] text-red-500 bg-red-100 dark:bg-red-500/20 px-1.5 py-0.5 rounded flex-shrink-0">
                      N/A
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                      {formatSize(layer.file_size)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {layer.description}
                </p>
              </div>
            </div>

            {/* Load/Unload Button */}
            <div className="mt-3">
              {!state.loaded ? (
                <Button
                  onClick={() => handleLoadLayer(layer)}
                  disabled={state.loading || !layer.available}
                  variant="outline"
                  className="w-full h-8 text-xs font-semibold transition-all duration-300 hover:scale-[1.02]"
                  style={{ 
                    backgroundColor: layer.available ? `${layer.color}20` : undefined,
                    borderColor: layer.available ? `${layer.color}80` : undefined,
                    color: layer.available ? layer.color : undefined,
                    boxShadow: layer.available ? `0 0 10px ${layer.color}25` : undefined,
                  }}
                  onMouseEnter={(e) => {
                    if (layer.available) {
                      e.currentTarget.style.boxShadow = `0 0 20px ${layer.color}40`;
                      e.currentTarget.style.borderColor = `${layer.color}`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (layer.available) {
                      e.currentTarget.style.boxShadow = `0 0 10px ${layer.color}25`;
                      e.currentTarget.style.borderColor = `${layer.color}80`;
                    }
                  }}
                >
                  {state.loading ? (
                    <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Loading...</>
                  ) : (
                    <><Eye className="w-3 h-3 mr-1.5" />Load Layer</>
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => handleUnloadLayer(layer)}
                  className="w-full h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                >
                  Unload Layer
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {/* Attribution */}
      <div className="text-[9px] text-muted-foreground/60 text-center pt-1">
        Data from AMCHE.IN & IndianOpenMaps
      </div>
    </div>
  );
};

export default GoaCards;
