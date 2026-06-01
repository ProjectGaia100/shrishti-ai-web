import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export interface ChangeDetectionOverlayProps {
  beforeDate?: Date;
  afterDate?: Date;
  splitPercent: number;
  onBeforeDateChange: (date: Date | undefined) => void;
  onAfterDateChange: (date: Date | undefined) => void;
  onSplitChange: (percent: number) => void;
}

type CalendarSide = "before" | "after" | null;

export function ChangeDetectionOverlay({
  beforeDate,
  afterDate,
  splitPercent,
  onBeforeDateChange,
  onAfterDateChange,
  onSplitChange,
}: ChangeDetectionOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [calendarSide, setCalendarSide] = useState<CalendarSide>(null);

  const updateSplitFromPointer = useCallback(
    (clientX: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = (x / rect.width) * 100;
      onSplitChange(Math.min(85, Math.max(15, pct)));
    },
    [onSplitChange]
  );

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current) return;
      const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
      if (clientX != null) updateSplitFromPointer(clientX);
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [updateSplitFromPointer]);

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
    if (clientX != null) updateSplitFromPointer(clientX);
  };

  const renderPanelLabel = (side: "before" | "after", date?: Date) => {
    if (date) {
      return (
        <div className="text-center pointer-events-none select-none">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold mb-1">
            {side === "before" ? "Before" : "After"}
          </p>
          <p className="text-sm font-semibold text-white drop-shadow-md">{format(date, "PPP")}</p>
        </div>
      );
    }
    return (
      <p className="text-sm font-medium text-white/90 text-center drop-shadow-md pointer-events-none select-none px-4">
        Select date to compare
      </p>
    );
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-[1400] pointer-events-none"
      aria-label="Change detection comparison"
    >
      <div className="absolute inset-4 sm:inset-6 md:inset-10 pointer-events-auto">
        {/* Before panel */}
        <button
          type="button"
          className={cn(
            "absolute inset-y-0 left-0 border-2 border-dashed border-white/85 rounded-sm",
            "flex items-center justify-center cursor-pointer",
            "bg-black/15 hover:bg-black/25 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          )}
          style={{ width: `${splitPercent}%` }}
          onClick={() => setCalendarSide("before")}
        >
          {renderPanelLabel("before", beforeDate)}
        </button>

        {/* After panel */}
        <button
          type="button"
          className={cn(
            "absolute inset-y-0 right-0 border-2 border-dashed border-white/85 rounded-sm",
            "flex items-center justify-center cursor-pointer",
            "bg-black/15 hover:bg-black/25 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          )}
          style={{ width: `${100 - splitPercent}%` }}
          onClick={() => setCalendarSide("after")}
        >
          {renderPanelLabel("after", afterDate)}
        </button>

        {/* Center divider + drag handle */}
        <div
          className="absolute inset-y-0 w-0.5 bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.35)]"
          style={{ left: `${splitPercent}%`, transform: "translateX(-50%)" }}
        />
        <div
          role="slider"
          aria-label="Comparison divider"
          aria-valuemin={15}
          aria-valuemax={85}
          aria-valuenow={Math.round(splitPercent)}
          tabIndex={0}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -translate-x-1/2",
            "w-9 h-9 rounded-full bg-teal-600 border-2 border-white shadow-lg",
            "flex items-center justify-center cursor-ew-resize",
            "hover:bg-teal-500 active:scale-95 transition-transform"
          )}
          style={{ left: `${splitPercent}%` }}
          onMouseDown={startDrag}
          onTouchStart={startDrag}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") onSplitChange(Math.max(15, splitPercent - 2));
            if (e.key === "ArrowRight") onSplitChange(Math.min(85, splitPercent + 2));
          }}
        >
          <ChevronLeft className="w-3.5 h-3.5 text-white -mr-1" strokeWidth={3} />
          <ChevronRight className="w-3.5 h-3.5 text-white -ml-1" strokeWidth={3} />
        </div>

        {/* Calendar modal for selected side */}
        {calendarSide && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 rounded-sm backdrop-blur-[1px]"
            onClick={() => setCalendarSide(null)}
          >
            <div
              className="w-[min(100%,20rem)] bg-background border border-border rounded-xl shadow-2xl p-4 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 px-1">
                {calendarSide === "before" ? "Select before date" : "Select after date"}
              </p>
              <Calendar
                mode="single"
                numberOfMonths={1}
                selected={calendarSide === "before" ? beforeDate : afterDate}
                onSelect={(day) => {
                  if (calendarSide === "before") onBeforeDateChange(day);
                  else onAfterDateChange(day);
                  if (day) setCalendarSide(null);
                }}
                disabled={(day) => day > new Date()}
                initialFocus
                className="p-0"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
