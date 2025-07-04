// Backend configuration
export const BACKEND_CONFIG = {
  // Sol VM backend URL - Updated with actual VM IP
  DEFAULT_URL: 'http://10.139.126.4:8000',
  
  // Alternative IP (if the first one doesn't work from your network)
  // DEFAULT_URL: 'http://192.168.150.4:8000',
  
  // For local testing, use this instead:
  // DEFAULT_URL: 'http://localhost:8000',
  
  // API endpoints
  ENDPOINTS: {
    HEALTH: '/api/health',
    EXECUTE_PYTHON: '/api/execute/python',
    UPLOAD_PYTHON: '/api/upload/python',
    SYSTEM_INFO: '/api/system/info',
    TEST: '/api/test'
  },
  
  // Default timeout for code execution (in seconds)
  DEFAULT_TIMEOUT: 30,
  
  // Connection timeout (in milliseconds)
  CONNECTION_TIMEOUT: 5000
};
