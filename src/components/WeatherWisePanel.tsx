import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, CloudRain, TrendingUp, MapPin, Calendar, Sparkles, Loader2, AlertCircle, Droplets, Wind, Gauge, Sun, Thermometer, CloudDrizzle, Activity, CalendarDays, LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";
import { weatherWiseService } from "@/services/weatherWise";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";

interface WeatherForecast {
  model_context: string;
  forecast_dates: string[];
  forecast: Record<string, number[]>;
}

interface WeatherWisePanelProps {
  isVisible: boolean;
  onClose: () => void;
  mapCoords?: { lat: number; lon: number } | null;
  availableCredits?: number | null;
}

export const WeatherWisePanel = ({ isVisible, onClose, mapCoords, availableCredits = 0 }: WeatherWisePanelProps) => {
  const WEATHERWISE_COST = 10;
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [date, setDate] = useState("");
  const [disasterType, setDisasterType] = useState("Normal");
  const [isLoading, setIsLoading] = useState(false);
  const [forecastData, setForecastData] = useState<WeatherForecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const disasterTypes = ["Normal", "Flood", "Drought", "Storm", "Landslide"];
  const selectedDate = date ? new Date(`${date}T00:00:00`) : undefined;

  // Auto-fill coordinates from map click
  useEffect(() => {
    if (mapCoords) {
      setLatitude(mapCoords.lat.toFixed(6));
      setLongitude(mapCoords.lon.toFixed(6));
    }
  }, [mapCoords]);

  const handlePredict = async () => {
    const credits = availableCredits ?? 0;
    if (credits < WEATHERWISE_COST) {
      window.dispatchEvent(new CustomEvent('credits:insufficient', {
        detail: {
          required_credits: WEATHERWISE_COST,
          remaining_credits: credits,
          model: 'weatherwise',
        }
      }));
      const errorMsg = 'Out of credits. Buy more credits to run WeatherWise forecasts.';
      setError(errorMsg);
      toast({
        title: 'Out of credits',
        description: errorMsg,
        variant: 'destructive'
      });
      return;
    }
    
    setError(null);
    setForecastData(null);
    
    if (!latitude || !longitude || !date) {
      const errorMsg = "Please fill in all required fields";
      setError(errorMsg);
      toast({
        title: "Validation Error",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      const errorMsg = "Latitude must be between -90 and 90";
      setError(errorMsg);
      toast({
        title: "Validation Error",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    if (isNaN(lon) || lon < -180 || lon > 180) {
      const errorMsg = "Longitude must be between -180 and 180";
      setError(errorMsg);
      toast({
        title: "Validation Error",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    toast({
      title: "Generating Forecast",
      description: "Please wait while we generate your weather forecast..."
    });

    try {
      const result = await weatherWiseService.generateForecast(
        lat,
        lon,
        date,
        disasterType,
        60
      );

      if (result.success && result.data) {
        setForecastData(result.data);
        setError(null);
        
        toast({
          title: "Forecast Generated",
          description: `60-day weather forecast using ${result.data.model_context} model`,
        });
      } else {
        const errorMsg = result.error || "Failed to generate forecast";
        setError(errorMsg);
        
        toast({
          title: "Forecast Failed",
          description: errorMsg,
          variant: "destructive"
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to generate forecast";
      console.error("[WEATHERWISE_PANEL] Exception:", err);
      
      setError(errorMsg);
      
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setLatitude("");
    setLongitude("");
    setDate("");
    setDisasterType("Normal");
    setForecastData(null);
    setError(null);
  };

  const handleDateSelection = (selected?: Date) => {
    if (!selected) {
      setDate("");
      return;
    }
    setDate(format(selected, "yyyy-MM-dd"));
  };

  const getLatestValue = (key: string): number | null => {
    if (!forecastData?.forecast?.[key]) return null;
    const values = forecastData.forecast[key].filter((v) => Number.isFinite(v));
    if (values.length === 0) return null;
    return values[values.length - 1];
  };

  const formatMetric = (value: number | null, unit = "") => {
    if (value === null || !Number.isFinite(value)) return "-";
    const precision = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 10 ? 1 : 2;
    return `${value.toFixed(precision)}${unit}`;
  };

  // Prepare chart data from forecast response
  const prepareChartData = (data: WeatherForecast | null) => {
    if (!data?.forecast_dates || !data?.forecast) {
      return [];
    }
    
    const dates = data.forecast_dates;
    const forecast = data.forecast;
    
    const chartData = dates.map((date: string, index: number) => {
      const dataPoint: Record<string, string | number> = {
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
      
      Object.keys(forecast).forEach(key => {
        dataPoint[key] = forecast[key]?.[index];
      });
      
      return dataPoint;
    });
    
    return chartData;
  };

  // Render a single chart
  const renderChart = (title: string, dataKey: string, color: string, icon?: React.ReactNode) => {
    const chartData = prepareChartData(forecastData);
    if (chartData.length === 0) return null;

    const formatYAxisTick = (value: number) => {
      if (!Number.isFinite(value)) return '';
      const abs = Math.abs(value);

      if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
      if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
      if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
      if (abs >= 100) return value.toFixed(0);
      if (abs >= 10) return value.toFixed(1);
      if (abs >= 1) return value.toFixed(2);
      return value.toFixed(3);
    };

    const values = chartData
      .map((d) => Number(d?.[dataKey]))
      .filter((v: number) => Number.isFinite(v));

    let yDomain: [number, number] | undefined;
    if (values.length > 0) {
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);

      if (minVal === maxVal) {
        const base = Math.abs(minVal) || 1;
        const pad = Math.max(base * 0.1, 0.1);
        yDomain = [minVal - pad, maxVal + pad];
      } else {
        const range = maxVal - minVal;
        const pad = Math.max(range * 0.12, 0.05);
        yDomain = [minVal - pad, maxVal + pad];
      }
    }

    return (
      <div className="rounded-lg p-4 border border-border bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              domain={yDomain}
              width={72}
              tick={{ fontSize: 10 }}
              tickCount={6}
              tickFormatter={formatYAxisTick}
              stroke="hsl(var(--muted-foreground))"
            />
            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} connectNulls={true} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  if (!isVisible) return null;

  return (
    <Card className={cn(
      "fixed top-4 right-4 w-[420px] max-w-[92vw] max-h-[90vh] z-[1600]",
      "bg-background/90 dark:bg-zinc-900/90 border border-border shadow-2xl animate-in slide-in-from-right-4 duration-500 backdrop-blur-xl overflow-hidden flex flex-col"
    )}>
      <div className="p-5 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-border/20">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight leading-none">WeatherWise</h3>
              <p className="text-[11px] text-muted-foreground leading-none mt-1">Forecast Analysis</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Input Form */}
        <div className="space-y-4">
          <div className="rounded-xl p-4 space-y-4 bg-muted/25 border border-border/70">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin className="w-4 h-4" />
              <span>Location & Parameters</span>
              </div>
              {mapCoords && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-background border border-border rounded-full px-2 py-1">
                  <LocateFixed className="w-3 h-3" />
                  Map Synced
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Latitude */}
              <div className="space-y-2">
                <Label htmlFor="ww-latitude" className="text-sm font-medium">
                  Latitude <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ww-latitude"
                  type="number"
                  step="0.0001"
                  placeholder="e.g., 22.9093"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="bg-background border border-input text-sm"
                />
              </div>

              {/* Longitude */}
              <div className="space-y-2">
                <Label htmlFor="ww-longitude" className="text-sm font-medium">
                  Longitude <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ww-longitude"
                  type="number"
                  step="0.0001"
                  placeholder="e.g., 76.4246"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="bg-background border border-input text-sm"
                />
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="ww-date" className="text-sm font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Reference Date <span className="text-red-500">*</span>
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="ww-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-between text-left font-normal bg-background",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <span>
                      {date ? format(selectedDate as Date, "PPP") : "Pick a reference date"}
                    </span>
                    <CalendarDays className="w-4 h-4 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="z-[2600] w-auto p-0" align="start" sideOffset={6}>
                  <DateCalendar
                    mode="single"
                    numberOfMonths={1}
                    selected={selectedDate}
                    onSelect={handleDateSelection}
                    disabled={(day) => day > new Date() || day < new Date("2000-01-01")}
                    className="rounded-lg border border-border bg-background p-3"
                    classNames={{
                      months: "flex flex-col",
                      month: "space-y-3",
                      caption: "flex justify-center pt-1 relative items-center",
                      caption_label: "text-sm font-semibold",
                      nav: "space-x-1 flex items-center",
                      head_row: "grid grid-cols-7 gap-1",
                      head_cell: "h-9 w-9 text-center text-xs text-muted-foreground font-medium",
                      row: "grid grid-cols-7 gap-1 mt-1",
                      cell: "h-9 w-9 p-0 text-center text-sm",
                      day: "h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground",
                      day_outside: "text-muted-foreground opacity-40",
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-[11px] text-muted-foreground">
                Recent NASA days may be missing; WeatherWise fetches maximum available data and fills missing tail values.
              </p>
            </div>

            {/* Disaster Type */}
            <div className="space-y-2">
              <Label htmlFor="ww-disasterType" className="text-sm font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Disaster Type Context
              </Label>
              <Select value={disasterType} onValueChange={setDisasterType}>
                <SelectTrigger id="ww-disasterType" className="bg-background">
                  <SelectValue placeholder="Select disaster type" />
                </SelectTrigger>
                <SelectContent className="z-[2600]">
                  {disasterTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Error</p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handlePredict}
              disabled={isLoading}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Forecasting...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Generate Forecast
                </>
              )}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="border-border/50 bg-background"
            >
              Reset
            </Button>
          </div>

          {/* Forecast Display Area */}
          {forecastData && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground pt-2 border-t border-border/50">
                <TrendingUp className="w-4 h-4" />
                <span>60-Day Weather Forecast (NASA POWER Variables)</span>
              </div>

              {/* Headline output metrics */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <p className="text-[11px] text-muted-foreground mb-1">Latest Temperature</p>
                  <p className="text-lg font-bold tracking-tight">{formatMetric(getLatestValue("temperature_C"), "°C")}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <p className="text-[11px] text-muted-foreground mb-1">Latest Precipitation</p>
                  <p className="text-lg font-bold tracking-tight">{formatMetric(getLatestValue("precipitation_mm"), " mm")}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <p className="text-[11px] text-muted-foreground mb-1">Latest Humidity</p>
                  <p className="text-lg font-bold tracking-tight">{formatMetric(getLatestValue("humidity_%"), "%")}</p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <p className="text-[11px] text-muted-foreground mb-1">Latest Wind Speed</p>
                  <p className="text-lg font-bold tracking-tight">{formatMetric(getLatestValue("wind_speed_mps"), " m/s")}</p>
                </div>
              </div>

              {/* Tabbed Charts (NASA POWER-related variables only) */}
              <Tabs defaultValue="core" className="w-full">
                <TabsList className="grid grid-cols-4 w-full bg-muted/40 border border-border/60">
                  <TabsTrigger value="core" className="text-xs">Core (6)</TabsTrigger>
                  <TabsTrigger value="temp" className="text-xs">Temp (2)</TabsTrigger>
                  <TabsTrigger value="moisture" className="text-xs">Moisture (6)</TabsTrigger>
                  <TabsTrigger value="risk" className="text-xs">Atmos (3)</TabsTrigger>
                </TabsList>

                {/* Core Weather Variables */}
                <TabsContent value="core" className="space-y-3 mt-3">
                  {renderChart("Temperature (°C)", "temperature_C", "#09090b", <Thermometer className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />)}
                  {renderChart("Precipitation (mm)", "precipitation_mm", "#27272a", <Droplets className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />)}
                  {renderChart("Humidity (%)", "humidity_%", "#3f3f46", <CloudRain className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />)}
                  {renderChart("Wind Speed (m/s)", "wind_speed_mps", "#52525b", <Wind className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />)}
                  {renderChart("Surface Pressure (hPa)", "surface_pressure_hPa", "#71717a", <Gauge className="w-4 h-4 text-zinc-500 dark:text-zinc-500" />)}
                  {renderChart("Solar Radiation (W/m²)", "solar_radiation_wm2", "#a1a1aa", <Sun className="w-4 h-4 text-zinc-400 dark:text-zinc-600" />)}
                </TabsContent>

                {/* Temperature Details */}
                <TabsContent value="temp" className="space-y-3 mt-3">
                  {renderChart("Max Temperature (°C)", "temperature_max_C", "#09090b", <Thermometer className="w-4 h-4 text-zinc-950 dark:text-zinc-50" />)}
                  {renderChart("Min Temperature (°C)", "temperature_min_C", "#27272a", <Thermometer className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />)}
                  {/* Engineered variables hidden for now:
                  {renderChart("Temperature Range (°C)", "temp_range", "#f59e0b", <Activity className="w-4 h-4 text-amber-500" />)}
                  {renderChart("Normalized Temperature", "temp_normalized", "#8b5cf6", <Activity className="w-4 h-4 text-violet-500" />)}
                  {renderChart("Heat Index", "heat_index", "#ef4444", <Activity className="w-4 h-4 text-red-500" />)}
                  {renderChart("Wind Chill", "wind_chill", "#06b6d4", <Activity className="w-4 h-4 text-cyan-500" />)}
                  {renderChart("Discomfort Index", "discomfort_index", "#f97316", <Activity className="w-4 h-4 text-orange-500" />)}
                  */}
                </TabsContent>

                {/* Moisture & Water */}
                <TabsContent value="moisture" className="space-y-3 mt-3">
                  {renderChart("Specific Humidity (g/kg)", "specific_humidity_g_kg", "#09090b", <Droplets className="w-4 h-4 text-zinc-950 dark:text-zinc-50" />)}
                  {renderChart("Dew Point (°C)", "dew_point_C", "#27272a", <Droplets className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />)}
                  {renderChart("Cloud Amount (%)", "cloud_amount_%", "#3f3f46", <CloudDrizzle className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />)}
                  {renderChart("Surface Soil Wetness (%)", "surface_soil_wetness_%", "#52525b", <Activity className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />)}
                  {renderChart("Root Zone Soil Moisture (%)", "root_zone_soil_moisture_%", "#71717a", <Activity className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />)}
                  {renderChart("Evapotranspiration (W/m²)", "evapotranspiration_wm2", "#a1a1aa", <Activity className="w-4 h-4 text-zinc-500 dark:text-zinc-500" />)}
                  {/* Engineered variables hidden for now:
                  {renderChart("Evaporation Deficit", "evaporation_deficit", "#f59e0b", <Activity className="w-4 h-4 text-amber-500" />)}
                  {renderChart("Soil Saturation Index", "soil_saturation_index", "#0891b2", <Activity className="w-4 h-4 text-cyan-600" />)}
                  {renderChart("Moisture Stress Index", "moisture_stress_index", "#dc2626", <Activity className="w-4 h-4 text-red-600" />)}
                  */}
                </TabsContent>

                {/* Atmospheric & Risk */}
                <TabsContent value="risk" className="space-y-3 mt-3">
                  {renderChart("Wind Speed 10m (m/s)", "wind_speed_10m_mps", "#09090b", <Wind className="w-4 h-4 text-zinc-950 dark:text-zinc-50" />)}
                  {renderChart("Wind Direction 10m (°)", "wind_direction_10m_degrees", "#27272a", <Wind className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />)}
                  {renderChart("Sea Level Pressure (hPa)", "sea_level_pressure_hPa", "#3f3f46", <Gauge className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />)}
                  {/* Engineered variables hidden for now:
                  {renderChart("Wind-Precip Interaction", "wind_precip_interaction", "#0891b2", <Activity className="w-4 h-4 text-cyan-600" />)}
                  {renderChart("Pressure Anomaly", "pressure_anomaly", "#6366f1", <Activity className="w-4 h-4 text-indigo-500" />)}
                  {renderChart("Atmospheric Instability", "atmospheric_instability", "#8b5cf6", <Activity className="w-4 h-4 text-violet-500" />)}
                  {renderChart("Solar-Temp Ratio", "solar_temp_ratio", "#fb923c", <Activity className="w-4 h-4 text-orange-400" />)}
                  {renderChart("Solar Radiation Anomaly", "solar_radiation_anomaly", "#fbbf24", <Activity className="w-4 h-4 text-amber-400" />)}
                  {renderChart("Adjusted Humidity", "adjusted_humidity", "#14b8a6", <Activity className="w-4 h-4 text-teal-500" />)}
                  {renderChart("High Precip Flag", "high_precip_flag", "#2563eb", <Activity className="w-4 h-4 text-blue-600" />)}
                  {renderChart("Weather Severity Score", "weather_severity_score", "#dc2626", <AlertCircle className="w-4 h-4 text-red-600" />)}
                  {renderChart("Drought Indicator", "drought_indicator", "#f59e0b", <Activity className="w-4 h-4 text-amber-500" />)}
                  {renderChart("Flood Risk Score", "flood_risk_score", "#0284c7", <Activity className="w-4 h-4 text-sky-600" />)}
                  {renderChart("Storm Intensity Index", "storm_intensity_index", "#7c3aed", <Activity className="w-4 h-4 text-violet-600" />)}
                  */}
                </TabsContent>
              </Tabs>

              {/* Forecast Summary */}
              <div className="rounded-xl p-4 space-y-2 bg-muted/20 border border-border/70">
                <div className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                  Forecast Summary
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Location</div>
                    <div className="font-medium">{latitude}, {longitude}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Reference Date</div>
                    <div className="font-medium">{date}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Disaster Context</div>
                    <div className="font-medium">{disasterType}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Forecast Horizon</div>
                    <div className="font-medium">60 Days</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
