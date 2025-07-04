import { useState } from 'react';

const MinimalIndex = () => {
  console.log('MinimalIndex rendering...');
  
  const [activeTab, setActiveTab] = useState('simulation');
  const [executionResult, setExecutionResult] = useState<any>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/50 flex flex-col font-inter">
      <h1 className="text-4xl font-bold text-center py-8">Minimal Index</h1>
      <p className="text-center">This is a simplified version of the Index page without complex components.</p>
      <div className="flex-1 flex gap-8 p-8">
        <div className="w-1/3 bg-white rounded-lg p-4 shadow">
          <h2 className="text-xl font-semibold mb-4">Code Editor Placeholder</h2>
          <textarea 
            className="w-full h-40 p-2 border rounded"
            placeholder="Code would go here..."
          />
          <button className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
            Run Code
          </button>
        </div>
        
        <div className="flex-1 bg-white rounded-lg p-4 shadow">
          <h2 className="text-xl font-semibold mb-4">Workspace Placeholder</h2>
          <p>Active tab: {activeTab}</p>
          <button 
            onClick={() => setActiveTab('debug')}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Switch to Debug
          </button>
        </div>
      </div>
    </div>
  );
};

export default MinimalIndex;
