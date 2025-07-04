
import React, { useState, useEffect } from 'react';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle, AlertCircle } from 'lucide-react';

const StatusBar = () => {
  const [modelProgress, setModelProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'training' | 'complete' | 'error'>('idle');

  useEffect(() => {
    // Simulate model training progress
    if (status === 'training') {
      const interval = setInterval(() => {
        setModelProgress(prev => {
          if (prev >= 100) {
            setStatus('complete');
            return 100;
          }
          return prev + Math.random() * 5;
        });
      }, 500);

      return () => clearInterval(interval);
    }
  }, [status]);

  const startTraining = () => {
    setStatus('training');
    setModelProgress(0);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'training':
        return <Activity className="w-4 h-4 animate-pulse" />;      case 'complete':
        return <CheckCircle className="w-4 h-4 text-nvidia-green" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'training':
        return 'Model training in progress...';
      case 'complete':
        return 'Training completed successfully';
      case 'error':
        return 'Training error occurred';
      default:
        return 'Ready for model training';
    }
  };

  const getStatusColor = () => {
    switch (status) {      case 'training':
        return 'bg-asu-gold/20 text-asu-gold-dark';
      case 'complete':
        return 'bg-nvidia-green/20 text-nvidia-green-dark';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 px-8 py-3">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium text-gray-700">
              {getStatusText()}
            </span>
            <Badge className={getStatusColor()}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          </div>
          
          {(status === 'training' || status === 'complete') && (
            <div className="flex items-center gap-3">
              <Progress value={modelProgress} className="w-32" />
              <span className="text-sm text-gray-600 font-mono">
                {Math.round(modelProgress)}%
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-nvidia-green rounded-full animate-pulse"></div>
            <span>GPU Ready</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-asu-gold rounded-full"></div>
            <span>API Connected</span>
          </div>
          {status === 'idle' && (
            <button
              onClick={startTraining}
              className="text-asu-maroon hover:text-asu-maroon-dark font-medium"
            >
              Start Training
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
