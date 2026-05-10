import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { HazardGuardCard } from "./HazardGuardCard";
import type { HazardGuardMode } from "./HazardGuardCard";
import { WeatherWiseCard } from "./WeatherWiseCard";
import { GeoVisionCard } from "./GeoVisionCard";
import { SatelliteTimelapseCard } from "./SatelliteTimelapseCard";
import { ForestDeptCards } from "./ForestDeptCards";
import { StateCards } from "./StateCards";
import { CollapsibleSection } from "./CollapsibleSection";
import type { TimelapseFrame } from "@/services/api";
import type { UrbanPlanningFeature } from "@/services/urbanPlanning";
import type { ForestDeptFeature } from "@/services/forestDepartment";
import {
  indiaService,
} from "@/services/stateData";
import { 
  HelpCircle,
  Layers, 
  Mountain, 
  Lightbulb, 
  Thermometer, 
  Brain, 
  Clock, 
  Trees,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  Globe,
  Plus,
  RefreshCw,
  Sprout,
  Wheat
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchDataset } from "@/services/api";
import { GLOBAL_DATASETS } from "@/services/datasetService";

const COMING_SOON_MODELS = [
  {
    title: "RootPulse",
    subtitle: "Soil health & irrigation intelligence",
    description:
      "Analyzes soil moisture levels, nutrient content, and water retention patterns to recommend precise irrigation schedules. Reduces water waste by telling farmers exactly when and how much to irrigate, field by field.",
    icon: Sprout,
  },
  {
    title: "HarvestMind",
    subtitle: "Yield optimization & harvest timing",
    description:
      "Combines crop growth stage tracking with weather forecasts to predict the ideal harvest window. Goes beyond predicting yield quantity by also predicting when to harvest for maximum quality and minimum loss.",
    icon: Wheat,
  },
] as const;

export const Sidebar = ({ 
  isCollapsed = false,
  onToggleCollapse,
  onHazardGuardModeChange, 
  onWeatherWiseToggle,
  isWeatherWiseActive,
  onGeoVisionToggle,
  isGeoVisionActive,
  onTimelapseLoaded, 
  onTimelapseClose, 
  isTimelapseActive,
  activeUrbanPlanningFeature,
  onUrbanPlanningFeatureChange,
  activeForestDeptFeature,
  onForestDeptFeatureChange,
  onOpenDatasetDiscovery,
  onRefreshAddedLayers,
  refreshingAddedLayers = false,
  sidebarLayerCatalog = [],
}: {
  onHazardGuardModeChange: (isActive: boolean, mode: HazardGuardMode, samplePoints: number) => void;
  onWeatherWiseToggle?: () => void;
  isWeatherWiseActive?: boolean;
  onGeoVisionToggle?: () => void;
  isGeoVisionActive?: boolean;
  onTimelapseLoaded?: (frames: TimelapseFrame[], title: string, dataset: string) => void;
  onTimelapseClose?: () => void;
  isTimelapseActive?: boolean;
  activeUrbanPlanningFeature?: UrbanPlanningFeature | null;
  onUrbanPlanningFeatureChange?: (feature: UrbanPlanningFeature | null) => void;
  activeForestDeptFeature?: ForestDeptFeature | null;
  onForestDeptFeatureChange?: (feature: ForestDeptFeature | null) => void;
  onOpenDatasetDiscovery?: () => void;
  onRefreshAddedLayers?: () => void;
  refreshingAddedLayers?: boolean;
  sidebarLayerCatalog?: Array<{ id: string; name: string }>;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}) => {
  // Track expanded state for all sections
  const [sectionsExpanded, setSectionsExpanded] = useState<Record<string, boolean>>({
    models: true,
    timelapse: true,
    dataLayers: true,
    forestDept: true,
    india: true,
  });

  const allExpanded = Object.values(sectionsExpanded).every(Boolean);

  const toggleAllSections = () => {
    const newState = !allExpanded;
    setSectionsExpanded({
      models: newState,
      timelapse: newState,
      dataLayers: newState,
      forestDept: newState,
      india: newState,
    });
  };

  const toggleSection = (section: string) => (expanded: boolean) => {
    setSectionsExpanded(prev => ({ ...prev, [section]: expanded }));
  };

  const navigate = useNavigate();

  // Define tab categories for a cleaner organization
  const [activeTab, setActiveTab] = useState<'models' | 'data' | 'regions'>('models');

  const [addedLayers, setAddedLayers] = useState<Array<{ id: string; name: string; visible: boolean }>>([]);
  const [addingLayerId, setAddingLayerId] = useState<string | null>(null);
  const [expandedLegendIds, setExpandedLegendIds] = useState<Record<string, boolean>>({});

  const datasetById = new Map(GLOBAL_DATASETS.map((dataset) => [dataset.id, dataset]));
  const defaultLayerIds = new Set(sidebarLayerCatalog.map((layer) => layer.id));
  const addedLayerMap = new Map(addedLayers.map((layer) => [layer.id, layer]));
  const defaultLayerRows = sidebarLayerCatalog.map((layer) => {
    const active = addedLayerMap.get(layer.id);
    const dataset = datasetById.get(layer.id);
    return {
      id: layer.id,
      name: layer.name,
      visible: Boolean(active),
      legend: dataset?.legend ?? [],
    };
  });
  const customAddedRows = addedLayers
    .filter((layer) => !defaultLayerIds.has(layer.id))
    .map((layer) => ({
      id: layer.id,
      name: layer.name,
      visible: true,
      legend: datasetById.get(layer.id)?.legend ?? [],
    }));
  const layerRows = [...defaultLayerRows, ...customAddedRows];

  const toggleLegend = (layerId: string) => {
    setExpandedLegendIds((prev) => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));
  };

  const handleAddLayer = async (id: string, name: string) => {
    if (addingLayerId) return;

    setAddingLayerId(id);
    try {
      const data = await fetchDataset(id, { timeoutMs: 120000, retries: 1 });
      const tileUrl = data?.tile_url;
      if (!tileUrl) return;

      window.dispatchEvent(new CustomEvent('geo:add-layer', {
        detail: {
          id,
          name,
          url: tileUrl,
          metadata: data.metadata || data,
          opacity: 0.85,
        }
      }));
    } catch (error) {
      console.error(`[SIDEBAR] Failed to add layer ${id}:`, error);
    } finally {
      setAddingLayerId(null);
    }
  };

  useEffect(() => {
    const syncLayers = (event?: Event) => {
      const detail = (event as CustomEvent<Record<string, { id: string; name: string; visible?: boolean }>> | undefined)?.detail;
      const layerMap = detail || (window as Window & { GEO_LAYERS?: Record<string, { id: string; name: string; visible?: boolean; type?: string }> }).GEO_LAYERS || {};
      const layers = Object.values(layerMap)
        .filter((layer) => !!layer?.id && !!layer?.name)
        .map((layer) => ({ id: layer.id, name: layer.name, visible: layer.visible !== false }));
      setAddedLayers(layers);
    };

    syncLayers();
    window.addEventListener('geo:layers-changed', syncLayers as EventListener);

    return () => {
      window.removeEventListener('geo:layers-changed', syncLayers as EventListener);
    };
  }, []);

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 80 : 420 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="h-full bg-background border-r border-border flex flex-col z-[1500] relative overflow-hidden group/sidebar"
    >
      {/* Brand Header */}
      <div className={cn(
        "flex items-center gap-3 py-4 border-b border-border/60 bg-muted/5 transition-all",
        isCollapsed ? "px-0 justify-center" : "px-6"
      )}>
        <div 
          className="flex items-center gap-2.5 cursor-pointer group shrink-0" 
          onClick={() => navigate('/')} 
          title="Back to Home"
        >
          <img src="/shrishti-icon-small.png" alt="Shrishti AI" className="h-7 w-7 object-contain opacity-80 group-hover:opacity-100 transition-opacity" />
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <span className="text-[11px] font-black tracking-widest uppercase leading-none text-foreground/90">Shrishti</span>
              <span className="text-[9px] font-bold tracking-[0.1em] uppercase text-muted-foreground leading-none mt-0.5">Intelligence</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-20 bg-background border border-border rounded-full p-1 z-50 shadow-md hover:bg-muted transition-colors"
      >
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>

      {/* Primary Category Switcher (Professional Tab Interface) */}
      <div className={cn(
        "flex border-b border-border/40 p-1 bg-zinc-50/50 dark:bg-zinc-900/50",
        isCollapsed ? "flex-col items-center gap-2" : ""
      )}>
        <button
          onClick={() => setActiveTab('models')}
          title="Models"
          className={cn(
            "flex items-center justify-center py-2 px-1 rounded-lg transition-all gap-2",
            isCollapsed ? "w-10 h-10" : "flex-1",
            activeTab === 'models' 
              ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm ring-1 ring-border/20" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <Brain className="h-3.5 w-3.5" />
          {!isCollapsed && <span className="text-[10px] font-bold uppercase tracking-tight">Models</span>}
        </button>
        <button
          onClick={() => setActiveTab('data')}
          title="Data"
          className={cn(
            "flex items-center justify-center py-2 px-1 rounded-lg transition-all gap-2 relative group-tab",
            isCollapsed ? "w-10 h-10" : "flex-1",
            activeTab === 'data' 
              ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm ring-1 ring-border/20" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <div className="flex items-center gap-2">
            <Layers className="h-3.5 w-3.5" />
            {!isCollapsed && (
              <>
                <span className="text-[10px] font-bold uppercase tracking-tight">Data</span>
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDatasetDiscovery?.();
                  }}
                  className={cn(
                    "p-0.5 rounded-sm hover:bg-muted/80 transition-colors",
                    activeTab === 'data' ? "text-zinc-400 hover:text-foreground" : "text-muted-foreground/40 hover:text-foreground"
                  )}
                >
                  <Plus className="h-3 w-3" />
                </div>
              </>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('regions')}
          title="Regions"
          className={cn(
            "flex items-center justify-center py-2 px-1 rounded-lg transition-all gap-2",
            isCollapsed ? "w-10 h-10" : "flex-1",
            activeTab === 'regions' 
              ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm ring-1 ring-border/20" 
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          )}
        >
          <Globe className="h-3.5 w-3.5" />
          {!isCollapsed && <span className="text-[10px] font-bold uppercase tracking-tight">Regions</span>}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6 overflow-x-hidden">
        {isCollapsed ? (
          <div className="py-4 flex flex-col items-center gap-6 animate-in fade-in duration-500">
            <div className="p-2 rounded-full bg-muted/30 text-muted-foreground/40 cursor-help" onClick={() => setActiveTab('models')}>
                <Brain className="h-5 w-5" />
            </div>
            <div className="p-2 rounded-full bg-muted/30 text-muted-foreground/40 cursor-help" onClick={() => setActiveTab('data')}>
                <Layers className="h-5 w-5" />
            </div>
            <div className="p-2 rounded-full bg-muted/30 text-muted-foreground/40 cursor-help" onClick={() => setActiveTab('regions')}>
                <Globe className="h-5 w-5" />
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'models' && (
              <div className="animate-in fade-in slide-in-from-left-2 duration-300">
                {/* Models Section */}
                <div className="px-3 py-4 space-y-4">
                  <div className="flex items-center justify-between mb-1 px-1">
                    <h4 className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Predictive Intelligence</h4>
                  </div>
                  <HazardGuardCard onModeChange={onHazardGuardModeChange} />
                  {onWeatherWiseToggle && <WeatherWiseCard onTogglePanel={onWeatherWiseToggle} isActive={isWeatherWiseActive} />}
                  {onGeoVisionToggle && <GeoVisionCard onTogglePanel={onGeoVisionToggle} isActive={isGeoVisionActive} />}

                  <div className="mx-3 mt-2 rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Coming Soon</h5>
                    </div>

                    {COMING_SOON_MODELS.map((model) => {
                      const Icon = model.icon;
                      return (
                        <div key={model.title} className="rounded-lg border border-border/60 bg-background/70 px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200">
                              <Icon className="w-3.5 h-3.5" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold tracking-tight text-foreground">{model.title}</span>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button type="button" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                                        <HelpCircle className="w-3.5 h-3.5" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="max-w-[260px] text-[11px] leading-relaxed">
                                      {model.description}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">{model.subtitle}</p>
                            </div>

                            <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-500/15 border border-amber-200 dark:border-amber-500/30 rounded px-1.5 py-0.5">
                              Coming Soon
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="animate-in fade-in slide-in-from-right-2 duration-300 px-4 py-4 space-y-6">
                {/* Analysis Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-1 px-1">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Historical Analysis</h4>
                  </div>
                  <CollapsibleSection
                    title="Satellite Timelapse"
                    icon={Clock}
                    expanded={sectionsExpanded.timelapse}
                    onToggle={toggleSection('timelapse')}
                  >
                    {onTimelapseLoaded && onTimelapseClose && (
                      <SatelliteTimelapseCard
                        onTimelapseLoaded={onTimelapseLoaded}
                        onTimelapseClose={onTimelapseClose}
                        isActive={isTimelapseActive ?? false}
                      />
                    )}
                  </CollapsibleSection>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3 pl-1">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Added Layers</h4>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-zinc-400 hover:text-foreground hover:bg-muted/50 transition-all"
                        onClick={() => onRefreshAddedLayers?.()}
                        title="Refresh layers with latest rectangle"
                        disabled={refreshingAddedLayers}
                      >
                        <RefreshCw className={cn("w-3 h-3", refreshingAddedLayers && "animate-spin")} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-400 hover:text-foreground hover:bg-muted/50 transition-all gap-1.5"
                        onClick={() => onOpenDatasetDiscovery?.()}
                      >
                        Discovery
                        <Plus className="w-2.5 h-2.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {layerRows.map((layer) => (
                      <div key={layer.id} className="rounded-lg border border-border/60 bg-background px-3 py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground truncate">{layer.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{layer.id}</p>
                            <button
                              type="button"
                              onClick={() => toggleLegend(layer.id)}
                              className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                            >
                              Legend
                              <ChevronDown className={cn("h-3 w-3 transition-transform", expandedLegendIds[layer.id] && "rotate-180")} />
                            </button>
                          </div>
                          {layer.visible ? (
                            <button
                              type="button"
                              onClick={() => window.dispatchEvent(new CustomEvent('geo:remove-layer', { detail: { id: layer.id } }))}
                              className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                            >
                              Remove
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddLayer(layer.id, layer.name)}
                              disabled={addingLayerId === layer.id}
                              className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground disabled:opacity-60"
                            >
                              {addingLayerId === layer.id ? 'Adding...' : 'Add'}
                            </button>
                          )}
                        </div>

                        {expandedLegendIds[layer.id] && (
                          <div className="mt-2 border-t border-border/50 pt-2 space-y-1.5">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">What colors mean</p>
                            {layer.legend.length > 0 ? (
                              <div className="space-y-1">
                                {layer.legend.map((item) => (
                                  <div key={`${layer.id}-${item.label}`} className="flex items-center gap-2">
                                    <span
                                      className="h-3 w-3 rounded-sm border border-border/60"
                                      style={{ backgroundColor: item.color }}
                                      aria-hidden="true"
                                    />
                                    <span className="text-[10px] text-muted-foreground leading-tight">{item.label}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-muted-foreground">Legend unavailable for this layer.</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {layerRows.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          No layers added yet. Click Discovery to add datasets.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'regions' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 px-4 py-4">
                <div className="flex items-center justify-between mb-4 pl-1">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground">Regional Geospatial Data</h4>
                  <button
                    onClick={toggleAllSections}
                    className="text-[9px] font-bold text-muted-foreground hover:text-foreground border-b border-border/60 hover:border-foreground/30 transition-colors"
                  >
                    Toggle All
                  </button>
                </div>
                
                <div className="space-y-1">
                  <CollapsibleSection
                    title="Forest Dept"
                    icon={Trees}
                    badge="10"
                    expanded={sectionsExpanded.forestDept}
                    onToggle={toggleSection('forestDept')}
                  >
                    <ForestDeptCards
                      activeFeature={activeForestDeptFeature ?? null}
                      onSelectFeature={onForestDeptFeatureChange ?? (() => {})}
                      activeUrbanFeature={activeUrbanPlanningFeature ?? null}
                      onOpenUrbanFeature={onUrbanPlanningFeatureChange ?? (() => {})}
                    />
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="India (National)"
                    icon={Globe}
                    expanded={sectionsExpanded.india}
                    onToggle={toggleSection('india')}
                  >
                    <StateCards stateName="India" stateSlug="india" service={indiaService} />
                  </CollapsibleSection>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-border/60 bg-muted/10 text-center">
          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
            Shrishti AI © 2026 • v2.4.0
          </p>
        </div>
      )}
    </motion.aside>
  );
};
