import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Brain, Sparkles, X, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GeoVisionCardProps {
  onTogglePanel: () => void;
  isActive?: boolean;
}

export const GeoVisionCard = ({ onTogglePanel, isActive = false }: GeoVisionCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "rounded-xl p-4 transition-all duration-200 border mx-3",
        isActive
          ? "border-zinc-400 dark:border-zinc-500 bg-zinc-100 dark:bg-zinc-800"
          : "border-border bg-background hover:bg-muted/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2.5 rounded-lg transition-all duration-200",
          isActive || isHovered 
            ? "text-foreground bg-zinc-200 dark:bg-zinc-700" 
            : "text-muted-foreground bg-zinc-50 dark:bg-zinc-900"
        )}>
          <Brain className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-[15px] tracking-tight leading-tight">TerraScan</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px] text-[11px] leading-relaxed">
                  Ensemble predictions fusing LSTM, Tree Models & CNN for localized environmental forecasting.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Fusion Intelligence</p>
        </div>

        <Button
          onClick={onTogglePanel}
          size="sm"
          className={cn(
            "h-7 px-3 font-black rounded-lg text-[9px] uppercase tracking-widest transition-all shrink-0",
            isActive
              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
              : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-sm"
          )}
        >
          {isActive ? (
            <div className="flex items-center gap-1.5">
              <X className="w-3 h-3" />
              <span>Close</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              <span>Open</span>
            </div>
          )}
        </Button>
      </div>
    </div>
  );
};
