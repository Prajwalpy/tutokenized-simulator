// Hybrid Executor for SOL VM Communication
// Uses a polling-based approach where SOL VM polls for tasks and submits results

export interface SystemMetrics {
  cpu: {
    usage: number;
    threads: number;
    clockSpeed: number;
    temperature: number;
    model?: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage_percent: number;
  };
  gpu: {
    usage: number;
    memory_used: number;
    memory_total: number;
    temperature: number;
    name: string;
    driver_version?: string;
  };
  system: {
    platform: string;
    arch: string;
    uptime: number;
    loadavg: number[];
    hostname?: string;
  };
}

export interface BenchmarkResult {
  time: number;
  score: number;
  status: string;
}

export interface Benchmarks {
  matrix_multiplication: BenchmarkResult;
  memory_access: BenchmarkResult;
  cpu_intensive: BenchmarkResult;
  io_operations?: BenchmarkResult;
  python_version: string;
  system_info?: Record<string, any>;
}

export interface ExecutionResult {
  id: string;
  success: boolean;
  output: string;
  error: string;
  execution_time: number;
  timestamp: string;
  code: string;
  system_metrics?: SystemMetrics;
  benchmarks?: Benchmarks;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  vm_id?: string;
  vm_info?: {
    hostname?: string;
    platform?: string;
    python_version?: string;
  };
}

export interface TaskSubmission {
  id: string;
  code: string;
  timeout: number;
  timestamp: string;
  priority: number;
  client_id: string;
}

export class HybridSolVMExecutor {
  private taskQueueUrl: string;
  private resultQueueUrl: string;
  private clientId: string;
  private maxRetries: number;
  private retryDelay: number;
  private pollInterval: number;
  constructor(options: {
    taskQueueUrl?: string;
    resultQueueUrl?: string;
    maxRetries?: number;
    retryDelay?: number;
    pollInterval?: number;
  } = {}) {
    // Use environment variables or fallback to local development URLs
    this.taskQueueUrl = options.taskQueueUrl || import.meta.env.VITE_TASK_QUEUE_URL || 'http://localhost:5000/tasks';
    this.resultQueueUrl = options.resultQueueUrl || import.meta.env.VITE_RESULT_QUEUE_URL || 'http://localhost:5000/results';
    this.clientId = this.generateClientId();
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 2000;
    this.pollInterval = options.pollInterval || 3000;
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Submit code for execution on SOL VM
   * The code is queued and SOL VM will poll for it
   */
  async executeCode(code: string, timeout: number = 30): Promise<ExecutionResult> {
    const taskId = this.generateTaskId();
    
    const task: TaskSubmission = {
      id: taskId,
      code: code,
      timeout: timeout,
      timestamp: new Date().toISOString(),
      priority: 1,
      client_id: this.clientId
    };

    try {
      // Submit task to the queue
      await this.submitTask(task);
      
      // Start polling for result
      return await this.pollForResult(taskId, timeout + 10); // Add buffer time
      
    } catch (error: any) {
      return {
        id: taskId,
        success: false,
        output: '',
        error: `Failed to submit task or get result: ${error.message}`,
        execution_time: 0,
        timestamp: new Date().toISOString(),
        code: code,
        status: 'failed'
      };
    }
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Submit task to the message queue
   */
  private async submitTask(task: TaskSubmission): Promise<void> {
    const apiKey = import.meta.env.VITE_API_KEY || 'dev-api-key';
    
    const response = await fetch(this.taskQueueUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(task)
    });

    if (!response.ok) {
      throw new Error(`Failed to submit task: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Poll for execution result
   */
  private async pollForResult(taskId: string, maxWaitTime: number): Promise<ExecutionResult> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitTime * 1000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const result = await this.getResult(taskId);
        if (result && result.status !== 'pending' && result.status !== 'running') {
          return result;
        }
        
        // Wait before next poll
        await this.sleep(this.pollInterval);
        
      } catch (error) {
        console.warn(`Polling error for task ${taskId}:`, error);
        await this.sleep(this.pollInterval);
      }
    }

    // Timeout
    return {
      id: taskId,
      success: false,
      output: '',
      error: 'Execution timeout - no result received from SOL VM',
      execution_time: maxWaitTime,
      timestamp: new Date().toISOString(),
      code: '',
      status: 'timeout'
    };
  }

  /**
   * Get result from the result queue
   */
  async getResult(taskId: string): Promise<ExecutionResult | null> {
    try {
      const apiKey = import.meta.env.VITE_API_KEY || 'dev-api-key';
      
      const response = await fetch(`${this.resultQueueUrl}/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      });

      if (response.status === 404) {
        return null; // Result not ready yet
      }

      if (!response.ok) {
        throw new Error(`Failed to get result: ${response.status}`);
      }

      return await response.json();
      
    } catch (error) {
      console.warn('Failed to get result:', error);
      return null;
    }
  }

  /**
   * Get recent execution results
   */
  async getRecentResults(): Promise<ExecutionResult[]> {
    try {
      const apiKey = import.meta.env.VITE_API_KEY || 'dev-api-key';
      
      const response = await fetch(`${this.resultQueueUrl}?client_id=${this.clientId}&limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.results || [];
      
    } catch (error) {
      console.warn('Failed to get recent results:', error);
      return [];
    }
  }
  /**
   * Check if the system is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      // Extract base URL from task queue URL
      const baseUrl = this.taskQueueUrl.replace('/tasks', '');
      
      const response = await fetch(`${baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.warn('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get queue status and statistics
   */  async getQueueStatus(): Promise<{
    pending_tasks: number;
    active_vms: number;
    avg_execution_time: number;
    queue_health: string;
  }> {
    try {
      const apiKey = import.meta.env.VITE_API_KEY || 'dev-api-key';
      const baseUrl = this.taskQueueUrl.replace('/tasks', '');
      
      const response = await fetch(`${baseUrl}/status`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get queue status');
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to get queue status:', error);
      return {
        pending_tasks: 0,
        active_vms: 0,
        avg_execution_time: 0,
        queue_health: 'unknown'
      };
    }
  }

  /**
   * Cancel a pending task
   */
  async cancelTask(taskId: string): Promise<boolean> {
    try {
      const apiKey = import.meta.env.VITE_API_KEY || 'dev-api-key';
      
      const response = await fetch(`${this.taskQueueUrl}/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        }
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Alternative implementation using Firebase Firestore as message queue
export class FirebaseHybridExecutor {
  private db: any; // Firebase Firestore instance
  private tasksCollection: string = 'execution_tasks';
  private resultsCollection: string = 'execution_results';
  private clientId: string;

  constructor(firebaseDb: any) {
    this.db = firebaseDb;
    this.clientId = this.generateClientId();
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async executeCode(code: string, timeout: number = 30): Promise<ExecutionResult> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Add task to Firestore
      await this.db.collection(this.tasksCollection).doc(taskId).set({
        code: code,
        timeout: timeout,
        timestamp: new Date(),
        status: 'pending',
        client_id: this.clientId,
        priority: 1
      });

      // Poll for result
      return await this.pollForFirebaseResult(taskId, timeout + 10);
      
    } catch (error: any) {
      return {
        id: taskId,
        success: false,
        output: '',
        error: `Firebase execution error: ${error.message}`,
        execution_time: 0,
        timestamp: new Date().toISOString(),
        code: code,
        status: 'failed'
      };
    }
  }

  private async pollForFirebaseResult(taskId: string, maxWaitTime: number): Promise<ExecutionResult> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitTime * 1000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const doc = await this.db.collection(this.resultsCollection).doc(taskId).get();
        
        if (doc.exists) {
          const data = doc.data();
          if (data.status === 'completed' || data.status === 'failed') {
            return {
              id: taskId,
              success: data.success || false,
              output: data.output || '',
              error: data.error || '',
              execution_time: data.execution_time || 0,
              timestamp: data.timestamp?.toISOString() || new Date().toISOString(),
              code: data.code || '',
              status: data.status,
              system_metrics: data.system_metrics,
              benchmarks: data.benchmarks,
              vm_info: data.vm_info
            };
          }
        }
        
        await this.sleep(3000); // Poll every 3 seconds
        
      } catch (error) {
        console.warn('Firebase polling error:', error);
        await this.sleep(3000);
      }
    }

    return {
      id: taskId,
      success: false,
      output: '',
      error: 'Execution timeout',
      execution_time: maxWaitTime,
      timestamp: new Date().toISOString(),
      code: '',
      status: 'timeout'
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async checkHealth(): Promise<boolean> {
    try {
      // Try to read from Firestore
      await this.db.collection(this.tasksCollection).limit(1).get();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Export both implementations
export { HybridSolVMExecutor as default };