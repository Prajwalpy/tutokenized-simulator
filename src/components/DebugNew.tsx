import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bug, Terminal, Trash2, Copy, Download, Wifi, WifiOff, Server, RefreshCw, Play, Settings } from 'lucide-react';
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
  const [debugEntries, setDebugEntries] = useState<DebugEntry[]>([
    {
      id: '1',
      timestamp: new Date().toISOString(),
      type: 'info',
      source: 'System',
      message: 'Debug window initialized',
      data: { status: 'ready' }
    }
  ]);

  const [filter, setFilter] = useState<string>('all');
  const [backendUrl, setBackendUrl] = useState<string>(BACKEND_CONFIG.DEFAULT_URL);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [testCode, setTestCode] = useState<string>(`print("Hello from remote backend!")
import datetime
print(f"Current time: {datetime.datetime.now()}")
result = 2 + 2
print(f"2 + 2 = {result}")`);

  const addDebugEntry = (type: DebugEntry['type'], source: string, message: string, data?: any) => {
    const newEntry: DebugEntry = {
      id: Date.now().toString(),
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
      
      const response = await fetch(`${backendUrl}${BACKEND_CONFIG.ENDPOINTS.HEALTH}`, {
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

  // Execute test code on remote backend
  const executeTestCode = async () => {
    if (!testCode.trim()) {
      addDebugEntry('warning', 'Execution', 'No code provided for execution');
      return;
    }

    setIsExecuting(true);
    const executionStart = Date.now();

    try {
      addDebugEntry('info', 'Execution', 'Sending test code to remote backend for execution...', { 
        codeLength: testCode.length,
        backendUrl 
      });

      const response = await fetch(`${backendUrl}${BACKEND_CONFIG.ENDPOINTS.EXECUTE_PYTHON}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: testCode,
          timeout: BACKEND_CONFIG.DEFAULT_TIMEOUT,
          language: 'python'
        }),
      });

      const executionTime = Date.now() - executionStart;

      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          addDebugEntry('execution', 'Test Execution', 'Test code executed successfully!', {
            ...result,
            networkTime: executionTime
          });
        } else {
          addDebugEntry('error', 'Test Execution', 'Test code execution failed', {
            ...result,
            networkTime: executionTime
          });
        }
      } else {
        const errorText = await response.text();
        addDebugEntry('error', 'Test Execution', `HTTP Error: ${response.status}`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          networkTime: executionTime
        });
      }
    } catch (error: any) {
      const executionTime = Date.now() - executionStart;
      addDebugEntry('error', 'Test Execution', `Network error: ${error.message}`, {
        error: error.message,
        networkTime: executionTime
      });
    } finally {
      setIsExecuting(false);
    }
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
      <div className="flex items-center justify-between">        <div className="flex items-center gap-3">
          <Bug className="w-6 h-6 text-asu-maroon" />
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

      {/* Connection Status & Backend Configuration */}
      <Card className="glass-card bg-white/70 backdrop-blur-sm border border-gray-200/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Backend Connection
            <Badge className={isConnected ? 'bg-nvidia-green/20 text-nvidia-green-dark' : 'bg-red-100 text-red-800'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="backend-url" className="text-sm font-medium">
                Backend URL
              </Label>
              <div className="flex gap-2">
                <Input
                  id="backend-url"
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  placeholder="http://your-sol-vm:8000"
                  className="flex-1"
                />
                <Button onClick={testConnection} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Settings className="w-4 h-4" />
                Configure your Sol VM backend URL
              </div>
              <Badge
                variant="outline"
                className="text-xs"
              >
                Default: {BACKEND_CONFIG.DEFAULT_URL}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="test-code" className="text-sm font-medium">
                Test Code
              </Label>
              <Textarea
                id="test-code"
                value={testCode}
                onChange={(e) => setTestCode(e.target.value)}
                placeholder="Enter Python code to test backend connection..."
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
