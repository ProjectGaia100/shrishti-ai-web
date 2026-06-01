import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useIsMobile } from "@/hooks/use-mobile";
import { HazardGuardCard } from "./HazardGuardCard";
import type { HazardGuardMode } from "./HazardGuardCard";
import { WeatherWiseCard } from "./WeatherWiseCard";
import { GeoVisionCard } from "./GeoVisionCard";
import { SatelliteTimelapseCard } from "./SatelliteTimelapseCard";
import { ChangeDetectionCard } from "./ChangeDetectionCard";
import { ForestDeptCards } from "./ForestDeptCards";
import { StateCards } from "./StateCards";
import { UrbanPlanningCards } from "./UrbanPlanningCards";
import { CollapsibleSection } from "./CollapsibleSection";
import type { TimelapseFrame, AoiBbox } from "@/services/api";
import type { UrbanPlanningFeature } from "@/services/urbanPlanning";
import type { ForestDeptFeature } from "@/services/forestDepartment";
import { DatasetExplorerModal } from './DatasetExplorerModal';
import { ThemeToggle } from "./ThemeToggle";
import {
  indiaService,
  karnatakaService,
  keralaService,
  maharashtraService,
  tamilnaduService,
  andhrapradeshService,
} from "@/services/stateData";
import { goaService } from "@/services/goa";
import { 
  HelpCircle,
  Layers, 
  Mountain, 
  Lightbulb, 
  Thermometer, 
  Brain, 
  Clock,
  GitCompare,
  Trees,
  Building2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronsUpDown,
  Globe,
  Plus,
  RefreshCw,
  Menu
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
  onChangeDetectionToggle,
  isChangeDetectionActive,
  activeUrbanPlanningFeature,
  onUrbanPlanningFeatureChange,
  activeForestDeptFeature,
  onForestDeptFeatureChange,
  onOpenDatasetDiscovery,
  onRefreshAddedLayers,
  refreshingAddedLayers = false,
  sidebarLayerCatalog = [],
  aoiBbox = null,
}: {
  onHazardGuardModeChange: (isActive: boolean, mode: HazardGuardMode, samplePoints: number) => void;
  onWeatherWiseToggle?: () => void;
  isWeatherWiseActive?: boolean;
  onGeoVisionToggle?: () => void;
  isGeoVisionActive?: boolean;
  onTimelapseLoaded?: (frames: TimelapseFrame[], title: string, dataset: string) => void;
  onTimelapseClose?: () => void;
  isTimelapseActive?: boolean;
  onChangeDetectionToggle?: () => void;
  isChangeDetectionActive?: boolean;
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
  aoiBbox?: AoiBbox | null;
}) => {
  // Track expanded state for all sections
  const [sectionsExpanded, setSectionsExpanded] = useState<Record<string, boolean>>({
    models: true,
    timelapse: true,
    changeDetection: true,
    dataLayers: true,
    urbanPlanning: true,
    forestDept: true,
    india: true,
    goa: false,
    karnataka: false,
    kerala: false,
    maharashtra: false,
    tamilnadu: false,
    andhrapradesh: false,
  });

  const isMobile = useIsMobile();

  const allExpanded = Object.values(sectionsExpanded).every(Boolean);

  const toggleAllSections = () => {
    const newState = !allExpanded;
    setSectionsExpanded({
      models: newState,
      timelapse: newState,
      dataLayers: newState,
      urbanPlanning: newState,
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
      const aoiBbox = (window as any).__GEO_AOI_ACTIVE ? ((window as any).__GEO_AOI_BBOX ?? undefined) : undefined;
      const data = await fetchDataset(id, { timeoutMs: 120000, retries: 1, ...(aoiBbox ? { aoiBbox } : {}) });
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

  const goaStateAdapter = {
    getLayers: () => goaService.getLayers() as any,
    getLayerData: (layerId: string) => goaService.getLayerData(layerId as import('@/services/goa').GoaLayerId),
  };

  return (
    <>
      {isMobile && !isCollapsed && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[1400]" 
          onClick={onToggleCollapse}
        />
      )}
      <motion.aside 
        initial={false}
        animate={{ 
          width: isMobile ? (isCollapsed ? 0 : '100vw') : (isCollapsed ? 80 : 420),
          maxWidth: isMobile ? '100vw' : 420
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={cn(
          "h-full bg-background border-r border-border flex flex-col z-[1500] relative overflow-hidden group/sidebar",
          isMobile ? "fixed top-0 left-0 bottom-0" : ""
        )}
      >
      {/* Brand Header */}
      <div className={cn(
        "flex items-center justify-between py-4 border-b border-border/60 bg-muted/5 transition-all",
        isCollapsed ? "px-0 justify-center" : "px-6"
      )}>
          <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => navigate('/')}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl">
              <img src="/shrishti-icon.png" alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col"
              >
                <span className="text-sm font-black tracking-tight text-foreground uppercase leading-none">
                  Shrishti AI
                </span>
              </motion.div>
            )}
          </div>
          {isMobile && !isCollapsed && (
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleCollapse}
                className="flex items-center justify-center p-2 h-10 w-10 rounded-xl bg-background border border-border/40 shadow-sm transition-all active:scale-95 text-foreground/80 hover:bg-muted"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          )}
      </div>

      {/* Toggle Button - Hidden on Mobile, since we'll use a hamburger menu in Index.tsx */}
      {!isMobile && (
        <button
          onClick={onToggleCollapse}
          className="absolute -right-3 top-20 bg-background border border-border rounded-full p-1 z-50 shadow-md hover:bg-muted transition-colors"
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      )}

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

                  {onChangeDetectionToggle && (
                    <CollapsibleSection
                      title="Change Detection"
                      icon={GitCompare}
                      expanded={sectionsExpanded.changeDetection}
                      onToggle={toggleSection('changeDetection')}
                    >
                      <ChangeDetectionCard
                        isActive={isChangeDetectionActive ?? false}
                        onToggle={onChangeDetectionToggle}
                      />
                    </CollapsibleSection>
                  )}
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

                {/* Catalog Link */}
                <div className="mt-4 pt-6 border-t border-border/40">
                  <div className="flex flex-col items-center text-center px-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Plus className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground mb-1">Looking for more?</h4>
                    <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed">
                      Browse our global catalog of multi-spectral satellite datasets and planetary-scale indices.
                    </p>
                    <Button 
                      onClick={() => onOpenDatasetDiscovery?.()}
                      variant="outline"
                      className="w-full rounded-xl font-black uppercase tracking-widest text-[9px] h-9 border-border/60 hover:bg-muted/50"
                    >
                      Discover Datasets
                    </Button>
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
                    title="Urban Planning"
                    icon={Building2}
                    badge="4"
                    expanded={sectionsExpanded.urbanPlanning}
                    onToggle={toggleSection('urbanPlanning')}
                  >
                    <UrbanPlanningCards
                      activeFeature={activeUrbanPlanningFeature ?? null}
                      onSelectFeature={onUrbanPlanningFeatureChange ?? (() => {})}
                    />
                  </CollapsibleSection>

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

                  <CollapsibleSection
                    title="Goa"
                    icon={Globe}
                    badge="7"
                    expanded={sectionsExpanded.goa}
                    onToggle={toggleSection('goa')}
                  >
                    <StateCards stateName="Goa" stateSlug="goa" service={goaStateAdapter} attribution="Data from AMCHE.IN & IndianOpenMaps" />
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="Karnataka"
                    icon={Globe}
                    badge="1"
                    expanded={sectionsExpanded.karnataka}
                    onToggle={toggleSection('karnataka')}
                  >
                    <StateCards stateName="Karnataka" stateSlug="karnataka" service={karnatakaService} attribution="Data from KGISMAPS" />
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="Kerala"
                    icon={Globe}
                    badge="1"
                    expanded={sectionsExpanded.kerala}
                    onToggle={toggleSection('kerala')}
                  >
                    <StateCards stateName="Kerala" stateSlug="kerala" service={keralaService} attribution="Data from NCSCM" />
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="Maharashtra"
                    icon={Globe}
                    badge="1"
                    expanded={sectionsExpanded.maharashtra}
                    onToggle={toggleSection('maharashtra')}
                  >
                    <StateCards stateName="Maharashtra" stateSlug="maharashtra" service={maharashtraService} attribution="Data from NCSCM" />
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="Tamil Nadu"
                    icon={Globe}
                    badge="1"
                    expanded={sectionsExpanded.tamilnadu}
                    onToggle={toggleSection('tamilnadu')}
                  >
                    <StateCards stateName="Tamil Nadu" stateSlug="tamilnadu" service={tamilnaduService} attribution="Data from TNGIS" />
                  </CollapsibleSection>

                  <CollapsibleSection
                    title="Andhra Pradesh"
                    icon={Globe}
                    badge="1"
                    expanded={sectionsExpanded.andhrapradesh}
                    onToggle={toggleSection('andhrapradesh')}
                  >
                    <StateCards stateName="Andhra Pradesh" stateSlug="andhrapradesh" service={andhrapradeshService} attribution="Data from APSAC" />
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
    </>
  );
};

