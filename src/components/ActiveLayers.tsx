import { Layers, Eye, EyeOff, X, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

export const ActiveLayers = () => {
  const [layers, setLayers] = useState<Record<string, any>>({});

  useEffect(() => {
    const handler = (e: any) => {
      setLayers({ ...(e.detail || (window as any).GEO_LAYERS || {}) });
    };

    window.addEventListener('geo:layers-changed', handler as EventListener);
    // initialize
    setLayers((window as any).GEO_LAYERS || {});

    return () => {
      window.removeEventListener('geo:layers-changed', handler as EventListener);
    };
  }, []);

  const layerArray = Object.values(layers || {});

  const handleRemoveLayer = (layerId: string) => {
    window.dispatchEvent(new CustomEvent('geo:remove-layer', { 
      detail: { id: layerId } 
    }));
    // Also emit layer-removed event so sidebar cards can sync their state
    window.dispatchEvent(new CustomEvent('geo:layer-removed', { 
      detail: { id: layerId } 
    }));
  };

  const handleToggleVisibility = (layerId: string, currentVisible: boolean) => {
    window.dispatchEvent(new CustomEvent('geo:toggle-layer', { 
      detail: { id: layerId, visible: !currentVisible } 
    }));
  };

  const handleOpacityChange = (layerId: string, opacity: number[]) => {
    window.dispatchEvent(new CustomEvent('geo:update-opacity', { 
      detail: { id: layerId, opacity: opacity[0] / 100 } 
    }));
  };

  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-background/95 backdrop-blur-sm border border-border rounded-xl p-3 shadow-lg w-72">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold">Active Layers ({layerArray.length})</span>
      </div>
      
      {layerArray.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          <p>No layers loaded. Select datasets from the panel or use the AI chat to begin.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {layerArray.map((layer: any) => (
            <div key={layer.id} className="bg-muted/50 rounded-lg p-3 border border-border">
              {/* Layer Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{layer.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {layer.metadata?.description || layer.metadata?.source || layer.id}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveLayer(layer.id)}
                  className="h-6 w-6 p-0 ml-2 hover:bg-destructive/20 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleToggleVisibility(layer.id, layer.visible !== false)}
                  className="h-6 w-6 p-0"
                >
                  {layer.visible !== false ? (
                    <Eye className="w-3 h-3 text-primary" />
                  ) : (
                    <EyeOff className="w-3 h-3 text-muted-foreground" />
                  )}
                </Button>
                
                <div className="flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Opacity</span>
                    <span className="text-xs font-medium">
                      {Math.round((layer.opacity !== undefined ? layer.opacity : 0.8) * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[Math.round((layer.opacity !== undefined ? layer.opacity : 0.8) * 100)]}
                    onValueChange={(value) => handleOpacityChange(layer.id, value)}
                    max={100}
                    min={0}
                    step={1}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
