import { useEffect, useMemo, useState } from "react";
import { Search, X, Check, Info, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { GLOBAL_DATASETS } from "@/services/datasetService";
import { isChangeDetectionDataset } from "@/lib/changeDetection";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface DatasetExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLayerIds?: string[];
  sidebarLayerIds?: string[];
  onSyncSidebarSelection?: (selectedIds: string[]) => void;
  mode?: "sidebar" | "changeDetection";
  changeDetectionDatasetId?: string | null;
  onSelectChangeDetectionLayer?: (id: string, name: string) => void;
}

export const DatasetExplorerModal = ({
  isOpen,
  onClose,
  activeLayerIds = [],
  sidebarLayerIds = [],
  onSyncSidebarSelection,
  mode = "sidebar",
  changeDetectionDatasetId = null,
  onSelectChangeDetectionLayer,
}: DatasetExplorerModalProps) => {
  const isChangeDetectionMode = mode === "changeDetection";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [changeDetectionPick, setChangeDetectionPick] = useState<string | null>(changeDetectionDatasetId);

  const activeLayerSet = useMemo(() => new Set(activeLayerIds), [activeLayerIds]);
  const sidebarLayerSet = useMemo(() => new Set(sidebarLayerIds), [sidebarLayerIds]);

  useEffect(() => {
    if (!isOpen) return;
    if (isChangeDetectionMode) {
      setChangeDetectionPick(changeDetectionDatasetId);
      return;
    }
    setSelectedIds([...new Set(sidebarLayerIds)]);
  }, [isOpen, sidebarLayerIds, isChangeDetectionMode, changeDetectionDatasetId]);

  const hasSelectionChanges = useMemo(() => {
    if (selectedIds.length !== sidebarLayerSet.size) return true;
    return selectedIds.some((id) => !sidebarLayerSet.has(id));
  }, [selectedIds, sidebarLayerSet]);

  const filteredDatasets = useMemo(() => {
    return GLOBAL_DATASETS.filter(ds => {
      if (isChangeDetectionMode && !isChangeDetectionDataset(ds.id)) return false;
      return (
        ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ds.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ds.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [searchQuery, isChangeDetectionMode]);

  const toggleSelection = (id: string) => {
    if (isChangeDetectionMode) {
      setChangeDetectionPick((prev) => (prev === id ? null : id));
      return;
    }
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleAddToProject = () => {
    if (isChangeDetectionMode) {
      if (!changeDetectionPick) return;
      const dataset = GLOBAL_DATASETS.find((item) => item.id === changeDetectionPick);
      onSelectChangeDetectionLayer?.(changeDetectionPick, dataset?.name ?? changeDetectionPick);
      onClose();
      return;
    }
    onSyncSidebarSelection?.(selectedIds);
    onClose();
  };

  const footerSelectionCount = isChangeDetectionMode ? (changeDetectionPick ? 1 : 0) : selectedIds.length;
  const footerHasChanges = isChangeDetectionMode
    ? Boolean(changeDetectionPick) && changeDetectionPick !== changeDetectionDatasetId
    : hasSelectionChanges;

  const handleCatalogInfo = (datasetId: string, datasetName: string) => {
    const query = encodeURIComponent(`${datasetName} ${datasetId} dataset catalog`);
    window.open(`https://www.google.com/search?q=${query}`, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center pointer-events-none p-4 md:p-8">
          {/* Scoped Backdrop - Only dims the map area */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl h-full max-h-[85vh] bg-background/95 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 shadow-2xl rounded-[2rem] overflow-hidden flex flex-col pointer-events-auto"
          >
            {/* Header */}
            <div className="p-6 border-b border-border/40 relative">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="text-2xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
                    {isChangeDetectionMode ? "Select Comparison Layer" : "Data Explorer"}
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 border-none">
                      {isChangeDetectionMode ? "Change Detection" : "Global Inventory"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 font-medium">
                    {isChangeDetectionMode
                      ? "Pick one time-varying dataset. Static layers (elevation, land cover, etc.) are hidden. Then choose dates on the map."
                      : "Select planetary-scale datasets to visualize global trends and anomalies."}
                  </p>
                </div>
                
                <div className="relative w-full md:w-80 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                  <Input
                    placeholder="Search catalog (e.g. Vegetation, Population)"
                    className="pl-10 h-11 bg-muted/40 border-border/40 rounded-2xl focus-visible:ring-zinc-400/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="absolute top-4 right-4 rounded-full h-8 w-8 hover:bg-muted/80"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Grid Area */}
            <ScrollArea className="flex-1 px-6 pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-24">
                {filteredDatasets.map((ds) => {
                  const isInSidebar = sidebarLayerSet.has(ds.id);
                  const isOnMap = activeLayerSet.has(ds.id);
                  const isSelected = isChangeDetectionMode
                    ? changeDetectionPick === ds.id
                    : selectedIds.includes(ds.id);
                  return (
                    <div 
                      key={ds.id}
                      onClick={() => toggleSelection(ds.id)}
                      className={cn(
                        "group relative flex flex-col rounded-3xl border transition-all duration-300 overflow-hidden cursor-pointer",
                        isSelected 
                          ? "border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-900 ring-4 ring-zinc-900/5 dark:ring-zinc-100/5" 
                          : "border-border/60 bg-background hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xl hover:-translate-y-1"
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-[16/9] overflow-hidden">
                        {(() => {
                          const localCover = `/datasets-images/${ds.id}.png`;
                          const backupCover = ds.imageUrl || "/datasets-images/vegetation.png";
                          return (
                        <img 
                          src={localCover}
                          alt={ds.name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale-[0.3] group-hover:grayscale-0"
                          onError={(e) => {
                            const target = e.currentTarget;
                            if (target.src.includes(localCover)) {
                              target.src = backupCover;
                              return;
                            }
                            if (!target.src.includes("/datasets-images/vegetation.png")) {
                              target.src = "/datasets-images/vegetation.png";
                              return;
                            }
                            target.onerror = null;
                            target.src = "/placeholder.svg";
                          }}
                        />
                          );
                        })()}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />
                        
                        {ds.isExperimental && (
                          <div className="absolute top-3 left-3 flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg">
                            <Sparkles className="w-2.5 h-2.5" />
                            Experimental
                          </div>
                        )}

                        <div className="absolute top-3 right-3">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                            isSelected 
                              ? "bg-zinc-900 border-zinc-900 text-white scale-110 dark:bg-zinc-100 dark:border-zinc-100 dark:text-zinc-900" 
                              : "bg-black/20 border-white/40 text-transparent group-hover:bg-black/40"
                          )}>
                            <Check className="w-3.5 h-3.5 stroke-[4px]" />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">
                          <ds.icon className="w-3 h-3" />
                          {ds.category || "Dataset"}
                        </div>
                        <h4 className="font-black text-base tracking-tight mb-2 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                          {ds.name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground/80 leading-relaxed line-clamp-2 mb-4">
                          {ds.description}
                        </p>
                        
                        <div className="mt-auto flex items-center justify-between">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px] font-bold gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCatalogInfo(ds.id, ds.name);
                            }}
                          >
                            <Info className="w-3 h-3" />
                            Catalog Info
                          </Button>
                          <div className={cn(
                            "text-[10px] font-black underline underline-offset-4 decoration-2 transition-all",
                            isSelected ? "text-zinc-900 dark:text-zinc-100 opacity-100" : "text-transparent opacity-0 group-hover:text-muted-foreground group-hover:opacity-100"
                          )}>
                            {isOnMap && !isSelected ? "ON MAP · WILL REMOVE" : isInSidebar && !isSelected ? "IN SIDEBAR · WILL REMOVE" : isOnMap ? "ON MAP" : isInSidebar ? "IN SIDEBAR" : isSelected ? "WILL ADD" : "CLICK TO SELECT"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-6 border-t border-border/40 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 text-sm font-black shadow-lg">
                  {footerSelectionCount}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-tight">
                    {isChangeDetectionMode ? "Layer selected" : "Layers selected"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    {isChangeDetectionMode
                      ? changeDetectionPick
                        ? GLOBAL_DATASETS.find((item) => item.id === changeDetectionPick)?.name ?? changeDetectionPick
                        : "Choose one dataset"
                      : `${sidebarLayerSet.size} in sidebar • ${selectedIds.length} selected now`}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button 
                  variant="ghost" 
                  onClick={onClose}
                  className="flex-1 sm:flex-none uppercase text-[11px] font-black tracking-widest hover:bg-zinc-200 dark:hover:bg-zinc-800"
                >
                  Cancel
                </Button>
                <Button 
                  disabled={isChangeDetectionMode ? !changeDetectionPick : !footerHasChanges}
                  onClick={handleAddToProject}
                  className="flex-1 sm:flex-none min-w-[160px] h-11 uppercase text-[11px] font-black tracking-[0.2em] bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 shadow-xl shadow-zinc-900/10 dark:shadow-zinc-100/5 disabled:opacity-50 transition-all active:scale-[0.98]"
                >
                  {isChangeDetectionMode ? "Use This Layer" : "Apply Sidebar"}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
