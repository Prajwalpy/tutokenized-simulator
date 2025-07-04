#!/usr/bin/env python3
"""
Automatic Post-Execution Benchmarking System for WARP Simulations

This module automatically runs after any WARP simulation to collect comprehensive
performance metrics, system information, and resource utilization data.
It monitors the execution environment and provides detailed analytics.
"""

import json
import time
import psutil
import subprocess
import platform
import sys
import os
import threading
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import numpy as np

@dataclass
class SystemInfo:
    """System information structure"""
    cpu_model: str
    cpu_cores: int
    cpu_threads: int
    total_memory_gb: float
    available_memory_gb: float
    gpu_info: List[Dict[str, Any]]
    platform: str
    python_version: str
    warp_version: str
    timestamp: str

@dataclass
class ResourceMetrics:
    """Resource utilization metrics"""
    cpu_percent: float
    memory_percent: float
    memory_used_gb: float
    gpu_utilization: List[Dict[str, float]]
    disk_io: Dict[str, float]
    network_io: Dict[str, float]

@dataclass
class BenchmarkResults:
    """Complete benchmark results"""
    system_info: SystemInfo
    execution_time: float
    peak_memory_usage: float
    average_cpu_usage: float
    peak_cpu_usage: float
    gpu_metrics: List[Dict[str, Any]]
    resource_timeline: List[ResourceMetrics]
    process_stats: Dict[str, Any]
    warp_specific_metrics: Dict[str, Any]

class AutoBenchmark:
    """Automatic benchmarking system for WARP simulations"""
    
    def __init__(self, monitor_interval: float = 0.1):
        self.monitor_interval = monitor_interval
        self.start_time = None
        self.end_time = None
        self.resource_history = []
        self.monitoring = False
        self.monitor_thread = None
        self.process = None
        
    def get_gpu_info(self) -> List[Dict[str, Any]]:
        """Get GPU information using nvidia-smi"""
        try:
            result = subprocess.run([
                'nvidia-smi', '--query-gpu=name,memory.total,memory.used,temperature.gpu,utilization.gpu',
                '--format=csv,noheader,nounits'
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                gpu_info = []
                for i, line in enumerate(result.stdout.strip().split('\n')):
                    if line.strip():
                        parts = [p.strip() for p in line.split(',')]
                        if len(parts) >= 5:
                            gpu_info.append({
                                'id': i,
                                'name': parts[0],
                                'memory_total_mb': int(parts[1]) if parts[1].isdigit() else 0,
                                'memory_used_mb': int(parts[2]) if parts[2].isdigit() else 0,
                                'temperature': int(parts[3]) if parts[3].isdigit() else 0,
                                'utilization_percent': int(parts[4]) if parts[4].isdigit() else 0
                            })
                return gpu_info
        except Exception as e:
            print(f"Warning: Could not get GPU info: {e}")
        
        return [{'id': 0, 'name': 'Unknown', 'memory_total_mb': 0, 'memory_used_mb': 0, 
                'temperature': 0, 'utilization_percent': 0}]
    
    def get_warp_version(self) -> str:
        """Get WARP version if available"""
        try:
            import warp as wp
            return getattr(wp, '__version__', 'unknown')
        except ImportError:
            return 'not_installed'
    
    def get_system_info(self) -> SystemInfo:
        """Collect comprehensive system information"""
        memory = psutil.virtual_memory()
        
        return SystemInfo(
            cpu_model=platform.processor() or 'Unknown',
            cpu_cores=psutil.cpu_count(logical=False),
            cpu_threads=psutil.cpu_count(logical=True),
            total_memory_gb=memory.total / (1024**3),
            available_memory_gb=memory.available / (1024**3),
            gpu_info=self.get_gpu_info(),
            platform=f"{platform.system()} {platform.release()}",
            python_version=platform.python_version(),
            warp_version=self.get_warp_version(),
            timestamp=time.strftime('%Y-%m-%d %H:%M:%S')
        )
    
    def get_current_resources(self) -> ResourceMetrics:
        """Get current resource utilization"""
        memory = psutil.virtual_memory()
        disk_io = psutil.disk_io_counters()
        net_io = psutil.net_io_counters()
        
        # Get GPU utilization
        gpu_util = []
        for gpu in self.get_gpu_info():
            gpu_util.append({
                'gpu_id': gpu['id'],
                'utilization': gpu['utilization_percent'],
                'memory_used': gpu['memory_used_mb'],
                'temperature': gpu['temperature']
            })
        
        return ResourceMetrics(
            cpu_percent=psutil.cpu_percent(),
            memory_percent=memory.percent,
            memory_used_gb=memory.used / (1024**3),
            gpu_utilization=gpu_util,
            disk_io={
                'read_mb': disk_io.read_bytes / (1024**2) if disk_io else 0,
                'write_mb': disk_io.write_bytes / (1024**2) if disk_io else 0
            },
            network_io={
                'sent_mb': net_io.bytes_sent / (1024**2) if net_io else 0,
                'recv_mb': net_io.bytes_recv / (1024**2) if net_io else 0
            }
        )
    
    def monitor_resources(self):
        """Background thread to monitor resource usage"""
        while self.monitoring:
            try:
                metrics = self.get_current_resources()
                self.resource_history.append(metrics)
                time.sleep(self.monitor_interval)
            except Exception as e:
                print(f"Warning: Resource monitoring error: {e}")
                time.sleep(self.monitor_interval)
    
    def start_monitoring(self, target_process_id: Optional[int] = None):
        """Start resource monitoring"""
        self.start_time = time.perf_counter()
        self.monitoring = True
        self.resource_history = []
        
        if target_process_id:
            try:
                self.process = psutil.Process(target_process_id)
            except psutil.NoSuchProcess:
                self.process = None
        
        self.monitor_thread = threading.Thread(target=self.monitor_resources)
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        
        print(f"[AutoBenchmark] Started monitoring (interval: {self.monitor_interval}s)")
    
    def stop_monitoring(self) -> BenchmarkResults:
        """Stop monitoring and return results"""
        self.end_time = time.perf_counter()
        self.monitoring = False
        
        if self.monitor_thread:
            self.monitor_thread.join(timeout=2.0)
        
        execution_time = self.end_time - self.start_time
        
        # Calculate aggregated metrics
        if self.resource_history:
            cpu_usage = [r.cpu_percent for r in self.resource_history]
            memory_usage = [r.memory_used_gb for r in self.resource_history]
            
            avg_cpu = np.mean(cpu_usage) if cpu_usage else 0
            peak_cpu = np.max(cpu_usage) if cpu_usage else 0
            peak_memory = np.max(memory_usage) if memory_usage else 0
        else:
            avg_cpu = peak_cpu = peak_memory = 0
        
        # Get process-specific stats if available
        process_stats = {}
        if self.process:
            try:
                process_stats = {
                    'cpu_percent': self.process.cpu_percent(),
                    'memory_mb': self.process.memory_info().rss / (1024**2),
                    'num_threads': self.process.num_threads(),
                    'status': self.process.status()
                }
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                process_stats = {'error': 'Process no longer accessible'}
        
        # WARP-specific metrics (if detectable)
        warp_metrics = self.detect_warp_metrics()
        
        results = BenchmarkResults(
            system_info=self.get_system_info(),
            execution_time=execution_time,
            peak_memory_usage=peak_memory,
            average_cpu_usage=avg_cpu,
            peak_cpu_usage=peak_cpu,
            gpu_metrics=self.get_gpu_info(),
            resource_timeline=self.resource_history,
            process_stats=process_stats,
            warp_specific_metrics=warp_metrics
        )
        
        print(f"[AutoBenchmark] Monitoring completed ({execution_time:.2f}s)")
        return results
    
    def detect_warp_metrics(self) -> Dict[str, Any]:
        """Detect WARP-specific performance metrics"""
        warp_metrics = {
            'detected_operations': [],
            'estimated_gpu_usage': 0,
            'simulation_type': 'unknown'
        }
        
        # Try to detect WARP usage patterns
        try:
            if self.resource_history:
                gpu_usage = []
                for metrics in self.resource_history:
                    for gpu in metrics.gpu_utilization:
                        gpu_usage.append(gpu['utilization'])
                
                if gpu_usage:
                    warp_metrics['estimated_gpu_usage'] = np.mean(gpu_usage)
                    warp_metrics['peak_gpu_usage'] = np.max(gpu_usage)
                    
                    # Detect simulation patterns
                    if np.mean(gpu_usage) > 50:
                        warp_metrics['simulation_type'] = 'gpu_intensive'
                    elif np.mean(gpu_usage) > 10:
                        warp_metrics['simulation_type'] = 'moderate_gpu'
                    else:
                        warp_metrics['simulation_type'] = 'cpu_primary'
        
        except Exception as e:
            warp_metrics['detection_error'] = str(e)
        
        return warp_metrics
    
    def make_json_safe(self, obj):
        """Convert numpy arrays and other non-serializable objects to JSON-safe formats"""
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, dict):
            return {key: self.make_json_safe(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self.make_json_safe(item) for item in obj]
        elif hasattr(obj, '__dict__'):
            return self.make_json_safe(asdict(obj) if hasattr(obj, '__dataclass_fields__') else obj.__dict__)
        else:
            return obj
    
    def generate_report(self, results: BenchmarkResults) -> Dict[str, Any]:
        """Generate a comprehensive benchmark report"""
        
        # Convert to JSON-safe format
        safe_results = self.make_json_safe(results)
        
        # Create summary metrics
        summary = {
            'execution_summary': {
                'total_time': results.execution_time,
                'peak_memory_gb': results.peak_memory_usage,
                'average_cpu_percent': results.average_cpu_usage,
                'peak_cpu_percent': results.peak_cpu_usage,
                'gpu_count': len(results.gpu_metrics),
                'monitoring_samples': len(results.resource_timeline)
            },
            'system_summary': {
                'cpu': f"{results.system_info.cpu_model} ({results.system_info.cpu_cores}C/{results.system_info.cpu_threads}T)",
                'memory': f"{results.system_info.total_memory_gb:.1f}GB total",
                'gpu_primary': results.system_info.gpu_info[0]['name'] if results.system_info.gpu_info else 'None',
                'platform': results.system_info.platform
            },
            'performance_rating': self.calculate_performance_rating(results),
            'recommendations': self.generate_recommendations(results)
        }
        
        return {
            'benchmark_type': 'auto_post_execution',
            'timestamp': results.system_info.timestamp,
            'summary': summary,
            'detailed_results': safe_results,
            'format_version': '1.0'
        }
    
    def calculate_performance_rating(self, results: BenchmarkResults) -> Dict[str, str]:
        """Calculate performance ratings"""
        ratings = {}
        
        # CPU performance rating
        if results.average_cpu_usage > 80:
            ratings['cpu'] = 'High Utilization'
        elif results.average_cpu_usage > 50:
            ratings['cpu'] = 'Moderate Utilization'
        else:
            ratings['cpu'] = 'Low Utilization'
        
        # Memory performance rating
        memory_percent = (results.peak_memory_usage / results.system_info.total_memory_gb) * 100
        if memory_percent > 80:
            ratings['memory'] = 'High Usage'
        elif memory_percent > 50:
            ratings['memory'] = 'Moderate Usage'
        else:
            ratings['memory'] = 'Low Usage'
        
        # GPU performance rating
        if results.warp_specific_metrics.get('estimated_gpu_usage', 0) > 70:
            ratings['gpu'] = 'High Utilization'
        elif results.warp_specific_metrics.get('estimated_gpu_usage', 0) > 30:
            ratings['gpu'] = 'Moderate Utilization'
        else:
            ratings['gpu'] = 'Low Utilization'
        
        return ratings
    
    def generate_recommendations(self, results: BenchmarkResults) -> List[str]:
        """Generate performance recommendations"""
        recommendations = []
        
        if results.average_cpu_usage > 90:
            recommendations.append("Consider using more CPU cores or optimizing algorithms")
        
        if results.peak_memory_usage > results.system_info.total_memory_gb * 0.9:
            recommendations.append("Memory usage is very high - consider optimizing data structures")
        
        if results.warp_specific_metrics.get('estimated_gpu_usage', 0) < 20:
            recommendations.append("GPU utilization is low - verify WARP is using GPU acceleration")
        
        if results.execution_time > 60:
            recommendations.append("Long execution time - consider reducing problem size or optimizing")
        
        if not recommendations:
            recommendations.append("Performance looks good - no specific recommendations")
        
        return recommendations

def benchmark_execution(script_path: str, monitor_interval: float = 0.1) -> Dict[str, Any]:
    """
    Run a Python script and automatically benchmark its execution
    
    Args:
        script_path: Path to the Python script to execute
        monitor_interval: How often to sample resource usage (seconds)
    
    Returns:
        Dictionary containing benchmark results
    """
    benchmark = AutoBenchmark(monitor_interval)
    
    # Start monitoring
    benchmark.start_monitoring()
    
    try:
        # Execute the script
        print(f"[AutoBenchmark] Executing: {script_path}")
        
        # Run the script as a subprocess to monitor it
        process = subprocess.Popen([
            sys.executable, script_path
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        # Start monitoring the specific process
        benchmark.process = psutil.Process(process.pid)
        
        # Wait for completion
        stdout, stderr = process.communicate()
        
        # Print output
        if stdout:
            print(stdout)
        if stderr:
            print(f"STDERR: {stderr}", file=sys.stderr)
        
    except Exception as e:
        print(f"[AutoBenchmark] Execution error: {e}")
    
    finally:
        # Stop monitoring and get results
        results = benchmark.stop_monitoring()
        report = benchmark.generate_report(results)
        
        # Print benchmark summary
        print("\n" + "="*60)
        print("AUTOMATIC BENCHMARK REPORT")
        print("="*60)
        print(f"Execution Time: {results.execution_time:.2f}s")
        print(f"Peak Memory: {results.peak_memory_usage:.2f}GB")
        print(f"Average CPU: {results.average_cpu_usage:.1f}%")
        print(f"Peak CPU: {results.peak_cpu_usage:.1f}%")
        
        if results.gpu_metrics:
            gpu_usage = results.warp_specific_metrics.get('estimated_gpu_usage', 0)
            print(f"GPU Usage: {gpu_usage:.1f}%")
        
        print("\nRecommendations:")
        for rec in report['summary']['recommendations']:
            print(f"  • {rec}")
        
        print("="*60)
        
        # Output JSON for frontend consumption
        print(f"\nBENCHMARK_OUTPUT:{json.dumps(report)}")
        
        return report

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python auto_benchmark.py <script_to_benchmark.py>")
        sys.exit(1)
    
    script_to_run = sys.argv[1]
    if not os.path.exists(script_to_run):
        print(f"Error: Script not found: {script_to_run}")
        sys.exit(1)
    
    benchmark_execution(script_to_run)
