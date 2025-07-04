import { useState } from 'react';

const TestIndex3 = () => {
  console.log('TestIndex3 rendering...');
  
  // Test if the issue is with executorManager import
  try {
    console.log('Trying to import executorManager...');
    const { executorManager } = require('@/utils/executorManager');
    console.log('✅ executorManager imported successfully:', executorManager);
  } catch (error) {
    console.error('❌ Failed to import executorManager:', error);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/50 flex flex-col font-inter p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Test Index 3</h1>
      <p className="text-center mb-8">Testing executorManager import</p>
      
      <div className="w-1/2 mx-auto p-4 bg-white rounded border">
        <p>Check the console for import results</p>
      </div>
    </div>
  );
};

export default TestIndex3;
