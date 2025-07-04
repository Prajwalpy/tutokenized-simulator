import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal, Trash2, Copy, CheckCircle, XCircle, Clock } from 'lucide-react';

interface DebugProps {
  executionResult?: any;
}

const Debug: React.FC<DebugProps> = ({ executionResult }) => {
  const [output, setOutput] = useState<string>('Ready for code execution...\n\nClick "Run Code" in the editor to see results here.');
  const [lastResult, setLastResult] = useState<any>(null);

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
        newOutput += executionResult.error || 'Unknown error';
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

  return (
    <div className="h-full flex flex-col space-y-4">
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
          <ScrollArea className="h-[500px] w-full">
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
      timestamp: new Date().toISOString(),
      type,
      source,
      message,
      data
    };
    setDebugEntries(prev => [newEntry, ...prev]);
  };

  // Add execution result when received from CodeEditor
  useEffect(() => {
    if (executionResult) {
      addDebugEntry(
        executionResult.success ? 'execution' : 'error',
        'Local Python Executor',
        executionResult.success 
          ? `Code executed successfully! (${executionResult.execution_time.toFixed(2)}s)` 
          : `Execution failed: ${executionResult.error}`,
        {
          ...executionResult,
          localExecution: true
        }
      );
    }
  }, [executionResult]);

  // Test local executor service
  const testLocalExecutor = async () => {
    addDebugEntry('info', 'Local Executor', 'Testing local executor service...');
    
    try {
      const { localPythonExecutor } = await import('@/utils/localExecutor');
      const isHealthy = await localPythonExecutor.checkHealth();
      
      if (isHealthy) {
        setIsConnected(true);
        addDebugEntry('info', 'Local Executor', 'Local executor service is running and healthy!');
      } else {
        setIsConnected(false);
        addDebugEntry('error', 'Local Executor', 'Local executor service is not responding. Make sure to run ./start-executor.sh');
      }
    } catch (error: any) {
      setIsConnected(false);
      addDebugEntry('error', 'Local Executor', `Failed to connect to local executor: ${error.message}`);
    }
  };

  // Execute test code using local executor
  const executeTestCodeLocally = async () => {
    if (!testCode.trim()) {
      addDebugEntry('warning', 'Execution', 'No code provided for execution');
      return;
    }

    addDebugEntry('info', 'Local Test', 'Executing test code locally...');
    setIsExecuting(true);
    
    try {
      const { localPythonExecutor } = await import('@/utils/localExecutor');
      const result = await localPythonExecutor.executeCode(testCode);
      
      if (result.success) {
        addDebugEntry('execution', 'Local Test', `Test executed successfully! (${result.execution_time.toFixed(2)}s)`, result);
      } else {
        addDebugEntry('error', 'Local Test', 'Test execution failed', result);
      }
    } catch (error: any) {
      addDebugEntry('error', 'Local Test', `Test execution failed: ${error.message}`, {
        error: error.message
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // For backward compatibility
  const executeTestCode = executeTestCodeLocally;

  // Update the connection test to be local executor test
  const testConnection = () => {
    testLocalExecutor();
  };

  const clearDebugEntries = () => {
    setDebugEntries([]);
  };

  const copyDebugEntries = () => {
    const text = debugEntries.map(entry => 
      `[${entry.timestamp}] ${entry.type.toUpperCase()} - ${entry.source}: ${entry.message}`
    ).join('\n');
    navigator.clipboard.writeText(text);
    addDebugEntry('info', 'System', 'Debug entries copied to clipboard');
  };

  const filteredEntries = debugEntries.filter(entry => 
    filter === 'all' || entry.type === filter
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'debug': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'execution': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'info': return '💡';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'debug': return '🔍';
      case 'execution': return '▶️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bug className="w-6 h-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-800">Debug Console</h2>
          <Badge variant="outline" className="text-xs">
            {filteredEntries.length} entries
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={copyDebugEntries} size="sm" variant="outline">
            <Copy className="w-4 h-4 mr-1" />
            Copy
          </Button>
          <Button onClick={clearDebugEntries} size="sm" variant="outline">
            <Trash2 className="w-4 h-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Local Executor Service Status */}
      <Card className="glass-card bg-white/70 backdrop-blur-sm border border-gray-200/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Local Executor Service
            <Badge className={isConnected ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}>
              {isConnected ? 'Running' : 'Not Connected'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="executor-status" className="text-sm font-medium">
                Local Executor Service
              </Label>
              <div className="flex gap-2">
                <Input
                  id="executor-status"
                  value="http://localhost:3001"
                  readOnly
                  className="flex-1"
                />
                <Button onClick={testConnection} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Settings className="w-4 h-4" />
                Node.js service for executing Python code locally
              </div>
              <Badge
                variant="outline"
                className="text-xs"
              >
                Start with: ./start-executor.sh
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="test-code" className="text-sm font-medium">
                Test Code (Local Execution)
              </Label>
              <Textarea
                id="test-code"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                placeholder="Enter Python code to test local executor service..."
                className="h-24 font-mono text-sm"
              />
              <Button 
                onClick={executeTestCode} 
                disabled={isExecuting || !testCode.trim()}
                size="sm" 
                className="w-full"
              >
                <Play className="w-4 h-4 mr-1" />
                {isExecuting ? 'Executing...' : 'Execute Test Code'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Controls */}
      <Card className="glass-card bg-white/70 backdrop-blur-sm border border-gray-200/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium mb-2 block">
              Filter by Type:
            </Label>
            <div className="flex gap-2">
              {['all', 'info', 'warning', 'error', 'debug', 'execution'].map((type) => (
                <Button
                  key={type}
                  size="sm"
                  variant={filter === type ? "default" : "outline"}
                  onClick={() => setFilter(type)}
                  className="text-xs"
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Entries */}
      <Card className="glass-card bg-white/70 backdrop-blur-sm border border-gray-200/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Debug Output
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full">
            <div className="space-y-3">
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bug className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No debug entries to display</p>
                  <Button onClick={executeTestCode} size="sm" className="mt-2">
                    <Play className="w-4 h-4 mr-1" />
                    Run Test Code
                  </Button>
                </div>
              ) : (
                filteredEntries.map((entry) => (
                  <div key={entry.id} className="border border-gray-200 rounded-lg p-4 bg-white/50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getTypeIcon(entry.type)}</span>
                        <Badge className={getTypeColor(entry.type)}>
                          {entry.type.toUpperCase()}
                        </Badge>
                        <span className="font-medium text-gray-800">{entry.source}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    <p className="text-gray-700 mb-2">{entry.message}</p>
                    
                    {entry.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-32">
                          {JSON.stringify(entry.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default Debug;
