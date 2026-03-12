import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, CloudRain, TrendingUp, MapPin, Calendar, Sparkles, Loader2, AlertCircle, CheckCircle, Droplets, Wind, Gauge, Sun, Thermometer, CloudDrizzle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { weatherWiseService } from "@/services/weatherWise";
import { useToast } from "@/components/ui/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WeatherWisePanelProps {
  isVisible: boolean;
  onClose: () => void;
  mapCoords?: { lat: number; lon: number } | null;
}

export const WeatherWisePanel = ({ isVisible, onClose, mapCoords }: WeatherWisePanelProps) => {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [date, setDate] = useState("");
  const [disasterType, setDisasterType] = useState("Normal");
  const [isLoading, setIsLoading] = useState(false);
  const [forecastData, setForecastData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const { toast } = useToast();

  const disasterTypes = ["Normal", "Flood", "Drought", "Storm", "Landslide"];

  const addDebugLog = (message: string) => {
    console.log(`[WEATHERWISE_PANEL] ${message}`);
    setDebugInfo(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    if (isVisible) {
      addDebugLog("Panel opened - click on the map to select coordinates");
    }
  }, [isVisible]);

  // Auto-fill coordinates from map click
  useEffect(() => {
    if (mapCoords) {
      setLatitude(mapCoords.lat.toFixed(6));
      setLongitude(mapCoords.lon.toFixed(6));
      addDebugLog(`Coordinates set from map click: ${mapCoords.lat.toFixed(6)}, ${mapCoords.lon.toFixed(6)}`);
    }
  }, [mapCoords]);

  const handlePredict = async () => {
    addDebugLog("Generate Forecast button clicked");
    
    setError(null);
    setForecastData(null);
    setDebugInfo([]);
    
    addDebugLog("Validating inputs...");
    
    if (!latitude || !longitude || !date) {
      const errorMsg = "Please fill in all required fields";
      addDebugLog(`Validation failed: ${errorMsg}`);
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

    addDebugLog(`Parsed coordinates: lat=${lat}, lon=${lon}`);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      const errorMsg = "Latitude must be between -90 and 90";
      addDebugLog(`Validation failed: ${errorMsg}`);
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
      addDebugLog(`Validation failed: ${errorMsg}`);
      setError(errorMsg);
      toast({
        title: "Validation Error",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    addDebugLog("Validation passed");
    addDebugLog(`Request params: lat=${lat}, lon=${lon}, date=${date}, disasterType=${disasterType}`);
    
    setIsLoading(true);
    
    toast({
      title: "Generating Forecast",
      description: "Please wait while we generate your weather forecast..."
    });

    try {
      addDebugLog("Calling WeatherWise API...");
      
      const result = await weatherWiseService.generateForecast(
        lat,
        lon,
        date,
        disasterType,
        60
      );

      addDebugLog(`API call completed. Success: ${result.success}`);

      if (result.success && result.data) {
        addDebugLog("Forecast generated successfully");
        addDebugLog(`Model used: ${result.data.model_context}`);
        addDebugLog(`Forecast days: ${result.data.forecast_summary?.horizon_days}`);
        
        setForecastData(result.data);
        setError(null);
        
        toast({
          title: "Forecast Generated",
          description: `60-day weather forecast using ${result.data.model_context} model`,
        });
      } else {
        const errorMsg = result.error || "Failed to generate forecast";
        addDebugLog(`Forecast failed: ${errorMsg}`);
        setError(errorMsg);
        
        toast({
          title: "Forecast Failed",
          description: errorMsg,
          variant: "destructive"
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || "Failed to generate forecast";
      addDebugLog(`Exception occurred: ${errorMsg}`);
      console.error("[WEATHERWISE_PANEL] Exception:", err);
      
      setError(errorMsg);
      
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      addDebugLog("Request completed");
    }
  };

  const handleReset = () => {
    addDebugLog("Reset button clicked");
    setLatitude("");
    setLongitude("");
    setDate("");
    setDisasterType("Normal");
    setForecastData(null);
    setError(null);
    setDebugInfo([]);
  };

  // Prepare chart data from forecast response
  const prepareChartData = (data: any) => {
    if (!data?.forecast_dates || !data?.forecast) {
      return [];
    }
    
    const dates = data.forecast_dates;
    const forecast = data.forecast;
    
    const chartData = dates.map((date: string, index: number) => {
      const dataPoint: any = {
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
            <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
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
      "fixed top-4 right-4 w-96 max-w-[90vw] max-h-[90vh] overflow-y-auto z-[1100]",
      "bg-background border border-border shadow-xl animate-slide-in-from-right"
    )}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">WeatherWise</h3>
              <p className="text-xs text-muted-foreground">LSTM Weather Forecasting</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 hover:bg-red-500/10 hover:text-red-500"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Input Form */}
        <div className="space-y-4">
          <div className="rounded-lg p-4 space-y-4 bg-muted/30 border border-border">
            <div className="flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400">
              <MapPin className="w-4 h-4" />
              <span>Location & Parameters</span>
            </div>

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

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="ww-date" className="text-sm font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Reference Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ww-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-background border border-input text-sm"
              />
            </div>

            {/* Disaster Type */}
            <div className="space-y-2">
              <Label htmlFor="ww-disasterType" className="text-sm font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Disaster Type Context
              </Label>
              <select
                id="ww-disasterType"
                value={disasterType}
                onChange={(e) => setDisasterType(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                {disasterTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
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

          {/* Debug Info Display */}
          {debugInfo.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 max-h-40 overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Debug Log</p>
              </div>
              <div className="space-y-1">
                {debugInfo.map((log, idx) => (
                  <p key={idx} className="text-xs font-mono text-blue-600 dark:text-blue-400">
                    {log}
                  </p>
                ))}
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
              className="border-border/50"
            >
              Reset
            </Button>
          </div>

          {/* Forecast Display Area */}
          {forecastData && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400 pt-2 border-t border-border/50">
                <TrendingUp className="w-4 h-4" />
                <span>60-Day Weather Forecast (36 Variables)</span>
              </div>

              {/* Tabbed Charts for All 36 Variables */}
              <Tabs defaultValue="core" className="w-full">
                <TabsList className="grid grid-cols-4 w-full bg-purple-500/10">
                  <TabsTrigger value="core" className="text-xs">Core (6)</TabsTrigger>
                  <TabsTrigger value="temp" className="text-xs">Temp (7)</TabsTrigger>
                  <TabsTrigger value="moisture" className="text-xs">Moisture (9)</TabsTrigger>
                  <TabsTrigger value="risk" className="text-xs">Risk (13)</TabsTrigger>
                </TabsList>

                {/* Core Weather Variables */}
                <TabsContent value="core" className="space-y-3 mt-3">
                  {renderChart("Temperature (°C)", "temperature_C", "#f97316", <Thermometer className="w-4 h-4 text-orange-500" />)}
                  {renderChart("Precipitation (mm)", "precipitation_mm", "#3b82f6", <Droplets className="w-4 h-4 text-blue-500" />)}
                  {renderChart("Humidity (%)", "humidity_%", "#06b6d4", <CloudRain className="w-4 h-4 text-cyan-500" />)}
                  {renderChart("Wind Speed (m/s)", "wind_speed_mps", "#22c55e", <Wind className="w-4 h-4 text-green-500" />)}
                  {renderChart("Surface Pressure (hPa)", "surface_pressure_hPa", "#6366f1", <Gauge className="w-4 h-4 text-indigo-500" />)}
                  {renderChart("Solar Radiation (W/m²)", "solar_radiation_wm2", "#eab308", <Sun className="w-4 h-4 text-yellow-500" />)}
                </TabsContent>

                {/* Temperature Details */}
                <TabsContent value="temp" className="space-y-3 mt-3">
                  {renderChart("Max Temperature (°C)", "temperature_max_C", "#dc2626", <Thermometer className="w-4 h-4 text-red-600" />)}
                  {renderChart("Min Temperature (°C)", "temperature_min_C", "#0ea5e9", <Thermometer className="w-4 h-4 text-sky-500" />)}
                  {renderChart("Temperature Range (°C)", "temp_range", "#f59e0b", <Activity className="w-4 h-4 text-amber-500" />)}
                  {renderChart("Normalized Temperature", "temp_normalized", "#8b5cf6", <Activity className="w-4 h-4 text-violet-500" />)}
                  {renderChart("Heat Index", "heat_index", "#ef4444", <Activity className="w-4 h-4 text-red-500" />)}
                  {renderChart("Wind Chill", "wind_chill", "#06b6d4", <Activity className="w-4 h-4 text-cyan-500" />)}
                  {renderChart("Discomfort Index", "discomfort_index", "#f97316", <Activity className="w-4 h-4 text-orange-500" />)}
                </TabsContent>

                {/* Moisture & Water */}
                <TabsContent value="moisture" className="space-y-3 mt-3">
                  {renderChart("Specific Humidity (g/kg)", "specific_humidity_g_kg", "#0ea5e9", <Droplets className="w-4 h-4 text-sky-500" />)}
                  {renderChart("Dew Point (°C)", "dew_point_C", "#06b6d4", <Droplets className="w-4 h-4 text-cyan-500" />)}
                  {renderChart("Cloud Amount (%)", "cloud_amount_%", "#94a3b8", <CloudDrizzle className="w-4 h-4 text-slate-400" />)}
                  {renderChart("Surface Soil Wetness (%)", "surface_soil_wetness_%", "#854d0e", <Activity className="w-4 h-4 text-yellow-900" />)}
                  {renderChart("Root Zone Soil Moisture (%)", "root_zone_soil_moisture_%", "#78350f", <Activity className="w-4 h-4 text-amber-900" />)}
                  {renderChart("Evapotranspiration (W/m²)", "evapotranspiration_wm2", "#14b8a6", <Activity className="w-4 h-4 text-teal-500" />)}
                  {renderChart("Evaporation Deficit", "evaporation_deficit", "#f59e0b", <Activity className="w-4 h-4 text-amber-500" />)}
                  {renderChart("Soil Saturation Index", "soil_saturation_index", "#0891b2", <Activity className="w-4 h-4 text-cyan-600" />)}
                  {renderChart("Moisture Stress Index", "moisture_stress_index", "#dc2626", <Activity className="w-4 h-4 text-red-600" />)}
                </TabsContent>

                {/* Atmospheric & Risk */}
                <TabsContent value="risk" className="space-y-3 mt-3">
                  {renderChart("Wind Speed 10m (m/s)", "wind_speed_10m_mps", "#10b981", <Wind className="w-4 h-4 text-emerald-500" />)}
                  {renderChart("Wind Direction 10m (°)", "wind_direction_10m_degrees", "#22c55e", <Wind className="w-4 h-4 text-green-500" />)}
                  {renderChart("Wind-Precip Interaction", "wind_precip_interaction", "#0891b2", <Activity className="w-4 h-4 text-cyan-600" />)}
                  {renderChart("Sea Level Pressure (hPa)", "sea_level_pressure_hPa", "#3b82f6", <Gauge className="w-4 h-4 text-blue-500" />)}
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
                </TabsContent>
              </Tabs>

              {/* Forecast Summary */}
              <div className="rounded-lg p-4 space-y-2 bg-muted/30 border border-border">
                <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2">
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
