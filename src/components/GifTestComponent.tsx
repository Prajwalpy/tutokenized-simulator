import React from 'react';
import GifPlayer from './GifPlayer';

// Test component to verify GIF functionality with mock data
const GifTestComponent: React.FC = () => {
  // Mock GIF data similar to what the backend should send
  const mockGifData = {
    type: 'gif_animation',
    gif_data: 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // Tiny 1x1 transparent GIF
    gif_bytestream: [71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255, 255, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 1, 68, 0, 59],
    fps: 10,
    resolution: [100, 100] as [number, number],
    frame_count: 1,
    duration: 0.1,
    file_size_bytes: 43
  };

  console.log('🧪 GifTestComponent rendering with mock data:', mockGifData);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">GIF Player Test</h2>
      <div className="border-2 border-dashed border-gray-300 p-4 rounded">
        <h3 className="font-semibold mb-2">Test with Base64 Data:</h3>
        <GifPlayer 
          gifData={mockGifData.gif_data}
          fps={mockGifData.fps}
          resolution={mockGifData.resolution}
          frameCount={mockGifData.frame_count}
          duration={mockGifData.duration}
          fileSizeBytes={mockGifData.file_size_bytes}
        />
      </div>
      <div className="border-2 border-dashed border-gray-300 p-4 rounded">
        <h3 className="font-semibold mb-2">Test with Bytestream Data:</h3>
        <GifPlayer 
          gifBytestream={mockGifData.gif_bytestream}
          fps={mockGifData.fps}
          resolution={mockGifData.resolution}
          frameCount={mockGifData.frame_count}
          duration={mockGifData.duration}
          fileSizeBytes={mockGifData.file_size_bytes}
        />
      </div>
    </div>
  );
};

export default GifTestComponent;
