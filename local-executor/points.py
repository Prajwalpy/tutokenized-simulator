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
import time
import platform
import psutil
import subprocess
import sys

# Warp config
wp.config.quiet = True
wp.init()

# Enable headless rendering for server environments
pyglet.options["headless"] = True

# ---------- Benchmarking and System Info ----------

class BenchmarkTracker:
    def __init__(self):
        self.frame_times = []
        self.physics_times = []
        self.rendering_times = []
        self.total_start_time = None
        self.frame_start_time = None
        
    def start_total_timer(self):
        self.total_start_time = time.perf_counter()
        
    def start_frame_timer(self):
        self.frame_start_time = time.perf_counter()
        
    def log_physics(self, duration):
        self.physics_times.append(duration)
        
    def log_rendering(self, duration):
        self.rendering_times.append(duration)
        
    def end_frame_timer(self):
        if self.frame_start_time:
            frame_duration = time.perf_counter() - self.frame_start_time
            self.frame_times.append(frame_duration)
            return frame_duration
        return 0
        
    def get_total_time(self):
        if self.total_start_time:
            return time.perf_counter() - self.total_start_time
        return 0
        
    def get_averages(self):
        return {
            'avg_frame_time': np.mean(self.frame_times) if self.frame_times else 0,
            'avg_physics_time': np.mean(self.physics_times) if self.physics_times else 0,
            'avg_rendering_time': np.mean(self.rendering_times) if self.rendering_times else 0,
            'total_time': self.get_total_time(),
            'frame_count': len(self.frame_times)
        }

def get_gpu_info():
    """Get GPU information if available"""
    gpu_info = {"name": "Unknown", "memory_total": 0, "memory_used": 0, "utilization": 0}
    
    try:
        # Try nvidia-smi for NVIDIA GPUs
        result = subprocess.run(['nvidia-smi', '--query-gpu=name,memory.total,memory.used,utilization.gpu', '--format=csv,noheader,nounits'], 
                               capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            lines = result.stdout.strip().split('\n')
            if lines:
                parts = lines[0].split(', ')
                if len(parts) >= 4:
                    gpu_info = {
                        "name": parts[0].strip(),
                        "memory_total": int(parts[1].strip()),
                        "memory_used": int(parts[2].strip()),
                        "utilization": int(parts[3].strip())
                    }
    except:
        pass
    
    return gpu_info

def get_system_info():
    """Get comprehensive system information"""
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        gpu_info = get_gpu_info()
        
        return {
            "cpu": {
                "name": platform.processor(),
                "cores": psutil.cpu_count(logical=False),
                "threads": psutil.cpu_count(logical=True),
                "utilization": cpu_percent,
                "frequency": psutil.cpu_freq().current if psutil.cpu_freq() else 0
            },
            "memory": {
                "total": memory.total,
                "used": memory.used,
                "available": memory.available,
                "percent": memory.percent
            },
            "gpu": gpu_info,
            "platform": {
                "system": platform.system(),
                "version": platform.version(),
                "architecture": platform.architecture()[0],
                "python_version": sys.version
            }
        }
    except Exception as e:
        print(f"Warning: Could not get system info: {e}")
        return {}

def make_json_safe(obj):
    """Convert numpy arrays and other non-serializable objects to JSON-safe types"""
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, dict):
        return {key: make_json_safe(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [make_json_safe(item) for item in obj]
    else:
        return obj


# ---------- Physics Kernels ----------

@wp.func
def contact_force(n: wp.vec3, v: wp.vec3, c: float, k_n: float, k_d: float, k_f: float, k_mu: float) -> wp.vec3:
    vn = wp.dot(n, v)
    jn = c * k_n
    jd = min(vn, 0.0) * k_d
    fn = jn + jd
    vt = v - n * vn
    vs = wp.length(vt)
    if vs > 0.0:
        vt = vt / vs
    ft = wp.min(vs * k_f, k_mu * wp.abs(fn))
    return -n * fn - vt * ft


@wp.kernel
def update(
    grid: wp.uint64,
    particle_x: wp.array(dtype=wp.vec3),
    particle_v: wp.array(dtype=wp.vec3),
    particle_f: wp.array(dtype=wp.vec3),
    radius: float,
    k_contact: float,
    k_damp: float,
    k_friction: float,
    k_mu: float,
):
    tid = wp.tid()
    i = wp.hash_grid_point_id(grid, tid)
    x = particle_x[i]
    v = particle_v[i]
    f = wp.vec3()
    n = wp.vec3(0.0, 1.0, 0.0)
    c = wp.dot(n, x)

    cohesion_ground = 0.02
    cohesion_particle = 0.0075

    if c < cohesion_ground:
        f += contact_force(n, v, c, k_contact, k_damp, 100.0, 0.5)

    neighbors = wp.hash_grid_query(grid, x, radius * 5.0)
    for index in neighbors:
        if index != i:
            n = x - particle_x[index]
            d = wp.length(n)
            err = d - radius * 2.0
            if err <= cohesion_particle:
                n = n / d
                vrel = v - particle_v[index]
                f += contact_force(n, vrel, err, k_contact, k_damp, k_friction, k_mu)

    particle_f[i] = f


@wp.kernel
def integrate(
    x: wp.array(dtype=wp.vec3),
    v: wp.array(dtype=wp.vec3),
    f: wp.array(dtype=wp.vec3),
    gravity: wp.vec3,
    dt: float,
    inv_mass: float,
):
    tid = wp.tid()
    v_new = v[tid] + f[tid] * inv_mass * dt + gravity * dt
    x_new = x[tid] + v_new * dt
    v[tid] = v_new
    x[tid] = x_new


# ---------- Particle Grid Initialization ----------

def create_particle_grid(dim_x, dim_y, dim_z, lower, radius, jitter):
    grid = np.meshgrid(
        np.linspace(0, dim_x - 1, dim_x),
        np.linspace(0, dim_y - 1, dim_y),
        np.linspace(0, dim_z - 1, dim_z),
    )
    grid = np.array(grid).T * radius * 2.0 + np.array(lower)
    grid += np.random.rand(*grid.shape) * radius * jitter
    return wp.array(grid.reshape((-1, 3)), dtype=wp.vec3)


# ---------- Simulation Settings ----------

# Initialize benchmark tracker
benchmark = BenchmarkTracker()

resolution = (256, 192)  # Reduced resolution for faster processing
num_frames = 20  # Reduced for faster execution and smaller GIF
fps = 15  # Reduced FPS for smoother performance
sim_substeps = 32  # Reduced substeps for faster simulation
frame_dt = 1.0 / fps
sim_dt = frame_dt / sim_substeps

point_radius = 0.1
inv_mass = 64.0
k_contact = 8000.0
k_damp = 2.0
k_friction = 1.0
k_mu = 1e5

points = create_particle_grid(6, 16, 6, (0.0, 0.5, 0.0), point_radius, 0.1)  # Reduced particle count
velocities = wp.array(((0.0, 0.0, 15.0),) * len(points), dtype=wp.vec3)
forces = wp.empty_like(points)

grid = wp.HashGrid(64, 64, 64)  # Reduced grid size
grid_cell_size = point_radius * 5.0

camera_pos = (-26.0, 6.0, 13.5)
camera_front = (1.0, 0.0, 0.0)

renderer = wp.render.OpenGLRenderer(
    fps=fps,
    screen_width=resolution[0],
    screen_height=resolution[1],
    camera_pos=camera_pos,
    camera_front=camera_front,
    draw_grid=False,
    draw_axis=False,
    vsync=False,
    headless=True,  # Enable headless mode for server
)

image = wp.empty(shape=(resolution[1], resolution[0], 3), dtype=float)

# ---------- Frame Rendering Loop ----------

renders = []
print("Starting WARP particle simulation...")
print("Collecting system information...")

# Get initial system info
system_info = get_system_info()
benchmark.start_total_timer()

try:
    for frame in range(num_frames):
        print(f"Rendering frame {frame + 1}/{num_frames}")
        benchmark.start_frame_timer()
        
        # Time physics simulation
        physics_start = time.perf_counter()
        grid.build(points, grid_cell_size)

        for _ in range(sim_substeps):
            wp.launch(
                update,
                dim=points.shape,
                inputs=(grid.id, points, velocities, forces, point_radius, k_contact, k_damp, k_friction, k_mu),
            )
            wp.launch(
                integrate,
                dim=points.shape,
                inputs=(points, velocities, forces, (0.0, -9.8, 0.0), sim_dt, inv_mass),
            )
        wp.synchronize()  # Ensure GPU work is complete
        physics_time = time.perf_counter() - physics_start
        benchmark.log_physics(physics_time)
        
        # Time rendering
        render_start = time.perf_counter()
        renderer.begin_frame(frame / num_frames)
        renderer.render_points(
            points=points.numpy(),
            radius=point_radius,
            name="points",
            colors=(0.8, 0.3, 0.2),
        )
        renderer.end_frame()
        renderer.get_pixels(image, split_up_tiles=False, mode="rgb")
        render_time = time.perf_counter() - render_start
        benchmark.log_rendering(render_time)
        
        # End frame timing
        frame_total = benchmark.end_frame_timer()
        
        # Log frame performance
        print(f"  Frame {frame + 1} timings: Physics={physics_time:.4f}s, Render={render_time:.4f}s, Total={frame_total:.4f}s")
        
        renders.append(wp.clone(image, device="cpu", pinned=True))

except Exception as e:
    print(f"ERROR during frame rendering: {e}")
    # Output error format that VideoSimulation can handle with benchmark data
    error_output = {
        'type': 'gif_animation',
        'error': f'Frame rendering failed: {str(e)}',
        'fps': fps,
        'resolution': resolution,
        'frame_count': 0,
        'duration': 0,
        'file_size_bytes': 0,
        'benchmark_data': {
            'system_info': system_info,
            'performance_metrics': benchmark.get_averages(),
            'error_occurred': True
        }
    }
    print(f"GIF_OUTPUT:{json.dumps(error_output)}")
    exit(1)

wp.synchronize()

# ---------- Convert frames to GIF for frontend ----------

def frame_to_pil_image(frame_array):
    """Convert numpy frame to PIL Image"""
    try:
        # Convert to uint8
        if frame_array.dtype != np.uint8:
            frame_uint8 = (frame_array * 255).astype(np.uint8)
        else:
            frame_uint8 = frame_array
        
        try:
            from PIL import Image
            return Image.fromarray(frame_uint8)
        except ImportError:
            print("PIL not available, cannot create GIF")
            return None
    except Exception as e:
        print(f"Frame conversion error: {e}")
        return None

print("Converting frames to GIF animation...")
gif_frames = []
for i, render in enumerate(renders):
    frame_data = render.numpy()
    pil_image = frame_to_pil_image(frame_data)
    if pil_image:
        gif_frames.append(pil_image)
        if (i + 1) % 5 == 0:  # Progress indicator
            print(f"  Converted frame {i + 1}/{len(renders)}")

# Create GIF in memory
if gif_frames:
    print("Creating GIF animation...")
    gif_buffer = io.BytesIO()
    gif_frames[0].save(
        gif_buffer,
        format='GIF',
        save_all=True,
        append_images=gif_frames[1:],
        duration=int(1000/fps),  # Duration per frame in milliseconds
        loop=0,  # Infinite loop
        optimize=True
    )
    
    # Convert to base64
    gif_bytes = gif_buffer.getvalue()
    gif_base64 = base64.b64encode(gif_bytes).decode('utf-8')
    gif_bytestream = list(gif_bytes)
    
    # Get final benchmark averages
    benchmark_averages = benchmark.get_averages()
    
    # Output GIF data with bytestream and benchmark data as JSON for backend to capture
    gif_output = {
        'type': 'gif_animation',
        'gif_data': gif_base64,
        'gif_bytestream': gif_bytestream,
        'fps': fps,
        'resolution': resolution,
        'frame_count': len(gif_frames),
        'duration': len(gif_frames) / fps,
        'file_size_bytes': len(gif_bytes),
        'benchmark_data': {
            'system_info': make_json_safe(system_info),
            'performance_metrics': make_json_safe(benchmark_averages),
            'error_occurred': False
        }
    }
    
    print(f"GIF_OUTPUT:{json.dumps(gif_output, default=str)}")
    print(f"Simulation complete! Generated GIF with {len(gif_frames)} frames.")
    print(f"GIF size: {len(gif_bytes)} bytes")
    print(f"Average frame time: {benchmark_averages.get('avg_frame_time', 0):.4f}s")
else:
    print("No frames were generated for GIF creation.")
    # Output error format that VideoSimulation can handle with benchmark data
    error_output = {
        'type': 'gif_animation',
        'error': 'No frames were generated for GIF creation',
        'fps': fps,
        'resolution': resolution,
        'frame_count': 0,
        'duration': 0,
        'file_size_bytes': 0,
        'benchmark_data': {
            'system_info': make_json_safe(system_info),
            'performance_metrics': make_json_safe(benchmark.get_averages()),
            'error_occurred': True
        }
    }
    print(f"GIF_OUTPUT:{json.dumps(error_output, default=str)}")
    exit(1)
