import { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

export const StatusIndicator = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsConnected(true);
    const handleOffline = () => setIsConnected(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="absolute top-4 left-4 z-[1000] bg-background/95 backdrop-blur-sm border border-border rounded-xl px-4 py-2 flex items-center gap-2 shadow-sm">
      {isConnected ? (
        <>
          <div className="w-2 h-2 rounded-full bg-success animate-pulse-glow" />
          <Wifi className="w-4 h-4 text-success" />
          <span className="text-sm font-medium">Connected</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
          <WifiOff className="w-4 h-4 text-error" />
          <span className="text-sm font-medium">Disconnected</span>
        </>
      )}
    </div>
  );
};
