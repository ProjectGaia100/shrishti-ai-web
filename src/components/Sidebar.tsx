import { DatasetCard } from "./DatasetCard";
import { HazardGuardCard } from "./HazardGuardCard";
import type { HazardGuardMode } from "./HazardGuardCard";
import { WeatherWiseCard } from "./WeatherWiseCard";
import { GeoVisionCard } from "./GeoVisionCard";
import { SatelliteTimelapseCard } from "./SatelliteTimelapseCard";
import type { TimelapseFrame } from "@/services/api";
import { Layers, Mountain, Lightbulb, Map, Thermometer, Leaf } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const Sidebar = ({ onHazardGuardModeChange, onWeatherWiseOpen, onGeoVisionOpen, onTimelapseLoaded, onTimelapseClose, isTimelapseActive }: {
  onHazardGuardModeChange: (isActive: boolean, mode: HazardGuardMode, samplePoints: number) => void;
  onWeatherWiseOpen?: () => void;
  onGeoVisionOpen?: () => void;
  onTimelapseLoaded?: (frames: TimelapseFrame[], title: string, dataset: string) => void;
  onTimelapseClose?: () => void;
  isTimelapseActive?: boolean;
}) => {
  const datasets = [
    {
      id: "ndvi",
      name: "NDVI",
      title: "Vegetation Index",
      description: "Normalized Difference Vegetation Index",
      icon: Leaf,
      theme: "vegetation" as const,
      legend: [
        { color: "#A52A2A", label: "No vegetation (0.0–0.3)" },
        { color: "#FFFF00", label: "Sparse vegetation (0.3–0.6)" },
        { color: "#008000", label: "Healthy vegetation (0.6–1.0)" },
      ],
    },
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

      <div className="space-y-3 py-2">
        {/* HazardGuard Card */}
        <HazardGuardCard onModeChange={onHazardGuardModeChange} />
        
        {/* WeatherWise Card */}
        {onWeatherWiseOpen && <WeatherWiseCard onOpenPanel={onWeatherWiseOpen} />}

        {/* GeoVision Fusion Card */}
        {onGeoVisionOpen && <GeoVisionCard onOpenPanel={onGeoVisionOpen} />}

        {/* Satellite Timelapse Card */}
        {onTimelapseLoaded && onTimelapseClose && (
          <SatelliteTimelapseCard
            onTimelapseLoaded={onTimelapseLoaded}
            onTimelapseClose={onTimelapseClose}
            isActive={isTimelapseActive ?? false}
          />
        )}

        {/* Data Layers divider */}
        <div className="px-4 pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Layers</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>

        {/* Dataset Cards */}
        {datasets.map((dataset) => (
          <DatasetCard key={dataset.id} {...dataset} />
        ))}
      </div>
    </aside>
  );
};
