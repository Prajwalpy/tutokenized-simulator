
import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-8 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-semibold mb-4">About Tutokenized</h3>
            <p className="text-sm leading-relaxed">
              Revolutionizing GPU education through AI-powered interactive learning. 
              Master parallel computing, CUDA programming, and GPU-accelerated data science 
              with real-time simulations and personalized tutoring.
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Features</h3>
            <ul className="text-sm space-y-2">
              <li>• Interactive GPU Simulation Environment</li>
              <li>• Real-time Performance Monitoring</li>
              <li>• NVIDIA API Integration</li>
              <li>• Personalized AI Tutoring</li>
              <li>• Comprehensive Benchmarking Tools</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Technology Stack</h3>
            <ul className="text-sm space-y-2">
              <li>• CUDA & GPU Computing</li>
              <li>• Machine Learning Frameworks</li>
              <li>• Real-time Data Visualization</li>
              <li>• Advanced LLM Integration</li>
              <li>• Cloud GPU Resources</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm">
          <p>&copy; 2024 Tutokenized. Empowering the next generation of GPU developers.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
