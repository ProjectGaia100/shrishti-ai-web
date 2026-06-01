import { GitCompare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ChangeDetectionCardProps {
  isActive: boolean;
  onToggle: () => void;
}

export function ChangeDetectionCard({ isActive, onToggle }: ChangeDetectionCardProps) {
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
            Compare two dates side-by-side on the map with a draggable divider.
          </p>
        </div>
      </div>

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
          "Open Comparison"
        )}
      </Button>
    </div>
  );
}
