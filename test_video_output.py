#!/usr/bin/env python3
"""
Simple test script to generate VIDEO_OUTPUT without heavy dependencies
This can be used to test the video playback functionality
"""

import json
import base64
import numpy as np
from PIL import Image
import io

print("Generating test video frames...")

# Generate 10 simple test frames
frames = []
fps = 10
resolution = [320, 240]

for i in range(10):
    # Create a simple test image - gradient with frame number
    width, height = resolution
    img_array = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Create gradient background
    for y in range(height):
        for x in range(width):
            img_array[y, x] = [
                (x * 255) // width,          # Red gradient
                (y * 255) // height,         # Green gradient  
                ((i + 1) * 255) // 10        # Blue based on frame number
            ]
    
    # Create PIL Image and convert to JPEG
    img = Image.fromarray(img_array)
    img_buffer = io.BytesIO()
    img.save(img_buffer, format='JPEG', quality=85)
    img_bytes = img_buffer.getvalue()
    
    # Encode to base64
    encoded_frame = base64.b64encode(img_bytes).decode('utf-8')
    
    frames.append({
        'frame': i,
        'timestamp': i / fps,
        'image': encoded_frame
    })
    
    print(f"  Generated frame {i + 1}/10")

# Output video data as JSON for backend to capture
video_output = {
    'type': 'video_frames',
    'frames': frames,
    'fps': fps,
    'resolution': resolution,
    'frame_count': len(frames),
    'duration': len(frames) / fps
}

print(f"VIDEO_OUTPUT:{json.dumps(video_output)}")
print(f"Test video complete! Generated {len(frames)} frames for video playback.")
