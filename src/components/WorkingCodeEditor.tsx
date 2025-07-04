import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Play, RotateCcw, Loader2, Upload, FileText } from 'lucide-react';

interface CodeEditorProps {
  onExecutionResult?: (result: any) => void;
  onCodeChange?: (code: string) => void;
}

const WorkingCodeEditor: React.FC<CodeEditorProps> = ({ onExecutionResult, onCodeChange }) => {
  console.log('WorkingCodeEditor rendering...');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [code, setCode] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentExecutor, setCurrentExecutor] = useState<'local' | 'hybrid'>('local');

  useEffect(() => {
    console.log('Code changed:', code);
    if (onCodeChange) {
      onCodeChange(code);
    }
  }, [code, onCodeChange]);

  const executeCode = async () => {
    if (!code.trim()) return;
    
    setIsExecuting(true);
    console.log('Executing code:', code);
    
    try {
      // Import executorManager dynamically to avoid initialization issues
      const { executorManager } = await import('@/utils/executorManager');
      
      // Detect if this is volume.py or other video generation code
      const isVideoGeneration = code.includes('volume.py') || 
                                code.includes('warp.render') || 
                                code.includes('VIDEO_OUTPUT') ||
                                code.includes('warp as wp');
      
      const timeout = isVideoGeneration ? 120 : 30; // 2 minutes for video, 30s for others
      
      const result = await executorManager.executeCode(code, timeout);
      
      console.log('Code execution result:', result);
      
      if (onExecutionResult) {
        onExecutionResult({
          ...result,
          timestamp: new Date().toISOString(),
          code: code
        });
      }
    } catch (error) {
      console.error('Execution error:', error);
      if (onExecutionResult) {
        onExecutionResult({
          success: false,
          output: `Execution error: ${error}`,
          error: String(error),
          timestamp: new Date().toISOString(),
          code: code
        });
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRefresh = () => {
    setCode('');
    setUploadedFileName('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.py')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCode(content);
        setUploadedFileName(file.name);
      };
      reader.readAsText(file);
    }  };

  return (
    <Card className="w-full shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold flex items-center justify-between">          <span className="flex items-center gap-2">
            Python Code Editor
            {uploadedFileName && (
              <span className="flex items-center gap-1 text-sm font-normal text-blue-600">
                <FileText className="w-4 h-4" />
                {uploadedFileName}
              </span>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter your Python code here..."
          className="min-h-[300px] font-mono text-sm resize-none border-slate-200 focus:border-blue-400 focus:ring-blue-400 text-black"
        />
        
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={executeCode}
            disabled={isExecuting || !code.trim()}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Code
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleRefresh} 
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </Button>
          
          <div className="relative">
            <input
              type="file"
              accept=".py"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Upload .py
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkingCodeEditor;
