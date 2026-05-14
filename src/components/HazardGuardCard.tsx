import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, MapPin, Target, Hexagon, Minus, Plus, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type HazardGuardMode = 'point' | 'region';

interface HazardGuardCardProps {
  onModeChange: (isActive: boolean, mode: HazardGuardMode, samplePoints: number) => void;
}

export const HazardGuardCard = ({ onModeChange }: HazardGuardCardProps) => {
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<HazardGuardMode>('point');
  const [samplePoints, setSamplePoints] = useState(5);

  useEffect(() => {
    onModeChange(isActive, mode, samplePoints);
  }, [isActive, mode, samplePoints, onModeChange]);

  // Listen for deactivation events (when panel is closed or other panels open)
  useEffect(() => {
    const handleDeactivate = () => {
      setIsActive(false);
    };
    
    window.addEventListener('hazardguard:deactivate', handleDeactivate);
    return () => {
      window.removeEventListener('hazardguard:deactivate', handleDeactivate);
    };
  }, []);

  const handleToggleMode = () => {
    setIsActive(!isActive);
  };

  const adjustSamplePoints = (delta: number) => {
    setSamplePoints(prev => Math.max(3, Math.min(25, prev + delta)));
  };

  return (
    <div
      className={cn(
        "rounded-xl p-3.5 transition-all duration-300 border mx-3 group",
        isActive 
          ? "border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 shadow-sm" 
          : "border-border bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300",
          isActive ? "text-foreground bg-zinc-200 dark:bg-zinc-700 shadow-sm" : "text-muted-foreground bg-zinc-100 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
        )}>
          <Shield className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-sm tracking-tight leading-none">HazardGuard</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px] text-[11px] leading-relaxed">
                  {mode === 'point' 
                    ? 'Pinpoint accurate risk assessment using ML analysis of terrain, climate, and historical trends.'
                    : 'Geospatial heatmap generation for regional disaster vulnerability assessment.'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 mt-1">Disaster Intelligence</p>
        </div>

        <Button
          onClick={handleToggleMode}
          size="sm"
          variant={isActive ? "outline" : "default"}
          className={cn(
            "h-7 px-3 font-black rounded-lg text-[9px] uppercase tracking-widest transition-all shrink-0",
            isActive
              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
              : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-sm"
          )}
        >
          {isActive ? (
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-foreground animate-pulse" />
              <span>Analyzing</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Target className="w-2.5 h-2.5" />
              <span>Predict</span>
            </div>
          )}
        </Button>
      </div>

      <div className="space-y-2">

        {isActive && (
          <div className="space-y-2.5 pt-1 animate-in slide-in-from-top-2 duration-300 max-h-[52vh] overflow-y-auto">
            <div className="rounded-xl p-1 bg-muted/30 border border-border/40">
              <div className="flex gap-1">
                <button
                  onClick={() => setMode('point')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                    mode === 'point'
                      ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-sm"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <MapPin className="w-3 h-3" />
                  Point
                </button>
                <button
                  onClick={() => setMode('region')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all",
                    mode === 'region'
                      ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-sm"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Hexagon className="w-3 h-3" />
                  Region
                </button>
              </div>
            </div>

            {/* Region-specific controls */}
            {mode === 'region' && (
              <div className="rounded-lg p-3 space-y-2.5 bg-muted/50 dark:bg-muted/30 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Sample Points</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => adjustSamplePoints(-1)}
                      className="w-6 h-6 rounded-md bg-muted hover:bg-muted/80 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold tabular-nums w-6 text-center">{samplePoints}</span>
                    <button
                      onClick={() => adjustSamplePoints(1)}
                      className="w-6 h-6 rounded-md bg-muted hover:bg-muted/80 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Points are evenly distributed within the drawn polygon. More points = more accurate heatmap but slower.
                </p>
              </div>
            )}

            <div className="rounded-lg p-3 text-center bg-muted/30 border border-border/60">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 bg-foreground rounded-full animate-pulse"></div>
                <span className="text-sm font-black uppercase tracking-tight text-foreground">
                  {mode === 'point' ? 'Point Prediction Active' : 'Region Heatmap Active'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {mode === 'point' 
                  ? 'Click map or enter coordinates in panel, then run analysis'
                  : 'Draw a polygon on the map to generate a risk heatmap'}
              </p>
            </div>

            <div className="text-[10px] text-muted-foreground space-y-2 border-t border-border/20 pt-3 mt-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-zinc-200 dark:bg-zinc-800 border border-border/50 rounded-sm"></div>
                <span className="font-bold uppercase tracking-widest">Normal - Standard conditions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-zinc-950 dark:bg-zinc-50 rounded-sm"></div>
                <span className="font-bold uppercase tracking-widest">Disaster - Critical Risk</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};