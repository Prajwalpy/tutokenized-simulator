const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    
    if (req.method === 'OPTIONS') {
        res.end();
        return;
    }
    
    if (req.url === '/health') {
        res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
        return;
    }
    
    if (req.url === '/execute' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { code } = JSON.parse(body);
                const { exec } = require('child_process');
                
                const startTime = Date.now();
                exec(`python3 -c "${code.replace(/"/g, '\\"')}"`, { timeout: 30000 }, (error, stdout, stderr) => {
                    const executionTime = (Date.now() - startTime) / 1000;
                    
                    const result = {
                        id: Date.now().toString(),
                        success: !error,
                        output: stdout || '',
                        error: error ? `${error.message}\n${stderr}` : stderr || '',
                        execution_time: executionTime,
                        timestamp: new Date().toISOString(),
                        code: code
                    };
                    
                    res.end(JSON.stringify(result));
                });
            } catch (error) {
                res.end(JSON.stringify({
                    success: false,
                    error: error.message,
                    execution_time: 0
                }));
            }
        });
        return;
    }
    
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`🚀 Minimal Python Executor running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  GET  /health - Health check');
    console.log('  POST /execute - Execute Python code');
});
