import { useState } from 'react';
import SimpleCodeEditor from '../components/SimpleCodeEditor';

const TestIndex4 = () => {
  console.log('TestIndex4 rendering...');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/50 flex flex-col font-inter p-8">
      <h1 className="text-4xl font-bold text-center mb-8">Test Index 4</h1>
      <p className="text-center mb-8">Testing with SimpleCodeEditor (no context, no executorManager)</p>
      
      <div className="w-1/2 mx-auto">
        <SimpleCodeEditor />
      </div>
    </div>
  );
};

export default TestIndex4;
