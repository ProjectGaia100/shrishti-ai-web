import { Satellite } from "lucide-react";
import { cn } from "@/lib/utils";

interface InfoOverlayProps {
  isVisible?: boolean;
}

export const InfoOverlay = ({ isVisible = true }: InfoOverlayProps) => {
  if (!isVisible) return null;
  
  return (
    <div className="absolute top-16 right-4 z-[1000] bg-background/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-lg max-w-xs">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Satellite className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-lg">GeoVision</h3>
          <p className="text-xs text-muted-foreground">Real-time Earth Observation</p>
        </div>
      </div>
      <div className="text-xs text-foreground/70 space-y-1">
        <p>• Interactive geospatial visualization</p>
        <p>• Multi-layer data analysis</p>
        <p>• Powered by Earth Engine</p>
      </div>
    </div>
  );
};
