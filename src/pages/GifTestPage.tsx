import React from 'react';
import VideoSimulation from '../components/VideoSimulation';

// Test page to verify GIF functionality with the exact output from simple_gif_test.py
const GifTestPage: React.FC = () => {  // Simplified test with a tiny valid GIF (1x1 transparent pixel, animated)
  const testExecutionResult = {
    success: true,
    output: 'GIF_OUTPUT:{"type": "gif_animation", "gif_data": "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "gif_bytestream": [71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255, 255, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 1, 68, 0, 59], "fps": 10, "resolution": [100, 100], "frame_count": 1, "duration": 0.1, "file_size_bytes": 43}',
    error: '',
    video_data: {
      type: 'gif_animation',
      gif_data: 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', // 1x1 transparent GIF
      gif_bytestream: [71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255, 255, 33, 249, 4, 1, 0, 0, 0, 0, 44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 1, 68, 0, 59],
      fps: 10,
      resolution: [100, 100] as [number, number],
      frame_count: 1,
      duration: 0.1,
      file_size_bytes: 43
    }
  };

  console.log('🧪 GifTestPage rendering with test data');

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">GIF Player Test Page</h1>
      <p className="text-gray-600">Testing with real GIF data from simple_gif_test.py</p>
      
      <VideoSimulation executionResult={testExecutionResult} />
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold">Debug Info:</h3>
        <pre className="text-xs mt-2 overflow-x-auto">
          {JSON.stringify(testExecutionResult.video_data, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default GifTestPage;
