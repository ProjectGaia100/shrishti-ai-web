import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CloudRain, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeatherWiseCardProps {
  onOpenPanel: () => void;
}

export const WeatherWiseCard = ({ onOpenPanel }: WeatherWiseCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "rounded-xl p-4 transition-all duration-200 border mx-3",
        "border-border bg-background hover:bg-muted/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          "p-2.5 rounded-lg transition-all duration-200",
          isHovered ? "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-500/20" : "text-purple-600 dark:text-purple-500 bg-purple-50 dark:bg-purple-500/10"
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
        onClick={onOpenPanel}
        className={cn(
          "w-full transition-smooth font-semibold flex items-center gap-2",
          "bg-purple-500/20 hover:bg-purple-500/30 text-purple-600 dark:text-purple-400 border border-purple-500/50"
        )}
        variant="outline"
      >
        <TrendingUp className="w-4 h-4" />
        Open Weather Forecast
      </Button>
    </div>
  );
};
