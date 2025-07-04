import { useState } from 'react';
import Header from '../components/Header';

const TestIndex1 = () => {
  console.log('TestIndex1 rendering...');
  
  const [activeTab, setActiveTab] = useState('simulation');
  const [executionResult, setExecutionResult] = useState<any>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/50 flex flex-col font-inter">
      <Header />
      
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Test Index 1</h1>
          <p>Testing with Header component only</p>
        </div>
      </main>
    </div>
  );
};

export default TestIndex1;
