import { Globe } from "lucide-react";
import { DatasetCard } from "./DatasetCard";
import { Leaf, Mountain, Lightbulb, Map, Thermometer } from "lucide-react";

export const Sidebar = () => {
  const datasets = [
    {
      id: "ndvi",
      name: "NDVI",
      title: "Vegetation Index",
      description: "Normalized Difference Vegetation Index",
      icon: Leaf,
      theme: "vegetation" as const,
      legend: [
        { color: "#8B4513", label: "Barren" },
        { color: "#DEB887", label: "Low Vegetation" },
        { color: "#90EE90", label: "Moderate Vegetation" },
        { color: "#228B22", label: "Dense Vegetation" },
      ],
    },
    {
      id: "elevation",
      name: "Elevation",
      title: "Terrain Elevation",
      description: "Digital Elevation Model",
      icon: Mountain,
      theme: "terrain" as const,
      legend: [
        { color: "#0066CC", label: "Sea Level" },
        { color: "#228B22", label: "Low Elevation" },
        { color: "#FFD700", label: "Mid Elevation" },
        { color: "#FF6347", label: "High Elevation" },
      ],
    },
    {
      id: "nightlights",
      name: "Nighttime Lights",
      title: "Night Illumination",
      description: "VIIRS Night Time Lights",
      icon: Lightbulb,
      theme: "lights" as const,
      legend: [
        { color: "#000000", label: "No Light" },
        { color: "#4B0082", label: "Low Light" },
        { color: "#FFD700", label: "Moderate Light" },
        { color: "#FFFFFF", label: "High Light" },
      ],
    },
    {
      id: "landcover",
      name: "Land Cover",
      title: "Land Classification",
      description: "MODIS Land Cover Types",
      icon: Map,
      theme: "landcover" as const,
      legend: [
        { color: "#228B22", label: "Forest" },
        { color: "#FFD700", label: "Grassland" },
        { color: "#CD853F", label: "Cropland" },
        { color: "#A9A9A9", label: "Urban" },
      ],
    },
    {
      id: "temperature",
      name: "Temperature",
      title: "Surface Temperature",
      description: "Land Surface Temperature",
      icon: Thermometer,
      theme: "temperature" as const,
      legend: [
        { color: "#0066CC", label: "Cold" },
        { color: "#00CC00", label: "Cool" },
        { color: "#FFD700", label: "Warm" },
        { color: "#FF0000", label: "Hot" },
      ],
    },
  ];

  return (
    <aside className="w-full lg:w-1/4 h-full bg-card/50 border-r border-border/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gradient-blue-purple p-6 shadow-glow">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-background/20 rounded-lg backdrop-blur-sm">
            <Globe className="w-6 h-6 text-primary-glow animate-spin-slow" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">GEO VISION</h1>
        </div>
        <p className="text-sm text-foreground/80 font-medium">Earth Engine Data Layers</p>
      </div>

      <div className="p-4 space-y-4">
        {datasets.map((dataset) => (
          <DatasetCard key={dataset.id} {...dataset} />
        ))}
      </div>
    </aside>
  );
};
