import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, LucideIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchDataset } from "@/services/api";

interface Legend {
  color: string;
  label: string;
}

interface DatasetCardProps {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: LucideIcon;
  theme: "vegetation" | "terrain" | "lights" | "landcover" | "temperature";
  legend: Legend[];
}

export const DatasetCard = ({ id, name, title, description, icon: Icon, theme, legend }: DatasetCardProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  const iconColors: Record<string, string> = {
    vegetation: "text-dataset-vegetation",
    terrain: "text-dataset-terrain",
    lights: "text-dataset-lights",
    landcover: "text-dataset-landcover",
    temperature: "text-dataset-temperature",
  };

  // Custom button colors per theme (outline style like models) with glow effects
  const buttonColors: Record<string, string> = {
    vegetation: "bg-green-500/20 hover:bg-green-500/30 text-green-500 dark:text-green-400 border border-green-500/50 shadow-[0_0_10px_rgba(34,197,94,0.15)] hover:shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:border-green-400/70",
    terrain: "bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 dark:text-orange-400 border border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.15)] hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:border-orange-400/70",
    lights: "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 dark:text-yellow-400 border border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.15)] hover:shadow-[0_0_20px_rgba(234,179,8,0.3)] hover:border-yellow-400/70",
    landcover: "bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 dark:text-blue-400 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:border-blue-400/70",
    temperature: "bg-red-500/20 hover:bg-red-500/30 text-red-500 dark:text-red-400 border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.15)] hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:border-red-400/70",
  };

  // Listen for layer removal from Active Layers panel
  useEffect(() => {
    const handleLayerRemoved = (e: CustomEvent) => {
      if (e.detail?.id === id) {
        setIsLoaded(false);
      }
    };

    window.addEventListener('geo:layer-removed' as any, handleLayerRemoved);
    return () => {
      window.removeEventListener('geo:layer-removed' as any, handleLayerRemoved);
    };
  }, [id]);

  const handleLoad = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDataset(id);
      const tileUrl = data?.tile_url;

      if (tileUrl) {
        window.dispatchEvent(new CustomEvent('geo:add-layer', {
          detail: {
            id: id,
            name,
            url: tileUrl,
            metadata: data.metadata || data,
            opacity: 0.7,
          }
        }));
        setIsLoaded(true);
      } else {
        console.error('No tile_url returned from server for', name, data);
      }
    } catch (err) {
      console.error('Failed to load dataset', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnload = () => {
    window.dispatchEvent(new CustomEvent('geo:remove-layer', { detail: { id } }));
    setIsLoaded(false);
  };

  return (
    <div
      className={cn(
        "rounded-xl p-3 transition-all duration-200 border mx-3",
        isLoaded
          ? "border-green-200 dark:border-green-500/30 bg-green-50/50 dark:bg-green-500/5"
          : "border-border bg-background hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg bg-muted/50 dark:bg-muted/30 flex-shrink-0", iconColors[theme])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm leading-tight">{name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {!isLoaded ? (
          <Button
            onClick={handleLoad}
            disabled={isLoading}
            className={cn("w-full h-8 text-xs font-semibold transition-all duration-300", buttonColors[theme])}
          >
            {isLoading ? (
              <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Loading...</>
            ) : (
              "Load Layer"
            )}
          </Button>
        ) : (
          <Button
            onClick={handleUnload}
            variant="outline"
            className="w-full h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
          >
            Unload Layer
          </Button>
        )}

        {/* Legend Toggle */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
        >
          <span>Legend</span>
          {showLegend ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showLegend && (
          <div className="space-y-1 animate-fade-in rounded-lg p-2 bg-muted/50 dark:bg-muted/30 border border-border">
            {legend.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div
                  className="w-3 h-3 rounded border border-border/50 flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-foreground/80 text-[10px]">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
