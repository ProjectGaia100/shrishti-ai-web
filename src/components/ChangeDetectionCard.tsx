import { GitCompare, Layers, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChangeDetectionCardProps {
  isActive: boolean;
  awaitingAoi: boolean;
  hasAoi: boolean;
  selectedLayerName?: string | null;
  onToggle: () => void;
  onOpenLayerPicker?: () => void;
}

export function ChangeDetectionCard({
  isActive,
  awaitingAoi,
  hasAoi,
  selectedLayerName,
  onToggle,
  onOpenLayerPicker,
}: ChangeDetectionCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-all duration-200",
        isActive
          ? "border-zinc-400/40 bg-zinc-100/70 dark:bg-zinc-800/70"
          : "border-border bg-background hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "p-2 rounded-lg shrink-0",
            isActive ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-muted text-foreground"
          )}
        >
          <GitCompare className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm leading-tight">Change Detection</h4>
          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
            Draw an area, pick a layer, then compare two dates with the slider.
          </p>
        </div>
      </div>

      {awaitingAoi && (
        <div className="mt-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-2.5 py-2 flex items-start gap-2">
          <Square className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-800 dark:text-amber-200 leading-relaxed">
            Draw a rectangle on the map to define your comparison area.
          </p>
        </div>
      )}

      {isActive && hasAoi && !awaitingAoi && (
        <div className="mt-3 space-y-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full h-8 text-[10px] font-bold uppercase tracking-wider justify-start gap-2"
            onClick={onOpenLayerPicker}
          >
            <Layers className="w-3.5 h-3.5" />
            {selectedLayerName ? selectedLayerName : "Select layer from catalog"}
          </Button>
          {selectedLayerName ? (
            <p className="text-[10px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
              Tap each panel on the map to pick before/after dates, then drag the center slider.
            </p>
          ) : (
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Choose a layer before selecting comparison dates.
            </p>
          )}
        </div>
      )}

      <Button
        type="button"
        size="sm"
        variant={isActive ? "secondary" : "default"}
        className={cn(
          "w-full mt-3 h-8 text-[10px] font-bold uppercase tracking-wider",
          !isActive && "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        )}
        onClick={onToggle}
      >
        {isActive ? (
          <>
            <X className="w-3 h-3 mr-1.5" />
            Close Comparison
          </>
        ) : (
          "Start Comparison"
        )}
      </Button>
    </div>
  );
}
