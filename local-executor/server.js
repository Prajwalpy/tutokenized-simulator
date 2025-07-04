const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

// Function to get the correct Python command for the current platform
function getPythonCommand() {
    const platform = os.platform();
    
    // On Windows, try python first, then python3
    if (platform === 'win32') {
        return 'python';
    }
    
    // On Unix-like systems, prefer python3
    return 'python3';
}

// Function to check if Python is available
function checkPythonAvailability() {
    return new Promise((resolve) => {
        const pythonCmd = getPythonCommand();
        exec(`${pythonCmd} --version`, (error, stdout, stderr) => {
            if (error) {
                // Try alternative command
                const altCmd = pythonCmd === 'python' ? 'python3' : 'python';
                exec(`${altCmd} --version`, (altError, altStdout, altStderr) => {
                    if (altError) {
                        resolve({ available: false, command: null, version: null });
                    } else {
                        resolve({ 
                            available: true, 
                            command: altCmd, 
                            version: altStdout.trim() || altStderr.trim() 
                        });
                    }
                });
            } else {
                resolve({ 
                    available: true, 
                    command: pythonCmd, 
                    version: stdout.trim() || stderr.trim() 
                });
            }
        });
    });
}

const app = express();
const PORT = 3001;

console.log('🚀 Local Python Executor starting...');

// Global Python command - will be set after checking availability
let PYTHON_COMMAND = 'python';
async function getSystemMetrics() {
    return new Promise((resolve) => {
        const metrics = {
            cpu: {
                usage: 0,
                threads: os.cpus().length,
                clockSpeed: 0,
                temperature: 0,
                model: os.cpus()[0].model
            },
            memory: {
                total: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
                used: 0,
                free: Math.round(os.freemem() / 1024 / 1024 / 1024), // GB
                usage_percent: 0
            },
            gpu: {
                usage: 0,
                memory_used: 0,
                memory_total: 0,
                temperature: 0,
                name: 'N/A',
                driver_version: 'N/A'
            },
            system: {
                platform: os.platform(),
                arch: os.arch(),
                uptime: Math.round(os.uptime()),
                loadavg: os.loadavg(),
                hostname: os.hostname()
            }
        };

        // Calculate CPU usage
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        
        cpus.forEach(cpu => {
            for (let type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        
        metrics.cpu.usage = Math.round(100 - (totalIdle / totalTick * 100));
        metrics.cpu.clockSpeed = cpus[0].speed / 1000; // Convert to GHz
        
        // Calculate memory usage
        metrics.memory.used = metrics.memory.total - metrics.memory.free;
        metrics.memory.usage_percent = Math.round((metrics.memory.used / metrics.memory.total) * 100);
        
        // Try to get comprehensive GPU info (NVIDIA)
        exec('nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu,driver_version --format=csv,noheader,nounits', 
            (error, stdout, stderr) => {
                if (!error && stdout) {
                    const gpuData = stdout.trim().split(', ');
                    if (gpuData.length >= 6) {
                        metrics.gpu.name = gpuData[0];
                        metrics.gpu.usage = parseInt(gpuData[1]) || 0;
                        metrics.gpu.memory_used = parseInt(gpuData[2]) || 0;
                        metrics.gpu.memory_total = parseInt(gpuData[3]) || 0;
                        metrics.gpu.temperature = parseInt(gpuData[4]) || 0;
                        metrics.gpu.driver_version = gpuData[5];
                        metrics.gpu.type = 'NVIDIA';
                    }
                } else {
                    // Try to detect AMD GPU
                    exec('rocm-smi --showuse', (amdError, amdStdout) => {
                        if (!amdError && amdStdout && amdStdout.includes('GPU')) {
                            metrics.gpu.name = 'AMD GPU (detected)';
                            metrics.gpu.type = 'AMD';
                        } else {
                            // Try to detect other GPU types
                            exec('lspci | grep -i vga', (lspciError, lspciStdout) => {
                                if (!lspciError && lspciStdout) {
                                    metrics.gpu.name = lspciStdout.trim().split(': ')[1] || 'Integrated Graphics';
                                    metrics.gpu.type = 'Integrated';
                                }
                            });
                        }
                    });
                }
                
                // Get CPU temperature (Linux - try multiple sources)
                const tempCommands = [
                    'cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null',
                    'sensors | grep "Core 0" | awk \'{print $3}\' | tr -d "+°C" 2>/dev/null',
                    'cat /sys/devices/platform/coretemp.0/hwmon/hwmon*/temp*_input 2>/dev/null | head -1'
                ];
                
                let tempChecked = 0;
                tempCommands.forEach(cmd => {
                    exec(cmd, (tempError, tempStdout) => {
                        tempChecked++;
                        if (!tempError && tempStdout && metrics.cpu.temperature === 0) {
                            const temp = parseInt(tempStdout);
                            if (temp > 1000) {
                                metrics.cpu.temperature = Math.round(temp / 1000); // Convert from millicelsius
                            } else if (temp > 0 && temp < 150) {
                                metrics.cpu.temperature = temp;
                            }
                        }
                        
                        if (tempChecked === tempCommands.length) {
                            resolve(metrics);
                        }
                    });
                });
            }
        );
    });
}

// Function to run Python benchmarks
async function runBenchmarks() {
    return new Promise((resolve) => {        const benchmarkCode = `
import time
import sys
import gc
import platform
import os

# Try to import optional packages
try:
    import numpy as np
    HAS_NUMPY = True
except ImportError:
    HAS_NUMPY = False
    print("NumPy not available, using basic benchmarks")

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    print("psutil not available, using basic system info")

def benchmark_matrix_multiplication():
    """Large matrix multiplication benchmark"""
    print("Running matrix multiplication benchmark...")
    start = time.time()
    
    if HAS_NUMPY:
        a = np.random.rand(1000, 1000).astype(np.float32)
        b = np.random.rand(1000, 1000).astype(np.float32)
        c = np.dot(a, b)
        del a, b, c
    else:
        # Fallback to basic operations
        result = sum(i * j for i in range(1000) for j in range(10))
    
    gc.collect()
    end = time.time()
    return end - start

def benchmark_memory_access():
    """Memory access pattern benchmark"""
    print("Running memory access benchmark...")
    start = time.time()
    # Large list operations
    data = [i ** 2 for i in range(1000000)]
    # Memory access patterns
    result = sum(data[::100])  # Strided access
    del data
    gc.collect()
    end = time.time()
    return end - start

def benchmark_cpu_intensive():
    """CPU-intensive computation benchmark"""
    print("Running CPU intensive benchmark...")
    start = time.time()
    result = sum(i ** 0.5 + i ** 1.5 for i in range(500000))
    end = time.time()
    return result, end - start

def benchmark_io_operations():
    """File I/O benchmark"""
    print("Running I/O benchmark...")
    start = time.time()
    data = "test data\\n" * 50000
    
    # Use temp directory that exists on all platforms
    import tempfile
    temp_file = os.path.join(tempfile.gettempdir(), "benchmark_test.txt")
    
    with open(temp_file, "w") as f:
        f.write(data)
    with open(temp_file, "r") as f:
        content = f.read()
    
    try:
        os.remove(temp_file)
    except:
        pass
        
    end = time.time()
    return end - start

# System info
def get_system_info():
    info = {
        'python_version': sys.version.split()[0],
        'platform': platform.system(),
        'architecture': platform.architecture()[0]
    }
    
    if HAS_PSUTIL:
        try:
            cpu_freq = psutil.cpu_freq()
            memory = psutil.virtual_memory()
            info.update({
                'cpu_count': psutil.cpu_count(),
                'cpu_freq': cpu_freq.current if cpu_freq else 0,
                'memory_total': memory.total // (1024**3),
                'memory_available': memory.available // (1024**3)
            })
        except:
            pass
    
    return info

# Run benchmarks
print("BENCHMARK_START")
print("System:", platform.system(), platform.release())
print("Python:", sys.version.split()[0])
print("NumPy:", "Available" if HAS_NUMPY else "Not Available")
print("psutil:", "Available" if HAS_PSUTIL else "Not Available")

# System info
sys_info = get_system_info()
for key, value in sys_info.items():
    print(f"SYS_{key.upper()}:{value}")

try:
    matrix_time = benchmark_matrix_multiplication()
    memory_time = benchmark_memory_access()
    cpu_result, cpu_time = benchmark_cpu_intensive()
    io_time = benchmark_io_operations()

    print(f"MATRIX_MULT_TIME:{matrix_time:.4f}")
    print(f"MEMORY_ACCESS_TIME:{memory_time:.4f}")
    print(f"CPU_INTENSIVE_TIME:{cpu_time:.4f}")
    print(f"IO_OPERATIONS_TIME:{io_time:.4f}")
    print(f"PYTHON_VERSION:{sys.version.split()[0]}")
    print("BENCHMARK_END")
except Exception as e:
    print(f"BENCHMARK_ERROR:{str(e)}")
    print("BENCHMARK_END")
`;

        const benchmarkFile = path.join(__dirname, 'temp', `benchmark_${Date.now()}.py`);
        fs.writeFileSync(benchmarkFile, benchmarkCode);
        
        exec(`${PYTHON_COMMAND} "${benchmarkFile}"`, { 
            timeout: 60000,
            env: { 
                ...process.env, 
                PYTHONIOENCODING: 'utf-8',
                PYTHONUNBUFFERED: '1'
            }
        }, (error, stdout, stderr) => {
            const benchmarks = {
                matrix_multiplication: { time: 0, score: 0, status: 'N/A' },
                memory_access: { time: 0, score: 0, status: 'N/A' },
                cpu_intensive: { time: 0, score: 0, status: 'N/A' },
                io_operations: { time: 0, score: 0, status: 'N/A' },
                python_version: 'Unknown',
                system_info: {}
            };
            
            if (!error && stdout) {
                const lines = stdout.split('\\n');
                lines.forEach(line => {
                    if (line.includes('MATRIX_MULT_TIME:')) {
                        const time = parseFloat(line.split(':')[1]);
                        benchmarks.matrix_multiplication.time = time;
                        benchmarks.matrix_multiplication.score = Math.round(15000 / (time * 10));
                        benchmarks.matrix_multiplication.status = time < 0.8 ? 'Excellent' : time < 1.5 ? 'Good' : 'Average';
                    }
                    if (line.includes('MEMORY_ACCESS_TIME:')) {
                        const time = parseFloat(line.split(':')[1]);
                        benchmarks.memory_access.time = time;
                        benchmarks.memory_access.score = Math.round(8000 / (time * 10));
                        benchmarks.memory_access.status = time < 0.3 ? 'Excellent' : time < 0.6 ? 'Good' : 'Average';
                    }
                    if (line.includes('CPU_INTENSIVE_TIME:')) {
                        const time = parseFloat(line.split(':')[1]);
                        benchmarks.cpu_intensive.time = time;
                        benchmarks.cpu_intensive.score = Math.round(12000 / (time * 2));
                        benchmarks.cpu_intensive.status = time < 1.2 ? 'Excellent' : time < 2.5 ? 'Good' : 'Average';
                    }
                    if (line.includes('IO_OPERATIONS_TIME:')) {
                        const time = parseFloat(line.split(':')[1]);
                        benchmarks.io_operations.time = time;
                        benchmarks.io_operations.score = Math.round(5000 / (time * 50));
                        benchmarks.io_operations.status = time < 0.1 ? 'Excellent' : time < 0.2 ? 'Good' : 'Average';
                    }
                    if (line.includes('PYTHON_VERSION:')) {
                        benchmarks.python_version = line.split(':')[1];
                    }
                    if (line.startsWith('SYS_')) {
                        const [key, value] = line.split(':');
                        benchmarks.system_info[key.replace('SYS_', '').toLowerCase()] = value;
                    }
                });
            }
            
            // Clean up
            try {
                fs.unlinkSync(benchmarkFile);
            } catch (e) {}
            
            resolve(benchmarks);
        });
    });
}

// Function to check for video output files and encode them
async function checkForVideoFiles() {
    const videoData = {};
    
    try {
        // Common video file locations
        const searchPaths = [
            __dirname,
            path.join(__dirname, 'warp_output'),
            path.join(__dirname, 'output'),
            path.join(__dirname, 'videos'),
            path.join(__dirname, 'temp')
        ];
        
        const videoExtensions = ['.mp4', '.gif', '.avi', '.mov', '.webm'];
        
        for (const searchPath of searchPaths) {
            if (!fs.existsSync(searchPath)) continue;
            
            const files = fs.readdirSync(searchPath);
            
            for (const file of files) {
                const filePath = path.join(searchPath, file);
                const ext = path.extname(file).toLowerCase();
                
                if (videoExtensions.includes(ext)) {
                    console.log(`📹 Found video file: ${file}`);
                    
                    try {
                        const fileData = fs.readFileSync(filePath);
                        const base64Data = fileData.toString('base64');
                        const fileSize = fileData.length;
                        
                        const key = ext.substring(1); // Remove the dot
                        videoData[key] = base64Data;
                        videoData[`${key}_size`] = fileSize;
                        
                        console.log(`✅ Encoded ${file} (${fileSize} bytes)`);
                        
                        // Clean up the file after encoding
                        fs.unlinkSync(filePath);
                        console.log(`🧹 Cleaned up ${file}`);
                        
                    } catch (encodeError) {
                        console.error(`Failed to encode ${file}:`, encodeError);
                    }
                }
            }
        }
        
        // Clean up empty output directories
        for (const searchPath of searchPaths) {
            if (fs.existsSync(searchPath) && searchPath !== __dirname) {
                try {
                    const files = fs.readdirSync(searchPath);
                    if (files.length === 0) {
                        fs.rmdirSync(searchPath);
                        console.log(`🧹 Cleaned up empty directory: ${searchPath}`);
                    }
                } catch (cleanupError) {
                    // Ignore cleanup errors
                }
            }
        }
        
    } catch (error) {
        console.error('Error checking for video files:', error);
    }
    
    return videoData;
}

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173', 
        'http://localhost:3000', 
        'http://localhost:8080',
        'http://localhost:8081',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:8081'
    ],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Create directories
const TEMP_DIR = path.join(__dirname, 'temp');
const RESULTS_DIR = path.join(__dirname, 'results');
const GIFS_DIR = path.join(__dirname, 'gifs');

console.log(`📁 Creating directories...`);
console.log(`   Temp: ${TEMP_DIR}`);
console.log(`   Results: ${RESULTS_DIR}`);
console.log(`   GIFs: ${GIFS_DIR}`);

try {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
        console.log('✅ Temp directory created');
    }
    if (!fs.existsSync(RESULTS_DIR)) {
        fs.mkdirSync(RESULTS_DIR, { recursive: true });
        console.log('✅ Results directory created');
    }
    if (!fs.existsSync(GIFS_DIR)) {
        fs.mkdirSync(GIFS_DIR, { recursive: true });
        console.log('✅ GIFs directory created');
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

// Function to check for video output files and encode them
async function checkForVideoFiles() {
    const videoData = {};
    
    try {
        // Common video file locations
        const searchPaths = [
            __dirname,
            path.join(__dirname, 'warp_output'),
            path.join(__dirname, 'output'),
            path.join(__dirname, 'videos'),
            path.join(__dirname, 'temp')
        ];
        
        const videoExtensions = ['.mp4', '.gif', '.avi', '.mov', '.webm'];
        
        for (const searchPath of searchPaths) {
            if (!fs.existsSync(searchPath)) continue;
            
            const files = fs.readdirSync(searchPath);
            
            for (const file of files) {
                const filePath = path.join(searchPath, file);
                const ext = path.extname(file).toLowerCase();
                
                if (videoExtensions.includes(ext)) {
                    console.log(`📹 Found video file: ${file}`);
                    
                    try {
                        const fileData = fs.readFileSync(filePath);
                        const base64Data = fileData.toString('base64');
                        const fileSize = fileData.length;
                        
                        const key = ext.substring(1); // Remove the dot
                        videoData[key] = base64Data;
                        videoData[`${key}_size`] = fileSize;
                        
                        console.log(`✅ Encoded ${file} (${fileSize} bytes)`);
                        
                        // Clean up the file after encoding
                        fs.unlinkSync(filePath);
                        console.log(`🧹 Cleaned up ${file}`);
                        
                    } catch (encodeError) {
                        console.error(`Failed to encode ${file}:`, encodeError);
                    }
                }
            }
        }
        
        // Clean up empty output directories
        for (const searchPath of searchPaths) {
            if (fs.existsSync(searchPath) && searchPath !== __dirname) {
                try {
                    const files = fs.readdirSync(searchPath);
                    if (files.length === 0) {
                        fs.rmdirSync(searchPath);
                        console.log(`🧹 Cleaned up empty directory: ${searchPath}`);
                    }
                } catch (cleanupError) {
                    // Ignore cleanup errors
                }
            }
        }
        
    } catch (error) {
        console.error('Error checking for video files:', error);
    }
    
    return videoData;
}

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
    
    try {        // Write code to temporary Python file
        fs.writeFileSync(tempFile, code, 'utf8');
        console.log('✅ Code written to temp file');
          const startTime = Date.now();
          // Always use benchmarking for comprehensive hardware monitoring
        const benchmarkingScript = path.join(__dirname, '..', 'ml_examples', 'benchmarking.py');
        const shouldUseBenchmarking = fs.existsSync(benchmarkingScript);
        
        console.log(`🔍 Benchmarking script path: ${benchmarkingScript}`);
        console.log(`📊 Benchmarking available: ${shouldUseBenchmarking}`);
        console.log(`📁 Current working directory: ${__dirname}`);
        console.log(`📂 Parent directory exists: ${fs.existsSync(path.join(__dirname, '..'))}`);
        
        // Execute Python code - use benchmarking wrapper for ALL executions to capture hardware metrics
        let command;
        if (shouldUseBenchmarking) {
            command = `${PYTHON_COMMAND} "${benchmarkingScript}" "${tempFile}"`;
            console.log(`⚡ Running Python code with hardware benchmarking: ${command}`);
            console.log(`✅ Benchmarking enabled - expect HARDWARE_BENCHMARK_OUTPUT in results`);
        } else {
            command = `${PYTHON_COMMAND} "${tempFile}"`;
            console.log(`⚠️ Running without benchmarking (benchmarking.py not found): ${command}`);
            console.log(`❌ Hardware benchmarking disabled - only basic benchmarks will be available`);
        }
        
        exec(command, { 
            timeout: 120000, // 2 minutes for video generation
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large video data
            cwd: __dirname,
            env: { 
                ...process.env, 
                PYTHONIOENCODING: 'utf-8',
                PYTHONUNBUFFERED: '1'
            }
        }, async (error, stdout, stderr) => {
            const endTime = Date.now();
            const executionTime = (endTime - startTime) / 1000;
            
            console.log(`⏱️ Execution completed in ${executionTime.toFixed(2)}s`);
              // Get system metrics
            console.log('📊 Collecting system metrics...');
            const systemMetrics = await getSystemMetrics();
            
            // Check for video output files and parse VIDEO_OUTPUT from stdout
            console.log('🎥 Checking for video output files...');
            const videoData = await checkForVideoFiles();
            
            // Parse VIDEO_OUTPUT from stdout if present
            if (stdout && stdout.includes('VIDEO_OUTPUT:')) {
                try {
                    const videoOutputMatch = stdout.match(/VIDEO_OUTPUT:(.+)/);
                    if (videoOutputMatch) {
                        const videoOutputData = JSON.parse(videoOutputMatch[1]);
                        console.log(`🎬 Found VIDEO_OUTPUT with ${videoOutputData.frames?.length || 0} frames`);
                        Object.assign(videoData, videoOutputData);
                    }
                } catch (parseError) {
                    console.error('Failed to parse VIDEO_OUTPUT:', parseError);
                }
            }
              // Parse GIF_OUTPUT from stdout if present
            if (stdout && stdout.includes('GIF_OUTPUT:')) {
                try {
                    const gifOutputMatch = stdout.match(/GIF_OUTPUT:(.+)/);
                    if (gifOutputMatch) {
                        const gifOutputData = JSON.parse(gifOutputMatch[1]);
                        console.log(`🎞️ Found GIF_OUTPUT with ${gifOutputData.frame_count || 0} frames, size: ${gifOutputData.file_size_bytes || 0} bytes`);
                        
                        // If there's a gif_file path, move it to the gifs directory
                        if (gifOutputData.gif_file) {
                            const originalGifPath = path.resolve(gifOutputData.gif_file);
                            const gifFilename = path.basename(originalGifPath);
                            const newGifPath = path.join(GIFS_DIR, gifFilename);
                            
                            try {
                                // Move the GIF file to the gifs directory
                                if (fs.existsSync(originalGifPath)) {
                                    fs.copyFileSync(originalGifPath, newGifPath);
                                    fs.unlinkSync(originalGifPath); // Remove original
                                    console.log(`📁 Moved GIF file: ${gifFilename}`);
                                    
                                    // Update the gif_file path to be a URL
                                    const serverPort = PORT || 8000;
                                    gifOutputData.gif_url = `http://localhost:${serverPort}/gifs/${gifFilename}`;
                                    gifOutputData.gif_filename = gifFilename;
                                    // Remove the local file path from the output
                                    delete gifOutputData.gif_file;
                                } else {
                                    console.warn(`⚠️ GIF file not found: ${originalGifPath}`);
                                }
                            } catch (fileError) {
                                console.error('Failed to move GIF file:', fileError);
                            }
                        }
                        
                        Object.assign(videoData, gifOutputData);
                    }
                } catch (parseError) {
                    console.error('Failed to parse GIF_OUTPUT:', parseError);
                }
            }
              // Parse HARDWARE_BENCHMARK_OUTPUT from stdout if present (from benchmarking.py)
            let hardwareBenchmarks = null;
            console.log(`🔍 Checking for HARDWARE_BENCHMARK_OUTPUT in stdout...`);
            console.log(`📤 stdout length: ${stdout ? stdout.length : 0} characters`);
            
            if (stdout && stdout.includes('HARDWARE_BENCHMARK_OUTPUT:')) {
                console.log(`✅ Found HARDWARE_BENCHMARK_OUTPUT marker in stdout`);
                try {
                    const benchmarkOutputMatch = stdout.match(/HARDWARE_BENCHMARK_OUTPUT:(.+)/);
                    if (benchmarkOutputMatch) {
                        const benchmarkData = JSON.parse(benchmarkOutputMatch[1]);
                        console.log(`🏁 Successfully parsed HARDWARE_BENCHMARK_OUTPUT with execution time: ${benchmarkData.execution_time || 0}s`);
                        console.log(`📊 Benchmark data keys: ${Object.keys(benchmarkData)}`);
                        hardwareBenchmarks = benchmarkData;
                        
                        // If the benchmarking wrapper captured the script output, merge it
                        if (benchmarkData.script_output) {
                            console.log('📋 Merging script output from benchmarking wrapper');
                            
                            // Check if script output contains VIDEO_OUTPUT or GIF_OUTPUT
                            const scriptOutput = benchmarkData.script_output;
                            
                            if (scriptOutput.includes('VIDEO_OUTPUT:')) {
                                try {
                                    const videoMatch = scriptOutput.match(/VIDEO_OUTPUT:(.+)/);
                                    if (videoMatch) {
                                        const videoOutputData = JSON.parse(videoMatch[1]);
                                        console.log(`🎬 Found VIDEO_OUTPUT in script output with ${videoOutputData.frames?.length || 0} frames`);
                                        Object.assign(videoData, videoOutputData);
                                    }
                                } catch (parseError) {
                                    console.error('Failed to parse VIDEO_OUTPUT from script output:', parseError);
                                }
                            }
                            
                            if (scriptOutput.includes('GIF_OUTPUT:')) {
                                try {
                                    const gifMatch = scriptOutput.match(/GIF_OUTPUT:(.+)/);
                                    if (gifMatch) {
                                        const gifOutputData = JSON.parse(gifMatch[1]);
                                        console.log(`🎞️ Found GIF_OUTPUT in script output with ${gifOutputData.frame_count || 0} frames`);
                                        
                                        // Handle GIF file movement same as above
                                        if (gifOutputData.gif_file) {
                                            const originalGifPath = path.resolve(gifOutputData.gif_file);
                                            const gifFilename = path.basename(originalGifPath);
                                            const newGifPath = path.join(GIFS_DIR, gifFilename);
                                            
                                            try {
                                                if (fs.existsSync(originalGifPath)) {
                                                    fs.copyFileSync(originalGifPath, newGifPath);
                                                    fs.unlinkSync(originalGifPath);
                                                    console.log(`📁 Moved GIF file from script output: ${gifFilename}`);
                                                    
                                                    const serverPort = PORT || 8000;
                                                    gifOutputData.gif_url = `http://localhost:${serverPort}/gifs/${gifFilename}`;
                                                    gifOutputData.gif_filename = gifFilename;
                                                    delete gifOutputData.gif_file;
                                                }
                                            } catch (fileError) {
                                                console.error('Failed to move GIF file from script output:', fileError);
                                            }
                                        }
                                        
                                        Object.assign(videoData, gifOutputData);
                                    }
                                } catch (parseError) {
                                    console.error('Failed to parse GIF_OUTPUT from script output:', parseError);
                                }
                            }
                        }
                    }                } catch (parseError) {
                    console.error('Failed to parse HARDWARE_BENCHMARK_OUTPUT:', parseError);
                }
            } else {
                console.log(`❌ No HARDWARE_BENCHMARK_OUTPUT found in stdout`);
                if (shouldUseBenchmarking) {
                    console.log(`⚠️ Expected hardware benchmarks but none found - benchmarking may have failed`);
                }
            }
            
            // Run benchmarks if execution was successful
            let benchmarks = null;
            if (!error) {
                console.log('🏃 Running performance benchmarks...');
                benchmarks = await runBenchmarks();
                console.log('📊 Generated benchmarks:', benchmarks ? 'Success' : 'Failed');
            } else {
                console.log('⚠️ Skipping benchmarks due to execution error');
            }              const result = {
                id: executionId,
                success: !error,
                output: stdout || '',
                error: error ? `${error.message}${stderr ? '\n' + stderr : ''}` : (stderr || ''),
                execution_time: executionTime,
                timestamp: new Date().toISOString(),
                code: code,
                system_metrics: systemMetrics,
                benchmarks: benchmarks,
                hardware_benchmarks: hardwareBenchmarks,
                video_data: videoData,
                binary_outputs: {},
                file_outputs: {}
            };
            
            // Debug: Log what we're sending to frontend
            console.log(`📦 Result summary:`);
            console.log(`   - success: ${result.success}`);
            console.log(`   - has video_data: ${!!result.video_data && Object.keys(result.video_data).length > 0}`);
            console.log(`   - has hardware_benchmarks: ${!!result.hardware_benchmarks}`);
            console.log(`   - has benchmarks: ${!!result.benchmarks}`);
            
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

// Get execution result by ID
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
    } catch (err) {
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

// Clean up old files
app.post('/cleanup', (req, res) => {
    try {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        let cleaned = 0;
        
        [TEMP_DIR, RESULTS_DIR, GIFS_DIR].forEach(dir => {
            const files = fs.readdirSync(dir);
            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stats = fs.statSync(filePath);
                if (stats.mtime.getTime() < oneHourAgo) {
                    fs.unlinkSync(filePath);
                    cleaned++;
                }
            });
        });
        
        res.json({ cleaned, message: `Cleaned ${cleaned} old files` });
    } catch (err) {
        res.status(500).json({ error: 'Cleanup failed' });
    }
});

// Serve GIF files
app.get('/gifs/:filename', (req, res) => {
    const { filename } = req.params;
    const gifPath = path.join(GIFS_DIR, filename);
    
    try {
        if (fs.existsSync(gifPath)) {
            res.setHeader('Content-Type', 'image/gif');
            res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
            res.sendFile(gifPath);
        } else {
            res.status(404).json({ error: 'GIF file not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to serve GIF file' });
    }
});

// Start server with Python detection
async function startServer() {
    console.log('🔍 Checking Python availability...');
    const pythonCheck = await checkPythonAvailability();
    
    if (!pythonCheck.available) {
        console.error('❌ Python is not available on this system');
        console.error('   Please install Python 3.x and make sure it\'s in your PATH');
        process.exit(1);
    }
    
    PYTHON_COMMAND = pythonCheck.command;
    console.log(`✅ Python found: ${pythonCheck.version}`);
    console.log(`🐍 Using command: ${PYTHON_COMMAND}`);
    
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
        console.log('');
        console.log('✅ Ready to execute Python code locally!');
    });
}

// Start the server
startServer();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down Local Python Executor...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down Local Python Executor...');
    process.exit(0);
});
