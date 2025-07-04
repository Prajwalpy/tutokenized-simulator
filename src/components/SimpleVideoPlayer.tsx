import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipBack,
  SkipForward
} from 'lucide-react';

interface SimpleVideoPlayerProps {
  frames: Array<{
    frame: number;
    timestamp: number;
    image: string;
  }>;
  fps?: number;
  resolution?: [number, number];
}

const SimpleVideoPlayer: React.FC<SimpleVideoPlayerProps> = ({ 
  frames, 
  fps = 30, 
  resolution = [512, 384] 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  const duration = frames.length / fps;
  const currentTime = currentFrame / fps;

  console.log('🎬 SimpleVideoPlayer props:', {
    frameCount: frames.length,
    fps,
    resolution,
    firstFrameSize: frames[0]?.image?.length
  });

  // Draw current frame to canvas
  const drawFrame = useCallback((frameIndex: number) => {
    if (!canvasRef.current || !frames[frameIndex]) {
      console.warn('Cannot draw frame:', { frameIndex, hasCanvas: !!canvasRef.current, hasFrame: !!frames[frameIndex] });
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const frame = frames[frameIndex];
    
    if (frame?.image) {
      const img = new Image();
      img.onload = () => {
        console.log('Frame loaded:', { frameIndex, imgSize: `${img.width}x${img.height}` });
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.onerror = (e) => {
        console.error('Failed to load frame:', frameIndex, e);
      };
      img.src = `data:image/jpeg;base64,${frame.image}`;
    }
  }, [frames]);

  // Animation loop for playback
  const animate = useCallback((timestamp: number) => {
    if (!isPlaying || frames.length === 0) return;

    const elapsed = timestamp - lastFrameTimeRef.current;
    const frameInterval = 1000 / fps;

    if (elapsed >= frameInterval) {
      setCurrentFrame(prev => {
        const next = prev + 1;
        if (next >= frames.length) {
          setIsPlaying(false);
          return prev;
        }
        return next;
      });
      
      lastFrameTimeRef.current = timestamp;
    }

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, frames.length, fps]);

  // Setup and load
  useEffect(() => {
    if (frames.length > 0) {
      setIsLoaded(true);
      setCurrentFrame(0);
      console.log(`🎬 Video loaded: ${frames.length} frames at ${fps} FPS, resolution: ${resolution[0]}x${resolution[1]}`);
    }
  }, [frames.length, fps, resolution]);

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
  }, [isPlaying, animate]);

  // Update canvas when frame changes
  useEffect(() => {
    if (isLoaded) {
      drawFrame(currentFrame);
    }
  }, [currentFrame, drawFrame, isLoaded]);

  // Control functions
  const togglePlayPause = () => {
    if (frames.length === 0) return;
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  const skipToFrame = (frameIndex: number) => {
    const clampedFrame = Math.max(0, Math.min(frameIndex, frames.length - 1));
    setCurrentFrame(clampedFrame);
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
          <div className="text-center text-white">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
              <Play className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Video Data</h3>
            <p className="text-gray-300">Run the simulation to generate video frames</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <Card className="bg-gradient-to-br from-slate-900/90 to-purple-900/90 backdrop-blur-xl border border-white/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            🎬 WARP Volume Simulation
            <Badge variant="secondary" className="ml-2">
              {frames.length} frames • {fps} FPS
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-b-lg overflow-hidden">
            {/* Video Canvas Container with fixed aspect ratio */}
            <div 
              className="relative w-full bg-black flex items-center justify-center"
              style={{ aspectRatio: `${resolution[0]}/${resolution[1]}` }}
            >
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-full object-contain"
                width={resolution[0]}
                height={resolution[1]}
                style={{ imageRendering: 'pixelated' }}
              />
              
              {/* Loading indicator */}
              {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/75">
                  <div className="text-white text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p>Loading video frames...</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
              {/* Progress Bar */}
              <div className="mb-4">
                <Slider
                  value={[currentTime]}
                  onValueChange={([value]) => skipToFrame(Math.floor(value * fps))}
                  max={duration}
                  step={1 / fps}
                  className="w-full"
                />
              </div>
              
              {/* Control Buttons */}
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => skipToFrame(Math.max(0, currentFrame - 1))}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    disabled={currentFrame === 0}
                  >
                    <SkipBack className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={togglePlayPause}
                    variant="ghost"
                    size="lg"
                    className="text-white hover:bg-white/20 w-12 h-12 rounded-full"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                  </Button>
                  <Button
                    onClick={() => skipToFrame(Math.min(frames.length - 1, currentFrame + 1))}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20"
                    disabled={currentFrame === frames.length - 1}
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
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  <span className="text-gray-300">
                    Frame {currentFrame + 1}/{frames.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Info */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleVideoPlayer;
