import React, { createContext, useContext, useState, ReactNode } from 'react';
import { SystemMetrics, Benchmarks } from '@/utils/hybridExecutor';

interface SystemMetricsContextType {
  metrics: SystemMetrics | null;
  benchmarks: Benchmarks | null;
  updateMetrics: (metrics: SystemMetrics) => void;
  updateBenchmarks: (benchmarks: Benchmarks) => void;
  clearData: () => void;
}

const SystemMetricsContext = createContext<SystemMetricsContextType | undefined>(undefined);

export const useSystemMetrics = () => {
  const context = useContext(SystemMetricsContext);
  if (context === undefined) {
    throw new Error('useSystemMetrics must be used within a SystemMetricsProvider');
  }
  return context;
};

interface SystemMetricsProviderProps {
  children: ReactNode;
}

export const SystemMetricsProvider: React.FC<SystemMetricsProviderProps> = ({ children }) => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [benchmarks, setBenchmarks] = useState<Benchmarks | null>(null);

  const updateMetrics = (newMetrics: SystemMetrics) => {
    setMetrics(newMetrics);
  };

  const updateBenchmarks = (newBenchmarks: Benchmarks) => {
    setBenchmarks(newBenchmarks);
  };

  const clearData = () => {
    setMetrics(null);
    setBenchmarks(null);
  };

  const value = {
    metrics,
    benchmarks,
    updateMetrics,
    updateBenchmarks,
    clearData,
  };

  return (
    <SystemMetricsContext.Provider value={value}>
      {children}
    </SystemMetricsContext.Provider>
  );
};
