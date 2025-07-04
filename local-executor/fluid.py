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

# ---------- Fluid Physics Kernels ----------

@wp.func
def smoothing_kernel(r: float, h: float) -> float:
    """Poly6 smoothing kernel for SPH"""
    if r >= h:
        return 0.0
    
    h2 = h * h
    r2 = r * r
    return 315.0 / (64.0 * 3.14159 * wp.pow(h, 9)) * wp.pow(h2 - r2, 3)

@wp.func
def smoothing_kernel_gradient(r_vec: wp.vec3, h: float) -> wp.vec3:
    """Gradient of poly6 kernel for pressure forces"""
    r = wp.length(r_vec)
    if r >= h or r < 1e-6:
        return wp.vec3(0.0, 0.0, 0.0)
    
    h2 = h * h
    r2 = r * r
    grad_magnitude = -945.0 / (32.0 * 3.14159 * wp.pow(h, 9)) * wp.pow(h2 - r2, 2)
    return grad_magnitude * r_vec

@wp.func
def viscosity_kernel(r: float, h: float) -> float:
    """Viscosity kernel for SPH"""
    if r >= h:
        return 0.0
    
    return 45.0 / (3.14159 * wp.pow(h, 6)) * (h - r)

@wp.kernel
def compute_density_pressure(
    positions: wp.array(dtype=wp.vec3),
    densities: wp.array(dtype=float),
    pressures: wp.array(dtype=float),
    grid: wp.uint64,
    particle_mass: float,
    rest_density: float,
    gas_constant: float,
    smoothing_radius: float,
):
    tid = wp.tid()
    pos = positions[tid]
    density = 0.0
    
    # Query neighbors
    neighbors = wp.hash_grid_query(grid, pos, smoothing_radius)
    for neighbor_idx in neighbors:
        neighbor_pos = positions[neighbor_idx]
        r = wp.length(pos - neighbor_pos)
        density += particle_mass * smoothing_kernel(r, smoothing_radius)
    
    densities[tid] = density
    # Equation of state: P = k(ρ - ρ₀)
    pressures[tid] = gas_constant * (density - rest_density)

@wp.kernel
def compute_forces(
    positions: wp.array(dtype=wp.vec3),
    velocities: wp.array(dtype=wp.vec3),
    densities: wp.array(dtype=float),
    pressures: wp.array(dtype=float),
    forces: wp.array(dtype=wp.vec3),
    grid: wp.uint64,
    particle_mass: float,
    viscosity: float,
    smoothing_radius: float,
    gravity: wp.vec3,
):
    tid = wp.tid()
    pos = positions[tid]
    vel = velocities[tid]
    density = densities[tid]
    pressure = pressures[tid]
    
    force = gravity * particle_mass  # Gravity force
    
    # Query neighbors for pressure and viscosity forces
    neighbors = wp.hash_grid_query(grid, pos, smoothing_radius)
    for neighbor_idx in neighbors:
        if neighbor_idx == tid:
            continue
            
        neighbor_pos = positions[neighbor_idx]
        neighbor_vel = velocities[neighbor_idx]
        neighbor_density = densities[neighbor_idx]
        neighbor_pressure = pressures[neighbor_idx]
        
        r_vec = pos - neighbor_pos
        r = wp.length(r_vec)
        
        if r > 0.0 and r < smoothing_radius:
            # Pressure force
            pressure_gradient = smoothing_kernel_gradient(r_vec, smoothing_radius)
            pressure_force = -particle_mass * (pressure + neighbor_pressure) / (2.0 * neighbor_density) * pressure_gradient
            force += pressure_force
            
            # Viscosity force
            vel_diff = neighbor_vel - vel
            viscosity_force = viscosity * particle_mass * vel_diff / neighbor_density * viscosity_kernel(r, smoothing_radius)
            force += viscosity_force
    
    forces[tid] = force

@wp.kernel
def integrate_particles(
    positions: wp.array(dtype=wp.vec3),
    velocities: wp.array(dtype=wp.vec3),
    forces: wp.array(dtype=wp.vec3),
    dt: float,
    particle_mass: float,
    damping: float,
    bounds_min: wp.vec3,
    bounds_max: wp.vec3,
):
    tid = wp.tid()
    pos = positions[tid]
    vel = velocities[tid]
    force = forces[tid]
    
    # Integration
    acceleration = force / particle_mass
    new_vel = vel + acceleration * dt
    new_pos = pos + new_vel * dt
    
    # Boundary conditions with collision response
    restitution = 0.3
    
    if new_pos[0] < bounds_min[0]:
        new_pos = wp.vec3(bounds_min[0], new_pos[1], new_pos[2])
        new_vel = wp.vec3(-new_vel[0] * restitution, new_vel[1], new_vel[2])
    elif new_pos[0] > bounds_max[0]:
        new_pos = wp.vec3(bounds_max[0], new_pos[1], new_pos[2])
        new_vel = wp.vec3(-new_vel[0] * restitution, new_vel[1], new_vel[2])
        
    if new_pos[1] < bounds_min[1]:
        new_pos = wp.vec3(new_pos[0], bounds_min[1], new_pos[2])
        new_vel = wp.vec3(new_vel[0], -new_vel[1] * restitution, new_vel[2])
    elif new_pos[1] > bounds_max[1]:
        new_pos = wp.vec3(new_pos[0], bounds_max[1], new_pos[2])
        new_vel = wp.vec3(new_vel[0], -new_vel[1] * restitution, new_vel[2])
        
    if new_pos[2] < bounds_min[2]:
        new_pos = wp.vec3(new_pos[0], new_pos[1], bounds_min[2])
        new_vel = wp.vec3(new_vel[0], new_vel[1], -new_vel[2] * restitution)
    elif new_pos[2] > bounds_max[2]:
        new_pos = wp.vec3(new_pos[0], new_pos[1], bounds_max[2])
        new_vel = wp.vec3(new_vel[0], new_vel[1], -new_vel[2] * restitution)
    
    # Apply damping
    new_vel = new_vel * damping
    
    positions[tid] = new_pos
    velocities[tid] = new_vel

# ---------- Fluid Initialization ----------

def create_fluid_drop(center, radius, particle_spacing, jitter=0.1):
    """Create a spherical drop of fluid particles"""
    particles = []
    
    # Create particles in a sphere
    steps = int(2 * radius / particle_spacing) + 1
    for i in range(steps):
        for j in range(steps):
            for k in range(steps):
                pos = np.array([
                    center[0] + (i - steps//2) * particle_spacing,
                    center[1] + (j - steps//2) * particle_spacing,
                    center[2] + (k - steps//2) * particle_spacing
                ])
                
                # Check if particle is within sphere
                dist_from_center = np.linalg.norm(pos - center)
                if dist_from_center <= radius:
                    # Add some jitter for more natural arrangement
                    jitter_offset = (np.random.random(3) - 0.5) * particle_spacing * jitter
                    pos += jitter_offset
                    particles.append(pos)
    
    return np.array(particles)

def create_fluid_stream(start, end, width, particle_spacing, num_layers=3):
    """Create a stream of fluid particles"""
    particles = []
    
    direction = end - start
    length = np.linalg.norm(direction)
    direction = direction / length
    
    # Create perpendicular vectors for stream width
    if abs(direction[1]) < 0.9:
        perp1 = np.cross(direction, [0, 1, 0])
    else:
        perp1 = np.cross(direction, [1, 0, 0])
    perp1 = perp1 / np.linalg.norm(perp1)
    perp2 = np.cross(direction, perp1)
    
    # Create particles along the stream
    num_steps = int(length / particle_spacing) + 1
    width_steps = int(width / particle_spacing) + 1
    
    for i in range(num_steps):
        for j in range(width_steps):
            for k in range(num_layers):
                offset_along = i * particle_spacing
                offset_width = (j - width_steps//2) * particle_spacing
                offset_height = k * particle_spacing
                
                pos = (start + 
                       direction * offset_along + 
                       perp1 * offset_width + 
                       perp2 * offset_height)
                particles.append(pos)
    
    return np.array(particles)

# ---------- Simulation Settings ----------

# Initialize benchmark tracker
benchmark = BenchmarkTracker()

# Simulation parameters
resolution = (320, 240)  # Higher resolution for fluid detail
num_frames = 30  # More frames to show fluid behavior
fps = 20  # Good framerate for fluid motion
sim_substeps = 3  # Multiple substeps for stability
frame_dt = 1.0 / fps
sim_dt = frame_dt / sim_substeps

# Fluid parameters
particle_mass = 0.02
rest_density = 1000.0  # Water density
gas_constant = 200.0  # Pressure responsiveness
viscosity = 0.5  # Fluid viscosity
smoothing_radius = 0.15
damping = 0.98
particle_spacing = 0.08

# Create initial fluid configuration - a drop falling into a pool
drop_center = np.array([0.0, 3.0, 0.0])
drop_radius = 0.8
pool_start = np.array([-2.0, -1.5, -1.0])
pool_end = np.array([2.0, -1.0, 1.0])

# Create particles
drop_particles = create_fluid_drop(drop_center, drop_radius, particle_spacing)
pool_particles = create_fluid_stream(pool_start, pool_end, 4.0, particle_spacing, 2)

# Combine all particles
all_particles = np.vstack([drop_particles, pool_particles])
num_particles = len(all_particles)

print(f"Created {num_particles} fluid particles:")
print(f"  - Drop: {len(drop_particles)} particles")
print(f"  - Pool: {len(pool_particles)} particles")

# Initialize Warp arrays
positions = wp.array(all_particles, dtype=wp.vec3)
velocities = wp.zeros(num_particles, dtype=wp.vec3)
densities = wp.zeros(num_particles, dtype=float)
pressures = wp.zeros(num_particles, dtype=float)
forces = wp.zeros(num_particles, dtype=wp.vec3)

# Give the drop some initial downward velocity
initial_velocities = np.zeros_like(all_particles)
initial_velocities[:len(drop_particles), 1] = -2.0  # Downward velocity for drop
velocities = wp.array(initial_velocities, dtype=wp.vec3)

# Spatial grid for neighbor searching
grid = wp.HashGrid(32, 32, 32)
grid_cell_size = smoothing_radius * 2.0

# Simulation bounds
bounds_min = wp.vec3(-3.0, -2.0, -2.0)
bounds_max = wp.vec3(3.0, 4.0, 2.0)
gravity = wp.vec3(0.0, -9.81, 0.0)

# Rendering setup
camera_pos = (8.0, 3.0, 8.0)
camera_front = (-0.6, -0.2, -0.8)

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
print("Starting WARP fluid simulation...")
print("Simulating fluid drop falling into pool...")

# Get initial system info
system_info = get_system_info()
benchmark.start_total_timer()

try:
    for frame in range(num_frames):
        print(f"Rendering frame {frame + 1}/{num_frames}")
        benchmark.start_frame_timer()
        
        # Time physics simulation
        physics_start = time.perf_counter()
        
        # Build spatial grid for neighbor queries
        grid.build(positions, grid_cell_size)
        
        # Run fluid simulation substeps
        for substep in range(sim_substeps):
            # Compute density and pressure
            wp.launch(
                compute_density_pressure,
                dim=num_particles,
                inputs=(positions, densities, pressures, grid.id, 
                        particle_mass, rest_density, gas_constant, smoothing_radius)
            )
            
            # Compute forces
            wp.launch(
                compute_forces,
                dim=num_particles,
                inputs=(positions, velocities, densities, pressures, forces, grid.id,
                        particle_mass, viscosity, smoothing_radius, gravity)
            )
            
            # Integrate particles
            wp.launch(
                integrate_particles,
                dim=num_particles,
                inputs=(positions, velocities, forces, sim_dt, particle_mass, 
                        damping, bounds_min, bounds_max)
            )
        
        wp.synchronize()  # Ensure GPU work is complete
        physics_time = time.perf_counter() - physics_start
        benchmark.log_physics(physics_time)
        
        # Time rendering
        render_start = time.perf_counter()
        renderer.begin_frame(frame / num_frames)
        
        # Render fluid particles with color based on velocity
        pos_numpy = positions.numpy()
        vel_numpy = velocities.numpy()
        
        # Calculate colors based on velocity magnitude
        vel_magnitudes = np.linalg.norm(vel_numpy, axis=1)
        max_vel = np.max(vel_magnitudes) if np.max(vel_magnitudes) > 0 else 1.0
        normalized_vels = vel_magnitudes / max_vel
        
        # Create color gradient from blue (slow) to red (fast)
        colors = []
        for vel_norm in normalized_vels:
            r = vel_norm  # Red increases with velocity
            g = 0.3 + 0.4 * (1.0 - vel_norm)  # Green decreases with velocity
            b = 1.0 - vel_norm  # Blue decreases with velocity
            colors.append((r, g, b))
        
        renderer.render_points(
            points=pos_numpy,
            radius=particle_spacing * 0.8,
            name="fluid_particles",
            colors=colors,
        )
        
        renderer.end_frame()
        renderer.get_pixels(image, split_up_tiles=False, mode="rgb")
        render_time = time.perf_counter() - render_start
        benchmark.log_rendering(render_time)
        
        # End frame timing
        frame_total = benchmark.end_frame_timer()
        
        # Log frame performance
        print(f"  Frame {frame + 1} timings: Physics={physics_time:.4f}s, Render={render_time:.4f}s, Total={frame_total:.4f}s")
        print(f"    Max velocity: {max_vel:.2f} m/s, Active particles: {num_particles}")
        
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
        'simulation_type': 'fluid_dynamics',
        'particle_count': num_particles,
        'benchmark_data': {
            'system_info': make_json_safe(system_info),
            'performance_metrics': make_json_safe(benchmark_averages),
            'simulation_settings': {
                'particle_count': num_particles,
                'smoothing_radius': smoothing_radius,
                'rest_density': rest_density,
                'viscosity': viscosity,
                'substeps': sim_substeps
            },
            'error_occurred': False
        }
    }
    
    print(f"GIF_OUTPUT:{json.dumps(gif_output, default=str)}")
    print(f"Fluid simulation complete! Generated GIF with {len(gif_frames)} frames.")
    print(f"GIF size: {len(gif_bytes)} bytes")
    print(f"Average frame time: {benchmark_averages.get('avg_frame_time', 0):.4f}s")
    print(f"Simulated {num_particles} fluid particles with SPH method")
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
        'simulation_type': 'fluid_dynamics',
        'particle_count': num_particles,
        'benchmark_data': {
            'system_info': make_json_safe(system_info),
            'performance_metrics': make_json_safe(benchmark.get_averages()),
            'error_occurred': True
        }
    }
    print(f"GIF_OUTPUT:{json.dumps(error_output, default=str)}")
    exit(1)
