// Polling Executor for SOL VM
// This runs on the SOL VM and polls for tasks from the message queue

export interface TaskSubmission {
  id: string;
  code: string;
  timeout: number;
  timestamp: string;
  priority: number;
  client_id: string;
}

export interface ExecutionResult {
  id: string;
  success: boolean;
  output: string;
  error: string;
  execution_time: number;
  timestamp: string;
  code: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
  vm_id?: string;
  vm_info?: {
    hostname?: string;
    platform?: string;
    python_version?: string;
  };
  system_metrics?: any;
  benchmarks?: any;
}

export class SolVMPollingExecutor {
  private taskQueueUrl: string;
  private resultQueueUrl: string;
  private vmId: string;
  private isPolling: boolean = false;
  private pollInterval: number;
  private maxRetries: number;
  private retryDelay: number;
  private currentTask: TaskSubmission | null = null;
  constructor(options: {
    taskQueueUrl?: string;
    resultQueueUrl?: string;
    pollInterval?: number;
    maxRetries?: number;
    retryDelay?: number;
  } = {}) {
    this.taskQueueUrl = options.taskQueueUrl || import.meta.env.VITE_TASK_QUEUE_URL || 'http://localhost:5000/tasks';
    this.resultQueueUrl = options.resultQueueUrl || import.meta.env.VITE_RESULT_QUEUE_URL || 'http://localhost:5000/results';
    this.vmId = this.generateVMId();
    this.pollInterval = options.pollInterval || 5000; // 5 seconds
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 2000;
  }

  private generateVMId(): string {
    const hostname = process.env.HOSTNAME || 'sol-vm';
    return `${hostname}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start polling for tasks
   */
  startPolling(): void {
    if (this.isPolling) {
      console.log('Already polling for tasks');
      return;
    }

    this.isPolling = true;
    console.log(`🔄 SOL VM Poller starting... VM ID: ${this.vmId}`);
    this.pollLoop();
  }

  /**
   * Stop polling for tasks
   */
  stopPolling(): void {
    this.isPolling = false;
    console.log('🛑 SOL VM Poller stopped');
  }

  /**
   * Main polling loop
   */
  private async pollLoop(): Promise<void> {
    while (this.isPolling) {
      try {
        // Get next task from queue
        const task = await this.getNextTask();
        
        if (task) {
          this.currentTask = task;
          console.log(`📋 Processing task: ${task.id}`);
          
          // Execute the task
          const result = await this.executeTask(task);
          
          // Submit result back to queue
          await this.submitResult(result);
          
          console.log(`✅ Task completed: ${task.id} (success: ${result.success})`);
          this.currentTask = null;
        }
        
        // Wait before next poll
        await this.sleep(this.pollInterval);
        
      } catch (error) {
        console.error('❌ Error in polling loop:', error);
        
        // If we have a current task, mark it as failed
        if (this.currentTask) {
          try {
            const errorResult: ExecutionResult = {
              id: this.currentTask.id,
              success: false,
              output: '',
              error: `VM execution error: ${error}`,
              execution_time: 0,
              timestamp: new Date().toISOString(),
              code: this.currentTask.code,
              status: 'failed',
              vm_id: this.vmId,
              vm_info: await this.getVMInfo()
            };
            
            await this.submitResult(errorResult);
          } catch (submitError) {
            console.error('Failed to submit error result:', submitError);
          }
          
          this.currentTask = null;
        }
        
        await this.sleep(this.retryDelay);
      }
    }
  }

  /**
   * Get next task from the queue
   */
  private async getNextTask(): Promise<TaskSubmission | null> {
    try {
      const response = await fetch(`${this.taskQueueUrl}/next?vm_id=${this.vmId}`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer YOUR_API_KEY',
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 204) {
        // No tasks available
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to get task: ${response.status} ${response.statusText}`);
      }

      const task = await response.json();
      return task;
      
    } catch (error) {
      console.warn('Failed to get next task:', error);
      return null;
    }
  }

  /**
   * Execute a task (Python code)
   */
  private async executeTask(task: TaskSubmission): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Update task status to running
      await this.updateTaskStatus(task.id, 'running');
      
      // Execute Python code
      const executionResult = await this.executePythonCode(task.code, task.timeout);
      
      const executionTime = (Date.now() - startTime) / 1000;
      
      return {
        id: task.id,
        success: executionResult.success,
        output: executionResult.output,
        error: executionResult.error,
        execution_time: executionTime,
        timestamp: new Date().toISOString(),
        code: task.code,
        status: executionResult.success ? 'completed' : 'failed',
        vm_id: this.vmId,
        vm_info: await this.getVMInfo(),
        system_metrics: executionResult.system_metrics,
        benchmarks: executionResult.benchmarks
      };
      
    } catch (error) {
      const executionTime = (Date.now() - startTime) / 1000;
      
      return {
        id: task.id,
        success: false,
        output: '',
        error: `Execution error: ${error}`,
        execution_time: executionTime,
        timestamp: new Date().toISOString(),
        code: task.code,
        status: 'failed',
        vm_id: this.vmId,
        vm_info: await this.getVMInfo()
      };
    }
  }

  /**
   * Execute Python code using child process
   */
  private async executePythonCode(code: string, timeout: number): Promise<any> {
    return new Promise((resolve) => {
      const { spawn } = require('child_process');
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      // Create temporary file for the code
      const tempDir = os.tmpdir();
      const tempFile = path.join(tempDir, `sol_vm_code_${Date.now()}.py`);
      
      try {
        fs.writeFileSync(tempFile, code);
        
        const python = spawn('python3', [tempFile], {
          timeout: timeout * 1000,
          killSignal: 'SIGKILL'
        });
        
        let output = '';
        let error = '';
        
        python.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        python.stderr.on('data', (data) => {
          error += data.toString();
        });
        
        python.on('close', (code) => {
          // Clean up temp file
          try {
            fs.unlinkSync(tempFile);
          } catch (cleanupError) {
            console.warn('Failed to clean up temp file:', cleanupError);
          }
          
          resolve({
            success: code === 0,
            output: output,
            error: error,
            system_metrics: this.getSystemMetrics(),
            benchmarks: null // Could add benchmarking here
          });
        });
        
        python.on('error', (err) => {
          try {
            fs.unlinkSync(tempFile);
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
          
          resolve({
            success: false,
            output: '',
            error: `Process error: ${err.message}`,
            system_metrics: null,
            benchmarks: null
          });
        });
        
      } catch (fileError) {
        resolve({
          success: false,
          output: '',
          error: `File operation error: ${fileError.message}`,
          system_metrics: null,
          benchmarks: null
        });
      }
    });
  }

  /**
   * Submit execution result back to the queue
   */
  private async submitResult(result: ExecutionResult): Promise<void> {
    const maxRetries = this.maxRetries;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        const response = await fetch(this.resultQueueUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_API_KEY'
          },
          body: JSON.stringify(result)
        });

        if (response.ok) {
          return; // Success
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
      } catch (error) {
        attempt++;
        console.warn(`Failed to submit result (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          await this.sleep(this.retryDelay * attempt); // Exponential backoff
        } else {
          throw new Error(`Failed to submit result after ${maxRetries} attempts: ${error}`);
        }
      }
    }
  }

  /**
   * Update task status
   */
  private async updateTaskStatus(taskId: string, status: string): Promise<void> {
    try {
      await fetch(`${this.taskQueueUrl}/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_API_KEY'
        },
        body: JSON.stringify({ status: status, vm_id: this.vmId })
      });
    } catch (error) {
      console.warn('Failed to update task status:', error);
    }
  }

  /**
   * Get VM information
   */
  private async getVMInfo(): Promise<any> {
    const os = require('os');
    const { exec } = require('child_process');
    
    return new Promise((resolve) => {
      exec('python3 --version', (error, stdout, stderr) => {
        resolve({
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          python_version: stdout ? stdout.trim() : 'Unknown',
          vm_id: this.vmId
        });
      });
    });
  }

  /**
   * Get basic system metrics
   */
  private getSystemMetrics(): any {
    const os = require('os');
    
    return {
      cpu: {
        usage: 0, // Would need more complex calculation
        threads: os.cpus().length,
        model: os.cpus()[0]?.model
      },
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024 / 1024),
        free: Math.round(os.freemem() / 1024 / 1024 / 1024),
        usage_percent: Math.round((1 - os.freemem() / os.totalmem()) * 100)
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        uptime: Math.round(os.uptime()),
        loadavg: os.loadavg()
      }
    };
  }

  /**
   * Get current status
   */
  getStatus(): any {
    return {
      vm_id: this.vmId,
      is_polling: this.isPolling,
      current_task: this.currentTask?.id || null,
      poll_interval: this.pollInterval,
      uptime: process.uptime()
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default SolVMPollingExecutor;