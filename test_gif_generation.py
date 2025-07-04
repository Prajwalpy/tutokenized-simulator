#!/usr/bin/env python3
"""
Test script to validate GIF generation flow
"""

import json
import base64
import io
import numpy as np

def test_gif_generation():
    """Test basic GIF creation without WARP dependencies"""
    print("Testing GIF generation flow...")
    
    try:
        from PIL import Image
        
        # Create some test frames
        frames = []
        resolution = (200, 150)
        num_frames = 10
        
        print(f"Creating {num_frames} test frames...")
        
        for i in range(num_frames):
            # Create a simple animated pattern
            frame_data = np.zeros((resolution[1], resolution[0], 3), dtype=np.uint8)
            
            # Add some animation (moving rectangle)
            x_pos = int((i / num_frames) * resolution[0] * 0.8)
            frame_data[50:100, x_pos:x_pos+40] = [255, 100, 100]  # Red rectangle
            
            # Add some color variation
            frame_data[:, :, 1] = (i / num_frames) * 255  # Green channel
            
            pil_image = Image.fromarray(frame_data)
            frames.append(pil_image)
        
        # Create GIF
        print("Creating GIF...")
        gif_buffer = io.BytesIO()
        frames[0].save(
            gif_buffer,
            format='GIF',
            save_all=True,
            append_images=frames[1:],
            duration=100,  # 100ms per frame = 10 FPS
            loop=0,
            optimize=True
        )
        
        # Save GIF to file
        import time
        import os
        timestamp = int(time.time() * 1000)
        gif_filename = f"test_gif_{timestamp}.gif"
        
        frames[0].save(
            gif_filename,
            format='GIF',
            save_all=True,
            append_images=frames[1:],
            duration=100,  # 100ms per frame = 10 FPS
            loop=0,
            optimize=True
        )
        
        # Get file size
        gif_file_size = os.path.getsize(gif_filename)
        
        # Create output structure
        gif_output = {
            'type': 'gif_animation',
            'gif_file': gif_filename,
            'gif_filename': gif_filename,
            'fps': 10,
            'resolution': resolution,
            'frame_count': len(frames),
            'duration': len(frames) / 10,
            'file_size_bytes': gif_file_size
        }
        
        print(f"GIF_OUTPUT:{json.dumps(gif_output)}")
        print(f"✅ Test successful! Generated GIF with {len(frames)} frames.")
        print(f"📊 GIF size: {gif_file_size} bytes")
        print(f"📁 GIF saved as: {gif_filename}")
        
        return True
        
    except ImportError:
        print("❌ PIL (Pillow) not available. Please install with: pip install Pillow")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

if __name__ == "__main__":
    test_gif_generation()
