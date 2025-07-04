
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Play, RotateCcw, Copy, Download, Settings, Loader2, Cloud, Monitor, Wifi } from 'lucide-react';
import { executorManager, ExecutorType } from '@/utils/executorManager';
import { useSystemMetrics } from '@/contexts/SystemMetricsContext';

interface CodeEditorProps {
  onExecutionResult?: (result: any) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ onExecutionResult }) => {
  console.log('CodeEditor rendering...');
  
  // Safely get context with error handling
  let updateMetrics, updateBenchmarks;
  try {
    const metricsContext = useSystemMetrics();
    updateMetrics = metricsContext.updateMetrics;
    updateBenchmarks = metricsContext.updateBenchmarks;
  } catch (error) {
    console.warn('SystemMetrics context not available:', error);
    updateMetrics = () => {};
    updateBenchmarks = () => {};
  }
  
  const [currentExecutor, setCurrentExecutor] = useState<ExecutorType>('local');
  const [executorStatus, setExecutorStatus] = useState<any>(null);const [code, setCode] = useState(`print("*** Hello World from SOL VM! ***")
print("=" * 40)
x = 15
y = 25
result = x + y
print(f"Calculation: {x} + {y} = {result}")
numbers = [1, 2, 3, 4, 5]
squares = [n**2 for n in numbers]
print(f"Numbers: {numbers}")
print(f"Squares: {squares}")
print("Counting:")
for i in range(1, 6):
    print(f"Count {i}")
def greet(name):
    return f"Hello, {name}!"
print("Greetings:")
print(greet("World"))
print(greet("SOL VM"))
print("[SUCCESS] Execution completed on SOL VM!")`);

  const [isExecuting, setIsExecuting] = useState(false);

  // Check executor status on component mount
  useEffect(() => {
    const checkExecutorStatus = async () => {
      try {
        const status = await executorManager.getStatus();
        setExecutorStatus(status);
        setCurrentExecutor(status.current_executor);
      } catch (error) {
        console.warn('Failed to get executor status:', error);
      }
    };

    checkExecutorStatus();
  }, []);

  const getExecutorIcon = (type: ExecutorType) => {
    switch (type) {
      case 'hybrid':
        return <Cloud className="w-4 h-4" />;
      case 'local':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Wifi className="w-4 h-4" />;
    }
  };

  const getExecutorBadgeColor = (type: ExecutorType) => {
    switch (type) {
      case 'hybrid':
        return 'bg-blue-500/20 text-blue-700 border-blue-300';
      case 'local':
        return 'bg-green-500/20 text-green-700 border-green-300';
      default:
        return 'bg-gray-500/20 text-gray-700 border-gray-300';
    }
  };

  const executeCode = async () => {
    if (!code.trim()) {
      console.warn('No code to execute');
      return;
    }

    setIsExecuting(true);
    
    try {
      const result = await executorManager.executeCode(code);
      
      // Update current executor type
      setCurrentExecutor((result.executor_type as ExecutorType) || 'local');
      
      // Update system metrics and benchmarks if available
      if (result.system_metrics) {
        console.log('📊 CodeEditor: Updating system metrics');
        updateMetrics(result.system_metrics);
      }
      if (result.benchmarks) {
        console.log('🏃 CodeEditor: Updating benchmarks');
        updateBenchmarks(result.benchmarks);
      }
      
      // Process hardware benchmarks if available
      if ((result as any).hardware_benchmarks?.benchmark_data) {
        console.log('⚡ CodeEditor: Processing hardware benchmarks');
        const hwBenchmarks = (result as any).hardware_benchmarks.benchmark_data;
        
        const hardwareBenchmarks = {
          matrix_multiplication: {
            time: hwBenchmarks.execution_time || 0,
            score: Math.round(1000 / Math.max(hwBenchmarks.execution_time || 1, 0.1)),
            status: (hwBenchmarks.execution_time || 0) < 2 ? 'Excellent' : 'Good'
          },
          memory_access: {
            time: hwBenchmarks.average_memory_percent || 0,
            score: Math.round(100 - (hwBenchmarks.average_memory_percent || 0)),
            status: (hwBenchmarks.average_memory_percent || 0) < 50 ? 'Excellent' : 'Good'
          },
          cpu_intensive: {
            time: hwBenchmarks.average_cpu_percent || 0,
            score: Math.round(hwBenchmarks.average_cpu_percent || 0),
            status: (hwBenchmarks.average_cpu_percent || 0) > 50 ? 'Excellent' : 'Good'
          },
          io_operations: {
            time: 0,
            score: hwBenchmarks.average_gpu_utilization || 0,
            status: 'Good'
          },
          python_version: hwBenchmarks.system_info?.platform?.python_version || '3.x',
          system_info: {
            hardware_monitoring: true,
            execution_time: hwBenchmarks.execution_time
          }
        };
        
        updateBenchmarks(hardwareBenchmarks);
      }
      
      // Fallback: Create basic benchmarks if none available
      if (!result.benchmarks && !(result as any).hardware_benchmarks && result.execution_time) {
        console.log('🔄 CodeEditor: Creating fallback benchmarks');
        const fallbackBenchmarks = {
          matrix_multiplication: {
            time: result.execution_time,
            score: Math.round(1000 / Math.max(result.execution_time, 0.1)),
            status: result.execution_time < 1 ? 'Excellent' : 'Good'
          },
          memory_access: {
            time: result.execution_time * 0.7,
            score: Math.round(800 / Math.max(result.execution_time * 0.7, 0.1)),
            status: result.execution_time < 1 ? 'Excellent' : 'Good'
          },
          cpu_intensive: {
            time: result.execution_time * 1.2,
            score: Math.round(1200 / Math.max(result.execution_time * 1.2, 0.1)),
            status: result.execution_time < 1 ? 'Excellent' : 'Good'
          },
          io_operations: {
            time: result.execution_time * 0.5,
            score: Math.round(500 / Math.max(result.execution_time * 0.5, 0.1)),
            status: result.execution_time < 1 ? 'Excellent' : 'Good'
          },
          python_version: '3.x',
          system_info: {
            fallback_benchmarks: true,
            execution_time: result.execution_time,
            executor_type: result.executor_type
          }
        };
        
        updateBenchmarks(fallbackBenchmarks);
      }
      
      // Pass result to parent component (Debug component)
      if (onExecutionResult) {
        onExecutionResult({
          ...result,
          timestamp: new Date().toISOString(),
          code: code
        });
      }
      
      console.log('Code execution result:', result);
      
    } catch (error: any) {
      console.error('Code execution failed:', error);
      
      // Pass error to parent component
      if (onExecutionResult) {
        onExecutionResult({
          id: Date.now().toString(),
          success: false,
          output: '',
          error: `Execution failed: ${error.message}`,
          execution_time: 0,
          timestamp: new Date().toISOString(),
          code: code,
          executor_type: currentExecutor,
          system_info: {}
        });
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = () => {
    executeCode();
  };  const handleRefresh = () => {
    setCode(`print("Hello World from SOL VM!")
x = 10
y = 20
result = x + y
print(f"{x} + {y} = {result}")
print("Counting to 5:")
for i in range(1, 6):
    print(f"Count: {i}")
message = "SOL VM is awesome!"
print(f"Message: {message}")
print(f"Length: {len(message)} characters")
print("Ready for SOL VM execution!")`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
      <CardHeader className="bg-purple-500 text-white p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-400 rounded-full"></div>            <span className="text-2xl font-bold">Code Editor</span>
            <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full border border-white/30">
              LLM-Assisted
            </span>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleCopy} className="text-white hover:bg-white/20 rounded-lg">
              <Copy className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 rounded-lg">
              <Download className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/20 rounded-lg">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Executor Status Indicator */}
        {executorStatus && (
          <div className="mt-3 flex items-center gap-4 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${executorStatus.executors.local.healthy ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span>Local</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${executorStatus.executors.hybrid.healthy ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span>SOL VM</span>
            </div>
            <div className="text-xs bg-white/10 px-2 py-1 rounded">
              Active: {currentExecutor}
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0 flex flex-col h-[600px]">
        <div className="flex-1 relative">
          <Textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-full font-mono text-sm border-0 resize-none focus:ring-0 rounded-none bg-slate-50 p-6 leading-relaxed"
            placeholder="Write your Python code here..."
            style={{
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', monospace"
            }}
          />
          
          {/* Line numbers overlay */}
          <div className="absolute left-2 top-6 flex flex-col text-xs text-gray-400 font-mono select-none pointer-events-none">
            {Array.from({ length: code.split('\n').length }, (_, i) => (
              <div key={i} className="h-6 flex items-center pr-4">
                {i + 1}
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-3 p-6 bg-gray-50 border-t border-gray-200">
          <Button 
            onClick={handleSubmit} 
            disabled={isExecuting}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Run Code
              </>
            )}
          </Button>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 px-6 py-3 rounded-lg font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>
      </CardContent>
    </div>
  );
};

export default CodeEditor;
