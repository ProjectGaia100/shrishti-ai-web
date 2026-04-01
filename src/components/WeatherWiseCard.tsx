import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudRain, TrendingUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeatherWiseCardProps {
  onTogglePanel: () => void;
  isActive?: boolean;
}

export const WeatherWiseCard = ({ onTogglePanel, isActive = false }: WeatherWiseCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "rounded-xl p-4 transition-all duration-200 border mx-3",
        isActive
          ? "border-purple-300 dark:border-purple-500/50 bg-purple-50 dark:bg-purple-500/10"
          : "border-border bg-background hover:bg-muted/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          "p-2.5 rounded-lg transition-all duration-200",
          isActive || isHovered ? "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20" : "text-purple-600 dark:text-purple-500 bg-purple-50 dark:bg-purple-500/10"
        )}>
          <CloudRain className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg leading-tight">WeatherWise</h3>
          <p className="text-xs text-muted-foreground mt-0.5">LSTM Weather Forecasting</p>
        </div>
      </div>

      <p className="text-sm text-foreground/70 mb-3">
        Predict weather trends for the next 60 days using advanced LSTM models. Analyze temperature, precipitation, and more.
      </p>

      <Button
        onClick={onTogglePanel}
        className={cn(
          "w-full transition-all duration-300 font-semibold flex items-center gap-2 hover:scale-[1.02]",
          isActive
            ? "bg-purple-500/30 hover:bg-purple-500/40 text-purple-500 dark:text-purple-300 border border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.25)] hover:shadow-[0_0_20px_rgba(168,85,247,0.35)]"
            : "bg-purple-500/20 hover:bg-purple-500/30 text-purple-500 dark:text-purple-400 border border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.15)] hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:border-purple-400/70"
        )}
        variant="outline"
      >
        {isActive ? (
          <>
            <X className="w-4 h-4" />
            Close Weather Forecast
          </>
        ) : (
          <>
            <TrendingUp className="w-4 h-4" />
            Open Weather Forecast
          </>
        )}
      </Button>
    </div>
  );
};
