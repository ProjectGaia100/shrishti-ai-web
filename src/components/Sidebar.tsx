import { useState } from "react";
import { DatasetCard } from "./DatasetCard";
import { HazardGuardCard } from "./HazardGuardCard";
import type { HazardGuardMode } from "./HazardGuardCard";
import { WeatherWiseCard } from "./WeatherWiseCard";
import { GeoVisionCard } from "./GeoVisionCard";
import { SatelliteTimelapseCard } from "./SatelliteTimelapseCard";
import { UrbanPlanningCards } from "./UrbanPlanningCards";
import { ForestDeptCards } from "./ForestDeptCards";
import { GoaCards } from "./GoaCards";
import { StateCards } from "./StateCards";
import { CollapsibleSection } from "./CollapsibleSection";
import type { TimelapseFrame } from "@/services/api";
import type { UrbanPlanningFeature } from "@/services/urbanPlanning";
import type { ForestDeptFeature } from "@/services/forestDepartment";
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
  Building2, 
  Trees, 
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
          <img src="/shrishti-icon-small.png" alt="Shrishti AI Icon" className="h-10 w-10 object-contain" />
          <img src="/shrishti-text-long.png" alt="Shrishti AI" className="h-8 object-contain" />
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
        {/* Models Section */}
        <CollapsibleSection
          title="Models"
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

        {/* Urban Planning Section */}
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

        {/* Forest Department Section */}
        <CollapsibleSection
          title="Forest Dept"
          icon={Trees}
          badge="8"
          expanded={sectionsExpanded.forestDept}
          onToggle={toggleSection('forestDept')}
        >
          <ForestDeptCards
            activeFeature={activeForestDeptFeature ?? null}
            onSelectFeature={onForestDeptFeatureChange ?? (() => {})}
          />
        </CollapsibleSection>

        {/* ============================================ */}
        {/* GEOGRAPHIC DATA SECTIONS - State-wise */}
        {/* Order: India, Goa, Karnataka, Kerala, Maharashtra, Tamil Nadu, Andhra Pradesh */}
        {/* ============================================ */}

        {/* India Section */}
        <CollapsibleSection
          title="India"
          icon={Globe}
          badge="2"
          expanded={sectionsExpanded.india}
          onToggle={toggleSection('india')}
        >
          <StateCards
            stateName="India"
            stateSlug="india"
            service={indiaService}
            attribution="Data from LGD & Aviation Authority"
          />
        </CollapsibleSection>

        {/* Goa Section */}
        <CollapsibleSection
          title="Goa"
          icon={MapPin}
          badge="7"
          expanded={sectionsExpanded.goa}
          onToggle={toggleSection('goa')}
        >
          <GoaCards />
        </CollapsibleSection>

        {/* Karnataka Section */}
        <CollapsibleSection
          title="Karnataka"
          icon={Landmark}
          badge="1"
          expanded={sectionsExpanded.karnataka}
          onToggle={toggleSection('karnataka')}
        >
          <StateCards
            stateName="Karnataka"
            stateSlug="karnataka"
            service={karnatakaService}
            attribution="Data from KGISMAPS"
          />
        </CollapsibleSection>

        {/* Kerala Section */}
        <CollapsibleSection
          title="Kerala"
          icon={Landmark}
          badge="1"
          expanded={sectionsExpanded.kerala}
          onToggle={toggleSection('kerala')}
        >
          <StateCards
            stateName="Kerala"
            stateSlug="kerala"
            service={keralaService}
            attribution="Data from NCSCM"
          />
        </CollapsibleSection>

        {/* Maharashtra Section */}
        <CollapsibleSection
          title="Maharashtra"
          icon={Landmark}
          badge="1"
          expanded={sectionsExpanded.maharashtra}
          onToggle={toggleSection('maharashtra')}
        >
          <StateCards
            stateName="Maharashtra"
            stateSlug="maharashtra"
            service={maharashtraService}
            attribution="Data from NCSCM"
          />
        </CollapsibleSection>

        {/* Tamil Nadu Section */}
        <CollapsibleSection
          title="Tamil Nadu"
          icon={Landmark}
          badge="1"
          expanded={sectionsExpanded.tamilnadu}
          onToggle={toggleSection('tamilnadu')}
        >
          <StateCards
            stateName="Tamil Nadu"
            stateSlug="tamilnadu"
            service={tamilnaduService}
            attribution="Data from TNGIS"
          />
        </CollapsibleSection>

        {/* Andhra Pradesh Section */}
        <CollapsibleSection
          title="Andhra Pradesh"
          icon={Landmark}
          badge="1"
          expanded={sectionsExpanded.andhrapradesh}
          onToggle={toggleSection('andhrapradesh')}
        >
          <StateCards
            stateName="Andhra Pradesh"
            stateSlug="andhrapradesh"
            service={andhrapradeshService}
            attribution="Data from APSAC"
          />
        </CollapsibleSection>
      </div>
    </aside>
  );
};
