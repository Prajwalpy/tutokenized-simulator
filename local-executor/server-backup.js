const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

console.log('🚀 Local Python Executor starting...');

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Create directories
const TEMP_DIR = path.join(__dirname, 'temp');
const RESULTS_DIR = path.join(__dirname, 'results');

console.log(`📁 Creating directories...`);
console.log(`   Temp: ${TEMP_DIR}`);
console.log(`   Results: ${RESULTS_DIR}`);

try {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
        console.log('✅ Temp directory created');
    }
    if (!fs.existsSync(RESULTS_DIR)) {
        fs.mkdirSync(RESULTS_DIR, { recursive: true });
        console.log('✅ Results directory created');
    }
} catch (error) {
    console.error('❌ Failed to create directories:', error);
    process.exit(1);
}

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('🩺 Health check requested');
    res.json({ 
        status: 'healthy', 
        service: 'Local Python Executor',
        timestamp: new Date().toISOString(),
        temp_dir: TEMP_DIR,
        results_dir: RESULTS_DIR,
        uptime: process.uptime()
    });
});

// Execute Python code endpoint
app.post('/execute', (req, res) => {
    const { code } = req.body;
    
    console.log('📝 Code execution requested');
    
    if (!code || typeof code !== 'string' || !code.trim()) {
        console.log('❌ No valid code provided');
        return res.status(400).json({
            success: false,
            error: 'No code provided or invalid code format',
            execution_time: 0,
            timestamp: new Date().toISOString()
        });
    }

    const executionId = uuidv4();
    const tempFile = path.join(TEMP_DIR, `execution_${executionId}.py`);
    const resultFile = path.join(RESULTS_DIR, `result_${executionId}.json`);
    
    console.log(`🚀 Executing code with ID: ${executionId}`);
    console.log(`📄 Temp file: ${tempFile}`);
    
    try {
        // Write code to temporary Python file
        fs.writeFileSync(tempFile, code, 'utf8');
        console.log('✅ Code written to temp file');
        
        const startTime = Date.now();
        
        // Execute Python code
        const command = `python3 "${tempFile}"`;
        console.log(`⚡ Running command: ${command}`);
        
        exec(command, { 
            timeout: 30000, // 30 seconds
            maxBuffer: 1024 * 1024, // 1MB buffer
            cwd: __dirname
        }, (error, stdout, stderr) => {
            const endTime = Date.now();
            const executionTime = (endTime - startTime) / 1000;
            
            console.log(`⏱️ Execution completed in ${executionTime.toFixed(2)}s`);
            
            const result = {
                id: executionId,
                success: !error,
                output: stdout || '',
                error: error ? `${error.message}${stderr ? '\n' + stderr : ''}` : (stderr || ''),
                execution_time: executionTime,
                timestamp: new Date().toISOString(),
                code: code
            };
            
            // Log the result
            if (result.success) {
                console.log('✅ Execution successful');
                console.log(`📤 Output: ${result.output.substring(0, 100)}${result.output.length > 100 ? '...' : ''}`);
            } else {
                console.log('❌ Execution failed');
                console.log(`💥 Error: ${result.error}`);
            }
            
            // Save result to file
            try {
                fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
                console.log('💾 Result saved to file');
            } catch (saveError) {
                console.error('Failed to save result:', saveError);
            }
            
            // Clean up temp file
            try {
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                    console.log('🧹 Temp file cleaned up');
                }
            } catch (cleanupError) {
                console.warn('Failed to cleanup temp file:', cleanupError);
            }
            
            res.json(result);
        });
        
    } catch (err) {
        console.error('💥 Execution error:', err);
        
        // Clean up on error
        try {
            if (fs.existsSync(tempFile)) {
                fs.unlinkSync(tempFile);
            }
        } catch (cleanupError) {
            console.error('Failed to cleanup on error:', cleanupError);
        }
        
        const errorResult = {
            id: executionId,
            success: false,
            output: '',
            error: `Execution failed: ${err.message}`,
            execution_time: 0,
            timestamp: new Date().toISOString(),
            code: code
        };
        
        res.status(500).json(errorResult);
    }
});
                system_info: {
                    platform: process.platform,
                    node_version: process.version,
                    python_command: 'python3'
                }
            };
            
            // Save result to JSON file
            const resultFile = path.join(RESULTS_DIR, `result_${executionId}.json`);
            await fs.writeFile(resultFile, JSON.stringify(result, null, 2), 'utf8');
            
            // Clean up temp Python file
            try {
                await fs.remove(pythonFile);
            } catch (cleanupError) {
                console.warn('Failed to cleanup temp file:', cleanupError);
            }
            
            res.json(result);
        });
        
    } catch (error) {
        const executionTime = (Date.now() - startTime) / 1000;
        
        const result = {
            id: executionId,
            success: false,
            output: '',
            error: error.message,
            execution_time: executionTime,
            timestamp: new Date().toISOString(),
            code: code,
            system_info: {
                platform: process.platform,
                node_version: process.version
            }
        };
        
        res.status(500).json(result);
    }
});

// Get execution result by ID
app.get('/result/:id', async (req, res) => {
    const { id } = req.params;
    const resultFile = path.join(RESULTS_DIR, `result_${id}.json`);
    
    try {
        const result = await fs.readJson(resultFile);
        res.json(result);
    } catch (error) {
        res.status(404).json({
            success: false,
            error: 'Result not found'
        });
    }
});

// Get all recent results
app.get('/results', async (req, res) => {
    try {
        const files = await fs.readdir(RESULTS_DIR);
        const results = [];
        
        for (const file of files) {
            if (file.startsWith('result_') && file.endsWith('.json')) {
                try {
                    const resultPath = path.join(RESULTS_DIR, file);
                    const result = await fs.readJson(resultPath);
                    results.push(result);
                } catch (error) {
                    console.warn('Failed to read result file:', file, error);
                }
            }
        }
        
        // Sort by timestamp (newest first)
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({
            success: true,
            results: results.slice(0, 50) // Return last 50 results
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        directories: {
            temp: TEMP_DIR,
            results: RESULTS_DIR
        }
    });
});

// Clean up endpoint
app.post('/cleanup', async (req, res) => {
    try {
        cleanOldFiles();
        res.json({
            success: true,
            message: 'Cleanup completed'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
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
    cleanOldFiles();
    process.exit(0);
});
