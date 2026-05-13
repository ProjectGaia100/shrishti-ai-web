import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, LucideIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchDataset } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

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
  theme: "vegetation" | "terrain" | "lights" | "landcover" | "temperature" | "hydro" | "atmosphere" | "hazard";
  legend: Legend[];
}

export const DatasetCard = ({ id, name, title, description, icon: Icon, theme, legend }: DatasetCardProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const { toast } = useToast();

  const iconColors: Record<string, string> = {
    vegetation: "text-dataset-vegetation",
    terrain: "text-dataset-terrain",
    lights: "text-dataset-lights",
    landcover: "text-dataset-landcover",
    temperature: "text-dataset-temperature",
    hydro: "text-blue-500",
    atmosphere: "text-sky-400",
    hazard: "text-amber-500",
  };

  // Professional grayscale-focused theme (light/dark adaptive)
  const buttonColors: Record<string, string> = {
    vegetation: "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-foreground border border-border/40",
    terrain: "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-foreground border border-border/40",
    lights: "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-foreground border border-border/40",
    landcover: "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-foreground border border-border/40",
    temperature: "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-foreground border border-border/40",
    hydro: "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-foreground border border-border/40",
    atmosphere: "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-foreground border border-border/40",
    hazard: "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-foreground border border-border/40",
  };

  // Listen for layer removal from Active Layers panel
  useEffect(() => {
    const handleLayerRemoved = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.id === id) {
        setIsLoaded(false);
      }
    };

    window.addEventListener('geo:layer-removed', handleLayerRemoved);
    return () => {
      window.removeEventListener('geo:layer-removed', handleLayerRemoved);
    };
  }, [id]);

  const handleLoad = async () => {
    setIsLoading(true);
    try {
      const aoiBbox = (window as any).__GEO_AOI_ACTIVE ? ((window as any).__GEO_AOI_BBOX ?? undefined) : undefined;
      const data = await fetchDataset(id, aoiBbox ? { aoiBbox } : undefined);
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
        toast({
          title: "Layer active",
          description: `${name} has been added to the map.`,
        });
      } else {
        console.error('No tile_url returned from server for', name, data);
        toast({
          title: "Connection Issue",
          description: `Failed to fetch tiles for ${name}.`,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Failed to load dataset', err);
      toast({
        title: "Sync Error",
        description: `Could not connect to the geospatial data service.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnload = () => {
    window.dispatchEvent(new CustomEvent('geo:remove-layer', { detail: { id } }));
    setIsLoaded(false);
    toast({
      title: "Layer removed",
      description: `${name} has been detached.`,
    });
  };

  return (
    <div
      className={cn(
        "rounded-xl p-3.5 transition-all duration-300 border mx-3 group",
        isLoaded
          ? "border-primary/40 bg-primary/[0.03] shadow-inner"
          : "border-border bg-background hover:bg-muted/30"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300",
          isLoaded ? "bg-primary/10 text-primary shadow-sm" : "bg-primary/5 text-primary group-hover:bg-primary/10"
        )}>
          <Icon className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm tracking-tight leading-none">{name}</h3>
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 mt-1 truncate">Data Layer</p>
        </div>
      </div>

      <div className="mt-3.5 space-y-2">
        {!isLoaded ? (
          <Button
            onClick={handleLoad}
            disabled={isLoading}
            className={cn("w-full h-8 font-black rounded-xl text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-[0.98]", buttonColors[theme])}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Syncing</span>
              </div>
            ) : (
              "Visualize"
            )}
          </Button>
        ) : (
          <Button
            onClick={handleUnload}
            variant="outline"
            className="w-full h-8 font-black rounded-xl text-[10px] uppercase tracking-widest text-red-500 hover:text-red-600 hover:bg-red-50 border-red-500/20 hover:border-red-500/40 transition-all active:scale-[0.98]"
          >
            Deactivate
          </Button>
        )}

        {/* Legend Toggle */}
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="w-full flex items-center justify-between py-1 px-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-primary hover:bg-primary/5 transition-all"
        >
          <span>Context Legend</span>
          {showLegend ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
        </button>

        {showLegend && (
          <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300 rounded-xl p-2.5 bg-muted/40 border border-border/40">
            {legend.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div
                  className="w-2.5 h-2.5 rounded-full ring-2 ring-background border border-border/20 flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-foreground/80 text-[10px] font-bold leading-none">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
