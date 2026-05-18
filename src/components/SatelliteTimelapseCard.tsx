import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Satellite, Play, Loader2, ChevronDown, HelpCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchTimelapse, type TimelapseFrame } from "@/services/api";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type TimelapseDataset = "sentinel2" | "ndvi" | "temperature" | "nightlights" | "precipitation" | "vegetation_modis";

interface SatelliteTimelapseCardProps {
  onTimelapseLoaded: (frames: TimelapseFrame[], title: string, dataset: string) => void;
  onTimelapseClose: () => void;
  isActive: boolean;
}

const DATASETS: { id: TimelapseDataset; label: string; desc: string }[] = [
  { id: "temperature",      label: "Temperature",  desc: "MODIS LST" },
  { id: "nightlights",      label: "Night Lights",  desc: "VIIRS DNB" },
  { id: "precipitation",    label: "Rainfall",      desc: "CHIRPS Daily" },
  { id: "vegetation_modis", label: "Vegetation",    desc: "MODIS NDVI" },
  { id: "sentinel2",        label: "True Color",    desc: "Sentinel-2" },
  { id: "ndvi",             label: "NDVI (HD)",     desc: "Sentinel-2" },
];

const MONTHS = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

// Build a list of years from 2016 to this year
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 2015 }, (_, i) => 2016 + i);

// Defaults: today minus 5 months → today minus 1 month  (4 frames)
function defaultDates() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() - 1, 1);   // last month
  const start = new Date(end.getFullYear(), end.getMonth() - 3, 1); // 3 months before end
  return {
    startYear:  start.getFullYear(),
    startMonth: start.getMonth() + 1,   // 1-12
    endYear:    end.getFullYear(),
    endMonth:   end.getMonth() + 1,
  };
}

const fmt2 = (n: number) => String(n).padStart(2, '0');

export const SatelliteTimelapseCard = ({ onTimelapseLoaded, onTimelapseClose, isActive }: SatelliteTimelapseCardProps) => {
  const [dataset, setDataset] = useState<TimelapseDataset>("temperature");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaults = useMemo(() => defaultDates(), []);
  const [startYear,  setStartYear]  = useState(defaults.startYear);
  const [startMonth, setStartMonth] = useState(defaults.startMonth);
  const [endYear,    setEndYear]    = useState(defaults.endYear);
  const [endMonth,   setEndMonth]   = useState(defaults.endMonth);

  // Calculate frames count from the selected range
  const frameCount = useMemo(() => {
    const months = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    return Math.max(1, Math.min(months, 24));
  }, [startYear, startMonth, endYear, endMonth]);

  const isRangeValid = useMemo(() => {
    return startYear < endYear || (startYear === endYear && startMonth <= endMonth);
  }, [startYear, startMonth, endYear, endMonth]);

  const handleLoad = async () => {
    if (!isRangeValid) { setError('Start date must be before end date'); return; }
    setLoading(true);
    setError(null);
    try {
      const startYM = `${startYear}-${fmt2(startMonth)}`;
      const endYM   = `${endYear}-${fmt2(endMonth)}`;
      const data = await fetchTimelapse(dataset, frameCount, startYM, endYM);
      if (data.success && data.frames?.length > 0) {
        onTimelapseLoaded(data.frames, data.metadata.title, dataset);
      } else {
        setError(data.error || 'No frames returned');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load timelapse');
    } finally {
      setLoading(false);
    }
  };

  const selectCls = "text-xs rounded-md border border-border bg-background px-1.5 py-1 cursor-pointer focus:outline-none hover:border-primary/50 transition-colors";

  return (
    <div className={cn(
      "rounded-xl p-4 transition-all duration-200 border mx-3",
      isActive ? "border-zinc-400 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 shadow-sm" : "border-border bg-background hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 shrink-0",
          isActive ? "text-foreground bg-zinc-200 dark:bg-zinc-700 shadow-sm" : "text-muted-foreground bg-zinc-100 dark:bg-zinc-800"
        )}>
          <Satellite className="w-4.5 h-4.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-bold text-sm tracking-tight leading-tight truncate">Satellite Timelapse</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground/40 hover:text-muted-foreground transition-colors">
                    <HelpCircle className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[200px] text-[11px] leading-relaxed">
                  Animated imagery showing planetary changes over time using multi-spectral satellite data.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60 mt-0.5">Atmospheric Ops</p>
        </div>

        <Button
          onClick={isActive ? onTimelapseClose : handleLoad}
          disabled={loading || (!isActive && !isRangeValid)}
          size="sm"
          className={cn(
            "h-7 px-3 font-black rounded-lg text-[9px] uppercase tracking-widest transition-all shrink-0 shadow-sm",
            isActive
              ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-none"
              : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-sm"
          )}
          variant="default"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : isActive ? (
            <X className="w-3 h-3" />
          ) : (
            "Load"
          )}
        </Button>
      </div>

      {/* Dataset selector */}
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {DATASETS.map(ds => (
          <button
            key={ds.id}
            onClick={() => { if (!loading && !isActive) setDataset(ds.id); }}
            className={cn(
              "py-1.5 px-1.5 rounded-lg text-xs font-medium transition-all duration-200 border relative",
              dataset === ds.id
                ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950 shadow-sm"
                : "bg-muted/50 dark:bg-muted/30 border-border text-muted-foreground hover:bg-muted",
              (loading || isActive) && "opacity-60 pointer-events-none"
            )}
          >
            <div className="font-semibold truncate">{ds.label}</div>
            <div className="text-[10px] opacity-70 truncate">{ds.desc}</div>
            </button>
            ))}
            </div>
      {/* Date range picker */}
      <div className={cn("mb-3 rounded-lg border border-border p-2.5 space-y-2", (loading || isActive) && "opacity-60 pointer-events-none")}>
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Date Range</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground w-8">From</span>
          <select value={startMonth} onChange={e => setStartMonth(Number(e.target.value))} className={selectCls}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={startYear} onChange={e => setStartYear(Number(e.target.value))} className={selectCls}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground w-8">To</span>
          <select value={endMonth} onChange={e => setEndMonth(Number(e.target.value))} className={selectCls}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={endYear} onChange={e => setEndYear(Number(e.target.value))} className={selectCls}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <span className={cn("ml-auto text-[11px] font-medium", isRangeValid ? "text-foreground" : "text-muted-foreground")}>
            {isRangeValid ? `${frameCount} frame${frameCount !== 1 ? 's' : ''}` : 'Invalid'}
          </span>
        </div>
      </div>

      {/* Load / Unload button removed from here, moved to header */}

      {error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}

      {isActive && (
        <p className="text-[11px] text-muted-foreground mt-2 text-center animate-fade-in">
          Use the playback bar at the bottom of the map to control animation
        </p>
      )}
    </div>
  );
};
