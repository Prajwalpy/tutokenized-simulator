import { useState } from 'react';
import CodeEditor from '../components/CodeEditor';

const TestIndex2 = () => {
  console.log('TestIndex2 rendering...');
  
  const [executionResult, setExecutionResult] = useState<any>(null);

  const handleExecutionResult = (result: any) => {
    console.log('Handling execution result:', result);
    setExecutionResult(result);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/50 flex flex-col font-inter p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Test Index 2</h1>
      <p className="text-center mb-8">Testing with CodeEditor component only</p>
      
      <div className="w-1/2 mx-auto">
        <CodeEditor onExecutionResult={handleExecutionResult} />
      </div>
      
      {executionResult && (
        <div className="mt-8 p-4 bg-white rounded border">
          <h3 className="font-bold">Execution Result:</h3>
          <pre>{JSON.stringify(executionResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default TestIndex2;
