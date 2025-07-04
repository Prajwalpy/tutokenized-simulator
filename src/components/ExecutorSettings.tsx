import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Settings, 
  Cloud, 
  Monitor, 
  Wifi, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Save,
  AlertTriangle,
  Info
} from 'lucide-react';
import { executorManager, ExecutorType, ExecutorConfig } from '@/utils/executorManager';

interface ExecutorSettingsProps {
  onConfigChange?: (config: ExecutorConfig) => void;
}

const ExecutorSettings: React.FC<ExecutorSettingsProps> = ({ onConfigChange }) => {
  const [status, setStatus] = useState<any>(null);
  const [queueStatus, setQueueStatus] = useState<any>(null);  const [config, setConfig] = useState<ExecutorConfig>({
    type: 'auto',
    hybridConfig: {
      taskQueueUrl: import.meta.env.VITE_TASK_QUEUE_URL || '',
      resultQueueUrl: import.meta.env.VITE_RESULT_QUEUE_URL || '',
      apiKey: import.meta.env.VITE_API_KEY || '',
      maxRetries: 3,
      retryDelay: 2000,
      pollInterval: 3000
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshStatus = async () => {
    setIsLoading(true);
    try {
      const [executorStatus, queueInfo] = await Promise.all([
        executorManager.getStatus(),
        executorManager.getQueueStatus()
      ]);
      
      setStatus(executorStatus);
      setQueueStatus(queueInfo);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to refresh status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleExecutorTypeChange = (type: ExecutorType) => {
    const newConfig = { ...config, type };
    setConfig(newConfig);
    executorManager.setExecutorType(type);
    
    if (onConfigChange) {
      onConfigChange(newConfig);
    }
  };

  const handleHybridConfigChange = (field: string, value: string | number) => {
    const newConfig = {
      ...config,
      hybridConfig: {
        ...config.hybridConfig!,
        [field]: value
      }
    };
    setConfig(newConfig);
    
    if (onConfigChange) {
      onConfigChange(newConfig);
    }
  };
  const getStatusIcon = (healthy: boolean) => {
    return healthy ? (
      <CheckCircle className="w-4 h-4 text-nvidia-green" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getExecutorIcon = (type: string) => {
    switch (type) {
      case 'hybrid':
        return <Cloud className="w-4 h-4" />;
      case 'local':
        return <Monitor className="w-4 h-4" />;
      default:
        return <Wifi className="w-4 h-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Executor Settings
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshStatus}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {lastUpdated && (
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="status" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="configuration">Configuration</TabsTrigger>
            <TabsTrigger value="queue">Queue Info</TabsTrigger>
          </TabsList>
          
          <TabsContent value="status" className="space-y-4">
            <div className="space-y-4">
              <Alert>
                <Info className="w-4 h-4" />
                <AlertDescription>
                  Current active executor: <strong>{status?.current_executor || 'Unknown'}</strong>
                  {status?.config_type === 'auto' && ' (Auto-detected)'}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Local Executor Status */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Monitor className="w-5 h-5" />
                      Local Executor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Available:</span>
                        {status ? getStatusIcon(status.executors.local.available) : <RefreshCw className="w-4 h-4 animate-spin" />}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Healthy:</span>
                        {status ? getStatusIcon(status.executors.local.healthy) : <RefreshCw className="w-4 h-4 animate-spin" />}
                      </div>
                      <Badge variant={status?.executors.local.healthy ? "default" : "destructive"}>
                        {status?.executors.local.healthy ? 'Ready' : 'Unavailable'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Hybrid Executor Status */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Cloud className="w-5 h-5" />
                      SOL VM (Hybrid)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Available:</span>
                        {status ? getStatusIcon(status.executors.hybrid.available) : <RefreshCw className="w-4 h-4 animate-spin" />}
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Healthy:</span>
                        {status ? getStatusIcon(status.executors.hybrid.healthy) : <RefreshCw className="w-4 h-4 animate-spin" />}
                      </div>
                      <Badge variant={status?.executors.hybrid.healthy ? "default" : "destructive"}>
                        {status?.executors.hybrid.healthy ? 'Ready' : 'Unavailable'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="configuration" className="space-y-4">
            <div className="space-y-6">
              {/* Executor Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="executor-type">Executor Type</Label>
                <Select value={config.type} onValueChange={handleExecutorTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select executor type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    <SelectItem value="local">Local Only</SelectItem>
                    <SelectItem value="hybrid">SOL VM Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  Auto-detect will try SOL VM first, then fallback to local
                </p>
              </div>

              {/* Hybrid Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">SOL VM Configuration</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="task-queue-url">Task Queue URL</Label>
                  <Input
                    id="task-queue-url"
                    value={config.hybridConfig?.taskQueueUrl || ''}
                    onChange={(e) => handleHybridConfigChange('taskQueueUrl', e.target.value)}
                    placeholder="https://your-api.com/tasks"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="result-queue-url">Result Queue URL</Label>
                  <Input
                    id="result-queue-url"
                    value={config.hybridConfig?.resultQueueUrl || ''}
                    onChange={(e) => handleHybridConfigChange('resultQueueUrl', e.target.value)}
                    placeholder="https://your-api.com/results"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={config.hybridConfig?.apiKey || ''}
                    onChange={(e) => handleHybridConfigChange('apiKey', e.target.value)}
                    placeholder="your-secret-api-key"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="max-retries">Max Retries</Label>
                    <Input
                      id="max-retries"
                      type="number"
                      value={config.hybridConfig?.maxRetries || 3}
                      onChange={(e) => handleHybridConfigChange('maxRetries', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="retry-delay">Retry Delay (ms)</Label>
                    <Input
                      id="retry-delay"
                      type="number"
                      value={config.hybridConfig?.retryDelay || 2000}
                      onChange={(e) => handleHybridConfigChange('retryDelay', parseInt(e.target.value))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="poll-interval">Poll Interval (ms)</Label>
                    <Input
                      id="poll-interval"
                      type="number"
                      value={config.hybridConfig?.pollInterval || 3000}
                      onChange={(e) => handleHybridConfigChange('pollInterval', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>

              <Button className="w-full">
                <Save className="w-4 h-4 mr-2" />
                Save Configuration
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="queue" className="space-y-4">
            {queueStatus ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Pending Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{queueStatus.pending_tasks}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Active VMs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{queueStatus.active_vms}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Avg Execution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{queueStatus.avg_execution_time}s</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Queue Health</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={queueStatus.queue_health === 'healthy' ? 'default' : 'destructive'}>
                      {queueStatus.queue_health}
                    </Badge>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Alert>
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Queue information is only available when using the SOL VM executor.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ExecutorSettings;
