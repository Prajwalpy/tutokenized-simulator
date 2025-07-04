"""
WARP Simulation Benchmarking Module

A comprehensive benchmarking system for WARP simulations that provides:
- High-precision timing with time.perf_counter()
- CPU and GPU utilization monitoring
- System information collection
- Automatic per-frame performance logging
- JSON-safe data serialization for frontend integration

Usage:
    from warp_benchmark import WarpBenchmark
    
    benchmark = WarpBenchmark()
    benchmark.start_simulation()
    
    for frame in range(num_frames):
        benchmark.start_frame()
        
        # Field generation
        with benchmark.time_operation('field_generation'):
            # Your field generation code here
            pass
            
        # Marching cubes
        with benchmark.time_operation('marching_cubes'):
            # Your marching cubes code here
            pass
            
        # Rendering
        with benchmark.time_operation('rendering'):
            # Your rendering code here
            pass
            
        benchmark.end_frame()
    
    # Get benchmark data for frontend
    benchmark_data = benchmark.get_benchmark_data()
"""

import time
import platform
import psutil
import subprocess
import sys
import json
import threading
import numpy as np
from contextlib import contextmanager
from typing import Dict, List, Any, Optional


class WarpBenchmark:
    """Comprehensive benchmarking system for WARP simulations"""
    
    def __init__(self, monitor_interval: float = 1.0):
        """
        Initialize benchmark tracker
        
        Args:
            monitor_interval: Interval in seconds for CPU/GPU monitoring
        """
        self.monitor_interval = monitor_interval
        self.simulation_start_time = None
        self.frame_start_time = None
        
        # Performance tracking
        self.frame_times = []
        self.operation_times = {
            'field_generation': [],
            'marching_cubes': [],
            'rendering': [],
            'data_conversion': [],
            'custom_operations': {}
        }
        
        # System monitoring
        self.cpu_utilization_history = []
        self.gpu_utilization_history = []
        self.memory_usage_history = []
        self.monitoring_active = False
        self.monitor_thread = None
        
        # System info
        self.system_info = None
        
    def start_simulation(self):
        """Start the overall simulation timer and system monitoring"""
        self.simulation_start_time = time.perf_counter()
        self.system_info = self._get_system_info()
        self._start_monitoring()
        print(f"WARP Benchmark: Simulation started with monitoring interval {self.monitor_interval}s")
        
    def start_frame(self):
        """Start timing for a new frame"""
        self.frame_start_time = time.perf_counter()
        
    def end_frame(self) -> float:
        """End frame timing and return frame duration"""
        if self.frame_start_time:
            frame_duration = time.perf_counter() - self.frame_start_time
            self.frame_times.append(frame_duration)
            return frame_duration
        return 0.0
    
    @contextmanager
    def time_operation(self, operation_name: str):
        """Context manager for timing specific operations"""
        start_time = time.perf_counter()
        try:
            yield
        finally:
            duration = time.perf_counter() - start_time
            
            if operation_name in self.operation_times:
                self.operation_times[operation_name].append(duration)
            else:
                # Custom operation
                if operation_name not in self.operation_times['custom_operations']:
                    self.operation_times['custom_operations'][operation_name] = []
                self.operation_times['custom_operations'][operation_name].append(duration)
    
    def log_operation_time(self, operation_name: str, duration: float):
        """Manually log an operation time"""
        if operation_name in self.operation_times:
            self.operation_times[operation_name].append(duration)
        else:
            if operation_name not in self.operation_times['custom_operations']:
                self.operation_times['custom_operations'][operation_name] = []
            self.operation_times['custom_operations'][operation_name].append(duration)
    
    def stop_simulation(self):
        """Stop simulation timing and monitoring"""
        self._stop_monitoring()
        total_time = self.get_total_time()
        print(f"WARP Benchmark: Simulation completed in {total_time:.4f}s")
        return total_time
    
    def get_total_time(self) -> float:
        """Get total simulation time"""
        if self.simulation_start_time:
            return time.perf_counter() - self.simulation_start_time
        return 0.0
    
    def _start_monitoring(self):
        """Start background monitoring of system resources"""
        self.monitoring_active = True
        self.monitor_thread = threading.Thread(target=self._monitor_resources, daemon=True)
        self.monitor_thread.start()
    
    def _stop_monitoring(self):
        """Stop background monitoring"""
        self.monitoring_active = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=2.0)
    
    def _monitor_resources(self):
        """Background thread for monitoring CPU/GPU/Memory usage"""
        while self.monitoring_active:
            try:
                # CPU utilization
                cpu_percent = psutil.cpu_percent(interval=None)
                self.cpu_utilization_history.append({
                    'timestamp': time.time(),
                    'value': cpu_percent
                })
                
                # Memory usage
                memory = psutil.virtual_memory()
                self.memory_usage_history.append({
                    'timestamp': time.time(),
                    'percent': memory.percent,
                    'used_gb': memory.used / (1024**3),
                    'available_gb': memory.available / (1024**3)
                })
                
                # GPU utilization
                gpu_info = self._get_gpu_utilization()
                if gpu_info:
                    self.gpu_utilization_history.append({
                        'timestamp': time.time(),
                        'utilization': gpu_info.get('utilization', 0),
                        'memory_used': gpu_info.get('memory_used', 0),
                        'memory_total': gpu_info.get('memory_total', 0)
                    })
                
                time.sleep(self.monitor_interval)
                
            except Exception as e:
                print(f"Warning: Resource monitoring error: {e}")
                time.sleep(self.monitor_interval)
    
    def _get_gpu_utilization(self) -> Optional[Dict]:
        """Get current GPU utilization"""
        try:
            result = subprocess.run([
                'nvidia-smi', 
                '--query-gpu=utilization.gpu,memory.used,memory.total', 
                '--format=csv,noheader,nounits'
            ], capture_output=True, text=True, timeout=3)
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                if lines:
                    parts = lines[0].split(', ')
                    if len(parts) >= 3:
                        return {
                            'utilization': int(parts[0].strip()),
                            'memory_used': int(parts[1].strip()),
                            'memory_total': int(parts[2].strip())
                        }
        except:
            pass
        return None
    
    def _get_system_info(self) -> Dict:
        """Get comprehensive system information"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            gpu_info = self._get_detailed_gpu_info()
            
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
    
    def _get_detailed_gpu_info(self) -> Dict:
        """Get detailed GPU information"""
        gpu_info = {"name": "Unknown", "memory_total": 0, "memory_used": 0, "utilization": 0}
        
        try:
            result = subprocess.run([
                'nvidia-smi', 
                '--query-gpu=name,memory.total,memory.used,utilization.gpu', 
                '--format=csv,noheader,nounits'
            ], capture_output=True, text=True, timeout=5)
            
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
    
    def _calculate_averages(self) -> Dict:
        """Calculate average performance metrics"""
        averages = {
            'frame_count': len(self.frame_times),
            'total_time': self.get_total_time(),
            'avg_frame_time': np.mean(self.frame_times) if self.frame_times else 0,
            'fps': len(self.frame_times) / self.get_total_time() if self.get_total_time() > 0 else 0
        }
        
        # Standard operations
        for op_name, times in self.operation_times.items():
            if op_name != 'custom_operations' and times:
                averages[f'avg_{op_name}'] = np.mean(times)
                averages[f'total_{op_name}'] = np.sum(times)
        
        # Custom operations
        for op_name, times in self.operation_times['custom_operations'].items():
            if times:
                averages[f'avg_{op_name}'] = np.mean(times)
                averages[f'total_{op_name}'] = np.sum(times)
        
        return averages
    
    def _calculate_utilization_stats(self) -> Dict:
        """Calculate utilization statistics"""
        stats = {}
        
        if self.cpu_utilization_history:
            cpu_values = [entry['value'] for entry in self.cpu_utilization_history]
            stats['cpu'] = {
                'avg': np.mean(cpu_values),
                'max': np.max(cpu_values),
                'min': np.min(cpu_values),
                'samples': len(cpu_values)
            }
        
        if self.gpu_utilization_history:
            gpu_values = [entry['utilization'] for entry in self.gpu_utilization_history]
            stats['gpu'] = {
                'avg': np.mean(gpu_values),
                'max': np.max(gpu_values),
                'min': np.min(gpu_values),
                'samples': len(gpu_values)
            }
        
        if self.memory_usage_history:
            memory_values = [entry['percent'] for entry in self.memory_usage_history]
            stats['memory'] = {
                'avg': np.mean(memory_values),
                'max': np.max(memory_values),
                'min': np.min(memory_values),
                'samples': len(memory_values)
            }
        
        return stats
    
    def _make_json_safe(self, obj) -> Any:
        """Convert numpy arrays and other non-JSON-serializable objects"""
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, dict):
            return {key: self._make_json_safe(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._make_json_safe(item) for item in obj]
        else:
            return obj
    
    def get_benchmark_data(self) -> Dict:
        """Get complete benchmark data for frontend consumption"""
        self.stop_simulation()
        
        benchmark_data = {
            'system_info': self.system_info,
            'performance_metrics': self._calculate_averages(),
            'utilization_stats': self._calculate_utilization_stats(),
            'timing_details': {
                'frame_times': self.frame_times,
                'operation_times': self.operation_times
            },
            'monitoring_data': {
                'cpu_history': self.cpu_utilization_history,
                'gpu_history': self.gpu_utilization_history,
                'memory_history': self.memory_usage_history
            },
            'simulation_settings': {
                'monitor_interval': self.monitor_interval,
                'total_frames': len(self.frame_times)
            }
        }
        
        return self._make_json_safe(benchmark_data)
    
    def print_summary(self):
        """Print a summary of benchmark results"""
        if not self.frame_times:
            print("No benchmark data available")
            return
        
        averages = self._calculate_averages()
        utilization = self._calculate_utilization_stats()
        
        print("\n" + "="*60)
        print("WARP SIMULATION BENCHMARK REPORT")
        print("="*60)
        
        # Performance metrics
        print(f"Total Time: {averages['total_time']:.4f}s")
        print(f"Frames: {averages['frame_count']}")
        print(f"Average FPS: {averages['fps']:.2f}")
        print(f"Average Frame Time: {averages['avg_frame_time']:.4f}s")
        
        # Operation breakdowns
        print("\nOperation Timings:")
        for op_name, times in self.operation_times.items():
            if op_name != 'custom_operations' and times:
                avg_time = np.mean(times)
                total_time = np.sum(times)
                print(f"  {op_name.replace('_', ' ').title()}: {avg_time:.4f}s avg, {total_time:.4f}s total")
        
        # Custom operations
        for op_name, times in self.operation_times['custom_operations'].items():
            if times:
                avg_time = np.mean(times)
                total_time = np.sum(times)
                print(f"  {op_name.replace('_', ' ').title()}: {avg_time:.4f}s avg, {total_time:.4f}s total")
        
        # System utilization
        print("\nSystem Utilization:")
        if 'cpu' in utilization:
            print(f"  CPU: {utilization['cpu']['avg']:.1f}% avg, {utilization['cpu']['max']:.1f}% max")
        if 'gpu' in utilization:
            print(f"  GPU: {utilization['gpu']['avg']:.1f}% avg, {utilization['gpu']['max']:.1f}% max")
        if 'memory' in utilization:
            print(f"  Memory: {utilization['memory']['avg']:.1f}% avg, {utilization['memory']['max']:.1f}% max")
        
        print("="*60)


# Convenience function for simple benchmarking
def benchmark_warp_simulation(simulation_func, *args, **kwargs):
    """
    Convenience function to benchmark a WARP simulation
    
    Args:
        simulation_func: Function that runs the simulation
        *args, **kwargs: Arguments to pass to simulation_func
    
    Returns:
        tuple: (simulation_result, benchmark_data)
    """
    benchmark = WarpBenchmark()
    benchmark.start_simulation()
    
    try:
        result = simulation_func(benchmark, *args, **kwargs)
        benchmark_data = benchmark.get_benchmark_data()
        benchmark.print_summary()
        return result, benchmark_data
    except Exception as e:
        benchmark.stop_simulation()
        raise e
