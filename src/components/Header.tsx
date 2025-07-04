
import React from 'react';

const Header = () => {
  return (    <header className="relative bg-gradient-to-r from-nvidia-green via-asu-gold to-asu-maroon text-white py-8 px-8 shadow-2xl overflow-hidden">
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-r from-nvidia-green/90 via-asu-gold/90 to-asu-maroon/90"></div>
      
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-16 right-20 w-24 h-24 bg-asu-gold/20 rounded-full blur-lg animate-pulse delay-1000"></div>
        <div className="absolute bottom-8 left-1/3 w-28 h-28 bg-nvidia-green/15 rounded-full blur-xl animate-pulse delay-2000"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto">
        <div>          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-white via-asu-gold-dark to-nvidia-green-light bg-clip-text text-transparent">
            Tutokenized
          </h1>
          <p className="text-gray-100 text-xl font-medium mb-6">
            AI-Powered GPU Tutoring Platform for Data Science Excellence
          </p>          <div className="flex flex-wrap gap-4 text-sm">
            <span className="glass-card px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300 text-gray-800 font-semibold">
              🚀 Real-time GPU Simulation
            </span>
            <span className="glass-card px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300 text-gray-800 font-semibold">
              📊 Performance Benchmarks
            </span>
            <span className="glass-card px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300 text-gray-800 font-semibold">
              🤖 LLM-Assisted Learning
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
