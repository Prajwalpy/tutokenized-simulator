#!/usr/bin/env python3
"""
Simple GIF test without WARP dependencies - for testing the complete flow
"""

import json
import base64
import io
import numpy as np
from PIL import Image

print("🎨 Creating test GIF animation...")

# Create test frames with simple animation
frames = []
resolution = (200, 150)
num_frames = 8

for i in range(num_frames):
    # Create animated pattern
    frame_data = np.zeros((resolution[1], resolution[0], 3), dtype=np.uint8)
    
    # Moving colorful rectangle
    x_pos = int((i / num_frames) * (resolution[0] - 40))
    y_pos = 50
    
    # Rainbow colors
    r = int(255 * (i / num_frames))
    g = int(255 * (1 - i / num_frames))
    b = 128
    
    frame_data[y_pos:y_pos+30, x_pos:x_pos+40] = [r, g, b]
    
    # Add some background pattern
    frame_data[::5, ::5] = [50, 50, 100]  # Grid pattern
    
    pil_image = Image.fromarray(frame_data)
    frames.append(pil_image)

print(f"Generated {len(frames)} test frames")

# Save GIF to file
import time
import os
timestamp = int(time.time() * 1000)
gif_filename = f"simple_test_gif_{timestamp}.gif"

frames[0].save(
    gif_filename,
    format='GIF',
    save_all=True,
    append_images=frames[1:],
    duration=150,  # 150ms per frame
    loop=0,
    optimize=True
)

# Get file size
gif_file_size = os.path.getsize(gif_filename)

# --- NEW: Read GIF as base64 and bytestream for testing ---
with open(gif_filename, 'rb') as f:
    gif_bytes = f.read()

gif_base64 = base64.b64encode(gif_bytes).decode('utf-8')
gif_bytestream = list(gif_bytes)

print(f"🔧 GIF Test Data:")
print(f"  File size: {gif_file_size} bytes")
print(f"  Base64 length: {len(gif_base64)} chars")
print(f"  Bytestream length: {len(gif_bytestream)} ints")
print(f"  First 10 bytes: {gif_bytestream[:10]}")
print(f"  GIF header (first 6 bytes): {gif_bytes[:6]}")

# Create output structure matching our backend expectations
gif_output = {
    'type': 'gif_animation',
    'gif_file': gif_filename,
    'gif_filename': gif_filename,
    'gif_data': gif_base64,  # Include base64 for testing
    'gif_bytestream': gif_bytestream,  # Include bytestream for testing
    'fps': 6,  # ~150ms per frame = 6.67 FPS
    'resolution': list(resolution),
    'frame_count': len(frames),
    'duration': len(frames) * 0.15,  # 150ms per frame
    'file_size_bytes': gif_file_size
}

print(f"GIF_OUTPUT:{json.dumps(gif_output)}")
print(f"✅ Test GIF created successfully!")
print(f"📊 {len(frames)} frames, {gif_file_size} bytes")
print(f"📁 GIF saved as: {gif_filename}")
print("🎞️ This should display as an animated GIF in the UI!")
