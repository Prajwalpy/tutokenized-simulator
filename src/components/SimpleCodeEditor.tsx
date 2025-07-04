import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Play } from 'lucide-react';

const SimpleCodeEditor: React.FC = () => {
  const [code, setCode] = useState(`print("Hello World!")
x = 10
y = 20
result = x + y
print(f"{x} + {y} = {result}")`);
  
  const [isExecuting, setIsExecuting] = useState(false);

  const executeCode = async () => {
    setIsExecuting(true);
    
    // Simple mock execution
    setTimeout(() => {
      console.log('Mock execution completed');
      setIsExecuting(false);
    }, 1000);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          Simple Code Editor (No Context)
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter your Python code here..."
          className="min-h-[200px] font-mono text-sm"
        />
        
        <div className="flex gap-2">
          <Button 
            onClick={executeCode}
            disabled={isExecuting || !code.trim()}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {isExecuting ? 'Running...' : 'Run Code'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleCodeEditor;
