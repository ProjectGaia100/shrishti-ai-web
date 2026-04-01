import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, MapPin, Target, Hexagon, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

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
        "rounded-xl p-4 transition-all duration-200 border mx-3",
        isActive 
          ? "border-blue-300 dark:border-blue-500/50 bg-blue-50 dark:bg-blue-500/10" 
          : "border-border bg-background hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          "p-2.5 rounded-lg transition-all duration-200",
          isActive ? "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20" : "text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-500/10"
        )}>
          <Shield className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-lg leading-tight">HazardGuard</h3>
          <p className="text-xs text-muted-foreground mt-0.5">AI Disaster Prediction</p>
        </div>
      </div>

      <p className="text-sm text-foreground/70 mb-3">
        {mode === 'point' 
          ? 'Click anywhere on the map to get real-time disaster risk predictions using advanced machine learning models.'
          : 'Draw a polygon on the map to generate a disaster risk heatmap using sampled predictions.'}
      </p>

      <div className="space-y-2">
        <Button
          onClick={handleToggleMode}
          className={cn(
            "w-full transition-all duration-300 font-semibold flex items-center gap-2 hover:scale-[1.02]",
            isActive
              ? "bg-success/20 hover:bg-success/30 text-success border border-success/50 shadow-[0_0_15px_rgba(34,197,94,0.2)] hover:shadow-[0_0_25px_rgba(34,197,94,0.35)]"
              : "bg-blue-500/20 hover:bg-blue-500/30 text-blue-500 dark:text-blue-400 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.15)] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:border-blue-400/70"
          )}
          variant="outline"
        >
          {isActive ? (
            <>
              <Target className="w-4 h-4" />
              ✓ Prediction Mode Active
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              Activate Prediction Mode
            </>
          )}
        </Button>

        {isActive && (
          <div className="space-y-3 animate-fade-in">
            {/* Mode Toggle: Point vs Region */}
            <div className="rounded-lg p-2 bg-muted/50 dark:bg-muted/30 border border-border">
              <div className="flex gap-1">
                <button
                  onClick={() => setMode('point')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all duration-200",
                    mode === 'point'
                      ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-500/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Point
                </button>
                <button
                  onClick={() => setMode('region')}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all duration-200",
                    mode === 'region'
                      ? "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 border border-purple-300 dark:border-purple-500/40"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Hexagon className="w-3.5 h-3.5" />
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

            <div className="rounded-lg p-3 text-center bg-muted/50 dark:bg-muted/30 border border-border">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {mode === 'point' ? 'Point Prediction Active' : 'Region Heatmap Active'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {mode === 'point' 
                  ? 'Click anywhere on the map to analyze disaster risk for that location'
                  : 'Draw a polygon on the map to generate a risk heatmap'}
              </p>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Low Risk - Normal conditions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>High Risk - Disaster likely</span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Prediction Features:</p>
              <ul className="space-y-0.5 text-[10px]">
                <li>• Weather & Climate Data</li>
                <li>• Soil & Elevation Analysis</li>
                <li>• Population Density</li>
                <li>• Historical Patterns</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};