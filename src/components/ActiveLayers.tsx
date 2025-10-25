import { Layers } from "lucide-react";

export const ActiveLayers = () => {
  return (
    <div className="absolute bottom-4 left-4 z-[1000] glass rounded-xl p-3 shadow-lg max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <Layers className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold">Active Layers</span>
      </div>
      <div className="text-xs text-muted-foreground">
        <p>No layers loaded. Select datasets from the panel to begin.</p>
      </div>
    </div>
  );
};
