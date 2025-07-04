#!/usr/bin/env python3
"""
Hardware Benchmarking System for WARP Simulations

This module monitors hardware utilization during WARP execution including:
- GPU utilization and memory usage
- CUDA core utilization 
- CPU performance metrics
- Memory consumption
- Temperature monitoring

Usage:
    python benchmarking.py <script_to_monitor.py>
    
The benchmarking runs in parallel with the target script and outputs
comprehensive hardware metrics for frontend display.
"""

import json
import time
import psutil
import subprocess
import platform
import sys
import os
import threading
import signal
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import numpy as np

@dataclass
class GPUMetrics:
    """GPU utilization metrics"""
    gpu_id: int
    name: str
    utilization_percent: float
    memory_used_mb: int
    memory_total_mb: int
    memory_percent: float
    temperature_c: int
    power_draw_w: float
    clock_graphics_mhz: int
    clock_memory_mhz: int

@dataclass
class SystemMetrics:
    """System-wide metrics"""
    timestamp: float
    cpu_percent: float
    memory_percent: float
    memory_used_gb: float
    memory_total_gb: float
    gpu_metrics: List[GPUMetrics]
    process_cpu_percent: float
    process_memory_mb: float

@dataclass
class BenchmarkReport:
    """Complete benchmark report"""
    execution_time: float
    average_gpu_utilization: float
    peak_gpu_utilization: float
    average_gpu_memory_percent: float
    peak_gpu_memory_mb: int
    average_cpu_percent: float
    peak_cpu_percent: float
    average_memory_percent: float
    peak_memory_gb: float
    gpu_efficiency_rating: str
    cuda_performance_rating: str
    system_info: Dict[str, Any]
    timeline_data: List[SystemMetrics]
    recommendations: List[str]

class HardwareBenchmark:
    """Real-time hardware monitoring for WARP simulations"""
    
    def __init__(self, monitor_interval: float = 0.1):
        self.monitor_interval = monitor_interval
        self.monitoring = False
        self.start_time = None
        self.timeline = []
        self.target_process = None
        self.monitor_thread = None
        
    def get_nvidia_gpu_metrics(self) -> List[GPUMetrics]:
        """Get detailed NVIDIA GPU metrics using nvidia-smi"""
        gpu_metrics = []
        
        try:
            # Query comprehensive GPU data
            cmd = [
                'nvidia-smi',
                '--query-gpu=index,name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,clocks.current.graphics,clocks.current.memory',
                '--format=csv,noheader,nounits'
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
            
            if result.returncode == 0:
                for line in result.stdout.strip().split('\n'):
                    if line.strip():
                        parts = [p.strip() for p in line.split(',')]
                        if len(parts) >= 9:
                            try:
                                gpu_id = int(parts[0]) if parts[0].isdigit() else 0
                                name = parts[1]
                                utilization = float(parts[2]) if parts[2].replace('.', '').isdigit() else 0
                                memory_used = int(parts[3]) if parts[3].isdigit() else 0
                                memory_total = int(parts[4]) if parts[4].isdigit() else 0
                                temperature = int(parts[5]) if parts[5].replace('.', '').isdigit() else 0
                                power_draw = float(parts[6]) if parts[6].replace('.', '').isdigit() else 0
                                clock_graphics = int(parts[7]) if parts[7].isdigit() else 0
                                clock_memory = int(parts[8]) if parts[8].isdigit() else 0
                                
                                memory_percent = (memory_used / memory_total * 100) if memory_total > 0 else 0
                                
                                gpu_metrics.append(GPUMetrics(
                                    gpu_id=gpu_id,
                                    name=name,
                                    utilization_percent=utilization,
                                    memory_used_mb=memory_used,
                                    memory_total_mb=memory_total,
                                    memory_percent=memory_percent,
                                    temperature_c=temperature,
                                    power_draw_w=power_draw,
                                    clock_graphics_mhz=clock_graphics,
                                    clock_memory_mhz=clock_memory
                                ))
                            except (ValueError, IndexError) as e:
                                print(f"Warning: Could not parse GPU data: {e}")
                                continue
                                
        except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.CalledProcessError) as e:
            print(f"Warning: nvidia-smi not available or failed: {e}")
            # Fallback: create placeholder GPU metrics
            gpu_metrics.append(GPUMetrics(
                gpu_id=0,
                name="Unknown GPU",
                utilization_percent=0,
                memory_used_mb=0,
                memory_total_mb=0,
                memory_percent=0,
                temperature_c=0,
                power_draw_w=0,
                clock_graphics_mhz=0,
                clock_memory_mhz=0
            ))
            
        return gpu_metrics
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get comprehensive system information"""
        try:
            memory = psutil.virtual_memory()
            cpu_freq = psutil.cpu_freq()
            
            # Get GPU info
            gpu_info = self.get_nvidia_gpu_metrics()
            
            return {
                "cpu": {
                    "model": platform.processor(),
                    "cores_physical": psutil.cpu_count(logical=False),
                    "cores_logical": psutil.cpu_count(logical=True),
                    "frequency_mhz": cpu_freq.current if cpu_freq else 0,
                    "frequency_max_mhz": cpu_freq.max if cpu_freq else 0
                },
                "memory": {
                    "total_gb": memory.total / (1024**3),
                    "available_gb": memory.available / (1024**3)
                },
                "gpu": [asdict(gpu) for gpu in gpu_info],
                "platform": {
                    "system": platform.system(),
                    "version": platform.version(),
                    "architecture": platform.architecture()[0],
                    "python_version": platform.python_version()
                },
                "warp": {
                    "version": self.get_warp_version(),
                    "cuda_available": self.check_cuda_available()
                }
            }
        except Exception as e:
            print(f"Warning: Could not get system info: {e}")
            return {}
    
    def get_warp_version(self) -> str:
        """Get WARP version"""
        try:
            import warp as wp
            return getattr(wp, '__version__', 'unknown')
        except ImportError:
            return 'not_installed'
    
    def check_cuda_available(self) -> bool:
        """Check if CUDA is available"""
        try:
            result = subprocess.run(['nvidia-smi'], capture_output=True, timeout=3)
            return result.returncode == 0
        except:
            return False
    
    def collect_metrics(self) -> SystemMetrics:
        """Collect current system metrics"""
        # System-wide metrics
        memory = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent()
        
        # Process-specific metrics
        process_cpu = 0
        process_memory = 0
        if self.target_process:
            try:
                process_cpu = self.target_process.cpu_percent()
                process_memory = self.target_process.memory_info().rss / (1024**2)  # MB
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
        
        # GPU metrics
        gpu_metrics = self.get_nvidia_gpu_metrics()
        
        return SystemMetrics(
            timestamp=time.time(),
            cpu_percent=cpu_percent,
            memory_percent=memory.percent,
            memory_used_gb=memory.used / (1024**3),
            memory_total_gb=memory.total / (1024**3),
            gpu_metrics=gpu_metrics,
            process_cpu_percent=process_cpu,
            process_memory_mb=process_memory
        )
    
    def monitor_loop(self):
        """Background monitoring loop"""
        while self.monitoring:
            try:
                metrics = self.collect_metrics()
                self.timeline.append(metrics)
                time.sleep(self.monitor_interval)
            except Exception as e:
                print(f"Warning: Monitoring error: {e}")
                time.sleep(self.monitor_interval)
    
    def start_monitoring(self, target_pid: Optional[int] = None):
        """Start hardware monitoring"""
        self.monitoring = True
        self.start_time = time.time()
        self.timeline = []
        
        if target_pid:
            try:
                self.target_process = psutil.Process(target_pid)
            except psutil.NoSuchProcess:
                print(f"Warning: Process {target_pid} not found")
                self.target_process = None
        
        self.monitor_thread = threading.Thread(target=self.monitor_loop)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        
        print(f"[Benchmark] Hardware monitoring started (interval: {self.monitor_interval}s)")
    
    def stop_monitoring(self) -> BenchmarkReport:
        """Stop monitoring and generate report"""
        self.monitoring = False
        execution_time = time.time() - self.start_time if self.start_time else 0
        
        if self.monitor_thread:
            self.monitor_thread.join(timeout=2.0)
        
        # Calculate aggregate metrics
        if not self.timeline:
            print("Warning: No monitoring data collected")
            return self.create_empty_report(execution_time)
        
        # GPU metrics aggregation
        gpu_utilizations = []
        gpu_memory_percents = []
        gpu_memory_mbs = []
        
        for metrics in self.timeline:
            for gpu in metrics.gpu_metrics:
                gpu_utilizations.append(gpu.utilization_percent)
                gpu_memory_percents.append(gpu.memory_percent)
                gpu_memory_mbs.append(gpu.memory_used_mb)
        
        # CPU and memory metrics
        cpu_utilizations = [m.cpu_percent for m in self.timeline]
        memory_percents = [m.memory_percent for m in self.timeline]
        memory_gbs = [m.memory_used_gb for m in self.timeline]
        
        # Calculate averages and peaks
        avg_gpu_util = np.mean(gpu_utilizations) if gpu_utilizations else 0
        peak_gpu_util = np.max(gpu_utilizations) if gpu_utilizations else 0
        avg_gpu_memory = np.mean(gpu_memory_percents) if gpu_memory_percents else 0
        peak_gpu_memory = np.max(gpu_memory_mbs) if gpu_memory_mbs else 0
        
        avg_cpu = np.mean(cpu_utilizations) if cpu_utilizations else 0
        peak_cpu = np.max(cpu_utilizations) if cpu_utilizations else 0
        avg_memory = np.mean(memory_percents) if memory_percents else 0
        peak_memory = np.max(memory_gbs) if memory_gbs else 0
        
        # Performance ratings
        gpu_efficiency = self.rate_gpu_efficiency(avg_gpu_util, peak_gpu_util)
        cuda_performance = self.rate_cuda_performance(avg_gpu_util, avg_gpu_memory)
        
        # Generate recommendations
        recommendations = self.generate_recommendations(
            avg_gpu_util, avg_cpu, avg_memory, execution_time
        )
        
        report = BenchmarkReport(
            execution_time=execution_time,
            average_gpu_utilization=avg_gpu_util,
            peak_gpu_utilization=peak_gpu_util,
            average_gpu_memory_percent=avg_gpu_memory,
            peak_gpu_memory_mb=int(peak_gpu_memory),
            average_cpu_percent=avg_cpu,
            peak_cpu_percent=peak_cpu,
            average_memory_percent=avg_memory,
            peak_memory_gb=peak_memory,
            gpu_efficiency_rating=gpu_efficiency,
            cuda_performance_rating=cuda_performance,
            system_info=self.get_system_info(),
            timeline_data=self.timeline,
            recommendations=recommendations
        )
        
        print(f"[Benchmark] Monitoring completed ({execution_time:.2f}s)")
        return report
    
    def create_empty_report(self, execution_time: float) -> BenchmarkReport:
        """Create empty report when no data is available"""
        return BenchmarkReport(
            execution_time=execution_time,
            average_gpu_utilization=0,
            peak_gpu_utilization=0,
            average_gpu_memory_percent=0,
            peak_gpu_memory_mb=0,
            average_cpu_percent=0,
            peak_cpu_percent=0,
            average_memory_percent=0,
            peak_memory_gb=0,
            gpu_efficiency_rating="No Data",
            cuda_performance_rating="No Data",
            system_info=self.get_system_info(),
            timeline_data=[],
            recommendations=["No monitoring data available"]
        )
    
    def rate_gpu_efficiency(self, avg_util: float, peak_util: float) -> str:
        """Rate GPU efficiency based on utilization"""
        if avg_util > 80:
            return "Excellent"
        elif avg_util > 60:
            return "Good"
        elif avg_util > 30:
            return "Moderate"
        elif avg_util > 10:
            return "Low"
        else:
            return "Very Low"
    
    def rate_cuda_performance(self, gpu_util: float, memory_util: float) -> str:
        """Rate CUDA performance"""
        if gpu_util > 70 and memory_util > 50:
            return "High Performance"
        elif gpu_util > 50 or memory_util > 30:
            return "Moderate Performance"
        elif gpu_util > 20 or memory_util > 10:
            return "Basic Performance"
        else:
            return "Minimal GPU Usage"
    
    def generate_recommendations(self, gpu_util: float, cpu_util: float, 
                               memory_util: float, exec_time: float) -> List[str]:
        """Generate performance recommendations"""
        recommendations = []
        
        if gpu_util < 30:
            recommendations.append("GPU utilization is low - ensure WARP is using GPU acceleration")
        
        if cpu_util > 90:
            recommendations.append("CPU is heavily utilized - consider GPU acceleration for compute tasks")
        
        if memory_util > 85:
            recommendations.append("Memory usage is high - consider optimizing data structures")
        
        if exec_time > 60:
            recommendations.append("Long execution time - consider optimizing algorithms or reducing problem size")
        
        if gpu_util > 80 and memory_util < 50:
            recommendations.append("Excellent GPU compute utilization - consider increasing data size for better throughput")
        
        if not recommendations:
            recommendations.append("Performance looks optimal for this workload")
        
        return recommendations
    
    def make_json_safe(self, obj):
        """Convert objects to JSON-safe format"""
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (np.integer, np.floating)):
            return float(obj)
        elif hasattr(obj, '__dataclass_fields__'):
            return asdict(obj)
        elif isinstance(obj, dict):
            return {key: self.make_json_safe(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self.make_json_safe(item) for item in obj]
        else:
            return obj

def monitor_script_execution(script_path: str, monitor_interval: float = 0.1) -> Dict[str, Any]:
    """
    Execute a Python script while monitoring hardware performance
    
    Args:
        script_path: Path to Python script to execute and monitor
        monitor_interval: Monitoring sample rate in seconds
    
    Returns:
        Dictionary containing execution output and benchmark data
    """
    
    if not os.path.exists(script_path):
        return {
            'status': 'error',
            'error': f'Script not found: {script_path}',
            'benchmark_data': None
        }
    
    benchmark = HardwareBenchmark(monitor_interval)
    
    try:
        print(f"[Benchmark] Starting execution: {script_path}")
        
        # Start the target script
        process = subprocess.Popen([
            sys.executable, script_path
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        # Start monitoring the process
        benchmark.start_monitoring(process.pid)
        
        # Wait for completion
        stdout, stderr = process.communicate()
        
        # Stop monitoring and get report
        report = benchmark.stop_monitoring()
        
        # Print execution output
        if stdout:
            print("\n" + "="*50)
            print("SCRIPT OUTPUT:")
            print("="*50)
            print(stdout)
        
        if stderr:
            print("\n" + "="*50)
            print("SCRIPT ERRORS:")
            print("="*50)
            print(stderr)
        
        # Convert report to JSON-safe format
        safe_report = benchmark.make_json_safe(report)
        
        # Print benchmark summary
        print("\n" + "="*50)
        print("HARDWARE BENCHMARK SUMMARY")
        print("="*50)
        print(f"Execution Time: {report.execution_time:.2f}s")
        print(f"Average GPU Utilization: {report.average_gpu_utilization:.1f}%")
        print(f"Peak GPU Utilization: {report.peak_gpu_utilization:.1f}%")
        print(f"Average CPU Utilization: {report.average_cpu_percent:.1f}%")
        print(f"Peak Memory Usage: {report.peak_memory_gb:.2f}GB")
        print(f"GPU Efficiency Rating: {report.gpu_efficiency_rating}")
        print(f"CUDA Performance Rating: {report.cuda_performance_rating}")
        
        print("\nRecommendations:")
        for rec in report.recommendations:
            print(f"  • {rec}")
        print("="*50)
        
        # Output JSON for frontend
        result = {
            'status': 'success',
            'execution_time': report.execution_time,
            'script_output': stdout,
            'script_errors': stderr,
            'benchmark_data': safe_report,
            'script_name': os.path.basename(script_path)
        }
        
        print(f"\nHARDWARE_BENCHMARK_OUTPUT:{json.dumps(result)}")
        return result
        
    except Exception as e:
        print(f"[Benchmark] Error during execution: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'benchmark_data': None
        }

def main():
    """Main execution function"""
    if len(sys.argv) != 2:
        print("Usage: python benchmarking.py <script_to_monitor.py>")
        print("\nExample:")
        print("  python benchmarking.py volume.py")
        sys.exit(1)
    
    script_path = sys.argv[1]
    result = monitor_script_execution(script_path)
    
    return result

if __name__ == "__main__":
    main()
