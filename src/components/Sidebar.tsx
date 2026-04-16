import { useState } from "react";
import { DatasetCard } from "./DatasetCard";
import { HazardGuardCard } from "./HazardGuardCard";
import type { HazardGuardMode } from "./HazardGuardCard";
import { WeatherWiseCard } from "./WeatherWiseCard";
import { GeoVisionCard } from "./GeoVisionCard";
import { SatelliteTimelapseCard } from "./SatelliteTimelapseCard";
import { GoaCards } from "./GoaCards";
import { StateCards } from "./StateCards";
import { CollapsibleSection } from "./CollapsibleSection";
import type { TimelapseFrame } from "@/services/api";
import {
  indiaService,
  karnatakaService,
  keralaService,
  maharashtraService,
  tamilnaduService,
  andhrapradeshService
} from "@/services/stateData";
import { 
  Layers, 
  Mountain, 
  Lightbulb, 
  Map, 
  Thermometer, 
  Brain, 
  Clock,
  MapPin,
  ChevronsUpDown,
  Globe,
  Landmark
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Sidebar = ({ 
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
  onForestDeptFeatureChange
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
}) => {
  // Track expanded state for all sections
  const [sectionsExpanded, setSectionsExpanded] = useState<Record<string, boolean>>({
    models: true,
    timelapse: true,
    dataLayers: true,
    urbanPlanning: true,
    forestDept: true,
    india: true,
    goa: true,
    karnataka: true,
    kerala: true,
    maharashtra: true,
    tamilnadu: true,
    andhrapradesh: true,
  });

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
      goa: newState,
      karnataka: newState,
      kerala: newState,
      maharashtra: newState,
      tamilnadu: newState,
      andhrapradesh: newState,
    });
  };

  const toggleSection = (section: string) => (expanded: boolean) => {
    setSectionsExpanded(prev => ({ ...prev, [section]: expanded }));
  };

  const datasets = [
    {
      id: "elevation",
      name: "Elevation",
      title: "Terrain Elevation",
      description: "Digital Elevation Model (MERIT DEM)",
      icon: Mountain,
      theme: "terrain" as const,
      legend: [
        { color: "#000080", label: "Sea level (0 m)" },
        { color: "#0000FF", label: "Low elevation (0–500 m)" },
        { color: "#00FFFF", label: "Hills (500–1000 m)" },
        { color: "#FFFF00", label: "Mountains (1000–2000 m)" },
        { color: "#FF8000", label: "High mountains (2000–4000 m)" },
        { color: "#FF0000", label: "Very high peaks (4000–6000 m)" },
        { color: "#800080", label: "Extreme peaks (> 6000 m)" },
      ],
    },
    {
      id: "nightlights",
      name: "Nighttime Lights",
      title: "Night Illumination",
      description: "NOAA VIIRS DNB (Gamma Enhanced)",
      icon: Lightbulb,
      theme: "lights" as const,
      legend: [
        { color: "#000000", label: "No activity (uninhabited)" },
        { color: "#1a0033", label: "Minimal (rural)" },
        { color: "#330066", label: "Low (small towns)" },
        { color: "#6600cc", label: "Medium (cities)" },
        { color: "#9933ff", label: "High (major cities)" },
        { color: "#cc66ff", label: "Very high (mega cities)" },
        { color: "#ffccff", label: "Extreme (urban centers)" },
        { color: "#ffffff", label: "Maximum (city cores)" },
      ],
    },
    {
      id: "landcover",
      name: "Land Cover",
      title: "Land Classification",
      description: "ESA WorldCover 2021 (10 m)",
      icon: Map,
      theme: "landcover" as const,
      legend: [
        { color: "#006400", label: "Tree cover" },
        { color: "#ffbb22", label: "Shrubland" },
        { color: "#ffff4c", label: "Grassland" },
        { color: "#f096ff", label: "Cropland" },
        { color: "#fa0000", label: "Built-up" },
        { color: "#b4b4b4", label: "Bare / sparse vegetation" },
        { color: "#f0f0f0", label: "Snow and ice" },
        { color: "#0064c8", label: "Permanent water bodies" },
        { color: "#0096a0", label: "Herbaceous wetland" },
        { color: "#00cf75", label: "Mangroves" },
      ],
    },
    {
      id: "temperature",
      name: "Temperature",
      title: "Surface Temperature",
      description: "MODIS Terra LST – Summer 2023",
      icon: Thermometer,
      theme: "temperature" as const,
      legend: [
        { color: "#000080", label: "Very cold (< 20 °C)" },
        { color: "#0000FF", label: "Cold (20–25 °C)" },
        { color: "#00FFFF", label: "Cool (25–30 °C)" },
        { color: "#00FF00", label: "Moderate (30–35 °C)" },
        { color: "#FFFF00", label: "Warm (35–40 °C)" },
        { color: "#FF8000", label: "Hot (40–45 °C)" },
        { color: "#FF0000", label: "Very hot (> 45 °C)" },
      ],
    },
  ];

  const navigate = useNavigate();

  return (
    <aside className="w-full lg:w-1/4 h-full bg-background border-r border-border overflow-y-auto">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-muted/30 dark:bg-muted/10">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')} title="Back to Home">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Globe className="h-6 w-6 text-emerald-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-foreground uppercase">Shrishti</span>
              <span className="text-[10px] font-medium text-emerald-500 uppercase tracking-widest -mt-1">Agritech</span>
            </div>
          </div>
        </div>
      </div>

      {/* Collapse/Expand All Toggle */}
      <div className="flex items-center justify-end px-4 py-1.5 border-b border-border/50">
        <button
          type="button"
          onClick={toggleAllSections}
          className="flex items-center gap-1 text-[10px] text-muted-foreground/70 transition-colors hover:text-foreground"
          title={allExpanded ? 'Collapse all sections' : 'Expand all sections'}
        >
          <ChevronsUpDown className="h-3 w-3" />
          <span>{allExpanded ? 'Collapse all' : 'Expand all'}</span>
        </button>
      </div>

      <div className="py-1">
        {/* Precision Agri-AI Section */}
        <CollapsibleSection
          title="Precision Agri-AI"
          icon={Brain}
          badge="3"
          expanded={sectionsExpanded.models}
          onToggle={toggleSection('models')}
        >
          <HazardGuardCard onModeChange={onHazardGuardModeChange} />
          {onWeatherWiseToggle && <WeatherWiseCard onTogglePanel={onWeatherWiseToggle} isActive={isWeatherWiseActive} />}
          {onGeoVisionToggle && <GeoVisionCard onTogglePanel={onGeoVisionToggle} isActive={isGeoVisionActive} />}
        </CollapsibleSection>

        {/* Timelapse Section */}
        <CollapsibleSection
          title="Timelapse"
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

        {/* Data Layers Section */}
        <CollapsibleSection
          title="Data Layers"
          icon={Layers}
          badge={String(datasets.length)}
          expanded={sectionsExpanded.dataLayers}
          onToggle={toggleSection('dataLayers')}
        >
          {datasets.map((dataset) => (
            <DatasetCard key={dataset.id} {...dataset} />
          ))}
        </CollapsibleSection>

        {/* Only keeping Agritech relevant sections for the hackathon */}
      </div>
    </aside>
  );
};
