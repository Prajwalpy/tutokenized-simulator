import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Terminal, Trash2, Copy, CheckCircle, XCircle, Clock, Wifi, Cpu, Zap, Activity, Thermometer, HardDrive } from 'lucide-react';

interface DebugProps {
  executionResult?: any;
}

const Debug: React.FC<DebugProps> = ({ executionResult }) => {
  const [output, setOutput] = useState<string>('Ready for code execution...\n\nClick "Run Code" in the editor to see results here.');
  const [lastResult, setLastResult] = useState<any>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Test connection to local executor
  const testConnection = async () => {
    setIsTestingConnection(true);
    try {
      const response = await fetch('http://localhost:3001/health');
      if (response.ok) {
        const data = await response.json();
        const testOutput = `[${new Date().toLocaleTimeString()}] ✅ Connection Test Successful\n` +
          `Service: ${data.service}\n` +
          `Status: ${data.status}\n` +
          `Uptime: ${Math.round(data.uptime)}s\n` +
          '─'.repeat(50) + '\n\n';
        setOutput(testOutput + output);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      const errorOutput = `[${new Date().toLocaleTimeString()}] ❌ Connection Test Failed\n` +
        `Error: ${error.message}\n\n` +
        `🔧 To fix this:\n` +
        `1. Run "start-executor.bat" from the project folder\n` +
        `2. Wait for the service to start on http://localhost:3001\n` +
        `3. Click "Test Connection" again\n` +
        '─'.repeat(50) + '\n\n';
      setOutput(errorOutput + output);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Update output when execution result changes
  useEffect(() => {
    if (executionResult) {
      setLastResult(executionResult);
      
      let newOutput = '';
      
      // Add timestamp
      newOutput += `[${new Date(executionResult.timestamp).toLocaleTimeString()}] `;
      
      if (executionResult.success) {
        newOutput += `✅ Execution completed in ${executionResult.execution_time.toFixed(2)}s\n`;
        newOutput += '─'.repeat(50) + '\n';
        newOutput += 'OUTPUT:\n';
        newOutput += executionResult.output || '(No output)';
      } else {
        newOutput += `❌ Execution failed in ${executionResult.execution_time.toFixed(2)}s\n`;
        newOutput += '─'.repeat(50) + '\n';
        newOutput += 'ERROR:\n';
        
        // Provide helpful error messages for common issues
        const errorMessage = executionResult.error || 'Unknown error';
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('fetch')) {
          newOutput += '🔧 CONNECTION ERROR:\n';
          newOutput += 'The local executor service is not running.\n\n';
          newOutput += 'To fix this:\n';
          newOutput += '1. Run "start-executor.bat" from the project folder\n';
          newOutput += '2. Or run "quick-start.bat" to start everything\n';
          newOutput += '3. Wait for the service to start on http://localhost:3001\n\n';
          newOutput += 'Original error: ' + errorMessage;
        } else {
          newOutput += errorMessage;
        }
      }
      
      newOutput += '\n' + '═'.repeat(50) + '\n\n';
      
      setOutput(newOutput + output);
    }
  }, [executionResult]);

  const clearOutput = () => {
    setOutput('Output cleared.\n\nClick "Run Code" in the editor to see results here.');
    setLastResult(null);
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
  };

  // Helper function to format system metrics
  const formatSystemMetrics = (metrics: any) => {
    if (!metrics) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* CPU Stats */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-blue-800 text-sm">CPU</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Usage:</span>
              <Badge variant="outline" className={`text-xs ${metrics.cpu?.usage > 80 ? 'border-red-300 text-red-700' : metrics.cpu?.usage > 50 ? 'border-yellow-300 text-yellow-700' : 'border-green-300 text-green-700'}`}>
                {metrics.cpu?.usage}%
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cores:</span>
              <span className="font-mono text-blue-700">{metrics.cpu?.threads}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Speed:</span>
              <span className="font-mono text-blue-700">{metrics.cpu?.clockSpeed?.toFixed(1)} GHz</span>
            </div>
            {metrics.cpu?.temperature > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Temp:</span>
                <div className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-blue-600" />
                  <span className={`font-mono text-xs ${metrics.cpu.temperature > 80 ? 'text-red-600' : 'text-blue-700'}`}>
                    {metrics.cpu.temperature}°C
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* GPU Stats */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-purple-800 text-sm">GPU</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Usage:</span>
              <Badge variant="outline" className={`text-xs ${metrics.gpu?.usage > 80 ? 'border-red-300 text-red-700' : metrics.gpu?.usage > 50 ? 'border-yellow-300 text-yellow-700' : 'border-green-300 text-green-700'}`}>
                {metrics.gpu?.usage || 0}%
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Memory:</span>
              <span className="font-mono text-purple-700">
                {((metrics.gpu?.memory_used || 0) / 1024).toFixed(1)}/{((metrics.gpu?.memory_total || 0) / 1024).toFixed(0)} GB
              </span>
            </div>
            {metrics.gpu?.temperature > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Temp:</span>
                <div className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-purple-600" />
                  <span className={`font-mono text-xs ${metrics.gpu.temperature > 80 ? 'text-red-600' : 'text-purple-700'}`}>
                    {metrics.gpu.temperature}°C
                  </span>
                </div>
              </div>
            )}
            <div className="text-xs text-gray-500 truncate" title={metrics.gpu?.name}>
              {metrics.gpu?.name || 'No GPU'}
            </div>
          </div>
        </div>
        
        {/* Memory Stats */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-600" />
            <span className="font-semibold text-green-800 text-sm">Memory</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Usage:</span>
              <Badge variant="outline" className={`text-xs ${metrics.memory?.usage_percent > 90 ? 'border-red-300 text-red-700' : metrics.memory?.usage_percent > 70 ? 'border-yellow-300 text-yellow-700' : 'border-green-300 text-green-700'}`}>
                {metrics.memory?.usage_percent}%
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Used:</span>
              <span className="font-mono text-green-700">{metrics.memory?.used} GB</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-mono text-green-700">{metrics.memory?.total} GB</span>
            </div>
          </div>
        </div>
        
        {/* System Stats */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-4 h-4 text-gray-600" />
            <span className="font-semibold text-gray-800 text-sm">System</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Platform:</span>
              <span className="font-mono text-gray-700">{metrics.system?.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Uptime:</span>
              <span className="font-mono text-gray-700">
                {Math.floor((metrics.system?.uptime || 0) / 3600)}h
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Host:</span>
              <span className="font-mono text-gray-700 text-xs truncate" title={metrics.system?.hostname}>
                {metrics.system?.hostname}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* System Metrics Display */}
      {lastResult?.system_metrics && (
        <Card className="glass-card bg-white/70 backdrop-blur-sm border border-gray-200/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4" />
              Real-time System Stats
              <Badge variant="outline" className="text-xs">
                {new Date(lastResult.timestamp).toLocaleTimeString()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {formatSystemMetrics(lastResult.system_metrics)}
          </CardContent>
        </Card>
      )}
      
      {/* Header with controls */}
      <Card className="glass-card bg-white/70 backdrop-blur-sm border border-gray-200/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Python Output Console
            </CardTitle>
            <div className="flex items-center gap-2">
              {lastResult && (
                <div className="flex items-center gap-2 text-sm">
                  {lastResult.success ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">Success</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-600">Error</span>
                    </>
                  )}
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">
                    {lastResult.execution_time.toFixed(2)}s
                  </span>
                </div>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={testConnection}
                disabled={isTestingConnection}
                className="text-xs"
              >
                <Wifi className="w-3 h-3 mr-1" />
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={copyOutput}
                className="text-xs"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={clearOutput}
                className="text-xs"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Output display */}
      <Card className="glass-card bg-white/70 backdrop-blur-sm border border-gray-200/50 flex-1">
        <CardContent className="p-0 h-full">
          <ScrollArea className="h-[400px] w-full">
            <div className="p-6">
              <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                {output}
              </pre>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default Debug;
