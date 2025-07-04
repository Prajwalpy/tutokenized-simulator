#!/usr/bin/env python3
"""
SOL VM Python Poller
This script runs on the SOL VM to poll for code execution tasks
"""

import json
import time
import requests
import subprocess
import tempfile
import os
import sys
import traceback
import psutil
import platform
from datetime import datetime
from typing import Dict, Any, Optional

class SolVMPythonPoller:
    def __init__(self, 
                 task_queue_url: str = "https://your-message-queue-api.com/tasks",
                 result_queue_url: str = "https://your-message-queue-api.com/results",
                 api_key: str = "YOUR_API_KEY",
                 poll_interval: int = 5,
                 max_retries: int = 3,
                 retry_delay: int = 2):
        
        self.task_queue_url = task_queue_url
        self.result_queue_url = result_queue_url
        self.api_key = api_key
        self.poll_interval = poll_interval
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        
        self.vm_id = self._generate_vm_id()
        self.is_polling = False
        self.current_task = None
        
        # Session for connection pooling
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        })
        
        print(f"🚀 SOL VM Python Poller initialized")
        print(f"   VM ID: {self.vm_id}")
        print(f"   Task Queue: {self.task_queue_url}")
        print(f"   Result Queue: {self.result_queue_url}")
        print(f"   Poll Interval: {self.poll_interval}s")

    def _generate_vm_id(self) -> str:
        hostname = os.environ.get('HOSTNAME', platform.node())
        timestamp = int(time.time())
        return f"{hostname}_{timestamp}_{os.getpid()}"

    def start_polling(self):
        """Start the main polling loop"""
        if self.is_polling:
            print("Already polling for tasks")
            return
            
        self.is_polling = True
        print(f"🔄 Starting polling loop...")
        
        try:
            self._poll_loop()
        except KeyboardInterrupt:
            print("\n🛑 Received interrupt signal, stopping...")
            self.stop_polling()
        except Exception as e:
            print(f"❌ Fatal error in polling loop: {e}")
            traceback.print_exc()
            self.stop_polling()

    def stop_polling(self):
        """Stop polling"""
        self.is_polling = False
        self.session.close()
        print("🛑 SOL VM Poller stopped")

    def _poll_loop(self):
        """Main polling loop"""
        while self.is_polling:
            try:
                # Get next task
                task = self._get_next_task()
                
                if task:
                    self.current_task = task
                    print(f"📋 Processing task: {task['id']}")
                    
                    # Execute the task
                    result = self._execute_task(task)
                    
                    # Submit result
                    self._submit_result(result)
                    
                    print(f"✅ Task completed: {task['id']} (success: {result['success']})")
                    self.current_task = None
                else:
                    # No tasks available, wait a bit
                    time.sleep(self.poll_interval)
                    continue
                
            except Exception as e:
                print(f"❌ Error in polling loop: {e}")
                
                # If we have a current task, mark it as failed
                if self.current_task:
                    try:
                        error_result = {
                            'id': self.current_task['id'],
                            'success': False,
                            'output': '',
                            'error': f'VM execution error: {str(e)}',
                            'execution_time': 0,
                            'timestamp': datetime.now().isoformat(),
                            'code': self.current_task.get('code', ''),
                            'status': 'failed',
                            'vm_id': self.vm_id,
                            'vm_info': self._get_vm_info()
                        }
                        
                        self._submit_result(error_result)
                    except Exception as submit_error:
                        print(f"Failed to submit error result: {submit_error}")
                    
                    self.current_task = None
                
                time.sleep(self.retry_delay)

    def _get_next_task(self) -> Optional[Dict[str, Any]]:
        """Get the next task from the queue"""
        try:
            url = f"{self.task_queue_url}/next?vm_id={self.vm_id}"
            response = self.session.get(url, timeout=10)
            
            if response.status_code == 204:
                # No tasks available
                return None
            
            if response.status_code != 200:
                raise Exception(f"HTTP {response.status_code}: {response.text}")
            
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Failed to get next task: {e}")
            return None

    def _execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a Python code task"""
        start_time = time.time()
        task_id = task['id']
        code = task['code']
        timeout = task.get('timeout', 120)  # 2 minutes default for video generation
        
        try:
            # Update task status to running
            self._update_task_status(task_id, 'running')
            
            # Execute the code
            execution_result = self._execute_python_code(code, timeout)
            
            # Parse video data from output if present
            video_data = {}
            if execution_result['success'] and execution_result['output']:
                video_data = self._parse_video_output(execution_result['output'])
            
            execution_time = time.time() - start_time
            
            return {
                'id': task_id,
                'success': execution_result['success'],
                'output': execution_result['output'],
                'error': execution_result['error'],
                'execution_time': execution_time,
                'timestamp': datetime.now().isoformat(),
                'code': code,
                'status': 'completed' if execution_result['success'] else 'failed',
                'vm_id': self.vm_id,
                'vm_info': self._get_vm_info(),
                'system_metrics': self._get_system_metrics(),
                'benchmarks': execution_result.get('benchmarks'),
                'video_data': video_data
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            
            return {
                'id': task_id,
                'success': False,
                'output': '',
                'error': f'Execution error: {str(e)}',
                'execution_time': execution_time,
                'timestamp': datetime.now().isoformat(),
                'code': code,
                'status': 'failed',
                'vm_id': self.vm_id,
                'vm_info': self._get_vm_info()
            }

    def _execute_python_code(self, code: str, timeout: int) -> Dict[str, Any]:
        """Execute Python code in a subprocess"""
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            try:
                # Execute the code
                result = subprocess.run(
                    [sys.executable, temp_file],
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                    cwd=tempfile.gettempdir()
                )
                
                return {
                    'success': result.returncode == 0,
                    'output': result.stdout,
                    'error': result.stderr,
                    'return_code': result.returncode
                }
                
            finally:
                # Clean up temp file
                try:
                    os.unlink(temp_file)
                except OSError:
                    pass
                    
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': f'Execution timed out after {timeout} seconds',
                'return_code': -1
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': f'Execution failed: {str(e)}',
                'return_code': -1
            }

    def _submit_result(self, result: Dict[str, Any]):
        """Submit execution result back to the queue"""
        for attempt in range(self.max_retries):
            try:
                response = self.session.post(
                    self.result_queue_url,
                    json=result,
                    timeout=10
                )
                
                if response.status_code in [200, 201]:
                    return  # Success
                
                raise Exception(f"HTTP {response.status_code}: {response.text}")
                
            except Exception as e:
                print(f"Failed to submit result (attempt {attempt + 1}/{self.max_retries}): {e}")
                
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay * (attempt + 1))  # Exponential backoff
                else:
                    raise Exception(f"Failed to submit result after {self.max_retries} attempts: {e}")

    def _update_task_status(self, task_id: str, status: str):
        """Update task status"""
        try:
            url = f"{self.task_queue_url}/{task_id}/status"
            data = {'status': status, 'vm_id': self.vm_id}
            
            response = self.session.put(url, json=data, timeout=5)
            
            if not response.ok:
                print(f"Failed to update task status: HTTP {response.status_code}")
                
        except Exception as e:
            print(f"Failed to update task status: {e}")

    def _get_vm_info(self) -> Dict[str, Any]:
        """Get VM information"""
        try:
            python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
            
            return {
                'hostname': platform.node(),
                'platform': platform.platform(),
                'architecture': platform.architecture()[0],
                'python_version': python_version,
                'python_executable': sys.executable,
                'vm_id': self.vm_id,
                'working_directory': os.getcwd(),
                'user': os.environ.get('USER', 'unknown')
            }
        except Exception as e:
            return {
                'vm_id': self.vm_id,
                'error': f'Failed to get VM info: {str(e)}'
            }

    def _get_system_metrics(self) -> Dict[str, Any]:
        """Get system metrics using psutil"""
        try:
            # CPU info
            cpu_percent = psutil.cpu_percent(interval=1)
            cpu_count = psutil.cpu_count()
            cpu_freq = psutil.cpu_freq()
            
            # Memory info
            memory = psutil.virtual_memory()
            
            # Disk info
            disk = psutil.disk_usage('/')
            
            # Load average
            load_avg = psutil.getloadavg() if hasattr(psutil, 'getloadavg') else [0, 0, 0]
            
            # GPU info
            gpu_info = self._get_gpu_info()
            
            return {
                'cpu': {
                    'usage': cpu_percent,
                    'threads': cpu_count,
                    'frequency': cpu_freq.current if cpu_freq else 0,
                    'model': platform.processor(),
                    'temperature': self._get_cpu_temperature()
                },
                'memory': {
                    'total': round(memory.total / (1024**3), 2),  # GB
                    'available': round(memory.available / (1024**3), 2),  # GB
                    'used': round(memory.used / (1024**3), 2),  # GB
                    'usage_percent': memory.percent
                },
                'gpu': gpu_info,
                'disk': {
                    'total': round(disk.total / (1024**3), 2),  # GB
                    'free': round(disk.free / (1024**3), 2),  # GB
                    'used': round(disk.used / (1024**3), 2),  # GB
                    'usage_percent': round((disk.used / disk.total) * 100, 2)
                },
                'system': {
                    'platform': platform.system(),
                    'architecture': platform.architecture()[0],
                    'uptime': time.time() - psutil.boot_time(),
                    'load_average': load_avg,
                    'hostname': platform.node()
                }
            }
        except Exception as e:
            return {
                'error': f'Failed to get system metrics: {str(e)}'
            }
    
    def _get_gpu_info(self) -> Dict[str, Any]:
        """Get GPU information"""
        try:
            import subprocess
            
            # Try to get NVIDIA GPU info
            try:
                result = subprocess.run([
                    'nvidia-smi', 
                    '--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu,driver_version',
                    '--format=csv,noheader,nounits'
                ], capture_output=True, text=True, timeout=5)
                
                if result.returncode == 0 and result.stdout.strip():
                    gpu_data = result.stdout.strip().split(', ')
                    if len(gpu_data) >= 6:
                        return {
                            'name': gpu_data[0],
                            'usage': int(gpu_data[1]) if gpu_data[1].isdigit() else 0,
                            'memory_used': int(gpu_data[2]) if gpu_data[2].isdigit() else 0,
                            'memory_total': int(gpu_data[3]) if gpu_data[3].isdigit() else 0,
                            'temperature': int(gpu_data[4]) if gpu_data[4].isdigit() else 0,
                            'driver_version': gpu_data[5],
                            'type': 'NVIDIA'
                        }
            except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
                pass
            
            # Try to detect AMD GPU
            try:
                result = subprocess.run(['rocm-smi', '--showuse'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0 and 'GPU' in result.stdout:
                    return {
                        'name': 'AMD GPU (detected)',
                        'usage': 0,  # AMD GPU usage detection would need more specific commands
                        'memory_used': 0,
                        'memory_total': 0,
                        'temperature': 0,
                        'driver_version': 'Unknown',
                        'type': 'AMD'
                    }
            except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
                pass
            
            # Fallback to integrated graphics detection
            try:
                result = subprocess.run(['lspci'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    for line in result.stdout.split('\n'):
                        if 'VGA' in line or 'Display' in line:
                            gpu_name = line.split(': ')[-1] if ': ' in line else 'Integrated Graphics'
                            return {
                                'name': gpu_name,
                                'usage': 0,
                                'memory_used': 0,
                                'memory_total': 0,
                                'temperature': 0,
                                'driver_version': 'Unknown',
                                'type': 'Integrated'
                            }
            except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
                pass
            
            return {
                'name': 'No GPU detected',
                'usage': 0,
                'memory_used': 0,
                'memory_total': 0,
                'temperature': 0,
                'driver_version': 'N/A',
                'type': 'None'
            }
            
        except Exception as e:
            return {
                'name': 'GPU info unavailable',
                'usage': 0,
                'memory_used': 0,
                'memory_total': 0,
                'temperature': 0,
                'driver_version': 'N/A',
                'type': 'Unknown',
                'error': str(e)
            }
    
    def _get_cpu_temperature(self) -> float:
        """Get CPU temperature"""
        try:
            import subprocess
            
            # Try different methods to get CPU temperature
            temp_commands = [
                ['cat', '/sys/class/thermal/thermal_zone0/temp'],
                ['sensors', '-u'],
                ['cat', '/sys/devices/platform/coretemp.0/hwmon/hwmon*/temp*_input']
            ]
            
            for cmd in temp_commands:
                try:
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=2)
                    if result.returncode == 0 and result.stdout.strip():
                        temp_str = result.stdout.strip().split('\n')[0]
                        temp = float(temp_str)
                        
                        # Convert from millicelsius if needed
                        if temp > 1000:
                            temp = temp / 1000
                        
                        if 0 < temp < 150:  # Reasonable temperature range
                            return round(temp, 1)
                except (subprocess.TimeoutExpired, ValueError, IndexError):
                    continue
            
            return 0.0
        except Exception:
            return 0.0

    def get_status(self) -> Dict[str, Any]:
        """Get current poller status"""
        return {
            'vm_id': self.vm_id,
            'is_polling': self.is_polling,
            'current_task': self.current_task['id'] if self.current_task else None,
            'poll_interval': self.poll_interval,
            'uptime': time.time() - psutil.boot_time() if hasattr(psutil, 'boot_time') else 0,
            'vm_info': self._get_vm_info()
        }
    
    def _parse_video_output(self, output: str) -> Dict[str, Any]:
        """Parse VIDEO_OUTPUT and GIF_OUTPUT from Python stdout"""
        video_data = {}
        
        try:
            lines = output.split('\n')
            for line in lines:
                line = line.strip()
                
                # Parse VIDEO_OUTPUT
                if line.startswith('VIDEO_OUTPUT:'):
                    video_json = line.split('VIDEO_OUTPUT:', 1)[1].strip()
                    parsed_data = json.loads(video_json)
                    video_data.update(parsed_data)
                    print(f"🎬 Parsed video data: {parsed_data.get('frame_count', 0)} frames")
                
                # Parse GIF_OUTPUT
                elif line.startswith('GIF_OUTPUT:'):
                    gif_json = line.split('GIF_OUTPUT:', 1)[1].strip()
                    parsed_data = json.loads(gif_json)
                    
                    # Handle file-based GIF output for remote execution
                    if 'gif_file' in parsed_data:
                        gif_filename = parsed_data['gif_filename']
                        gif_filepath = parsed_data['gif_file']
                        
                        # For remote execution, convert the file to base64
                        # since the frontend can't access the remote file system
                        try:
                            import base64
                            with open(gif_filepath, 'rb') as f:
                                gif_bytes = f.read()
                                gif_base64 = base64.b64encode(gif_bytes).decode('utf-8')
                                
                            # Replace file info with base64 data for remote execution
                            parsed_data['gif_data'] = gif_base64
                            parsed_data['gif_url'] = f"data:image/gif;base64,{gif_base64}"
                            
                            # Clean up the file
                            try:
                                os.unlink(gif_filepath)
                            except OSError:
                                pass
                            
                            print(f"�️ Parsed GIF data: {parsed_data.get('frame_count', 0)} frames, converted to base64 ({len(gif_base64)} chars)")
                            
                        except Exception as file_error:
                            print(f"Failed to read GIF file {gif_filepath}: {file_error}")
                            # Keep the original file path info as fallback
                            print(f"🎞️ Parsed GIF data: {parsed_data.get('frame_count', 0)} frames, file: {gif_filename}")
                    
                    video_data.update(parsed_data)
                    
        except Exception as e:
            print(f"Failed to parse video/GIF output: {e}")
        
        return video_data

def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='SOL VM Python Poller')
    parser.add_argument('--task-queue-url', default='https://your-message-queue-api.com/tasks',
                        help='Task queue API URL')
    parser.add_argument('--result-queue-url', default='https://your-message-queue-api.com/results',
                        help='Result queue API URL')
    parser.add_argument('--api-key', default='YOUR_API_KEY',
                        help='API key for authentication')
    parser.add_argument('--poll-interval', type=int, default=5,
                        help='Polling interval in seconds')
    parser.add_argument('--max-retries', type=int, default=3,
                        help='Maximum retry attempts')
    parser.add_argument('--retry-delay', type=int, default=2,
                        help='Delay between retries in seconds')
    
    args = parser.parse_args()
    
    # Create and start the poller
    poller = SolVMPythonPoller(
        task_queue_url=args.task_queue_url,
        result_queue_url=args.result_queue_url,
        api_key=args.api_key,
        poll_interval=args.poll_interval,
        max_retries=args.max_retries,
        retry_delay=args.retry_delay
    )
    
    try:
        poller.start_polling()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down...")
        poller.stop_polling()


if __name__ == '__main__':
    main()
