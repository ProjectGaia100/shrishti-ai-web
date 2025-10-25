import { Satellite } from "lucide-react";

export const InfoOverlay = () => {
  return (
    <div className="absolute top-4 right-4 z-[1000] glass-strong rounded-xl p-4 shadow-glow max-w-xs">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-gradient-blue-purple rounded-lg">
          <Satellite className="w-5 h-5 text-primary-glow" />
        </div>
        <div>
          <h3 className="font-bold text-lg">SatView</h3>
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
