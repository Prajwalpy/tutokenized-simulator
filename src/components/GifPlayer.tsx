import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Download, 
  RefreshCw, 
  Maximize2, 
  Play, 
  Pause,
  SkipBack,
  SkipForward,
  FastForward,
  Rewind
} from 'lucide-react';

interface GifPlayerProps {
  gifData?: string; // base64-encoded GIF data
  gifBytestream?: number[]; // raw GIF bytestream as array of ints
  gifUrl?: string;
  gifFilename?: string;
  fps?: number;
  resolution?: [number, number];
  frameCount?: number;
  duration?: number;
  fileSizeBytes?: number;
  standalone?: boolean; // Whether to render as standalone component with own card wrapper
}

const GifPlayer: React.FC<GifPlayerProps> = ({ 
  gifData,
  gifBytestream,
  gifUrl,
  gifFilename, 
  fps = 10, 
  resolution = [400, 300], 
  frameCount = 0,
  duration = 0,
  fileSizeBytes = 0,
  standalone = true
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const gifRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);

  // Speed options
  const speedOptions = [0.25, 0.5, 1, 2, 4];

  // Calculate frame duration based on FPS and speed
  const frameDuration = (1000 / fps) / playbackSpeed;
  // Animation loop for controlled playback
  useEffect(() => {
    if (!isPlaying || frameCount <= 1) return;

    const animate = (timestamp: number) => {
      if (timestamp - lastFrameTimeRef.current >= frameDuration) {
        setCurrentFrame(prev => (prev + 1) % frameCount);
        lastFrameTimeRef.current = timestamp;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, frameDuration, frameCount]);

  // Control GIF animation speed using CSS animation
  useEffect(() => {
    if (gifRef.current) {
      const img = gifRef.current;
      
      // Apply CSS to control GIF speed
      if (playbackSpeed !== 1) {
        img.style.animationDuration = `${1/playbackSpeed}s`;
        img.style.animationIterationCount = 'infinite';
        img.style.animationTimingFunction = 'linear';
      } else {
        img.style.animationDuration = '';
        img.style.animationIterationCount = '';
        img.style.animationTimingFunction = '';
      }
      
      // Pause/play the GIF
      img.style.animationPlayState = isPlaying ? 'running' : 'paused';
    }
  }, [playbackSpeed, isPlaying]);

  // Handle restart by reloading the GIF
  const restartGif = () => {
    if (gifRef.current && actualGifUrl) {
      const currentSrc = gifRef.current.src;
      gifRef.current.src = '';
      setTimeout(() => {
        if (gifRef.current) {
          gifRef.current.src = currentSrc;
        }
      }, 50);
    }
    setCurrentFrame(0);
  };

  // Toggle play/pause
  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  // Navigate frames
  const goToFrame = (frame: number) => {
    setCurrentFrame(Math.max(0, Math.min(frame, frameCount - 1)));
  };

  const nextFrame = () => {
    goToFrame(currentFrame + 1);
  };

  const prevFrame = () => {
    goToFrame(currentFrame - 1);
  };
  const restart = () => {
    restartGif();
  };
  // Prefer gifBytestream if present, then gifData (base64), else gifUrl, else filename
  const getGifBlobUrl = () => {
    if (gifBytestream && gifBytestream.length > 0) {
      try {
        console.log('🔧 Creating blob from bytestream:', {
          length: gifBytestream.length,
          firstBytes: gifBytestream.slice(0, 10),
          isValidArray: Array.isArray(gifBytestream) && gifBytestream.every(b => typeof b === 'number' && b >= 0 && b <= 255)
        });
        const byteArray = new Uint8Array(gifBytestream);
        const blob = new Blob([byteArray], { type: 'image/gif' });
        const url = URL.createObjectURL(blob);
        console.log('✅ Bytestream blob created successfully:', { blobSize: blob.size, url });
        return url;
      } catch (e) {
        console.error('❌ Bytestream blob creation failed:', e);
        return null;
      }
    } else if (gifData) {
      try {
        console.log('🔧 Creating blob from base64:', {
          length: gifData.length,
          validBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(gifData)
        });
        const byteCharacters = atob(gifData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/gif' });
        const url = URL.createObjectURL(blob);
        console.log('✅ Base64 blob created successfully:', { blobSize: blob.size, url });
        return url;
      } catch (e) {
        console.error('❌ Base64 blob creation failed:', e);
        return null;
      }
    }
    console.log('⚠️ No valid GIF data found for blob creation');
    return null;
  };
  const gifBlobUrl = getGifBlobUrl();
  const actualGifUrl = gifBlobUrl || (gifData
    ? `data:image/gif;base64,${gifData}`
    : gifUrl || (gifFilename ? `http://localhost:3001/gifs/${gifFilename}` : null));

  console.log('🎞️ GifPlayer props:', { 
    gifData: !!gifData, 
    gifDataLength: gifData?.length,
    gifBytestream: !!gifBytestream,
    gifBytestreamLength: gifBytestream?.length,
    gifUrl, 
    gifFilename, 
    actualGifUrl: actualGifUrl?.substring(0, 50) + '...', 
    frameCount, 
    fps 
  });
  // --- Enhanced debugging for gif data reception ---
  console.log('🔍 GifPlayer Debug (Enhanced):', {
    hasGifData: !!gifData,
    gifDataLength: gifData ? gifData.length : 0,
    gifDataStart: gifData ? gifData.substring(0, 20) : null,
    gifDataValidBase64: gifData ? /^[A-Za-z0-9+/]*={0,2}$/.test(gifData) : false,
    hasGifBytestream: !!gifBytestream,
    gifBytestreamLength: gifBytestream ? gifBytestream.length : 0,
    gifBytestreamType: typeof gifBytestream,
    gifBytestreamIsArray: Array.isArray(gifBytestream),
    hasGifUrl: !!gifUrl,
    hasGifFilename: !!gifFilename,
    actualGifUrl,
    gifBlobUrl,
    // Test if bytestream looks like valid GIF data
    bytestreamStartsWithGIF: gifBytestream && gifBytestream.length >= 6 ? 
      String.fromCharCode(...gifBytestream.slice(0, 6)) === 'GIF89a' || String.fromCharCode(...gifBytestream.slice(0, 6)) === 'GIF87a' : false
  });

  // --- Test bytestream conversion ---
  if (gifBytestream && gifBytestream.length > 0) {
    console.log('🔧 Testing bytestream conversion:', {
      bytestreamType: typeof gifBytestream,
      isArray: Array.isArray(gifBytestream),
      firstFewBytes: gifBytestream.slice(0, 10),
      lastFewBytes: gifBytestream.slice(-10)
    });
    
    try {
      const testByteArray = new Uint8Array(gifBytestream);
      const testBlob = new Blob([testByteArray], { type: 'image/gif' });
      console.log('✅ Bytestream conversion successful:', {
        uint8ArrayLength: testByteArray.length,
        blobSize: testBlob.size,
        blobType: testBlob.type
      });
    } catch (e) {
      console.error('❌ Bytestream conversion failed:', e);
    }
  }

  // --- Test base64 conversion ---
  if (gifData && !gifBytestream) {
    console.log('🔧 Testing base64 conversion:', {
      base64Length: gifData.length,
      startsWithGifHeader: gifData.startsWith('R0lGOD') // GIF header in base64
    });
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadGif = () => {
    if (!actualGifUrl) return;
    
    const link = document.createElement('a');
    link.href = actualGifUrl;
    link.download = gifFilename || 'warp_simulation.gif';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };  // Render simple GIF content without card wrapper when not standalone
  if (!standalone) {
    if (!actualGifUrl) {
      return (
        <div className="w-full h-96 bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center rounded-lg border-2 border-gray-600">
          <div className="text-center text-white">
            <div className="w-24 h-24 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Play className="w-12 h-12 ml-1" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No GIF Generated</h3>
            <p className="text-blue-200">Run the simulation to generate an animated GIF</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Playback Controls */}
        <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-gray-600">
          <div className="flex items-center gap-2">
            <Button
              onClick={togglePlayback}
              variant="outline"
              size="sm"
              className="text-white border-white/30 hover:bg-white/10"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              onClick={restart}
              variant="outline"
              size="sm"
              className="text-white border-white/30 hover:bg-white/10"
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              onClick={prevFrame}
              variant="outline"
              size="sm"
              className="text-white border-white/30 hover:bg-white/10"
            >
              <Rewind className="w-4 h-4" />
            </Button>
            <Button
              onClick={nextFrame}
              variant="outline"
              size="sm"
              className="text-white border-white/30 hover:bg-white/10"
            >
              <FastForward className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">Speed:</span>
              <select 
                value={playbackSpeed} 
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="bg-slate-700 text-white px-2 py-1 rounded border border-gray-600 text-sm"
              >
                {speedOptions.map(speed => (
                  <option key={speed} value={speed}>{speed}x</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">Frame:</span>
              <span className="text-blue-300 font-mono text-sm">{currentFrame + 1}/{frameCount}</span>
            </div>
            
            <Button
              onClick={downloadGif}
              variant="outline"
              size="sm"
              className="text-white border-white/30 hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={toggleFullscreen}
              variant="outline"
              size="sm"
              className="text-white border-white/30 hover:bg-white/10"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Frame Progress Bar */}
        {frameCount > 1 && (
          <div className="px-3">
            <Slider
              value={[currentFrame]}
              onValueChange={(value) => goToFrame(value[0])}
              max={frameCount - 1}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Control buttons */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
          </div>
        </div>        {/* GIF display with fixed dimensions and scroll */}
        <div 
          className={`relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border-2 border-gray-600 overflow-auto ${isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-100px)] w-[calc(100vw-32px)]' : 'w-full h-96'}`}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          <div style={{ position: 'relative' }}>
            <img
              ref={gifRef}
              src={actualGifUrl}
              alt="Animation"
              className="rounded shadow-lg"
              style={{ 
                imageRendering: 'crisp-edges',
                maxWidth: 'none',
                maxHeight: 'none',
                height: 'auto',
                width: 'auto',
                display: 'block',
                margin: '16px',
                animationPlayState: isPlaying ? 'running' : 'paused'
              }}
              onError={(e) => {
                console.error('❌ GIF failed to load:', e);
                console.error('GIF URL details:', actualGifUrl);
              }}
              onLoad={() => {
                console.log('✅ GIF successfully loaded');
              }}
            />
            
            {/* Hover controls overlay */}
            {showControls && (
              <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-gray-600">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={togglePlayback}
                      variant="outline"
                      size="sm"
                      className="text-white border-white/30 hover:bg-white/10"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      onClick={restart}
                      variant="outline"
                      size="sm"
                      className="text-white border-white/30 hover:bg-white/10"
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-white">Speed:</span>
                    <select 
                      value={playbackSpeed} 
                      onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                      className="bg-slate-700 text-white px-2 py-1 rounded border border-gray-600 text-xs"
                    >
                      {speedOptions.map(speed => (
                        <option key={speed} value={speed}>{speed}x</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Debug overlay */}
          <div className="absolute top-2 left-2 bg-black/80 text-white text-xs p-3 rounded-lg opacity-75 hover:opacity-100 transition-opacity max-w-sm w-auto backdrop-blur-sm border border-gray-600 z-10">
            <div className="space-y-1">
              <div className="break-words">
                <span className="text-gray-300">URL:</span> 
                <span className="ml-1 font-mono text-green-300 break-all">
                  {actualGifUrl?.substring(0, 40)}...
                </span>
              </div>
              <div className="break-words">
                <span className="text-gray-300">Data:</span> 
                <span className="ml-1 font-mono text-blue-300">
                  {gifBytestream ? `${gifBytestream.length} bytes` : gifData ? `${gifData.length} chars` : 'No data'}
                </span>
              </div>
              <div>
                <span className="text-gray-300">Resolution:</span> 
                <span className="ml-1 font-mono text-yellow-300">{resolution[0]}×{resolution[1]}</span>
              </div>
              <div className="text-gray-400 text-[10px] mt-2 italic">Scroll to navigate if needed</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // Standalone mode (original card layout)
  if (!actualGifUrl) {
    if (standalone) {
      return (
        <Card className="bg-gradient-to-br from-slate-900/90 to-purple-900/90 backdrop-blur-xl border border-white/20">
          <CardContent className="p-8">
            <div className="w-full h-96 bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center rounded-lg border-2 border-gray-600">
              <div className="text-center text-white">
                <div className="w-24 h-24 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Play className="w-12 h-12 ml-1" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No GIF Generated</h3>
                <p className="text-blue-200">Run the simulation to generate an animated GIF</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    } else {
      return (
        <div className="w-full h-96 bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center rounded-lg border-2 border-gray-600">
          <div className="text-center text-white">
            <div className="w-24 h-24 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Play className="w-12 h-12 ml-1" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No GIF Generated</h3>
            <p className="text-blue-200">Run the simulation to generate an animated GIF</p>
          </div>
        </div>
      );
    }
  }
  return (
    <div className="space-y-4">
      {/* GIF Player */}
      <Card className={`bg-gradient-to-br from-slate-900/90 to-purple-900/90 backdrop-blur-xl border border-white/20 ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-white flex items-center gap-2">
              🎞️ Animation
              <Badge variant="secondary" className="ml-2">
                {frameCount} frames • {fps} FPS
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={downloadGif}
                variant="outline"
                size="sm"
                className="text-white border-white/30 hover:bg-white/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Download GIF
              </Button>
              <Button
                onClick={toggleFullscreen}
                variant="outline"
                size="sm"
                className="text-white border-white/30 hover:bg-white/10"
              >
                <Maximize2 className="w-4 h-4" />
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </Button>
            </div>
          </div>
          
          {/* Playback Controls */}
          <div className="flex justify-between items-center mt-4 p-3 bg-slate-800/50 rounded-lg border border-gray-600">
            <div className="flex items-center gap-2">
              <Button
                onClick={togglePlayback}
                variant="outline"
                size="sm"
                className="text-white border-white/30 hover:bg-white/10"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
              <Button
                onClick={restart}
                variant="outline"
                size="sm"
                className="text-white border-white/30 hover:bg-white/10"
              >
                <SkipBack className="w-4 h-4" />
              </Button>
              <Button
                onClick={prevFrame}
                variant="outline"
                size="sm"
                className="text-white border-white/30 hover:bg-white/10"
              >
                <Rewind className="w-4 h-4" />
              </Button>
              <Button
                onClick={nextFrame}
                variant="outline"
                size="sm"
                className="text-white border-white/30 hover:bg-white/10"
              >
                <FastForward className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">Speed:</span>
                <select 
                  value={playbackSpeed} 
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="bg-slate-700 text-white px-2 py-1 rounded border border-gray-600 text-sm"
                >
                  {speedOptions.map(speed => (
                    <option key={speed} value={speed}>{speed}x</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">Frame:</span>
                <span className="text-blue-300 font-mono text-sm">{currentFrame + 1}/{frameCount}</span>
              </div>
            </div>
          </div>

          {/* Frame Progress Bar */}
          {frameCount > 1 && (
            <div className="mt-3">
              <Slider
                value={[currentFrame]}
                onValueChange={(value) => goToFrame(value[0])}
                max={frameCount - 1}
                step={1}
                className="w-full"
              />
            </div>
          )}
        </CardHeader>        <CardContent className="p-4">          <div 
            className={`relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border-2 border-gray-600 overflow-auto ${isFullscreen ? 'h-[calc(100vh-200px)] w-full' : 'w-full h-96'}`}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
          >
            {/* --- Enhanced GIF display with scroll functionality --- */}
            {gifBlobUrl ? (
              <div style={{ position: 'relative' }}>
                <img
                  ref={gifRef}
                  src={gifBlobUrl}
                  alt="Animation"
                  className="rounded shadow-lg"
                  style={{ 
                    imageRendering: 'crisp-edges',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    height: 'auto',
                    width: 'auto',
                    display: 'block',
                    margin: '16px',
                    animationPlayState: isPlaying ? 'running' : 'paused'
                  }}
                  onError={(e) => {
                    console.error('❌ Img tag failed to load GIF blob:', e);
                    console.error('Blob URL details:', gifBlobUrl);
                  }}
                  onLoad={() => {
                    console.log('✅ Img tag successfully loaded GIF blob');
                  }}
                />
                
                {/* Hover controls overlay */}
                {showControls && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-gray-600">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={togglePlayback}
                          variant="outline"
                          size="sm"
                          className="text-white border-white/30 hover:bg-white/10"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button
                          onClick={restart}
                          variant="outline"
                          size="sm"
                          className="text-white border-white/30 hover:bg-white/10"
                        >
                          <SkipBack className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-white">Speed:</span>
                        <select 
                          value={playbackSpeed} 
                          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                          className="bg-slate-700 text-white px-2 py-1 rounded border border-gray-600 text-xs"
                        >
                          {speedOptions.map(speed => (
                            <option key={speed} value={speed}>{speed}x</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : actualGifUrl ? (
              <div style={{ position: 'relative' }}>
                <img
                  ref={gifRef}
                  src={actualGifUrl}
                  alt="Animation"
                  className="rounded shadow-lg"
                  style={{ 
                    imageRendering: 'crisp-edges',
                    maxWidth: 'none',
                    maxHeight: 'none',
                    height: 'auto',
                    width: 'auto',
                    display: 'block',
                    margin: '16px',
                    animationPlayState: isPlaying ? 'running' : 'paused'
                  }}
                />
                
                {/* Hover controls overlay */}
                {showControls && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-3 border border-gray-600">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={togglePlayback}
                          variant="outline"
                          size="sm"
                          className="text-white border-white/30 hover:bg-white/10"
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <Button
                          onClick={restart}
                          variant="outline"
                          size="sm"
                          className="text-white border-white/30 hover:bg-white/10"
                        >
                          <SkipBack className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-white">Speed:</span>
                        <select 
                          value={playbackSpeed} 
                          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                          className="bg-slate-700 text-white px-2 py-1 rounded border border-gray-600 text-xs"
                        >
                          {speedOptions.map(speed => (
                            <option key={speed} value={speed}>{speed}x</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-900/50 to-purple-900/50 flex items-center justify-center rounded-lg min-h-[350px]">
                <div className="text-center text-white">
                  <div className="w-24 h-24 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <Play className="w-12 h-12 ml-1" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No GIF Generated</h3>
                  <p className="text-blue-200">Run the simulation to generate an animated GIF</p>
                </div>
              </div>
            )}
              {/* Debug overlay with scroll info */}
            <div className="absolute top-2 left-2 bg-black/80 text-white text-xs p-3 rounded-lg opacity-75 hover:opacity-100 transition-opacity max-w-sm w-auto backdrop-blur-sm border border-gray-600 z-10">
              <div className="space-y-1">
                <div className="break-words">
                  <span className="text-gray-300">URL:</span> 
                  <span className="ml-1 font-mono text-green-300 break-all">
                    {actualGifUrl?.substring(0, 40)}...
                  </span>
                </div>
                <div className="break-words">
                  <span className="text-gray-300">Data:</span> 
                  <span className="ml-1 font-mono text-blue-300">
                    {gifBytestream ? `${gifBytestream.length} bytes` : gifData ? `${gifData.length} chars` : 'No data'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-300">Resolution:</span> 
                  <span className="ml-1 font-mono text-yellow-300">{resolution[0]}×{resolution[1]}</span>
                </div>
                <div>
                  <span className="text-gray-300">Playback:</span> 
                  <span className="ml-1 font-mono text-purple-300">{playbackSpeed}x speed</span>
                </div>
                <div className="text-gray-400 text-[10px] mt-2 italic">Hover for controls • Scroll to navigate</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GIF Info */}
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
              <span className="ml-2 text-white font-mono">{duration.toFixed(2)}s</span>
            </div>
            <div>
              <span className="text-gray-400">File Size:</span>
              <span className="ml-2 text-white font-mono">{formatFileSize(fileSizeBytes)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GifPlayer;
