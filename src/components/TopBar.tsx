
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Upload, Zap, Database, Wifi, WifiOff } from 'lucide-react';

const TopBar = () => {
  const [nvidiaConnected, setNvidiaConnected] = useState(false);
  const [solAccess, setSolAccess] = useState(false);

  return (
    <div className="glass-card bg-white/80 backdrop-blur-xl border-0 border-b border-gray-200/50 px-8 py-6 shadow-lg">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-8">
          {/* NVIDIA API Connection */}
          <div className="flex items-center gap-4 glass-card bg-white/60 backdrop-blur-sm border border-gray-200/50 px-6 py-3 rounded-2xl hover-lift">
            <div className="flex items-center gap-3">
              {nvidiaConnected ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-500" />
              )}              <Zap className="w-5 h-5 text-nvidia-green" />
              <span className="font-semibold text-gray-800">NVIDIA APIs</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className={`status-dot ${nvidiaConnected ? 'bg-nvidia-green' : 'bg-red-400'}`}></div>
              <Badge 
                variant={nvidiaConnected ? "default" : "secondary"} 
                className={`${nvidiaConnected ? 'bg-nvidia-green/20 text-nvidia-green-dark border-nvidia-green' : 'bg-red-100 text-red-800 border-red-300'} font-medium`}
              >
                {nvidiaConnected ? "Connected" : "Disconnected"}
              </Badge>
              <Button
                size="sm"
                variant={nvidiaConnected ? "outline" : "default"}
                onClick={() => setNvidiaConnected(!nvidiaConnected)}                className={`transition-all duration-300 ${
                  nvidiaConnected 
                    ? 'hover:bg-red-50 hover:text-red-600 hover:border-red-300' 
                    : 'bg-gradient-to-r from-nvidia-green to-nvidia-green-light hover:from-nvidia-green-dark hover:to-nvidia-green text-white border-0'
                }`}
              >
                {nvidiaConnected ? "Disconnect" : "Connect"}
              </Button>
            </div>
          </div>

          {/* Sol Access Toggle */}          <div className="flex items-center gap-4 glass-card bg-white/60 backdrop-blur-sm border border-gray-200/50 px-6 py-3 rounded-2xl hover-lift">
            <Database className="w-5 h-5 text-asu-maroon" />
            <span className="font-semibold text-gray-800">Sol Access</span>
            <div className="flex items-center gap-3">
              <div className={`status-dot ${solAccess ? 'bg-asu-maroon' : 'bg-gray-400'}`}></div>
              <Switch
                checked={solAccess}
                onCheckedChange={setSolAccess}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-asu-maroon data-[state=checked]:to-asu-maroon-light"
              />
            </div>
          </div>
        </div>

        {/* Dataset Upload */}
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="glass-card bg-white/60 backdrop-blur-sm border border-gray-200/50 hover:bg-white/80 hover:scale-105 transition-all duration-300 px-6 py-3 rounded-2xl font-medium"
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Dataset
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
