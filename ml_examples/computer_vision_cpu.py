# Computer Vision - CPU Image Processing
# Demonstrates image processing without GPU acceleration

import time
import numpy as np
from PIL import Image
import matplotlib.pyplot as plt
from scipy import ndimage
from skimage import filters, transform, feature

print("🖼️  Computer Vision - CPU Image Processing")
print("=" * 50)

# Generate synthetic image dataset for processing
def create_synthetic_images(num_images=100, size=(256, 256)):
    """Create synthetic images for processing"""
    images = []
    print(f"📸 Generating {num_images} synthetic images ({size[0]}x{size[1]})...")
    
    for i in range(num_images):
        # Create complex synthetic image
        img = np.zeros(size)
        
        # Add random geometric shapes
        for _ in range(10):
            # Random circles
            center = (np.random.randint(0, size[0]), np.random.randint(0, size[1]))
            radius = np.random.randint(10, 50)
            y, x = np.ogrid[:size[0], :size[1]]
            mask = (x - center[0])**2 + (y - center[1])**2 <= radius**2
            img[mask] = np.random.rand()
        
        # Add noise
        img += np.random.normal(0, 0.1, size)
        img = np.clip(img, 0, 1)
        
        images.append(img)
        
        if (i + 1) % 20 == 0:
            print(f"  Generated {i + 1}/{num_images} images...")
    
    return np.array(images)

# CPU-based image processing operations
class ImageProcessorCPU:
    def __init__(self):
        self.processed_count = 0
    
    def apply_gaussian_blur(self, image, sigma=2.0):
        """Apply Gaussian blur using scipy (CPU)"""
        return ndimage.gaussian_filter(image, sigma=sigma)
    
    def apply_edge_detection(self, image):
        """Apply Sobel edge detection (CPU)"""
        return filters.sobel(image)
    
    def apply_histogram_equalization(self, image):
        """Apply histogram equalization (CPU)"""
        # Convert to integers for histogram
        img_int = (image * 255).astype(np.uint8)
        hist, bins = np.histogram(img_int.flatten(), 256, [0, 256])
        
        # Calculate CDF
        cdf = hist.cumsum()
        cdf_normalized = cdf * 255 / cdf[-1]
        
        # Apply equalization
        img_eq = np.interp(img_int.flatten(), bins[:-1], cdf_normalized)
        return img_eq.reshape(image.shape) / 255.0
    
    def apply_rotation(self, image, angle):
        """Apply rotation transformation (CPU)"""
        return transform.rotate(image, angle, mode='reflect')
    
    def extract_features(self, image):
        """Extract HOG features (CPU)"""
        return feature.hog(image, 
                          orientations=9,
                          pixels_per_cell=(8, 8),
                          cells_per_block=(2, 2),
                          feature_vector=True)
    
    def process_batch(self, images):
        """Process a batch of images with multiple operations"""
        results = []
        features_list = []
        
        for i, img in enumerate(images):
            # Apply multiple transformations
            blurred = self.apply_gaussian_blur(img, sigma=1.5)
            edges = self.apply_edge_detection(blurred)
            equalized = self.apply_histogram_equalization(edges)
            rotated = self.apply_rotation(equalized, angle=15)
            
            # Extract features
            features = self.extract_features(rotated)
            features_list.append(features)
            
            results.append({
                'blurred': blurred,
                'edges': edges,
                'equalized': equalized,
                'rotated': rotated,
                'features': features
            })
            
            self.processed_count += 1
            
            if (i + 1) % 10 == 0:
                print(f"  Processed {i + 1}/{len(images)} images...")
        
        return results, np.array(features_list)

# Generate test dataset
print("\n📊 Creating test dataset...")
images = create_synthetic_images(num_images=50, size=(256, 256))
print(f"Dataset shape: {images.shape}")
print(f"Total pixels to process: {np.prod(images.shape):,}")

# Initialize CPU processor
processor = ImageProcessorCPU()

# Perform CPU-based image processing
print("\n🚀 Starting CPU image processing...")
start_time = time.time()

# Process images in batches to simulate real workflow
batch_size = 10
all_results = []
all_features = []

for i in range(0, len(images), batch_size):
    batch_start = time.time()
    batch = images[i:i+batch_size]
    
    print(f"\nProcessing batch {i//batch_size + 1}/{(len(images) + batch_size - 1)//batch_size}")
    results, features = processor.process_batch(batch)
    
    all_results.extend(results)
    all_features.append(features)
    
    batch_time = time.time() - batch_start
    print(f"Batch processing time: {batch_time:.2f} seconds")

# Combine all features
all_features = np.vstack(all_features)
total_time = time.time() - start_time

# Performance analysis
print("\n📈 CPU Processing Results:")
print(f"Total processing time: {total_time:.2f} seconds")
print(f"Images processed: {len(images)}")
print(f"Average time per image: {total_time/len(images):.3f} seconds")
print(f"Throughput: {len(images)/total_time:.1f} images/second")

# Feature analysis
print(f"\n🔍 Feature Extraction Results:")
print(f"Features extracted per image: {all_features.shape[1]}")
print(f"Total features computed: {np.prod(all_features.shape):,}")

# Memory usage estimation
memory_mb = (images.nbytes + all_features.nbytes) / (1024**2)
print(f"Memory used: {memory_mb:.1f} MB")

print("\n⚠️  CPU Processing Limitations:")
print("- Sequential processing of pixels")
print("- Limited parallelization capabilities")
print("- Memory bandwidth bottlenecks")
print("- No specialized image processing units")
print("- CPU cores optimized for general computation, not parallel pixel ops")

print(f"\n💡 CPU processing took {total_time:.1f} seconds")
print("The GPU version will show dramatic acceleration for these operations!")

# Save sample results for comparison
print(f"\n💾 Processed {processor.processed_count} images total")
print("Ready to compare with GPU acceleration...")
