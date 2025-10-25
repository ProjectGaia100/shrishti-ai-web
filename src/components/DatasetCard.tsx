import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Eye, EyeOff, ChevronDown, ChevronUp, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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

export const DatasetCard = ({ name, title, description, icon: Icon, theme, legend }: DatasetCardProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [opacity, setOpacity] = useState([70]);
  const [showLegend, setShowLegend] = useState(false);

  const themeColors: Record<string, string> = {
    vegetation: "from-dataset-vegetation/20 to-dataset-vegetation/5",
    terrain: "from-dataset-terrain/20 to-dataset-terrain/5",
    lights: "from-dataset-lights/20 to-dataset-lights/5",
    landcover: "from-dataset-landcover/20 to-dataset-landcover/5",
    temperature: "from-dataset-temperature/20 to-dataset-temperature/5",
  };

  const iconColors: Record<string, string> = {
    vegetation: "text-dataset-vegetation",
    terrain: "text-dataset-terrain",
    lights: "text-dataset-lights",
    landcover: "text-dataset-landcover",
    temperature: "text-dataset-temperature",
  };

  return (
    <div
      className={cn(
        "glass rounded-2xl p-4 transition-smooth hover-lift border border-border/50",
        "bg-gradient-to-br",
        themeColors[theme]
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={cn("p-2.5 rounded-xl glass-strong", iconColors[theme])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg leading-tight">{name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
        </div>
      </div>

      <p className="text-sm text-foreground/70 mb-3">{description}</p>

      <div className="space-y-2">
        <Button
          onClick={() => setIsLoaded(!isLoaded)}
          className={cn(
            "w-full transition-smooth font-semibold",
            isLoaded
              ? "bg-success/20 hover:bg-success/30 text-success border border-success/50"
              : "bg-primary/20 hover:bg-primary/30 text-primary border border-primary/50"
          )}
          variant="outline"
        >
          {isLoaded ? "✓ Loaded" : "Load Dataset"}
        </Button>

        {isLoaded && (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsVisible(!isVisible)}
                className="p-2 hover:bg-primary/10"
              >
                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">
                  Opacity: {opacity[0]}%
                </label>
                <Slider
                  value={opacity}
                  onValueChange={setOpacity}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLegend(!showLegend)}
              className="w-full flex items-center justify-between text-xs hover:bg-primary/10"
            >
              <span>Legend</span>
              {showLegend ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>

            {showLegend && (
              <div className="space-y-1.5 animate-fade-in glass-strong rounded-lg p-2">
                {legend.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-4 h-4 rounded border border-border/50"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-foreground/80">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
