import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Volume2, Maximize2, ZoomIn, ZoomOut, Download } from 'lucide-react';
import SimpleVideoPlayer from './SimpleVideoPlayer';
import { useSystemMetrics } from '@/contexts/SystemMetricsContext';

interface VideoSimulationProps {
  executionResult?: {
    success: boolean;
    output: string;
    error: string;
    video_data?: {
      type?: string;
      frames?: Array<{
        frame: number;
        timestamp: number;
        image: string;
      }>;
      fps?: number;
      resolution?: [number, number];
      frame_count?: number;
      duration?: number;
      // GIF-specific data
      gif_data?: string; // base64-encoded GIF data
      gif_bytestream?: number[]; // raw GIF bytestream as array of ints
      gif_url?: string;
      gif_filename?: string;
      file_size_bytes?: number;
      // Benchmark data from volume.py
      benchmark_data?: {
        system_info?: {
          cpu?: {
            name?: string;
            cores?: number;
            threads?: number;
            utilization?: number;
            frequency?: number;
          };
          memory?: {
            total?: number;
            used?: number;
            available?: number;
            percent?: number;
          };
          gpu?: {
            name?: string;
            memory_total?: number;
            memory_used?: number;
            utilization?: number;
          };
          platform?: {
            system?: string;
            version?: string;
            architecture?: string;
            python_version?: string;
          };
        };
        performance_metrics?: {
          total_time?: number;
          frame_count?: number;
          avg_frame_time?: number;
          avg_field_generation?: number;
          avg_marching_cubes?: number;
          avg_rendering?: number;
          gif_creation_time?: number;
          frame_conversion_time?: number;
          effective_fps?: number;
        };
        individual_frame_times?: number[];
        field_generation_times?: number[];
        marching_cubes_times?: number[];
        rendering_times?: number[];
        simulation_settings?: {
          resolution?: [number, number];
          dimension?: number;
          num_frames?: number;
          fps?: number;
          torus_altitude?: number;
          torus_major_radius?: number;
          torus_minor_radius?: number;
          smooth_min_radius?: number;
        };        error_occurred?: boolean;
      };
    };
    // Hardware benchmarks from benchmarking.py
    hardware_benchmarks?: {
      status: string;
      execution_time: number;
      script_output?: string;
      script_errors?: string;
      benchmark_data?: {
        system_info?: {
          os?: {
            system?: string;
            version?: string;
            platform?: string;
          };
          cpu?: {
            brand?: string;
            architecture?: string;
            cores?: number;
            frequency?: number;
          };
          memory?: {
            total?: number;
          };
          python?: {
            version?: string;
          };
        };
        system_metrics?: Array<{
          timestamp: number;
          cpu_percent: number;
          memory_percent: number;
          memory_total?: number;
          memory_used?: number;
          memory_available?: number;
          cpu_count?: number;
          cpu_freq_current?: number;
        }>;
        gpu_metrics?: Array<{
          gpu_id: number;
          name: string;
          utilization_percent: number;
          memory_used_mb: number;
          memory_total_mb: number;
          memory_percent: number;
          temperature_c: number;
          power_draw_w?: number;
          clock_graphics_mhz?: number;
          clock_memory_mhz?: number;
        }>;
        performance_summary?: {
          monitoring_duration: number;
          avg_cpu_usage: number;
          max_cpu_usage: number;
          avg_memory_usage: number;
          max_memory_usage: number;
          avg_gpu_utilization?: number;
          max_gpu_utilization?: number;
          avg_gpu_memory_usage?: number;
          max_gpu_memory_usage?: number;
        };
      };
      script_name?: string;
    };
  };
}

const VideoSimulation: React.FC<VideoSimulationProps> = ({ executionResult }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(120); // 2 minutes fallback
  const { updateMetrics, updateBenchmarks } = useSystemMetrics();

  // Process benchmark data from volume.py when execution result changes
  useEffect(() => {
    if (executionResult?.success && executionResult.video_data?.benchmark_data) {
      const benchmarkData = executionResult.video_data.benchmark_data;
      
      // Update system metrics if available
      if (benchmarkData.system_info) {
        const systemInfo = benchmarkData.system_info;
        const metrics = {
          cpu: {
            usage: systemInfo.cpu?.utilization || 0,
            threads: systemInfo.cpu?.threads || 1,
            clockSpeed: (systemInfo.cpu?.frequency || 0) / 1000, // Convert MHz to GHz
            temperature: 0, // Not available from volume.py
            model: systemInfo.cpu?.name || 'Unknown CPU'
          },
          memory: {
            total: systemInfo.memory?.total || 0,
            used: systemInfo.memory?.used || 0,
            free: systemInfo.memory?.available || 0,
            usage_percent: systemInfo.memory?.percent || 0
          },
          gpu: {
            usage: systemInfo.gpu?.utilization || 0,
            memory_used: systemInfo.gpu?.memory_used || 0,
            memory_total: systemInfo.gpu?.memory_total || 0,
            temperature: 0, // Not available from volume.py
            name: systemInfo.gpu?.name || 'Unknown GPU'
          },
          system: {
            platform: systemInfo.platform?.system || 'Unknown',
            arch: systemInfo.platform?.architecture || 'Unknown',
            uptime: 0,
            loadavg: []
          }
        };
        updateMetrics(metrics);
      }

      // Create benchmark results from volume.py performance metrics
      if (benchmarkData.performance_metrics) {
        const perfMetrics = benchmarkData.performance_metrics;
        const benchmarks = {
          matrix_multiplication: {
            time: perfMetrics.avg_field_generation || 0,
            score: perfMetrics.avg_field_generation ? Math.round(1000 / (perfMetrics.avg_field_generation * 10)) : 0,
            status: (perfMetrics.avg_field_generation || 0) < 0.1 ? 'Excellent' : 
                   (perfMetrics.avg_field_generation || 0) < 0.2 ? 'Good' : 'Average'
          },
          memory_access: {
            time: perfMetrics.avg_marching_cubes || 0,
            score: perfMetrics.avg_marching_cubes ? Math.round(1000 / (perfMetrics.avg_marching_cubes * 5)) : 0,
            status: (perfMetrics.avg_marching_cubes || 0) < 0.1 ? 'Excellent' : 
                   (perfMetrics.avg_marching_cubes || 0) < 0.3 ? 'Good' : 'Average'
          },
          cpu_intensive: {
            time: perfMetrics.avg_rendering || 0,
            score: perfMetrics.avg_rendering ? Math.round(1000 / (perfMetrics.avg_rendering * 8)) : 0,
            status: (perfMetrics.avg_rendering || 0) < 0.1 ? 'Excellent' : 
                   (perfMetrics.avg_rendering || 0) < 0.25 ? 'Good' : 'Average'
          },
          io_operations: {
            time: perfMetrics.frame_conversion_time || 0,
            score: perfMetrics.frame_conversion_time ? Math.round(1000 / (perfMetrics.frame_conversion_time * 2)) : 0,
            status: (perfMetrics.frame_conversion_time || 0) < 1.0 ? 'Excellent' : 
                   (perfMetrics.frame_conversion_time || 0) < 3.0 ? 'Good' : 'Average'
          },
          python_version: benchmarkData.system_info?.platform?.python_version || '3.x',
          system_info: {
            warp_simulation: true,
            total_simulation_time: perfMetrics.total_time,
            effective_fps: perfMetrics.effective_fps,
            frame_count: perfMetrics.frame_count
          }
        };        updateBenchmarks(benchmarks);
      }
    }

    // Process hardware benchmark data from benchmarking.py
    if (executionResult?.success && executionResult.hardware_benchmarks) {
      const hardwareBenchmarks = executionResult.hardware_benchmarks;
      console.log('🔧 Processing hardware benchmark data:', hardwareBenchmarks);
      
      // Update system metrics from hardware benchmarking if available
      if (hardwareBenchmarks.benchmark_data?.system_metrics?.length > 0) {
        // Use the latest system metrics
        const latestMetrics = hardwareBenchmarks.benchmark_data.system_metrics[
          hardwareBenchmarks.benchmark_data.system_metrics.length - 1
        ];
        
        const hardwareMetrics = {
          cpu: {
            usage: latestMetrics.cpu_percent || 0,
            threads: latestMetrics.cpu_count || 1,
            clockSpeed: latestMetrics.cpu_freq_current ? latestMetrics.cpu_freq_current / 1000 : 0,
            temperature: 0, // May be available in GPU metrics
            model: hardwareBenchmarks.benchmark_data.system_info?.cpu?.brand || 'Unknown CPU'
          },
          memory: {
            total: Math.round((latestMetrics.memory_total || 0) / (1024**3)), // Convert to GB
            used: Math.round((latestMetrics.memory_used || 0) / (1024**3)),
            free: Math.round((latestMetrics.memory_available || 0) / (1024**3)),
            usage_percent: latestMetrics.memory_percent || 0
          },
          gpu: {
            usage: 0,
            memory_used: 0,
            memory_total: 0,
            temperature: 0,
            name: 'N/A'
          },
          system: {
            platform: hardwareBenchmarks.benchmark_data.system_info?.os?.system || 'Unknown',
            arch: hardwareBenchmarks.benchmark_data.system_info?.cpu?.architecture || 'Unknown',
            uptime: 0,
            loadavg: []
          }
        };

        // Update GPU metrics if available
        if (hardwareBenchmarks.benchmark_data?.gpu_metrics?.length > 0) {
          const latestGpu = hardwareBenchmarks.benchmark_data.gpu_metrics[
            hardwareBenchmarks.benchmark_data.gpu_metrics.length - 1
          ];
          hardwareMetrics.gpu = {
            usage: latestGpu.utilization_percent || 0,
            memory_used: latestGpu.memory_used_mb || 0,
            memory_total: latestGpu.memory_total_mb || 0,
            temperature: latestGpu.temperature_c || 0,
            name: latestGpu.name || 'Unknown GPU'
          };
        }

        updateMetrics(hardwareMetrics);
      }      // Create extended benchmark results that include hardware monitoring
      if (hardwareBenchmarks.benchmark_data?.performance_summary) {
        const perfSummary = hardwareBenchmarks.benchmark_data.performance_summary;
        const extendedBenchmarks = {
          // Required fields for Benchmarks interface
          matrix_multiplication: {
            time: hardwareBenchmarks.execution_time || 0,
            score: Math.round(100 / (hardwareBenchmarks.execution_time || 1)),
            status: (hardwareBenchmarks.execution_time || 0) < 5 ? 'Excellent' : 
                   (hardwareBenchmarks.execution_time || 0) < 15 ? 'Good' : 'Average'
          },
          memory_access: {
            time: perfSummary.avg_memory_usage || 0,
            score: Math.round(100 - (perfSummary.avg_memory_usage || 0)),
            status: (perfSummary.avg_memory_usage || 0) < 70 ? 'Excellent' : 
                   (perfSummary.avg_memory_usage || 0) < 85 ? 'Good' : 'High'
          },
          cpu_intensive: {
            time: perfSummary.avg_cpu_usage || 0,
            score: Math.round((perfSummary.avg_cpu_usage || 0) * 1.2),
            status: (perfSummary.avg_cpu_usage || 0) > 60 ? 'Excellent' : 
                   (perfSummary.avg_cpu_usage || 0) > 30 ? 'Good' : 'Low'
          },
          io_operations: {
            time: perfSummary.avg_gpu_utilization || 0,
            score: Math.round((perfSummary.avg_gpu_utilization || 0) * 10),
            status: (perfSummary.avg_gpu_utilization || 0) > 80 ? 'Excellent' : 
                   (perfSummary.avg_gpu_utilization || 0) > 50 ? 'Good' : 'Low'
          },
          python_version: hardwareBenchmarks.benchmark_data?.system_info?.python?.version || '3.x',
          system_info: {
            hardware_monitoring: true,
            execution_time: hardwareBenchmarks.execution_time,
            script_name: hardwareBenchmarks.script_name,
            monitoring_duration: perfSummary.monitoring_duration
          }
        };
        
        updateBenchmarks(extendedBenchmarks);
      }
    }
  }, [executionResult, updateMetrics, updateBenchmarks]);

  // Debug logging
  useEffect(() => {
    console.log('🎬 VideoSimulation received executionResult:', {
      hasResult: !!executionResult,
      success: executionResult?.success,
      hasVideoData: !!executionResult?.video_data,
      videoDataType: executionResult?.video_data?.type,
      frameCount: executionResult?.video_data?.frames?.length,
      outputLength: executionResult?.output?.length,
      hasBenchmarkData: !!executionResult?.video_data?.benchmark_data,
      benchmarkSystemInfo: !!executionResult?.video_data?.benchmark_data?.system_info,
      benchmarkPerformanceMetrics: !!executionResult?.video_data?.benchmark_data?.performance_metrics,
      fullExecutionResult: executionResult
    });
  }, [executionResult]);

  const videoData = executionResult?.video_data;
  
  // Fallback: try to parse GIF_OUTPUT from raw output if video_data is missing
  let fallbackVideoData = null;
  if (!videoData && executionResult?.output) {
    try {
      const gifOutputMatch = executionResult.output.match(/GIF_OUTPUT:(.+)/);
      if (gifOutputMatch) {
        fallbackVideoData = JSON.parse(gifOutputMatch[1]);
        console.log('🔄 Found GIF_OUTPUT in raw output:', fallbackVideoData);
      }
    } catch (e) {
      console.warn('Failed to parse GIF_OUTPUT from raw output:', e);
    }
  }
  
  const actualVideoData = videoData || fallbackVideoData;
  
  // Check if we have video frame data or GIF data
  const hasVideoFrames = actualVideoData?.type === 'video_frames' && 
                        actualVideoData?.frames && 
                        actualVideoData.frames.length > 0;
  const hasGifData = actualVideoData?.type === 'gif_animation' && 
                    (actualVideoData?.gif_data || actualVideoData?.gif_bytestream || actualVideoData?.gif_url || actualVideoData?.gif_filename);
  
  const frames = actualVideoData?.frames || [];
  const fps = actualVideoData?.fps || 30;
  const resolution = actualVideoData?.resolution || [512, 384];
  console.log('🎬 VideoSimulation render:', {
    hasVideoFrames,
    hasGifData,
    frameCount: frames.length,
    fps,
    resolution,
    executionSuccess: executionResult?.success,
    videoDataType: actualVideoData?.type,
    videoDataKeys: actualVideoData ? Object.keys(actualVideoData) : [],
    fullVideoData: actualVideoData,
    fallbackVideoData,
    // --- Enhanced GIF data debugging ---
    gifDataPresent: !!actualVideoData?.gif_data,
    gifDataLength: actualVideoData?.gif_data ? actualVideoData.gif_data.length : 0,
    gifDataPreview: actualVideoData?.gif_data ? actualVideoData.gif_data.substring(0, 50) + '...' : null,
    gifBytestreamPresent: !!actualVideoData?.gif_bytestream,
    gifBytestreamLength: actualVideoData?.gif_bytestream ? actualVideoData.gif_bytestream.length : 0,
    gifBytestreamFirstBytes: actualVideoData?.gif_bytestream ? actualVideoData.gif_bytestream.slice(0, 10) : null,
    gifUrlPresent: !!actualVideoData?.gif_url,
    gifFilenamePresent: !!actualVideoData?.gif_filename,
    // Raw execution result for debugging
    rawOutput: executionResult?.output ? executionResult.output.substring(0, 200) + '...' : null
  });  // If we have GIF data, display it directly in the browser
  if (hasGifData) {
    // State for zoom and scroll controls
    const [zoomLevel, setZoomLevel] = useState(1);
    
    // Create GIF blob URL from bytestream or base64 data
    const createGifUrl = () => {
      if (actualVideoData?.gif_bytestream && actualVideoData.gif_bytestream.length > 0) {
        try {
          const byteArray = new Uint8Array(actualVideoData.gif_bytestream);
          const blob = new Blob([byteArray], { type: 'image/gif' });
          return URL.createObjectURL(blob);
        } catch (e) {
          console.error('Failed to create blob from bytestream:', e);
          return null;
        }
      } else if (actualVideoData?.gif_data) {
        return `data:image/gif;base64,${actualVideoData.gif_data}`;
      } else if (actualVideoData?.gif_url) {
        return actualVideoData.gif_url;
      } else if (actualVideoData?.gif_filename) {
        return `http://localhost:3001/gifs/${actualVideoData.gif_filename}`;
      }
      return null;
    };

    const gifUrl = createGifUrl();

    // Zoom controls
    const zoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 5));
    const zoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.1));
    const resetZoom = () => setZoomLevel(1);

    // Download function
    const downloadGif = () => {
      if (!gifUrl) return;
      const link = document.createElement('a');
      link.href = gifUrl;
      link.download = actualVideoData?.gif_filename || 'warp_simulation.gif';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };    return (
      <div className="space-y-6 w-full max-w-6xl mx-auto px-4">
        {/* Fixed-size GIF Display Card */}
        <Card className="bg-gradient-to-br from-slate-900/90 to-purple-900/90 backdrop-blur-xl border border-white/20 w-full max-w-4xl mx-auto overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-white flex items-center gap-2">
                🎞️ Animation
                <Badge variant="secondary" className="ml-2">
                  GIF • {actualVideoData?.frame_count} frames
                </Badge>
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  onClick={downloadGif}
                  variant="outline"
                  size="sm"
                  className="text-black border-white/30 hover:bg-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-4">
            {/* Zoom Controls */}
            <div className="flex justify-center gap-2 mb-4">
              <Button
                onClick={zoomOut}
                variant="outline"
                size="sm"
                className="text-black border-white/30 hover:bg-white/10"
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button
                onClick={resetZoom}
                variant="outline"
                size="sm"
                className="text-black border-white/30 hover:bg-white/10 min-w-[80px]"
              >
                {Math.round(zoomLevel * 100)}%
              </Button>
              <Button
                onClick={zoomIn}
                variant="outline"
                size="sm"
                className="text-black border-white/30 hover:bg-white/10"
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>            {/* Fixed size GIF container with scroll */}
            <div 
              className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border-2 border-gray-600 w-full h-96 overflow-auto max-w-full"
              style={{ scrollBehavior: 'smooth', contain: 'layout' }}
            >
              {gifUrl ? (
                <div className="p-4 flex items-start justify-start min-w-full min-h-full">
                  <img
                    src={gifUrl}
                    alt="Animation"
                    className="rounded shadow-lg block"
                    style={{ 
                      imageRendering: 'crisp-edges',
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'top left',
                      transition: 'transform 0.2s ease-in-out'
                    }}
                    onLoad={() => console.log('✅ GIF loaded successfully')}
                    onError={(e) => console.error('❌ GIF failed to load:', e)}                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="w-24 h-24 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                      <Play className="w-12 h-12 ml-1" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Failed to Load GIF</h3>
                    <p className="text-blue-200">Check console for details</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>        </Card>        {/* Video Information Cards - Fixed Height */}
        <div className="w-full max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card bg-gradient-to-br from-blue-50/80 to-cyan-50/80 backdrop-blur-sm border border-blue-200/50 p-6 rounded-2xl hover-lift h-48 border-2">
            <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
              🎞️ Animation Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Resolution:</span>
                <span className="font-mono text-blue-700">{resolution[0]}x{resolution[1]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frame Rate:</span>
                <span className="font-mono text-blue-700">{fps} FPS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frames:</span>
                <span className="font-mono text-blue-700">{actualVideoData?.frame_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-mono text-blue-700">{actualVideoData?.duration?.toFixed(2)}s</span>
              </div>
            </div>
          </div>

          <div className="glass-card bg-gradient-to-br from-purple-50/80 to-pink-50/80 backdrop-blur-sm border border-purple-200/50 p-6 rounded-2xl hover-lift h-48 border-2">
            <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
              🧠 Simulation Status
            </h3>
            <div className="space-y-3">
              <Badge className="bg-green-100 text-green-800 border-green-300">
                Completed
              </Badge>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-mono text-purple-700">WARP Volume</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Format:</span>
                  <span className="font-mono text-purple-700">Animated GIF</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card bg-gradient-to-br from-green-50/80 to-emerald-50/80 backdrop-blur-sm border border-green-200/50 p-6 rounded-2xl hover-lift h-48 border-2">
            <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
              ⚡ Performance
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className="font-mono text-green-700">Success</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">File Size:</span>
                <span className="font-mono text-green-700">
                  {actualVideoData?.file_size_bytes ? `${(actualVideoData.file_size_bytes / 1024).toFixed(1)} KB` : 'N/A'}
                </span>
              </div>              <div className="flex justify-between">
                <span className="text-gray-600">GPU:</span>
                <span className="font-mono text-green-700">Auto-detect</span>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Execution Output if available */}
        {(executionResult?.output || executionResult?.error) && (
          <div className="glass-card bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6">
            <h4 className="font-bold mb-4 flex items-center gap-3">
              <Badge variant="outline" className={executionResult?.success ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-700 border-red-300"}>
                {executionResult?.success ? 'Output' : 'Error'}
              </Badge>
              Execution Log
            </h4>
            <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm text-green-400 max-h-40 overflow-y-auto">
              <div className="space-y-1">
                {executionResult?.success ? (
                  <pre className="whitespace-pre-wrap">{executionResult.output}</pre>
                ) : (
                  <pre className="text-red-400 whitespace-pre-wrap">{executionResult?.error}</pre>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If we have video frames, use the AdvancedVideoPlayer
  if (hasVideoFrames) {
    return (
      <div className="space-y-6">
        <div className="glass-card bg-gradient-to-br from-slate-900/90 to-purple-900/90 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden hover-lift">
          <div className="p-6">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              🎥 Simulation
              <Badge className="bg-green-100 text-green-800 border-green-300">
                {frames.length} frames
              </Badge>
            </h3>
            <SimpleVideoPlayer 
              frames={frames}
              fps={fps}
              resolution={resolution}
            />
          </div>
        </div>

        {/* Video Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card bg-gradient-to-br from-blue-50/80 to-cyan-50/80 backdrop-blur-sm border border-blue-200/50 p-6 rounded-2xl hover-lift">
            <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
              📹 Video Details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Resolution:</span>
                <span className="font-mono text-blue-700">{resolution[0]}x{resolution[1]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frame Rate:</span>
                <span className="font-mono text-blue-700">{fps} FPS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frames:</span>
                <span className="font-mono text-blue-700">{frames.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration:</span>
                <span className="font-mono text-blue-700">{(frames.length / fps).toFixed(2)}s</span>
              </div>
            </div>
          </div>

          <div className="glass-card bg-gradient-to-br from-purple-50/80 to-pink-50/80 backdrop-blur-sm border border-purple-200/50 p-6 rounded-2xl hover-lift">
            <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
              🧠 Simulation Status
            </h3>
            <div className="space-y-3">
              <Badge className={executionResult?.success ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"}>
                {executionResult?.success ? 'Completed' : 'Failed'}
              </Badge>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-mono text-purple-700">WARP Volume</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Format:</span>
                  <span className="font-mono text-purple-700">Frame Sequence</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card bg-gradient-to-br from-green-50/80 to-emerald-50/80 backdrop-blur-sm border border-green-200/50 p-6 rounded-2xl hover-lift">
            <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
              ⚡ Performance
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Execution:</span>
                <span className="font-mono text-green-700">
                  {executionResult?.success ? 'Success' : 'Failed'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frame Size:</span>
                <span className="font-mono text-green-700">
                  {frames.length > 0 ? `${Math.round(frames[0].image.length * 0.75 / 1024)}KB` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Size:</span>
                <span className="font-mono text-green-700">
                  {frames.length > 0 ? `${Math.round(frames.reduce((sum, f) => sum + f.image.length, 0) * 0.75 / 1024 / 1024)}MB` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Execution Output */}
        {(executionResult?.output || executionResult?.error) && (
          <div className="glass-card bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6">
            <h4 className="font-bold mb-4 flex items-center gap-3">
              <Badge variant="outline" className={executionResult?.success ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-700 border-red-300"}>
                {executionResult?.success ? 'Output' : 'Error'}
              </Badge>
              Execution Log
            </h4>
            <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm text-green-400 max-h-40 overflow-y-auto">
              <div className="space-y-1">
                {executionResult?.success ? (
                  <pre className="whitespace-pre-wrap">{executionResult.output}</pre>
                ) : (
                  <pre className="text-red-400 whitespace-pre-wrap">{executionResult?.error}</pre>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Fallback UI when no video data is available  
  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const resetVideo = () => {
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Placeholder Video Player Section */}
      <div className="glass-card bg-gradient-to-br from-slate-900/90 to-purple-900/90 backdrop-blur-xl border border-white/20 rounded-3xl overflow-hidden hover-lift">
        <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative flex items-center justify-center">
          {/* Video Placeholder */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-24 h-24 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                {isPlaying ? (
                  <Pause className="w-12 h-12" />
                ) : (
                  <Play className="w-12 h-12 ml-1" />
                )}
              </div>
              <h3 className="text-xl font-semibold mb-2">Simulation</h3>
              <p className="text-blue-200">
                {executionResult ? 
                  (executionResult.success ? 
                    "No video data generated" : 
                    "Execution failed - check logs below") : 
                  "Run volume.py to generate simulation video"}
              </p>
              {executionResult && !executionResult.success && (
                <Badge className="mt-2 bg-red-100 text-red-800 border-red-300">
                  Execution Error
                </Badge>
              )}
            </div>
          </div>
          
          {/* Video Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-4">
                <Button
                  onClick={togglePlayPause}
                  disabled={!hasVideoFrames}
                  className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 p-0 disabled:opacity-50"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-0.5" />
                  )}
                </Button>
                <Button
                  onClick={resetVideo}
                  disabled={!hasVideoFrames}
                  className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 p-0 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <span className="text-sm font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 p-0 disabled:opacity-50" disabled>
                  <Volume2 className="w-4 h-4" />
                </Button>
                <Button className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 p-0 disabled:opacity-50" disabled>
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4 bg-white/20 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Execution Output if available */}
      {(executionResult?.output || executionResult?.error) && (
        <div className="glass-card bg-white/60 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6">
          <h4 className="font-bold mb-4 flex items-center gap-3">
            <Badge variant="outline" className={executionResult?.success ? "bg-green-50 text-green-700 border-green-300" : "bg-red-50 text-red-700 border-red-300"}>
              {executionResult?.success ? 'Output' : 'Error'}
            </Badge>
            Execution Log
          </h4>
          <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm text-green-400 max-h-40 overflow-y-auto">
            <div className="space-y-1">
              {executionResult?.success ? (
                <pre className="whitespace-pre-wrap">{executionResult.output}</pre>
              ) : (
                <pre className="text-red-400 whitespace-pre-wrap">{executionResult?.error}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Video Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card bg-gradient-to-br from-blue-50/80 to-cyan-50/80 backdrop-blur-sm border border-blue-200/50 p-6 rounded-2xl hover-lift">
          <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
            📹 Video Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Resolution:</span>
              <span className="font-mono text-blue-700">
                {executionResult?.video_data?.resolution ? 
                  `${executionResult.video_data.resolution[0]}x${executionResult.video_data.resolution[1]}` : 
                  'Not available'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Frame Rate:</span>
              <span className="font-mono text-blue-700">
                {executionResult?.video_data?.fps ? `${executionResult.video_data.fps} FPS` : 'Not available'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-mono text-blue-700">
                {executionResult?.video_data?.duration ? 
                  `${executionResult.video_data.duration.toFixed(2)}s` : 
                  'Not available'}
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card bg-gradient-to-br from-purple-50/80 to-pink-50/80 backdrop-blur-sm border border-purple-200/50 p-6 rounded-2xl hover-lift">
          <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
            🧠 Simulation Status
          </h3>
          <div className="space-y-3">
            <Badge className={
              !executionResult ? "bg-gray-100 text-gray-800 border-gray-300" :
              executionResult.success ? "bg-green-100 text-green-800 border-green-300" : 
              "bg-red-100 text-red-800 border-red-300"
            }>
              {!executionResult ? 'Waiting' : 
               executionResult.success ? 'Completed' : 'Failed'}
            </Badge>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Type:</span>
                <span className="font-mono text-purple-700">WARP Volume</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frames:</span>
                <span className="font-mono text-purple-700">
                  {executionResult?.video_data?.frame_count || 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card bg-gradient-to-br from-green-50/80 to-emerald-50/80 backdrop-blur-sm border border-green-200/50 p-6 rounded-2xl hover-lift">
          <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
            ⚡ Performance
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-mono text-green-700">
                {!executionResult ? 'Ready' : 
                 executionResult.success ? 'Success' : 'Failed'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Format:</span>
              <span className="font-mono text-green-700">
                {executionResult?.video_data?.type || 'Frame Sequence'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">GPU:</span>
              <span className="font-mono text-green-700">Auto-detect</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoSimulation;
