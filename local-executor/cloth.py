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

# ---------- Cloth Physics Kernels ----------

@wp.func
def length_constraint(x1: wp.vec3, x2: wp.vec3, rest_length: float, stiffness: float) -> (wp.vec3, wp.vec3):
    """Constraint between two particles to maintain distance"""
    delta = x1 - x2
    distance = wp.length(delta)
    
    if distance > 1e-6:
        direction = delta / distance
        error = distance - rest_length
        correction = direction * error * stiffness * 0.5
        return -correction, correction
    else:
        return wp.vec3(0.0), wp.vec3(0.0)

@wp.kernel
def apply_forces(
    positions: wp.array(dtype=wp.vec3),
    velocities: wp.array(dtype=wp.vec3),
    forces: wp.array(dtype=wp.vec3),
    inv_mass: wp.array(dtype=float),
    gravity: wp.vec3,
    damping: float,
):
    tid = wp.tid()
    
    # Reset forces
    forces[tid] = gravity / inv_mass[tid] if inv_mass[tid] > 0.0 else wp.vec3(0.0)
    
    # Apply damping to velocity
    velocities[tid] = velocities[tid] * damping

@wp.kernel
def satisfy_distance_constraints(
    positions: wp.array(dtype=wp.vec3),
    inv_mass: wp.array(dtype=float),
    indices: wp.array(dtype=wp.int32),
    rest_lengths: wp.array(dtype=float),
    stiffness: float,
    num_constraints: int,
):
    tid = wp.tid()
    
    if tid >= num_constraints:
        return
        
    idx1 = indices[tid * 2]
    idx2 = indices[tid * 2 + 1]
    rest_length = rest_lengths[tid]
    
    pos1 = positions[idx1]
    pos2 = positions[idx2]
    mass1 = inv_mass[idx1]
    mass2 = inv_mass[idx2]
    
    if mass1 > 0.0 or mass2 > 0.0:
        correction1, correction2 = length_constraint(pos1, pos2, rest_length, stiffness)
        
        # Apply corrections based on inverse mass
        total_inv_mass = mass1 + mass2
        if total_inv_mass > 0.0:
            ratio1 = mass1 / total_inv_mass
            ratio2 = mass2 / total_inv_mass
            
            if mass1 > 0.0:
                wp.atomic_add(positions, idx1, correction1 * ratio1)
            if mass2 > 0.0:
                wp.atomic_add(positions, idx2, correction2 * ratio2)

@wp.kernel
def integrate_verlet(
    positions: wp.array(dtype=wp.vec3),
    prev_positions: wp.array(dtype=wp.vec3),
    velocities: wp.array(dtype=wp.vec3),
    forces: wp.array(dtype=wp.vec3),
    inv_mass: wp.array(dtype=float),
    dt: float,
):
    tid = wp.tid()
    
    if inv_mass[tid] > 0.0:  # Only move non-fixed particles
        # Verlet integration
        temp = positions[tid]
        acceleration = forces[tid] * inv_mass[tid]
        
        positions[tid] = 2.0 * positions[tid] - prev_positions[tid] + acceleration * dt * dt
        prev_positions[tid] = temp
        
        # Update velocity for rendering purposes
        velocities[tid] = (positions[tid] - prev_positions[tid]) / dt

@wp.kernel
def apply_sphere_collision(
    positions: wp.array(dtype=wp.vec3),
    sphere_center: wp.vec3,
    sphere_radius: float,
):
    tid = wp.tid()
    
    pos = positions[tid]
    to_center = pos - sphere_center
    distance = wp.length(to_center)
    
    if distance < sphere_radius and distance > 1e-6:
        # Push particle outside sphere
        direction = to_center / distance
        positions[tid] = sphere_center + direction * sphere_radius

# ---------- Cloth Initialization ----------

def create_cloth_grid(width: int, height: int, size: float):
    """Create a rectangular cloth grid"""
    positions = []
    indices = []
    rest_lengths = []
    inv_masses = []
    
    # Create grid of particles
    for i in range(height):
        for j in range(width):
            x = (j - width / 2) * size / width
            y = 3.0  # Start high in the air
            z = (i - height / 2) * size / height
            positions.append([x, y, z])
            
            # Top row is fixed (pinned)
            if i == 0:
                inv_masses.append(0.0)  # Fixed particles
            else:
                inv_masses.append(1.0)  # Movable particles
    
    # Create structural constraints (horizontal and vertical springs)
    for i in range(height):
        for j in range(width):
            current_idx = i * width + j
            
            # Horizontal constraint
            if j < width - 1:
                neighbor_idx = i * width + (j + 1)
                indices.extend([current_idx, neighbor_idx])
                rest_lengths.append(size / width)
            
            # Vertical constraint
            if i < height - 1:
                neighbor_idx = (i + 1) * width + j
                indices.extend([current_idx, neighbor_idx])
                rest_lengths.append(size / height)
    
    # Add diagonal constraints for structural stability
    for i in range(height - 1):
        for j in range(width - 1):
            current_idx = i * width + j
            
            # Diagonal constraint (top-left to bottom-right)
            diag_idx = (i + 1) * width + (j + 1)
            indices.extend([current_idx, diag_idx])
            diagonal_length = np.sqrt((size / width) ** 2 + (size / height) ** 2)
            rest_lengths.append(diagonal_length)
            
            # Diagonal constraint (top-right to bottom-left)
            current_idx2 = i * width + (j + 1)
            diag_idx2 = (i + 1) * width + j
            indices.extend([current_idx2, diag_idx2])
            rest_lengths.append(diagonal_length)
    
    return (np.array(positions, dtype=np.float32), 
            np.array(indices, dtype=np.int32),
            np.array(rest_lengths, dtype=np.float32),
            np.array(inv_masses, dtype=np.float32))

# ---------- Simulation Settings ----------

# Initialize benchmark tracker
benchmark = BenchmarkTracker()

# Simulation parameters
resolution = (480, 360)  # Good resolution for cloth detail
num_frames = 40  # Good length to show cloth behavior
fps = 20  # Smooth animation
sim_substeps = 5  # Multiple substeps for stability
constraint_iterations = 3  # Constraint solving iterations
frame_dt = 1.0 / fps
sim_dt = frame_dt / sim_substeps

# Cloth parameters
cloth_width = 16  # Number of particles wide
cloth_height = 12  # Number of particles tall
cloth_size = 4.0  # Physical size of cloth
stiffness = 0.8  # Constraint stiffness
damping = 0.995  # Velocity damping
gravity = wp.vec3(0.0, -9.81, 0.0)

# Create cloth
cloth_positions, constraint_indices, rest_lengths, inv_masses = create_cloth_grid(
    cloth_width, cloth_height, cloth_size
)

num_particles = len(cloth_positions)
num_constraints = len(constraint_indices) // 2

print(f"Created cloth with {num_particles} particles and {num_constraints} constraints")

# Initialize Warp arrays
positions = wp.array(cloth_positions, dtype=wp.vec3)
prev_positions = wp.clone(positions)  # For Verlet integration
velocities = wp.zeros(num_particles, dtype=wp.vec3)
forces = wp.zeros(num_particles, dtype=wp.vec3)
inv_mass_array = wp.array(inv_masses, dtype=float)
constraint_idx_array = wp.array(constraint_indices, dtype=wp.int32)
rest_length_array = wp.array(rest_lengths, dtype=float)

# Collision sphere (cloth will drape over this)
sphere_center = wp.vec3(0.0, 1.0, 0.0)
sphere_radius = 1.2

# Rendering setup
camera_pos = (8.0, 4.0, 10.0)
camera_front = (-0.5, -0.2, -0.8)

renderer = wp.render.OpenGLRenderer(
    fps=fps,
    screen_width=resolution[0],
    screen_height=resolution[1],
    camera_pos=camera_pos,
    camera_front=camera_front,
    draw_grid=True,
    draw_axis=True,
    vsync=False,
    headless=True,
)

image = wp.empty(shape=(resolution[1], resolution[0], 3), dtype=float)

# ---------- Frame Rendering Loop ----------

renders = []
print("Starting WARP cloth simulation...")
print("Simulating cloth draping over sphere...")

# Get initial system info
system_info = get_system_info()
benchmark.start_total_timer()

try:
    for frame in range(num_frames):
        print(f"Rendering frame {frame + 1}/{num_frames}")
        benchmark.start_frame_timer()
        
        # Time physics simulation
        physics_start = time.perf_counter()
        
        # Run cloth simulation substeps
        for substep in range(sim_substeps):
            # Apply forces (gravity and damping)
            wp.launch(
                apply_forces,
                dim=num_particles,
                inputs=(positions, velocities, forces, inv_mass_array, gravity, damping)
            )
            
            # Verlet integration
            wp.launch(
                integrate_verlet,
                dim=num_particles,
                inputs=(positions, prev_positions, velocities, forces, inv_mass_array, sim_dt)
            )
            
            # Satisfy distance constraints multiple times for stability
            for iteration in range(constraint_iterations):
                wp.launch(
                    satisfy_distance_constraints,
                    dim=num_constraints,
                    inputs=(positions, inv_mass_array, constraint_idx_array, 
                           rest_length_array, stiffness, num_constraints)
                )
            
            # Apply sphere collision
            wp.launch(
                apply_sphere_collision,
                dim=num_particles,
                inputs=(positions, sphere_center, sphere_radius)
            )
        
        wp.synchronize()  # Ensure GPU work is complete
        physics_time = time.perf_counter() - physics_start
        benchmark.log_physics(physics_time)
        
        # Time rendering
        render_start = time.perf_counter()
        renderer.begin_frame(frame / num_frames)
        
        # Render cloth points with color based on height
        pos_numpy = positions.numpy()
        
        # Calculate colors based on height (Y coordinate)
        heights = pos_numpy[:, 1]
        min_height = np.min(heights)
        max_height = np.max(heights)
        height_range = max_height - min_height if max_height > min_height else 1.0
        normalized_heights = (heights - min_height) / height_range
        
        # Create color gradient from blue (low) to red (high)
        colors = []
        for height_norm in normalized_heights:
            r = height_norm  # Red increases with height
            g = 0.3 + 0.4 * height_norm  # Green varies with height
            b = 1.0 - height_norm  # Blue decreases with height
            colors.append((r, g, b))
        
        # Render cloth particles
        renderer.render_points(
            points=pos_numpy,
            radius=0.03,
            name="cloth_particles",
            colors=colors,
        )
        
        # Render the collision sphere
        sphere_mesh_points = []
        sphere_colors = []
        # Create a simple sphere representation with points
        phi_steps = 16
        theta_steps = 12
        for i in range(phi_steps):
            for j in range(theta_steps):
                phi = 2.0 * np.pi * i / phi_steps
                theta = np.pi * j / theta_steps
                x = sphere_center.value[0] + sphere_radius * np.sin(theta) * np.cos(phi)
                y = sphere_center.value[1] + sphere_radius * np.cos(theta)
                z = sphere_center.value[2] + sphere_radius * np.sin(theta) * np.sin(phi)
                sphere_mesh_points.append([x, y, z])
                sphere_colors.append((0.7, 0.7, 0.7))  # Gray sphere
        
        if sphere_mesh_points:
            renderer.render_points(
                points=np.array(sphere_mesh_points),
                radius=0.02,
                name="collision_sphere",
                colors=sphere_colors,
            )
        
        renderer.end_frame()
        renderer.get_pixels(image, split_up_tiles=False, mode="rgb")
        render_time = time.perf_counter() - render_start
        benchmark.log_rendering(render_time)
        
        # End frame timing
        frame_total = benchmark.end_frame_timer()
        
        # Log frame performance
        print(f"  Frame {frame + 1} timings: Physics={physics_time:.4f}s, Render={render_time:.4f}s, Total={frame_total:.4f}s")
        print(f"    Cloth particles: {num_particles}, Constraints: {num_constraints}")
        
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
        'simulation_type': 'cloth_simulation',
        'particle_count': num_particles,
        'constraint_count': num_constraints,
        'benchmark_data': {
            'system_info': make_json_safe(system_info),
            'performance_metrics': make_json_safe(benchmark_averages),
            'simulation_settings': {
                'particle_count': num_particles,
                'constraint_count': num_constraints,
                'cloth_dimensions': [cloth_width, cloth_height],
                'constraint_iterations': constraint_iterations,
                'stiffness': stiffness,
                'substeps': sim_substeps
            },
            'error_occurred': False
        }
    }
    
    print(f"GIF_OUTPUT:{json.dumps(gif_output, default=str)}")
    print(f"Cloth simulation complete! Generated GIF with {len(gif_frames)} frames.")
    print(f"GIF size: {len(gif_bytes)} bytes")
    print(f"Average frame time: {benchmark_averages.get('avg_frame_time', 0):.4f}s")
    print(f"Simulated {num_particles} cloth particles with {num_constraints} distance constraints")
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
        'simulation_type': 'cloth_simulation',
        'particle_count': num_particles,
        'constraint_count': num_constraints,
        'benchmark_data': {
            'system_info': make_json_safe(system_info),
            'performance_metrics': make_json_safe(benchmark.get_averages()),
            'error_occurred': True
        }
    }
    print(f"GIF_OUTPUT:{json.dumps(error_output, default=str)}")
    exit(1)
