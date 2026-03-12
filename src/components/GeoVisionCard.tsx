import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeoVisionCardProps {
  onOpenPanel: () => void;
}

export const GeoVisionCard = ({ onOpenPanel }: GeoVisionCardProps) => {
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
          isHovered ? "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20" : "text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10"
        )}>
          <Brain className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg leading-tight">GeoVision</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Fusion Ensemble Prediction</p>
        </div>
      </div>

      <p className="text-sm text-foreground/70 mb-3">
        Cross-stacked ensemble fusing LSTM, Tree Models &amp; CNN for disaster &amp; weather regime prediction.
      </p>

      <Button
        onClick={onOpenPanel}
        className={cn(
          "w-full transition-smooth font-semibold flex items-center gap-2",
          "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/50"
        )}
        variant="outline"
      >
        <Sparkles className="w-4 h-4" />
        Open Fusion Prediction
      </Button>
    </div>
  );
};
