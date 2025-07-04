import warp as wp
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import pyglet
import warp.render
import json
import base64
import io
import os
from PIL import Image

# Warp config
wp.config.quiet = True
wp.init()

# Enable headless rendering for server environments
pyglet.options["headless"] = True

# ---------- SDF Functions ----------

@wp.func
def sdf_create_box(pos: wp.vec3, size: wp.vec3):
    q = wp.vec3(
        wp.abs(pos[0]) - size[0],
        wp.abs(pos[1]) - size[1],
        wp.abs(pos[2]) - size[2],
    )
    qp = wp.vec3(wp.max(q[0], 0.0), wp.max(q[1], 0.0), wp.max(q[2], 0.0))
    return wp.length(qp) + wp.min(wp.max(q[0], wp.max(q[1], q[2])), 0.0)


@wp.func
def sdf_create_torus(pos: wp.vec3, major_radius: float, minor_radius: float):
    q = wp.vec2(wp.length(wp.vec2(pos[0], pos[2])) - major_radius, pos[1])
    return wp.length(q) - minor_radius


@wp.func
def sdf_translate(pos: wp.vec3, offset: wp.vec3):
    return pos - offset


@wp.func
def sdf_rotate(pos: wp.vec3, angles: wp.vec3):
    rot = wp.quat_rpy(wp.radians(angles[0]), wp.radians(angles[1]), wp.radians(angles[2]))
    return wp.quat_rotate_inv(rot, pos)


@wp.func
def sdf_smooth_min(a: float, b: float, radius: float):
    h = wp.max(radius - wp.abs(a - b), 0.0) / radius
    return wp.min(a, b) - h * h * h * radius * (1.0 / 6.0)


@wp.kernel(enable_backward=False)
def make_field(
    torus_altitude: float,
    torus_major_radius: float,
    torus_minor_radius: float,
    smooth_min_radius: float,
    dim: int,
    time: float,
    out_data: wp.array3d(dtype=float),
):
    i, j, k = wp.tid()

    pos = wp.vec3(
        2.0 * ((float(i) + 0.5) / float(dim)) - 1.0,
        2.0 * ((float(j) + 0.5) / float(dim)) - 1.0,
        2.0 * ((float(k) + 0.5) / float(dim)) - 1.0,
    )

    box = sdf_create_box(sdf_translate(pos, wp.vec3(0.0, -0.7, 0.0)), wp.vec3(0.9, 0.3, 0.9))
    torus = sdf_create_torus(
        sdf_rotate(
            sdf_translate(pos, wp.vec3(0.0, torus_altitude, 0.0)),
            wp.vec3(wp.sin(time) * 90.0, wp.cos(time) * 45.0, 0.0),
        ),
        torus_major_radius,
        torus_minor_radius,
    )

    out_data[i, j, k] = sdf_smooth_min(box, torus, smooth_min_radius)

# ---------- Simulation Settings ----------

resolution = (400, 300)  # Smaller resolution for GIF
num_frames = 20  # Fewer frames for manageable GIF size
fps = 10  # Lower FPS for smooth GIF

dim = 32
max_verts = int(1e6)
max_tris = int(1e6)

torus_altitude = -0.5
torus_major_radius = 0.5
torus_minor_radius = 0.1
smooth_min_radius = 0.5

field = wp.zeros((dim, dim, dim), dtype=float)
mc = wp.MarchingCubes(dim, dim, dim, max_verts, max_tris)

camera_pos = (16.0, 16.0, 75.0)
camera_front = (0.0, -0.2, -1.0)

renderer = wp.render.OpenGLRenderer(
    fps=fps,
    screen_width=resolution[0],
    screen_height=resolution[1],
    camera_pos=camera_pos,
    camera_front=camera_front,
    far_plane=200.0,
    draw_grid=False,
    draw_axis=False,
    vsync=False,
    headless=True,
)

image = wp.empty(shape=(resolution[1], resolution[0], 3), dtype=float)

# ---------- Frame Rendering Loop ----------

print("Starting Simulation for GIF generation...")
gif_frames = []

for frame in range(num_frames):
    print(f"Rendering frame {frame + 1}/{num_frames}")
    
    wp.launch(
        make_field,
        dim=field.shape,
        inputs=(
            torus_altitude,
            torus_major_radius,
            torus_minor_radius,
            smooth_min_radius,
            dim,
            frame / fps,
        ),
        outputs=(field,),
    )

    mc.surface(field, 0.0)

    renderer.begin_frame(frame / num_frames)
    renderer.render_mesh(
        "surface",
        mc.verts.numpy(),
        mc.indices.numpy(),
        colors=((0.35, 0.55, 0.9),) * len(mc.verts),
        update_topology=True,
    )
    renderer.end_frame()

    renderer.get_pixels(image, split_up_tiles=False, mode="rgb")
    
    # Convert frame to PIL Image
    frame_data = image.numpy()
    if frame_data.dtype != np.uint8:
        frame_data = (frame_data * 255).astype(np.uint8)
    
    pil_image = Image.fromarray(frame_data)
    gif_frames.append(pil_image)

wp.synchronize()

# ---------- Create GIF ----------

print("Converting frames to GIF...")

# Generate unique filename with timestamp
import time
timestamp = int(time.time() * 1000)
gif_filename = f"warp_volume_animation_{timestamp}.gif"
gif_filepath = gif_filename  # Save in current directory

# Save GIF to file
gif_frames[0].save(
    gif_filepath,
    format='GIF',
    save_all=True,
    append_images=gif_frames[1:],
    duration=int(1000/fps),  # Duration per frame in milliseconds
    loop=0,  # Infinite loop
    optimize=True
)

# Get file size
gif_file_size = os.path.getsize(gif_filepath)

# Output GIF file info as JSON for backend to capture
gif_output = {
    'type': 'gif_animation',
    'gif_file': gif_filepath,
    'gif_filename': gif_filename,
    'fps': fps,
    'resolution': resolution,
    'frame_count': len(gif_frames),
    'duration': len(gif_frames) / fps,
    'file_size_bytes': gif_file_size
}

print(f"GIF_OUTPUT:{json.dumps(gif_output)}")
print(f"Simulation complete! Generated GIF with {len(gif_frames)} frames.")
print(f"GIF saved as: {gif_filepath}")
print(f"GIF size: {gif_file_size} bytes")
