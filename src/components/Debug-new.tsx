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
