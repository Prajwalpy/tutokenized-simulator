// Local Python code execution utility using local Node.js service

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
  system_info?: {
    platform?: string;
    node_version?: string;
    python_command?: string;
  };
}

export class LocalPythonExecutor {
  private baseUrl: string;

  constructor() {
    // Use environment variable or default to localhost:3001
    this.baseUrl = import.meta.env.VITE_LOCAL_EXECUTOR_URL || 'http://localhost:3001';
  }

  async executeCode(code: string, timeout: number = 30): Promise<ExecutionResult> {
    try {
      console.log('🚀 Executing code via local executor...');
      
      const response = await fetch(`${this.baseUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          timeout: timeout
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Local execution completed:', result.success ? 'Success' : 'Failed');
      
      return result;
      
    } catch (error: any) {
      console.error('❌ Local executor service error:', error);
      
      // Return error result if service is not available
      return {
        id: Date.now().toString(),
        success: false,
        output: '',
        error: `Local executor service error: ${error.message}. Make sure to run 'start-executor.bat' first.`,
        execution_time: 0,
        timestamp: new Date().toISOString(),
        code: code,
        system_info: {
          platform: navigator.platform
        }
      };
    }
  }

  async getResult(id: string): Promise<ExecutionResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/result/${id}`);
      
      if (!response.ok) {
        return null;
      }

      return await response.json();
      
    } catch (error) {
      console.warn('Failed to get result:', error);
      return null;
    }
  }

  async getRecentResults(): Promise<ExecutionResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/results`);
      
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

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async cleanup(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/cleanup`, {
        method: 'POST'
      });
      return response.ok;
    } catch (error) {
      console.warn('Failed to cleanup:', error);
      return false;
    }
  }
}

// Legacy manual executor for fallback
export class ManualExecutor {
  async executeCode(code: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const modal = this.createExecutionModal(code, (output: string, error: string) => {
        const executionTime = (Date.now() - startTime) / 1000;
        
        resolve({
          id: Date.now().toString(),
          success: !error,
          output: output,
          error: error,
          execution_time: executionTime,
          timestamp: new Date().toISOString(),
          code: code,
          system_info: {
            platform: navigator.platform
          }
        });
      });
      
      document.body.appendChild(modal);
    });
  }

  private createExecutionModal(code: string, callback: (output: string, error: string) => void): HTMLElement {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 80%;
      max-height: 80%;
      overflow: auto;
    `;
    
    content.innerHTML = `
      <h3>Manual Python Execution</h3>
      <p>Copy this code and run it in your Python environment:</p>
      <textarea readonly style="width: 100%; height: 200px; font-family: monospace;">${code}</textarea>
      <p>Paste the output here:</p>
      <textarea id="output" placeholder="Paste Python output here..." style="width: 100%; height: 100px;"></textarea>
      <p>Paste any errors here (if any):</p>
      <textarea id="error" placeholder="Paste Python errors here..." style="width: 100%; height: 60px;"></textarea>
      <div style="margin-top: 10px;">
        <button id="submit" style="margin-right: 10px; padding: 5px 15px;">Submit</button>
        <button id="cancel" style="padding: 5px 15px;">Cancel</button>
      </div>
    `;
    
    const submitBtn = content.querySelector('#submit') as HTMLButtonElement;
    const cancelBtn = content.querySelector('#cancel') as HTMLButtonElement;
    const outputTextarea = content.querySelector('#output') as HTMLTextAreaElement;
    const errorTextarea = content.querySelector('#error') as HTMLTextAreaElement;
    
    submitBtn.onclick = () => {
      callback(outputTextarea.value, errorTextarea.value);
      document.body.removeChild(modal);
    };
    
    cancelBtn.onclick = () => {
      callback('', 'Execution cancelled by user');
      document.body.removeChild(modal);
    };
    
    modal.appendChild(content);
    return modal;
  }
}

// Export both executors
export const localPythonExecutor = new LocalPythonExecutor();
export const manualExecutor = new ManualExecutor();
