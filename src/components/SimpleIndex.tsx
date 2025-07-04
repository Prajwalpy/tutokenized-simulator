import { useState } from 'react';

const SimpleIndex = () => {
  console.log('SimpleIndex component rendering...');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/50 flex flex-col font-inter">
      <h1 className="text-4xl font-bold text-center py-8">Simple Index - Testing</h1>
      <p className="text-center">If you can see this, the basic routing works!</p>
      <button 
        onClick={() => alert('Button clicked!')}
        className="mx-auto mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Test Button
      </button>
    </div>
  );
};

export default SimpleIndex;
