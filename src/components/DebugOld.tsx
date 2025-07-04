import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Bug, Terminal, Trash2, Copy, Download, Wifi, WifiOff, Server, RefreshCw } from 'lucide-react';
import { BACKEND_CONFIG } from '@/config/backend';

interface DebugEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'debug' | 'execution';
  source: string;
  message: string;
  data?: any;
}

interface DebugProps {
  executionResult?: any;
}

const Debug: React.FC<DebugProps> = ({ executionResult }) => {
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>(
    [
      {
        id: '1',
        timestamp: new Date().toISOString(),
        type: 'info',
        source: 'System',
        message: 'Debug window initialized',
        data: { status: 'ready' }
      }
    ]
  );

  const [filter, setFilter] = useState<string>('all');
  const [backendUrl, setBackendUrl] = useState<string>(BACKEND_CONFIG.DEFAULT_URL);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Add execution result when received from CodeEditor
  React.useEffect(() => {
    if (executionResult) {
      addDebugEntry(
        executionResult.success ? 'execution' : 'error',
        'Code Execution',
        executionResult.success 
          ? 'Code executed successfully!' 
          : `Execution failed: ${executionResult.error}`,
        executionResult
      );
    }
  }, [executionResult]);

  // Test backend connection
  const testConnection = async () => {
    try {
      addDebugEntry('info', 'Connection', `Testing connection to ${backendUrl}...`);
      
      const response = await fetch(`${backendUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsConnected(true);
        addDebugEntry('info', 'Connection', 'Successfully connected to backend!', data);
      } else {
        setIsConnected(false);
        addDebugEntry('error', 'Connection', `Connection failed: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      setIsConnected(false);
      addDebugEntry('error', 'Connection', `Connection error: ${error.message}`);
    }
  };

  // Execute code on remote backend
  const executeRemoteCode = async (code: string) => {
    if (!code.trim()) {
      addDebugEntry('warning', 'Execution', 'No code provided for execution');
      return;
    }

    setIsExecuting(true);
    const executionStart = Date.now();

    try {
      addDebugEntry('info', 'Execution', 'Sending code to remote backend for execution...', { 
        codeLength: code.length,
        backendUrl 
      });

      const response = await fetch(`${backendUrl}/api/execute/python`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          input: '',
          timeout: 30
        })
      });

      const executionTime = Date.now() - executionStart;

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          addDebugEntry('execution', 'Remote Execution', 'Code executed successfully!', {
            output: data.result.output,
            executionTime: data.result.execution_time,
            status: data.result.status,
            executionId: data.result.id,
            totalTime: executionTime
          });
        } else {
          addDebugEntry('error', 'Remote Execution', 'Code execution failed', {
            error: data.error || data.result?.error,
            details: data.debug,
            totalTime: executionTime
          });
        }
      } else {
        const errorText = await response.text();
        addDebugEntry('error', 'Remote Execution', `HTTP Error: ${response.status}`, {
          statusText: response.statusText,
          error: errorText,
          totalTime: executionTime
        });
      }
    } catch (error: any) {
      const executionTime = Date.now() - executionStart;
      addDebugEntry('error', 'Remote Execution', `Network error: ${error.message}`, {
        error: error.toString(),
        totalTime: executionTime
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const clearDebugEntries = () => {
    setDebugEntries([]);
  };

  const copyToClipboard = (entry: DebugEntry) => {
    const text = `[${entry.timestamp}] ${entry.type.toUpperCase()} - ${entry.source}: ${entry.message}${entry.data ? '\nData: ' + JSON.stringify(entry.data, null, 2) : ''}`;
    navigator.clipboard.writeText(text);
  };

  const exportDebugLog = () => {
    const logData = debugEntries.map(entry => ({
      timestamp: entry.timestamp,
      type: entry.type,
      source: entry.source,
      message: entry.message,
      data: entry.data
    }));
    
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-log-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredEntries = filter === 'all' 
    ? debugEntries 
    : debugEntries.filter(entry => entry.type === filter);

  const getTypeColor = (type: DebugEntry['type']) => {
    switch (type) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'debug': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'execution': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bug className="w-6 h-6 text-orange-600" />
          <h2 className="text-2xl font-bold text-gray-800">Debug Console</h2>
          <Badge variant="outline" className="text-xs">
            {debugEntries.length} entries
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportDebugLog}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={clearDebugEntries}
            className="flex items-center gap-2 text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-card bg-white/80 backdrop-blur-sm border border-white/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Terminal className="w-5 h-5" />
            Filter by Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {['all', 'info', 'debug', 'warning', 'error'].map((type) => (
              <Button
                key={type}
                variant={filter === type ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(type)}
                className="capitalize"
              >
                {type}
                {type !== 'all' && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {debugEntries.filter(e => e.type === type).length}
                  </Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Debug Entries */}
      <Card className="glass-card bg-white/80 backdrop-blur-sm border border-white/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Debug Output</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[350px] w-full">
            {filteredEntries.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Bug className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No debug entries to display</p>
                <p className="text-sm">Debug information will appear here as your application runs</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-lg border bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <Badge className={getTypeColor(entry.type)}>
                          {entry.type.toUpperCase()}
                        </Badge>
                        <span className="text-sm font-medium text-gray-600">
                          {entry.source}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTimestamp(entry.timestamp)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(entry)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <p className="text-gray-800 mb-2">{entry.message}</p>
                    
                    {entry.data && (
                      <details className="mt-2">
                        <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                          View data
                        </summary>
                        <pre className="mt-2 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                          {JSON.stringify(entry.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>      {/* Remote Code Execution */}
      <Card className="glass-card bg-white/80 backdrop-blur-sm border border-white/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="w-5 h-5" />
            Remote Code Execution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Backend URL Configuration */}
            <div className="flex items-center gap-2">
              <Label htmlFor="backend-url" className="text-sm font-medium">
                Backend URL:
              </Label>
              <Input
                id="backend-url"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="flex-1"
              />
              <Button 
                onClick={testConnection}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Test
              </Button>
              <Badge 
                variant={isConnected ? "default" : "secondary"}
                className={isConnected ? "bg-green-500 text-white" : "bg-red-500 text-white"}
              >
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </div>

            {/* Code Input */}
            <div className="space-y-2">
              <Label htmlFor="test-code" className="text-sm font-medium">
                Python Code to Execute:
              </Label>
              <textarea
                id="test-code"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                className="w-full h-32 p-3 border rounded-md font-mono text-sm"
                placeholder="Enter Python code here..."
              />
            </div>

            {/* Execution Controls */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => executeRemoteCode(testCode)}
                disabled={isExecuting || !testCode.trim()}
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                {isExecuting ? 'Executing...' : 'Execute Code'}
              </Button>
              <Button
                onClick={() => setTestCode('')}
                variant="outline"
                size="sm"
              >
                Clear
              </Button>
              <Button
                onClick={() => setTestCode(`print("Hello from remote backend!")
import datetime
print(f"Current time: {datetime.datetime.now()}")
result = 2 + 2
print(f"2 + 2 = {result}")`)}
                variant="outline"
                size="sm"
              >
                Load Sample
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 border-t">
              <Label className="text-sm font-medium mb-2 block">
                Quick Test Actions:
              </Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeRemoteCode('print("Hello, World!")')}
                  disabled={isExecuting}
                >
                  Hello World
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeRemoteCode('import sys\nprint(f"Python {sys.version}")')}
                  disabled={isExecuting}
                >
                  Python Version
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeRemoteCode('import platform\nprint(f"OS: {platform.system()}")\nprint(f"Architecture: {platform.machine()}")')}
                  disabled={isExecuting}
                >
                  System Info
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeRemoteCode('for i in range(5):\n    print(f"Count: {i}")')}
                  disabled={isExecuting}
                >
                  Loop Test
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remote Code Execution */}
      <Card className="glass-card bg-white/80 backdrop-blur-sm border border-white/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Play className="w-5 h-5" />
            Remote Code Execution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {/* Backend URL Input */}
            <div>
              <Label htmlFor="backend-url" className="text-sm font-medium">Backend URL</Label>
              <Input
                id="backend-url"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                className="mt-2"
                placeholder="Enter backend URL"
              />
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={testConnection}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Test Connection
              </Button>
              <Badge variant={isConnected ? "default" : "outline"} className="text-xs">
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>

            {/* Code Execution Area */}
            <div>
              <Label htmlFor="test-code" className="text-sm font-medium">Code to Execute</Label>
              <textarea
                id="test-code"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                className="mt-2 p-3 w-full h-32 rounded-md border focus:ring-1 focus:ring-blue-500 focus:outline-none resize-none"
                placeholder="Enter your Python code here"
              />
            </div>

            {/* Execute Button */}
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => executeRemoteCode(testCode)}
                className="flex items-center gap-2"
                disabled={isExecuting}
              >
                {isExecuting ? (
                  <span className="loader"></span>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Execute Code
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Debug;
