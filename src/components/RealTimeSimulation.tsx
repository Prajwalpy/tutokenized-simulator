import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Cpu, Zap, Battery, Activity, Thermometer } from 'lucide-react';
import { useSystemMetrics } from '@/contexts/SystemMetricsContext';

const RealTimeSimulation = () => {
  const { metrics } = useSystemMetrics();
  
  // Fallback values if no metrics available
  const cpuUsage = metrics?.cpu.usage ?? 45;
  const gpuUsage = metrics?.gpu.usage ?? 78;
  const memoryUsage = metrics?.memory.usage_percent ?? 62;
  const cpuThreads = metrics?.cpu.threads ?? 16;
  const cpuClock = metrics?.cpu.clockSpeed ?? 3.2;
  const cpuTemp = metrics?.cpu.temperature ?? 72;
  const memoryTotal = metrics?.memory.total ?? 32;
  const memoryUsed = metrics?.memory.used ?? 8.4;
  const gpuMemoryUsed = metrics?.gpu.memory_used ?? 6200;
  const gpuMemoryTotal = metrics?.gpu.memory_total ?? 16000;
  const gpuTemp = metrics?.gpu.temperature ?? 72;
  const gpuName = metrics?.gpu.name ?? 'NVIDIA RTX 4080';
  
  // Calculate values
  const threadsInUse = Math.round((cpuUsage / 100) * cpuThreads);
  const cacheHitRate = 94.2; // This would need specific monitoring tools
  const gpuCoresInUse = Math.round((gpuUsage / 100) * 2560); // Assuming RTX 4080 cores
  const powerConsumption = Math.round((cpuUsage + gpuUsage) / 2 * 3.5); // Rough estimation
  const currentDraw = Math.round(powerConsumption * 2.17);
  const peakPower = 285;
  const energyCostPerHour = (currentDraw * 0.12 / 1000).toFixed(3); // $0.12/kWh estimate

  return (
    <div className="h-full">
      <Tabs defaultValue="cpu" className="h-full">
        <TabsList className="bg-white/50 border border-white/30 p-2 rounded-lg mb-6">
          <TabsTrigger 
            value="cpu" 
            className="flex items-center gap-3 data-[state=active]:bg-blue-500 data-[state=active]:text-white font-semibold px-6 py-3 rounded-lg"
          >
            <Cpu className="w-5 h-5" />
            CPU
          </TabsTrigger>
          <TabsTrigger 
            value="gpu" 
            className="flex items-center gap-3 data-[state=active]:bg-purple-500 data-[state=active]:text-white font-semibold px-6 py-3 rounded-lg"
          >
            <Zap className="w-5 h-5" />
            GPU
          </TabsTrigger>
          <TabsTrigger 
            value="energy" 
            className="flex items-center gap-3 data-[state=active]:bg-green-500 data-[state=active]:text-white font-semibold px-6 py-3 rounded-lg"
          >
            <Battery className="w-5 h-5" />
            Energy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cpu" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
              <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                CPU Utilization
              </h3>
              <Progress value={cpuUsage} className="mb-4 h-3 bg-blue-100" />
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-blue-700">{cpuUsage}%</p>
                <Badge className="bg-blue-100 text-blue-800 border-blue-300">Active</Badge>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
              <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Thread Count
              </h3>
              <div className="text-4xl font-bold text-green-700 mb-2">{threadsInUse}/{cpuThreads}</div>
              <p className="text-green-600 font-medium">Threads in use</p>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-bold mb-4 flex items-center gap-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Real-time</Badge>
              CPU Performance Metrics
            </h4>
            <div className="grid grid-cols-3 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-600 font-medium">Clock Speed:</span>
                <span className="font-mono text-gray-800">{cpuClock.toFixed(1)} GHz</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-600 font-medium">Cache Hit Rate:</span>
                <span className="font-mono text-gray-800">{cacheHitRate}%</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-600 font-medium">Memory Usage:</span>
                <span className="font-mono text-gray-800">{memoryUsed.toFixed(1)}/{memoryTotal} GB</span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="gpu" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-purple-50 border border-purple-200 p-6 rounded-lg">
              <h3 className="font-bold text-purple-800 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5" />
                GPU Utilization
              </h3>
              <Progress value={gpuUsage} className="mb-4 h-3 bg-purple-100" />
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold text-purple-700">{gpuUsage}%</p>
                <Badge className="bg-purple-100 text-purple-800 border-purple-300">High Load</Badge>
              </div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 p-6 rounded-lg">
              <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                CUDA Cores
              </h3>
              <div className="text-4xl font-bold text-orange-700 mb-2">{gpuCoresInUse}/2560</div>
              <p className="text-orange-600 font-medium">Cores in use</p>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-bold mb-4 flex items-center gap-3">
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">{gpuName}</Badge>
              GPU Performance Metrics
            </h4>
            <div className="grid grid-cols-3 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-600 font-medium">Memory Clock:</span>
                <span className="font-mono text-gray-800">1.4 GHz</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-600 font-medium">VRAM Usage:</span>
                <span className="font-mono text-gray-800">{(gpuMemoryUsed/1024).toFixed(1)}/{(gpuMemoryTotal/1024).toFixed(0)} GB</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-600 font-medium">Temperature:</span>
                <span className="font-mono text-gray-800">{gpuTemp}°C</span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="energy" className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
              <h3 className="font-bold text-green-800 mb-4 flex items-center gap-2">
                <Battery className="w-5 h-5" />
                Power Consumption
              </h3>
              <Progress value={memoryUsage} className="mb-4 h-3 bg-green-100" />
              <div className="flex items-center justify-between">
                <p className="text-lg text-green-600">{memoryUsage}% of 350W TDP</p>
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-green-600" />
                  <span className="text-green-700 font-semibold">{cpuTemp}°C</span>
                </div>
              </div>
            </div>
              <div className="bg-yellow-100 border border-yellow-400 p-6 rounded-lg">
              <h3 className="font-bold text-yellow-900 mb-4">Efficiency Score</h3>
              <div className="text-6xl font-bold text-yellow-800 mb-2">A+</div>
              <p className="text-yellow-700 font-medium">Power efficiency</p>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="font-bold mb-4 flex items-center gap-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Energy Monitor</Badge>
              Power Analysis
            </h4>
            <div className="grid grid-cols-3 gap-6">
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-600 font-medium">Current Draw:</span>
                <span className="font-mono text-gray-800">{currentDraw}W</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-600 font-medium">Peak Power:</span>
                <span className="font-mono text-gray-800">{peakPower}W</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-600 font-medium">Energy Cost/Hour:</span>
                <span className="font-mono text-gray-800">${energyCostPerHour}</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RealTimeSimulation;
