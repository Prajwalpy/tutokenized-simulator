#!/usr/bin/env python3
"""
Simple Message Queue API Server
This can be deployed on any cloud service (Heroku, Railway, etc.)
Serves as an intermediary between the front-end and SOL VM
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import time
import os
import sqlite3
import threading
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import base64

app = Flask(__name__)
CORS(app)

# Configuration
DATABASE_PATH = os.environ.get('DATABASE_PATH', 'message_queue.db')
API_KEY = os.environ.get('API_KEY', 'your-secret-api-key')
MAX_TASK_AGE_HOURS = int(os.environ.get('MAX_TASK_AGE_HOURS', '24'))
CLEANUP_INTERVAL_MINUTES = int(os.environ.get('CLEANUP_INTERVAL_MINUTES', '60'))

class MessageQueueDB:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self.init_database()
        
    def init_database(self):
        """Initialize the database schema"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Tasks table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                code TEXT NOT NULL,
                timeout INTEGER NOT NULL,
                timestamp TEXT NOT NULL,
                priority INTEGER DEFAULT 1,
                client_id TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                vm_id TEXT,
                assigned_at TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Results table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS results (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                success BOOLEAN NOT NULL,
                output TEXT,
                error TEXT,
                execution_time REAL,
                timestamp TEXT NOT NULL,
                code TEXT,
                status TEXT NOT NULL,
                vm_id TEXT,
                vm_info TEXT,
                system_metrics TEXT,
                benchmarks TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES tasks (id)
            )
        ''')
        
        # VM status table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS vm_status (
                vm_id TEXT PRIMARY KEY,
                last_seen TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                info TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Indexes for performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks (status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks (priority DESC)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_results_task_id ON results (task_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_vm_last_seen ON vm_status (last_seen)')
        
        conn.commit()
        conn.close()
    
    def add_task(self, task: Dict[str, Any]) -> bool:
        """Add a new task to the queue"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT INTO tasks (id, code, timeout, timestamp, priority, client_id, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                task['id'],
                task['code'],
                task['timeout'],
                task['timestamp'],
                task.get('priority', 1),
                task['client_id'],
                'pending'
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error adding task: {e}")
            return False
    
    def get_next_task(self, vm_id: str) -> Optional[Dict[str, Any]]:
        """Get the next pending task for a VM"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Get the highest priority pending task
            cursor.execute('''
                SELECT id, code, timeout, timestamp, priority, client_id
                FROM tasks 
                WHERE status = 'pending'
                ORDER BY priority DESC, created_at ASC
                LIMIT 1
            ''')
            
            row = cursor.fetchone()
            if not row:
                conn.close()
                return None
            
            task_id = row[0]
            
            # Mark task as assigned to this VM
            cursor.execute('''
                UPDATE tasks 
                SET status = 'assigned', vm_id = ?, assigned_at = ?
                WHERE id = ? AND status = 'pending'
            ''', (vm_id, datetime.now().isoformat(), task_id))
            
            # Update VM status
            cursor.execute('''
                INSERT OR REPLACE INTO vm_status (vm_id, last_seen, status)
                VALUES (?, ?, 'active')
            ''', (vm_id, datetime.now().isoformat()))
            
            conn.commit()
            conn.close()
            
            # Return task if successfully assigned
            if cursor.rowcount > 0:
                return {
                    'id': row[0],
                    'code': row[1],
                    'timeout': row[2],
                    'timestamp': row[3],
                    'priority': row[4],
                    'client_id': row[5]
                }
            
            return None
            
        except Exception as e:
            print(f"Error getting next task: {e}")
            return None
    
    def update_task_status(self, task_id: str, status: str, vm_id: str = None) -> bool:
        """Update task status"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if vm_id:
                cursor.execute('''
                    UPDATE tasks SET status = ?, vm_id = ? WHERE id = ?
                ''', (status, vm_id, task_id))
            else:
                cursor.execute('''
                    UPDATE tasks SET status = ? WHERE id = ?
                ''', (status, task_id))
            
            conn.commit()
            conn.close()
            return cursor.rowcount > 0
        except Exception as e:
            print(f"Error updating task status: {e}")
            return False
    
    def add_result(self, result: Dict[str, Any]) -> bool:
        """Add execution result"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO results 
                (id, task_id, success, output, error, execution_time, timestamp, 
                 code, status, vm_id, vm_info, system_metrics, benchmarks)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                result['id'],
                result['id'],  # task_id same as result id
                result['success'],
                result.get('output', ''),
                result.get('error', ''),
                result.get('execution_time', 0),
                result['timestamp'],
                result.get('code', ''),
                result['status'],
                result.get('vm_id'),
                json.dumps(result.get('vm_info', {})),
                json.dumps(result.get('system_metrics', {})),
                json.dumps(result.get('benchmarks', {}))
            ))
            
            # Update task status
            cursor.execute('''
                UPDATE tasks SET status = ? WHERE id = ?
            ''', (result['status'], result['id']))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error adding result: {e}")
            return False
    
    def get_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get execution result by task ID"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT * FROM results WHERE task_id = ?
            ''', (task_id,))
            
            row = cursor.fetchone()
            conn.close()
            
            if not row:
                return None
            
            return {
                'id': row[0],
                'success': bool(row[2]),
                'output': row[3],
                'error': row[4],
                'execution_time': row[5],
                'timestamp': row[6],
                'code': row[7],
                'status': row[8],
                'vm_id': row[9],
                'vm_info': json.loads(row[10]) if row[10] else {},
                'system_metrics': json.loads(row[11]) if row[11] else {},
                'benchmarks': json.loads(row[12]) if row[12] else {}
            }
        except Exception as e:
            print(f"Error getting result: {e}")
            return None
    
    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Count tasks by status
            cursor.execute('SELECT status, COUNT(*) FROM tasks GROUP BY status')
            task_counts = dict(cursor.fetchall())
            
            # Count active VMs (seen in last 5 minutes)
            five_minutes_ago = (datetime.now() - timedelta(minutes=5)).isoformat()
            cursor.execute('SELECT COUNT(*) FROM vm_status WHERE last_seen > ?', (five_minutes_ago,))
            active_vms = cursor.fetchone()[0]
            
            # Average execution time
            cursor.execute('SELECT AVG(execution_time) FROM results WHERE execution_time > 0')
            avg_execution_time = cursor.fetchone()[0] or 0
            
            conn.close()
            
            return {
                'pending_tasks': task_counts.get('pending', 0),
                'assigned_tasks': task_counts.get('assigned', 0),
                'running_tasks': task_counts.get('running', 0),
                'completed_tasks': task_counts.get('completed', 0),
                'failed_tasks': task_counts.get('failed', 0),
                'active_vms': active_vms,
                'avg_execution_time': round(avg_execution_time, 2)
            }
        except Exception as e:
            print(f"Error getting queue stats: {e}")
            return {}
    
    def cleanup_old_data(self):
        """Clean up old tasks and results"""
        try:
            cutoff_time = (datetime.now() - timedelta(hours=MAX_TASK_AGE_HOURS)).isoformat()
            
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Delete old completed/failed tasks and their results
            cursor.execute('''
                DELETE FROM results WHERE task_id IN (
                    SELECT id FROM tasks 
                    WHERE status IN ('completed', 'failed', 'timeout') 
                    AND created_at < ?
                )
            ''', (cutoff_time,))
            
            cursor.execute('''
                DELETE FROM tasks 
                WHERE status IN ('completed', 'failed', 'timeout') 
                AND created_at < ?
            ''', (cutoff_time,))
            
            # Clean up old VM status
            old_vm_cutoff = (datetime.now() - timedelta(hours=1)).isoformat()
            cursor.execute('DELETE FROM vm_status WHERE last_seen < ?', (old_vm_cutoff,))
            
            conn.commit()
            conn.close()
            
            print(f"Cleaned up old data (cutoff: {cutoff_time})")
            
        except Exception as e:
            print(f"Error cleaning up old data: {e}")

# Global database instance
db = MessageQueueDB(DATABASE_PATH)

def verify_api_key(request):
    """Verify API key from request"""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return False
    
    token = auth_header[7:]  # Remove 'Bearer ' prefix
    return token == API_KEY

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@app.route('/tasks', methods=['POST'])
def submit_task():
    """Submit a new task to the queue"""
    if not verify_api_key(request):
        return jsonify({'error': 'Invalid API key'}), 401
    
    try:
        task = request.get_json()
        
        # Validate required fields
        required_fields = ['id', 'code', 'timeout', 'client_id']
        for field in required_fields:
            if field not in task:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Add timestamp if not provided
        if 'timestamp' not in task:
            task['timestamp'] = datetime.now().isoformat()
        
        success = db.add_task(task)
        
        if success:
            return jsonify({'message': 'Task submitted successfully', 'task_id': task['id']}), 201
        else:
            return jsonify({'error': 'Failed to submit task'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Invalid request: {str(e)}'}), 400

@app.route('/tasks/next', methods=['GET'])
def get_next_task():
    """Get next task for a VM"""
    if not verify_api_key(request):
        return jsonify({'error': 'Invalid API key'}), 401
    
    vm_id = request.args.get('vm_id')
    if not vm_id:
        return jsonify({'error': 'vm_id parameter required'}), 400
    
    task = db.get_next_task(vm_id)
    
    if task:
        return jsonify(task)
    else:
        return '', 204  # No content

@app.route('/tasks/<task_id>/status', methods=['PUT'])
def update_task_status(task_id):
    """Update task status"""
    if not verify_api_key(request):
        return jsonify({'error': 'Invalid API key'}), 401
    
    try:
        data = request.get_json()
        status = data.get('status')
        vm_id = data.get('vm_id')
        
        if not status:
            return jsonify({'error': 'status field required'}), 400
        
        success = db.update_task_status(task_id, status, vm_id)
        
        if success:
            return jsonify({'message': 'Task status updated'})
        else:
            return jsonify({'error': 'Task not found'}), 404
            
    except Exception as e:
        return jsonify({'error': f'Invalid request: {str(e)}'}), 400

@app.route('/results', methods=['POST'])
def submit_result():
    """Submit execution result"""
    if not verify_api_key(request):
        return jsonify({'error': 'Invalid API key'}), 401
    
    try:
        result = request.get_json()
        
        # Validate required fields
        required_fields = ['id', 'success', 'timestamp', 'status']
        for field in required_fields:
            if field not in result:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        success = db.add_result(result)
        
        if success:
            return jsonify({'message': 'Result submitted successfully'}), 201
        else:
            return jsonify({'error': 'Failed to submit result'}), 500
            
    except Exception as e:
        return jsonify({'error': f'Invalid request: {str(e)}'}), 400

@app.route('/results/<task_id>', methods=['GET'])
def get_result(task_id):
    """Get execution result"""
    if not verify_api_key(request):
        return jsonify({'error': 'Invalid API key'}), 401
    
    result = db.get_result(task_id)
    
    if result:
        # --- GIF bytestream injection logic ---
        # Try to parse GIF_OUTPUT from result['output']
        output = result.get('output', '')
        gif_bytes = None
        gif_filename = None
        import re, json as _json
        match = re.search(r'GIF_OUTPUT:(\{.*?\})(?:\n|$)', output)
        if match:
            try:
                gif_info = _json.loads(match.group(1))
                gif_filename = gif_info.get('gif_filename') or gif_info.get('gif_file')
                if gif_filename and os.path.exists(gif_filename):
                    with open(gif_filename, 'rb') as f:
                        gif_bytes = f.read()
                    # Send as base64 for transport, but also include raw bytes for direct use
                    gif_info['gif_data'] = base64.b64encode(gif_bytes).decode('utf-8')
                    gif_info['gif_bytestream'] = list(gif_bytes)  # send as list of ints for JS Uint8Array
                    result['video_data'] = gif_info
                elif gif_info.get('gif_data'):
                    # Already present
                    result['video_data'] = gif_info
            except Exception as e:
                print(f"Failed to parse GIF_OUTPUT or read GIF file: {e}")
        return jsonify(result)
    else:
        return jsonify({'error': 'Result not found'}), 404

@app.route('/status', methods=['GET'])
def get_queue_status():
    """Get queue status and statistics"""
    if not verify_api_key(request):
        return jsonify({'error': 'Invalid API key'}), 401
    
    stats = db.get_queue_stats()
    stats['queue_health'] = 'healthy'
    stats['timestamp'] = datetime.now().isoformat()
    
    return jsonify(stats)

def cleanup_worker():
    """Background worker for cleanup"""
    while True:
        time.sleep(CLEANUP_INTERVAL_MINUTES * 60)
        db.cleanup_old_data()

if __name__ == '__main__':
    # Start cleanup worker in background
    cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
    cleanup_thread.start()
    
    # Run the Flask app
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    print(f"🚀 Message Queue API starting on port {port}")
    print(f"   Database: {DATABASE_PATH}")
    print(f"   API Key: {API_KEY[:10]}...")
    print(f"   Max task age: {MAX_TASK_AGE_HOURS} hours")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
