# Test script to verify benchmark JSON output structure
import json
import numpy as np

def make_json_safe(obj):
    """Ensure all values in object are JSON serializable"""
    if isinstance(obj, (list, tuple)):
        return [make_json_safe(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: make_json_safe(v) for k, v in obj.items()}
    elif isinstance(obj, (np.integer, np.floating)):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif obj is None or isinstance(obj, (int, float, str, bool)):
        return obj
    else:
        return str(obj)

# Test data structure that will be sent to frontend
test_benchmark_data = {
    'type': 'gif_animation',
    'gif_data': 'base64_data_here',
    'gif_bytestream': [1, 2, 3, 4, 5],
    'fps': 30,
    'resolution': [512, 384],
    'frame_count': 30,
    'duration': 1.0,
    'file_size_bytes': 1024,
    'benchmark_data': {
        'system_info': {
            'cpu': {
                'name': 'Intel Core i7',
                'cores': 8,
                'threads': 16,
                'utilization': 45.2,
                'frequency': 3200.0
            },
            'memory': {
                'total': 16777216000,
                'used': 8388608000,
                'available': 8388608000,
                'percent': 50.0
            },
            'gpu': {
                'name': 'NVIDIA RTX 4080',
                'memory_total': 16384,
                'memory_used': 8192,
                'utilization': 85
            },
            'platform': {
                'system': 'Windows',
                'version': '10.0.22631',
                'architecture': '64bit',
                'python_version': '3.11.0'
            }
        },
        'performance_metrics': {
            'total_time': 15.432,
            'frame_count': 30,
            'avg_frame_time': 0.514,
            'avg_field_generation': 0.123,
            'avg_marching_cubes': 0.234,
            'avg_rendering': 0.157,
            'gif_creation_time': 2.1,
            'frame_conversion_time': 1.8,
            'effective_fps': 1.94
        },
        'individual_frame_times': [0.5, 0.51, 0.52, 0.48, 0.49],
        'field_generation_times': [0.12, 0.13, 0.11, 0.125, 0.122],
        'marching_cubes_times': [0.23, 0.24, 0.22, 0.235, 0.238],
        'rendering_times': [0.15, 0.16, 0.14, 0.158, 0.159],
        'simulation_settings': {
            'resolution': [512, 384],
            'dimension': 32,
            'num_frames': 30,
            'fps': 30,
            'torus_altitude': -0.5,
            'torus_major_radius': 0.5,
            'torus_minor_radius': 0.1,
            'smooth_min_radius': 0.5
        }
    }
}

# Test JSON serialization
try:
    json_safe_data = make_json_safe(test_benchmark_data)
    json_string = json.dumps(json_safe_data)
    print("✅ JSON serialization test PASSED")
    print(f"JSON output size: {len(json_string)} characters")
    
    # Test parsing back
    parsed_data = json.loads(json_string)
    print("✅ JSON parsing test PASSED")
    
    # Verify key benchmark fields exist
    benchmark_data = parsed_data['benchmark_data']
    assert 'system_info' in benchmark_data
    assert 'performance_metrics' in benchmark_data
    assert 'individual_frame_times' in benchmark_data
    assert 'simulation_settings' in benchmark_data
    
    print("✅ All benchmark data fields present")
    print("\nBenchmark data structure ready for production!")
    
except Exception as e:
    print(f"❌ Test FAILED: {e}")
