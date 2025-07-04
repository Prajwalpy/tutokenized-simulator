#!/usr/bin/env python3
"""
WARP Simulation Executor with Automatic Benchmarking

This script executes any uploaded WARP simulation code and automatically
collects comprehensive performance metrics, then sends both the simulation
output and benchmark data to the frontend.
"""

import sys
import os
import json
import subprocess
import tempfile
import time
from pathlib import Path

def execute_with_benchmarking(code_content: str, filename: str = "simulation.py") -> dict:
    """
    Execute WARP simulation code with automatic benchmarking
    
    Args:
        code_content: The Python code to execute
        filename: Name for the temporary file
    
    Returns:
        Dictionary containing both simulation output and benchmark data
    """
    
    # Create temporary file for the code
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_file:
        temp_file.write(code_content)
        temp_path = temp_file.name
    
    try:
        # Import the auto benchmark module
        sys.path.insert(0, os.path.dirname(__file__))
        from auto_benchmark import benchmark_execution
        
        print(f"[WarpExecutor] Starting execution with benchmarking...")
        print(f"[WarpExecutor] Temporary file: {temp_path}")
        
        # Execute with benchmarking
        benchmark_report = benchmark_execution(temp_path, monitor_interval=0.1)
        
        return {
            'status': 'success',
            'benchmark_data': benchmark_report,
            'execution_file': filename,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'execution_file': filename,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    finally:
        # Clean up temporary file
        try:
            os.unlink(temp_path)
        except OSError:
            pass

def execute_script_with_benchmarking(script_path: str) -> dict:
    """
    Execute an existing script with automatic benchmarking
    
    Args:
        script_path: Path to the script to execute
    
    Returns:
        Dictionary containing both simulation output and benchmark data
    """
    
    if not os.path.exists(script_path):
        return {
            'status': 'error',
            'error': f'Script not found: {script_path}',
            'execution_file': script_path,
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
    
    try:
        # Import the auto benchmark module
        sys.path.insert(0, os.path.dirname(__file__))
        from auto_benchmark import benchmark_execution
        
        print(f"[WarpExecutor] Starting execution with benchmarking...")
        print(f"[WarpExecutor] Script: {script_path}")
        
        # Execute with benchmarking
        benchmark_report = benchmark_execution(script_path, monitor_interval=0.1)
        
        return {
            'status': 'success',
            'benchmark_data': benchmark_report,
            'execution_file': os.path.basename(script_path),
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'execution_file': os.path.basename(script_path),
            'timestamp': time.strftime('%Y-%m-%d %H:%M:%S')
        }

def main():
    """Main execution function"""
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python warp_executor.py <script.py>           # Execute existing script")
        print("  python warp_executor.py --code '<code>'      # Execute code string")
        sys.exit(1)
    
    if sys.argv[1] == '--code':
        if len(sys.argv) < 3:
            print("Error: No code provided")
            sys.exit(1)
        
        code_content = sys.argv[2]
        result = execute_with_benchmarking(code_content)
    else:
        script_path = sys.argv[1]
        result = execute_script_with_benchmarking(script_path)
    
    # Output result for server to capture
    print(f"\nWARP_EXECUTION_RESULT:{json.dumps(result)}")
    
    return result

if __name__ == "__main__":
    main()
