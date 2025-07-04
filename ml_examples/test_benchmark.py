"""
Test script to verify the benchmark functionality without requiring warp
"""
import time
import platform
import psutil
import subprocess
import sys
import json

class BenchmarkTracker:
    def __init__(self):
        self.frame_times = []
        self.field_generation_times = []
        self.marching_cubes_times = []
        self.rendering_times = []
        self.total_start_time = None
        self.frame_start_time = None
        
    def start_total_timer(self):
        self.total_start_time = time.perf_counter()
        
    def start_frame_timer(self):
        self.frame_start_time = time.perf_counter()
        
    def log_field_generation(self, duration):
        self.field_generation_times.append(duration)
        
    def log_marching_cubes(self, duration):
        self.marching_cubes_times.append(duration)
        
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
            'avg_frame_time': sum(self.frame_times) / len(self.frame_times) if self.frame_times else 0,
            'avg_field_generation': sum(self.field_generation_times) / len(self.field_generation_times) if self.field_generation_times else 0,
            'avg_marching_cubes': sum(self.marching_cubes_times) / len(self.marching_cubes_times) if self.marching_cubes_times else 0,
            'avg_rendering': sum(self.rendering_times) / len(self.rendering_times) if self.rendering_times else 0,
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

def test_benchmark_system():
    """Test the benchmark and system info functionality"""
    print("Testing Benchmark and System Info Functions")
    print("=" * 50)
    
    # Test system info
    system_info = get_system_info()
    print("System Information:")
    print(json.dumps(system_info, indent=2))
    
    # Test benchmark tracker
    benchmark = BenchmarkTracker()
    benchmark.start_total_timer()
    
    # Simulate some work
    for i in range(3):
        benchmark.start_frame_timer()
        
        # Simulate field generation
        time.sleep(0.1)
        benchmark.log_field_generation(0.1)
        
        # Simulate marching cubes
        time.sleep(0.05)
        benchmark.log_marching_cubes(0.05)
        
        # Simulate rendering
        time.sleep(0.03)
        benchmark.log_rendering(0.03)
        
        frame_time = benchmark.end_frame_timer()
        print(f"Frame {i+1} completed in {frame_time:.4f}s")
    
    # Get benchmark results
    averages = benchmark.get_averages()
    print("\nBenchmark Results:")
    print(json.dumps(averages, indent=2))
    
    print("\nTest completed successfully!")

if __name__ == "__main__":
    test_benchmark_system()
