import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, X, Satellite } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelapseFrame } from "@/services/api";

const SPEED_OPTIONS = [
  { label: "0.5×", ms: 4000 },
  { label: "1×",   ms: 2000 },
  { label: "2×",   ms: 1000 },
  { label: "3×",   ms: 667  },
  { label: "4×",   ms: 500  },
];

interface TimelinePlayerProps {
  frames: TimelapseFrame[];
  title: string;
  onFrameChange: (frame: TimelapseFrame, index: number, opacity: number) => void;
  onClose: () => void;
  defaultOpacity?: number;   // 0–1, default 1
  defaultSpeedMs?: number;   // ms per frame, default 2000
}

export const TimelinePlayer = ({ frames, title, onFrameChange, onClose, defaultOpacity = 1, defaultSpeedMs = 1000 }: TimelinePlayerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [opacity, setOpacity] = useState(defaultOpacity);
  const [speedMs, setSpeedMs] = useState(defaultSpeedMs);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Notify parent whenever index or opacity changes
  useEffect(() => {
    if (frames[currentIndex]) {
      onFrameChange(frames[currentIndex], currentIndex, opacity);
    }
  }, [currentIndex, opacity, frames, onFrameChange]);

  // Auto-play loop — restarts whenever speed changes
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % frames.length);
      }, speedMs);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speedMs, frames.length]);

  const togglePlay = useCallback(() => setIsPlaying(p => !p), []);

  const stepBack = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(prev => (prev - 1 + frames.length) % frames.length);
  }, [frames.length]);

  const stepForward = useCallback(() => {
    setIsPlaying(false);
    setCurrentIndex(prev => (prev + 1) % frames.length);
  }, [frames.length]);

  const handleBarClick = useCallback((index: number) => {
    setIsPlaying(false);
    setCurrentIndex(index);
  }, []);

  if (frames.length === 0) return null;

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[1400] w-[min(640px,92vw)] pointer-events-auto">
      <div className="bg-background/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-border/40 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-zinc-100 dark:bg-zinc-800">
              <Satellite className="w-3 h-3 text-foreground/70" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Timeline bar */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-stretch gap-1 h-8 rounded-lg overflow-hidden">
            {frames.map((frame, i) => {
              const isCurrent = i === currentIndex;
              const isPast = i < currentIndex;
              return (
                <button
                  key={i}
                  onClick={() => handleBarClick(i)}
                  className={cn(
                    "flex-1 relative flex items-center justify-center text-[11px] font-medium transition-all duration-300 rounded-md",
                    isCurrent
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm scale-105 z-10"
                      : isPast
                        ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {frame.date_label}
                  {isCurrent && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-zinc-950 dark:bg-zinc-50 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 px-4 py-2">
          {/* Playback controls */}
          <button onClick={stepBack} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlay}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200",
              isPlaying
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 shadow-md"
                : "bg-muted text-foreground hover:bg-zinc-900 hover:text-white dark:hover:bg-zinc-100 dark:hover:text-zinc-950"
            )}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button onClick={stepForward} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <SkipForward className="w-4 h-4" />
          </button>

          <div className="text-xs text-muted-foreground">
            <span className="text-foreground font-medium">{frames[currentIndex]?.date_label}</span>
            <span className="mx-1.5">|</span>
            <span>{currentIndex + 1} / {frames.length}</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Speed selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground mr-0.5">Speed</span>
            {SPEED_OPTIONS.map(opt => (
              <button
                key={opt.ms}
                onClick={() => setSpeedMs(opt.ms)}
                className={cn(
                  "px-2 py-1 rounded text-[11px] font-medium transition-colors",
                  speedMs === opt.ms
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Opacity slider */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">Opacity</span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(opacity * 100)}
              onChange={e => setOpacity(Number(e.target.value) / 100)}
              className="w-20 h-1.5 accent-zinc-950 dark:accent-zinc-50 cursor-pointer"
            />
            <span className="text-[11px] text-foreground font-medium w-8 text-right">{Math.round(opacity * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
