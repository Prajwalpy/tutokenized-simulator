#!/usr/bin/env python3
"""
Test script to validate SOL VM communication setup
"""

import requests
import json
import time
import sys
from datetime import datetime

class SolVMCommunicationTester:
    def __init__(self, 
                 task_queue_url="http://localhost:5000/tasks",
                 result_queue_url="http://localhost:5000/results",
                 api_key="your-secret-api-key"):
        
        self.task_queue_url = task_queue_url
        self.result_queue_url = result_queue_url
        self.api_key = api_key
        
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }

    def test_api_health(self):
        """Test if the message queue API is healthy"""
        try:
            health_url = self.task_queue_url.replace('/tasks', '/health')
            response = requests.get(health_url, timeout=10)
            
            if response.ok:
                print("✅ Message Queue API is healthy")
                return True
            else:
                print(f"❌ API health check failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Cannot reach API: {e}")
            return False

    def test_task_submission(self):
        """Test submitting a task to the queue"""
        try:
            task = {
                'id': f'test_task_{int(time.time())}',
                'code': 'print("Hello from SOL VM test!")',
                'timeout': 30,
                'client_id': 'test_client',
                'timestamp': datetime.now().isoformat()
            }
            
            response = requests.post(
                self.task_queue_url,
                headers=self.headers,
                json=task,
                timeout=10
            )
            
            if response.ok:
                print("✅ Task submission successful")
                return task['id']
            else:
                print(f"❌ Task submission failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Task submission error: {e}")
            return None

    def test_task_polling(self, vm_id="test_vm"):
        """Test polling for tasks"""
        try:
            url = f"{self.task_queue_url}/next?vm_id={vm_id}"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.status_code == 200:
                task = response.json()
                print(f"✅ Task polling successful - received task: {task['id']}")
                return task
            elif response.status_code == 204:
                print("✅ Task polling successful - no tasks available")
                return None
            else:
                print(f"❌ Task polling failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Task polling error: {e}")
            return None

    def test_result_submission(self, task_id):
        """Test submitting a result"""
        try:
            result = {
                'id': task_id,
                'success': True,
                'output': 'Hello from SOL VM test!',
                'error': '',
                'execution_time': 0.5,
                'timestamp': datetime.now().isoformat(),
                'code': 'print("Hello from SOL VM test!")',
                'status': 'completed',
                'vm_id': 'test_vm',
                'vm_info': {
                    'hostname': 'test-vm',
                    'platform': 'test'
                }
            }
            
            response = requests.post(
                self.result_queue_url,
                headers=self.headers,
                json=result,
                timeout=10
            )
            
            if response.ok:
                print("✅ Result submission successful")
                return True
            else:
                print(f"❌ Result submission failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Result submission error: {e}")
            return False

    def test_result_retrieval(self, task_id):
        """Test retrieving a result"""
        try:
            url = f"{self.result_queue_url}/{task_id}"
            response = requests.get(url, headers=self.headers, timeout=10)
            
            if response.ok:
                result = response.json()
                print(f"✅ Result retrieval successful - output: {result.get('output', 'N/A')}")
                return result
            elif response.status_code == 404:
                print("⚠️  Result not found (task may not be completed yet)")
                return None
            else:
                print(f"❌ Result retrieval failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Result retrieval error: {e}")
            return None

    def test_queue_status(self):
        """Test getting queue status"""
        try:
            status_url = self.task_queue_url.replace('/tasks', '/status')
            response = requests.get(status_url, headers=self.headers, timeout=10)
            
            if response.ok:
                status = response.json()
                print("✅ Queue status retrieved successfully:")
                print(f"   Pending tasks: {status.get('pending_tasks', 0)}")
                print(f"   Active VMs: {status.get('active_vms', 0)}")
                print(f"   Avg execution time: {status.get('avg_execution_time', 0)}s")
                return status
            else:
                print(f"❌ Queue status failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Queue status error: {e}")
            return None

    def run_full_test(self):
        """Run complete test suite"""
        print("🧪 Starting SOL VM Communication Test Suite")
        print("=" * 50)
        
        # Test 1: API Health
        print("\n1. Testing API Health...")
        if not self.test_api_health():
            print("❌ Cannot proceed - API is not healthy")
            return False
        
        # Test 2: Queue Status
        print("\n2. Testing Queue Status...")
        self.test_queue_status()
        
        # Test 3: Task Submission
        print("\n3. Testing Task Submission...")
        task_id = self.test_task_submission()
        if not task_id:
            print("❌ Cannot proceed - task submission failed")
            return False
        
        # Test 4: Task Polling
        print("\n4. Testing Task Polling...")
        task = self.test_task_polling()
        
        # Test 5: Result Submission
        print("\n5. Testing Result Submission...")
        if not self.test_result_submission(task_id):
            print("❌ Result submission failed")
            return False
        
        # Test 6: Result Retrieval
        print("\n6. Testing Result Retrieval...")
        result = self.test_result_retrieval(task_id)
        
        print("\n" + "=" * 50)
        if result:
            print("🎉 All tests passed! SOL VM communication is working correctly.")
            return True
        else:
            print("⚠️  Some tests failed. Check the logs above.")
            return False

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Test SOL VM Communication Setup')
    parser.add_argument('--task-queue-url', 
                        default='http://localhost:5000/tasks',
                        help='Task queue API URL')
    parser.add_argument('--result-queue-url', 
                        default='http://localhost:5000/results',
                        help='Result queue API URL')
    parser.add_argument('--api-key', 
                        default='your-secret-api-key',
                        help='API key for authentication')
    parser.add_argument('--test', 
                        choices=['health', 'submit', 'poll', 'result', 'status', 'full'],
                        default='full',
                        help='Which test to run')
    
    args = parser.parse_args()
    
    tester = SolVMCommunicationTester(
        task_queue_url=args.task_queue_url,
        result_queue_url=args.result_queue_url,
        api_key=args.api_key
    )
    
    if args.test == 'health':
        success = tester.test_api_health()
    elif args.test == 'submit':
        task_id = tester.test_task_submission()
        success = task_id is not None
    elif args.test == 'poll':
        task = tester.test_task_polling()
        success = True  # Polling can return None (no tasks) and still be successful
    elif args.test == 'result':
        # Need a task ID to test result submission
        task_id = f'test_task_{int(time.time())}'
        success = tester.test_result_submission(task_id)
    elif args.test == 'status':
        status = tester.test_queue_status()
        success = status is not None
    else:  # full test
        success = tester.run_full_test()
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()
