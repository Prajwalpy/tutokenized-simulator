import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Download, 
  Maximize2, 
  Volume2,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1
} from 'lucide-react';

interface AdvancedVideoPlayerProps {
  frames: Array<{
    frame: number;
    timestamp: number;
    image: string;
  }>;
  fps?: number;
  resolution?: [number, number];
}

const AdvancedVideoPlayer: React.FC<AdvancedVideoPlayerProps> = ({ 
  frames, 
  fps = 30, 
  resolution = [512, 384] 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [loop, setLoop] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  // Calculate duration and setup
  useEffect(() => {
    if (frames.length > 0) {
      setDuration(frames.length / fps);
      setIsLoaded(true);
      console.log(`🎬 Video loaded: ${frames.length} frames at ${fps} FPS`);
    }
  }, [frames, fps]);

  // Draw current frame to canvas
  const drawFrame = useCallback((frameIndex: number) => {
    if (!canvasRef.current || !frames[frameIndex]) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const frame = frames[frameIndex];
    
    if (frame && frame.image) {
      const img = new Image();
      img.onload = () => {
        // Set canvas size to match the expected resolution
        const [expectedWidth, expectedHeight] = resolution;
        canvas.width = expectedWidth;
        canvas.height = expectedHeight;
        
        // Clear and draw the frame
        ctx?.clearRect(0, 0, expectedWidth, expectedHeight);
        ctx?.drawImage(img, 0, 0, expectedWidth, expectedHeight);
      };
      img.src = `data:image/jpeg;base64,${frame.image}`;
    }
  }, [frames, resolution]);

  // Animation loop for playback
  const animate = useCallback((timestamp: number) => {
    if (!isPlaying || frames.length === 0) return;

    const elapsed = timestamp - lastFrameTimeRef.current;
    const frameInterval = (1000 / fps) / playbackSpeed;

    if (elapsed >= frameInterval) {
      setCurrentFrame(prev => {
        const next = prev + 1;
        if (next >= frames.length) {
          if (loop) {
            return 0; // Loop back to start
          } else {
            setIsPlaying(false);
            return prev; // Stop at last frame
          }
        }
        return next;
      });
      
      setCurrentTime(prev => {
        const nextTime = prev + (1 / fps) * playbackSpeed;
        return nextTime >= duration && loop ? 0 : Math.min(nextTime, duration);
      });
      
      lastFrameTimeRef.current = timestamp;
    }

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, frames.length, fps, playbackSpeed, loop, duration]);

  // Start/stop animation
  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      lastFrameTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate, frames.length]);

  // Update canvas when frame changes
  useEffect(() => {
    drawFrame(currentFrame);
  }, [currentFrame, drawFrame]);

  // Draw first frame when component loads
  useEffect(() => {
    if (frames.length > 0 && isLoaded) {
      drawFrame(0);
    }
  }, [isLoaded, frames.length, drawFrame]);

  // Control functions
  const togglePlayPause = () => {
    if (frames.length === 0) return;
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    setCurrentFrame(0);
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const skipToFrame = (frameIndex: number) => {
    const clampedFrame = Math.max(0, Math.min(frameIndex, frames.length - 1));
    setCurrentFrame(clampedFrame);
    setCurrentTime((clampedFrame / frames.length) * duration);
  };

  const skipForward = () => {
    skipToFrame(currentFrame + Math.floor(fps * 0.5)); // Skip 0.5 seconds
  };

  const skipBackward = () => {
    skipToFrame(currentFrame - Math.floor(fps * 0.5)); // Skip back 0.5 seconds
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    const newFrame = Math.floor((newTime / duration) * frames.length);
    skipToFrame(newFrame);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const downloadVideo = () => {
    // Create and download a simple HTML file that plays the frames
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Simulation</title>
    <style>
        body { margin: 0; padding: 20px; background: #000; color: #fff; font-family: Arial; }
        canvas { max-width: 100%; height: auto; display: block; margin: 0 auto; }
        .controls { text-align: center; margin-top: 10px; }
        button { margin: 5px; padding: 10px 20px; }
    </style>
</head>
<body>
    <h1>Simulation</h1>
    <canvas id="canvas"></canvas>
    <div class="controls">
        <button onclick="togglePlay()">Play/Pause</button>
        <button onclick="restart()">Restart</button>
    </div>
    <script>
        const frames = ${JSON.stringify(frames)};
        const fps = ${fps};
        let currentFrame = 0;
        let playing = false;
        let interval;
        
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        
        function drawFrame(index) {
            if (!frames[index]) return;
            const img = new Image();
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
            };
            img.src = 'data:image/jpeg;base64,' + frames[index].image;
        }
        
        function togglePlay() {
            playing = !playing;
            if (playing) {
                interval = setInterval(() => {
                    currentFrame = (currentFrame + 1) % frames.length;
                    drawFrame(currentFrame);
                }, 1000 / fps);
            } else {
                clearInterval(interval);
            }
        }
        
        function restart() {
            currentFrame = 0;
            drawFrame(0);
        }
        
        drawFrame(0);
    </script>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'warp_simulation.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (frames.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-slate-900/90 to-purple-900/90 backdrop-blur-xl border border-white/20">
        <CardContent className="p-8">
          <div className="aspect-video bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center rounded-lg">
            <div className="text-center text-white">
              <div className="w-24 h-24 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Play className="w-12 h-12 ml-1" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Simulation</h3>
              <p className="text-blue-200">Ready for video playback</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Video Player */}
      <Card className="bg-gradient-to-br from-slate-900/90 to-purple-900/90 backdrop-blur-xl border border-white/20">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-white flex items-center gap-2">
              🎬 Simulation
              <Badge variant="secondary" className="ml-2">
                {frames.length} frames • {fps} FPS
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              <select 
                value={playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="bg-white/10 text-white border border-white/20 rounded px-2 py-1 text-sm"
              >
                <option value={0.25}>0.25x</option>
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-b-lg overflow-hidden">
            {/* Video Canvas Container */}
            <div className="relative w-full" style={{ aspectRatio: `${resolution[0]}/${resolution[1]}` }}>
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-contain"
                style={{ imageRendering: 'crisp-edges' }}
                width={resolution[0]}
                height={resolution[1]}
              />
              
              {/* Loading indicator */}
              {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
                  <div className="text-white text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p>Loading video frames...</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <Slider
                  value={[currentTime]}
                  max={duration}
                  step={1 / fps}
                  onValueChange={handleSeek}
                  className="w-full"
                />
              </div>
              
              {/* Control Buttons */}
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={skipBackward}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={togglePlayPause}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  </Button>
                  <Button
                    onClick={skipForward}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <SkipForward className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={restart}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => setLoop(!loop)}
                    variant="ghost"
                    size="sm"
                    className={`text-white hover:bg-white/20 ${loop ? 'bg-white/20' : ''}`}
                  >
                    {loop ? <Repeat className="w-4 h-4" /> : <Repeat1 className="w-4 h-4" />}
                  </Button>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  <span className="text-xs text-gray-300">
                    Frame {currentFrame + 1}/{frames.length}
                  </span>
                  <Button
                    onClick={downloadVideo}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={toggleFullscreen}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Info */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Resolution:</span>
              <span className="ml-2 text-white font-mono">{resolution[0]}×{resolution[1]}</span>
            </div>
            <div>
              <span className="text-gray-400">Frame Rate:</span>
              <span className="ml-2 text-white font-mono">{fps} FPS</span>
            </div>
            <div>
              <span className="text-gray-400">Duration:</span>
              <span className="ml-2 text-white font-mono">{formatTime(duration)}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Frames:</span>
              <span className="ml-2 text-white font-mono">{frames.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Speed:</span>
              <span className="ml-2 text-white font-mono">{playbackSpeed}x</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedVideoPlayer;
