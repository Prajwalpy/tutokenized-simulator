// Executor configuration for different environments
import { HybridSolVMExecutor } from '@/utils/hybridExecutor';
import { LocalPythonExecutor } from '@/utils/localExecutor';

export type ExecutorType = 'local' | 'hybrid' | 'auto';

export interface ExecutorConfig {
  type: ExecutorType;
  hybridConfig?: {
    taskQueueUrl: string;
    resultQueueUrl: string;
    apiKey: string;
    maxRetries?: number;
    retryDelay?: number;
    pollInterval?: number;
  };
}

// Default configuration - can be overridden by environment variables
export const DEFAULT_EXECUTOR_CONFIG: ExecutorConfig = {
  type: (import.meta.env.VITE_EXECUTOR_TYPE as ExecutorType) || 'auto', // Use environment variable, default to auto
  hybridConfig: {
    taskQueueUrl: import.meta.env.VITE_TASK_QUEUE_URL || 'http://localhost:5000/tasks',
    resultQueueUrl: import.meta.env.VITE_RESULT_QUEUE_URL || 'http://localhost:5000/results',
    apiKey: import.meta.env.VITE_API_KEY || 'dev-api-key',
    maxRetries: import.meta.env.VITE_MAX_RETRIES ? Number(import.meta.env.VITE_MAX_RETRIES) : 3,
    retryDelay: import.meta.env.VITE_RETRY_DELAY ? Number(import.meta.env.VITE_RETRY_DELAY) : 2000,
    pollInterval: import.meta.env.VITE_POLL_INTERVAL ? Number(import.meta.env.VITE_POLL_INTERVAL) : 3000
  }
};

export class ExecutorManager {
  private localExecutor: LocalPythonExecutor;
  private hybridExecutor: HybridSolVMExecutor | null = null;
  private config: ExecutorConfig;
  private currentExecutorType: ExecutorType = 'local';
  constructor(config: ExecutorConfig = DEFAULT_EXECUTOR_CONFIG) {
    this.config = config;
    this.currentExecutorType = config.type; // Set to config type instead of defaulting to 'local'
    this.localExecutor = new LocalPythonExecutor();
    
    if (config.hybridConfig) {
      this.hybridExecutor = new HybridSolVMExecutor({
        taskQueueUrl: config.hybridConfig.taskQueueUrl,
        resultQueueUrl: config.hybridConfig.resultQueueUrl,
        maxRetries: config.hybridConfig.maxRetries,
        retryDelay: config.hybridConfig.retryDelay,
        pollInterval: config.hybridConfig.pollInterval
      });
    }
  }

  /**
   * Automatically detect which executor to use
   */
  async detectExecutor(): Promise<ExecutorType> {
    if (this.config.type !== 'auto') {
      this.currentExecutorType = this.config.type;
      return this.currentExecutorType;
    }

    try {
      // First try local executor
      const localHealthy = await this.localExecutor.checkHealth();
      if (localHealthy) {
        console.log('🟢 Local executor is available');
        this.currentExecutorType = 'local';
        return 'local';
      }
    } catch (error) {
      console.warn('⚠️ Local executor not available:', error);
    }

    try {
      // Try hybrid executor
      if (this.hybridExecutor) {
        const hybridHealthy = await this.hybridExecutor.checkHealth();
        if (hybridHealthy) {
          console.log('🟢 Hybrid executor is available');
          this.currentExecutorType = 'hybrid';
          return 'hybrid';
        }
      }
    } catch (error) {
      console.warn('⚠️ Hybrid executor not available:', error);
    }

    // Fallback to local
    console.log('⚠️ Falling back to local executor');
    this.currentExecutorType = 'local';
    return 'local';
  }

  /**
   * Execute code using the appropriate executor
   */
  async executeCode(code: string, timeout: number = 30) {
    // Auto-detect executor if needed
    if (this.config.type === 'auto') {
      await this.detectExecutor();
    }

    const executor = this.getExecutor();
    
    try {
      console.log(`🚀 Executing code using ${this.currentExecutorType} executor`);
      const result = await executor.executeCode(code, timeout);
      
      // Add executor type to result for debugging
      return {
        ...result,
        executor_type: this.currentExecutorType,
        executor_info: {
          type: this.currentExecutorType,
          timestamp: new Date().toISOString()
        }
      };    } catch (error: any) {
      console.error(`❌ ${this.currentExecutorType} executor failed:`, error);
      
      // If hybrid executor fails and we're in auto mode, try local as fallback
      if (this.currentExecutorType === 'hybrid' && this.config.type === 'auto') {
        console.log('🔄 Trying local executor as fallback...');
        this.currentExecutorType = 'local';
        
        try {
          const result = await this.localExecutor.executeCode(code, timeout);
          return {
            ...result,
            executor_type: 'local',
            executor_info: {
              type: 'local',
              fallback: true,
              original_error: error.message,
              timestamp: new Date().toISOString()
            }
          };
        } catch (localError: any) {
          throw new Error(`Both executors failed. Hybrid: ${error.message}, Local: ${localError.message}`);
        }
      }
      
      // For hybrid mode without fallback, provide SOL VM specific error
      if (this.currentExecutorType === 'hybrid') {
        throw new Error(`SOL VM execution failed: ${error.message}. Check if the SOL VM poller is running and the message queue API is accessible.`);
      }
      
      throw error;
    }
  }

  /**
   * Get the current executor instance
   */
  private getExecutor() {
    switch (this.currentExecutorType) {
      case 'hybrid':
        if (!this.hybridExecutor) {
          throw new Error('Hybrid executor not initialized');
        }
        return this.hybridExecutor;
      case 'local':
      default:
        return this.localExecutor;
    }
  }

  /**
   * Get current executor status
   */
  async getStatus() {
    const status = {
      current_executor: this.currentExecutorType,
      config_type: this.config.type,
      executors: {
        local: { available: false, healthy: false },
        hybrid: { available: false, healthy: false }
      }
    };

    try {
      status.executors.local.available = true;
      status.executors.local.healthy = await this.localExecutor.checkHealth();
    } catch (error) {
      console.warn('Local executor status check failed:', error);
    }

    try {
      if (this.hybridExecutor) {
        status.executors.hybrid.available = true;
        status.executors.hybrid.healthy = await this.hybridExecutor.checkHealth();
      }
    } catch (error) {
      console.warn('Hybrid executor status check failed:', error);
    }

    return status;
  }

  /**
   * Get recent results from current executor
   */
  async getRecentResults() {
    const executor = this.getExecutor();
    
    try {
      return await executor.getRecentResults();
    } catch (error) {
      console.warn('Failed to get recent results:', error);
      return [];
    }
  }

  /**
   * Manually set executor type
   */
  setExecutorType(type: ExecutorType) {
    this.currentExecutorType = type;
    this.config.type = type;
  }

  /**
   * Get queue status (hybrid executor only)
   */
  async getQueueStatus() {
    if (this.currentExecutorType === 'hybrid' && this.hybridExecutor) {
      try {
        return await this.hybridExecutor.getQueueStatus();
      } catch (error) {
        console.warn('Failed to get queue status:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Cancel a task (hybrid executor only)
   */
  async cancelTask(taskId: string): Promise<boolean> {
    if (this.currentExecutorType === 'hybrid' && this.hybridExecutor) {
      try {
        return await this.hybridExecutor.cancelTask(taskId);
      } catch (error) {
        console.warn('Failed to cancel task:', error);
        return false;
      }
    }
    return false;
  }
}

// Global executor manager instance
export const executorManager = new ExecutorManager();

// Legacy exports for backward compatibility
export const localPythonExecutor = new LocalPythonExecutor();
