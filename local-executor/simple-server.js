const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Create directories
const TEMP_DIR = path.join(__dirname, 'temp');
const RESULTS_DIR = path.join(__dirname, 'results');

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}
if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

console.log('🚀 Local Python Executor starting...');
console.log('📁 Temp directory:', TEMP_DIR);
console.log('📄 Results directory:', RESULTS_DIR);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Execute Python code
app.post('/execute', (req, res) => {
    const { code } = req.body;
    
    if (!code || !code.trim()) {
        return res.status(400).json({
            success: false,
            error: 'No code provided',
            execution_time: 0
        });
    }

    const executionId = uuidv4();
    const pythonFile = path.join(TEMP_DIR, `execution_${executionId}.py`);
    const resultFile = path.join(RESULTS_DIR, `result_${executionId}.json`);
    
    console.log(`📝 Executing code with ID: ${executionId}`);
    
    try {
        // Write Python code to file
        fs.writeFileSync(pythonFile, code);
        
        const startTime = Date.now();
        
        // Execute Python code
        exec(`python3 "${pythonFile}"`, { 
            timeout: 30000,
            maxBuffer: 1024 * 1024 // 1MB buffer
        }, (error, stdout, stderr) => {
            const executionTime = (Date.now() - startTime) / 1000;
            
            const result = {
                id: executionId,
                success: !error,
                output: stdout || '',
                error: error ? `${error.message}\n${stderr}` : stderr || '',
                execution_time: executionTime,
                timestamp: new Date().toISOString(),
                code: code
            };
            
            // Save result to file
            try {
                fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
            } catch (saveError) {
                console.error('Failed to save result:', saveError);
            }
            
            // Clean up temp file
            try {
                if (fs.existsSync(pythonFile)) {
                    fs.unlinkSync(pythonFile);
                }
            } catch (cleanupError) {
                console.warn('Failed to cleanup temp file:', cleanupError);
            }
            
            console.log(`✅ Execution ${executionId} completed in ${executionTime.toFixed(2)}s`);
            res.json(result);
        });
        
    } catch (error) {
        console.error('Execution error:', error);
        res.status(500).json({
            id: executionId,
            success: false,
            output: '',
            error: `Failed to execute code: ${error.message}`,
            execution_time: 0,
            timestamp: new Date().toISOString(),
            code: code
        });
    }
});

// Get result by ID
app.get('/result/:id', (req, res) => {
    const { id } = req.params;
    const resultFile = path.join(RESULTS_DIR, `result_${id}.json`);
    
    try {
        if (fs.existsSync(resultFile)) {
            const result = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
            res.json(result);
        } else {
            res.status(404).json({ error: 'Result not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to read result' });
    }
});

// Get all recent results
app.get('/results', (req, res) => {
    try {
        const files = fs.readdirSync(RESULTS_DIR)
            .filter(file => file.startsWith('result_') && file.endsWith('.json'))
            .map(file => {
                try {
                    const content = fs.readFileSync(path.join(RESULTS_DIR, file), 'utf8');
                    return JSON.parse(content);
                } catch (error) {
                    return null;
                }
            })
            .filter(result => result !== null)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 50); // Return last 50 results
        
        res.json(files);
    } catch (error) {
        res.status(500).json({ error: 'Failed to read results' });
    }
});

// Cleanup old files
app.post('/cleanup', (req, res) => {
    try {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        let cleanedCount = 0;
        
        [TEMP_DIR, RESULTS_DIR].forEach(dir => {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);
                if (stats.mtimeMs < oneHourAgo) {
                    fs.unlinkSync(filePath);
                    cleanedCount++;
                }
            });
        });
        
        res.json({ cleaned: cleanedCount });
    } catch (error) {
        res.status(500).json({ error: 'Cleanup failed' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Local Python Executor running on http://localhost:${PORT}`);
    console.log(`📁 Temp directory: ${TEMP_DIR}`);
    console.log(`📄 Results directory: ${RESULTS_DIR}`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  POST /execute - Execute Python code');
    console.log('  GET  /result/:id - Get execution result');
    console.log('  GET  /results - Get all recent results');
    console.log('  GET  /health - Health check');
    console.log('  POST /cleanup - Clean old files');
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Local Python Executor...');
    process.exit(0);
});
