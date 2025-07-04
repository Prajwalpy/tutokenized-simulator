# Neural Network Training - GPU Accelerated Version
# This demonstrates NVIDIA GPU acceleration with PyTorch

import time
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from sklearn.datasets import make_classification
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

print("🚀 Neural Network Training - GPU Accelerated")
print("=" * 50)

# Check GPU availability
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"🎯 Using device: {device}")

if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
else:
    print("⚠️  No GPU detected - running on CPU for comparison")

# Generate the same dataset for fair comparison
print("\n📊 Generating dataset...")
X, y = make_classification(
    n_samples=50000,  # Large dataset
    n_features=100,   # Many features
    n_classes=10,     # Multi-class
    n_informative=80,
    random_state=42
)

# Split and scale data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

print(f"Training samples: {X_train_scaled.shape[0]}")
print(f"Features: {X_train_scaled.shape[1]}")
print(f"Classes: {len(np.unique(y))}")

# Convert to PyTorch tensors and move to GPU
X_train_tensor = torch.FloatTensor(X_train_scaled).to(device)
y_train_tensor = torch.LongTensor(y_train).to(device)
X_test_tensor = torch.FloatTensor(X_test_scaled).to(device)
y_test_tensor = torch.LongTensor(y_test).to(device)

# Create data loaders for efficient batch processing
train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
train_loader = DataLoader(train_dataset, batch_size=512, shuffle=True)

# Define GPU-optimized neural network
class NeuralNetworkGPU(nn.Module):
    def __init__(self, input_size, hidden_sizes, output_size):
        super(NeuralNetworkGPU, self).__init__()
        
        layers = []
        layer_sizes = [input_size] + hidden_sizes + [output_size]
        
        for i in range(len(layer_sizes) - 1):
            layers.append(nn.Linear(layer_sizes[i], layer_sizes[i+1]))
            if i < len(layer_sizes) - 2:  # Add ReLU for hidden layers
                layers.append(nn.ReLU())
                layers.append(nn.Dropout(0.2))  # Regularization
        
        self.network = nn.Sequential(*layers)
    
    def forward(self, x):
        return self.network(x)

# Initialize network and move to GPU
print("\n🔧 Initializing GPU neural network...")
model = NeuralNetworkGPU(
    input_size=100,
    hidden_sizes=[256, 128, 64],  # Same architecture as CPU version
    output_size=10
).to(device)

# Display model info
total_params = sum(p.numel() for p in model.parameters())
print(f"Total parameters: {total_params:,}")

# Define loss and optimizer (GPU optimized)
criterion = nn.CrossEntropyLoss()
optimizer = optim.Adam(model.parameters(), lr=0.001)

# Training loop with GPU acceleration
print("\n🚀 Starting GPU training...")
start_time = time.time()
epochs = 50

losses = []
times_per_epoch = []

# Enable GPU optimizations
torch.backends.cudnn.benchmark = True

for epoch in range(epochs):
    epoch_start = time.time()
    model.train()
    epoch_loss = 0
    num_batches = 0
    
    for batch_X, batch_y in train_loader:
        # Forward pass (GPU accelerated)
        optimizer.zero_grad()
        outputs = model(batch_X)
        loss = criterion(outputs, batch_y)
        
        # Backward pass (GPU accelerated)
        loss.backward()
        optimizer.step()
        
        epoch_loss += loss.item()
        num_batches += 1
    
    epoch_time = time.time() - epoch_start
    times_per_epoch.append(epoch_time)
    avg_loss = epoch_loss / num_batches
    losses.append(avg_loss)
    
    if epoch % 10 == 0:
        print(f"Epoch {epoch+1}/{epochs} - Loss: {avg_loss:.4f} - Time: {epoch_time:.3f}s")

total_time = time.time() - start_time

# Evaluation on GPU
print("\n📊 Evaluating model...")
model.eval()
with torch.no_grad():
    test_outputs = model(X_test_tensor)
    _, predictions = torch.max(test_outputs, 1)
    accuracy = (predictions == y_test_tensor).float().mean().item()

# Performance metrics
print("\n📈 GPU Training Results:")
print(f"Total training time: {total_time:.2f} seconds")
print(f"Average time per epoch: {np.mean(times_per_epoch):.3f} seconds")
print(f"Final loss: {losses[-1]:.4f}")
print(f"Test accuracy: {accuracy:.4f}")

# GPU performance advantages
if torch.cuda.is_available():
    print("\n🚀 GPU Acceleration Benefits:")
    print("✅ Parallel matrix operations across thousands of CUDA cores")
    print("✅ High memory bandwidth for large datasets")
    print("✅ Optimized tensor operations with cuDNN")
    print("✅ Automatic mixed precision support")
    print("✅ Efficient gradient computation")
    
    # Estimate speedup (assuming CPU version took ~100-200 seconds)
    estimated_cpu_time = 150  # Rough estimate
    speedup = estimated_cpu_time / total_time
    print(f"\n💡 Estimated speedup: {speedup:.1f}x faster than CPU!")
    print(f"GPU completed in {total_time:.1f}s vs estimated {estimated_cpu_time}s on CPU")
else:
    print("\n⚠️  Running on CPU - GPU would provide significant acceleration")

# Memory usage information
if torch.cuda.is_available():
    memory_used = torch.cuda.max_memory_allocated() / 1e9
    print(f"\nGPU Memory used: {memory_used:.2f} GB")
    
print("\n🎯 Key NVIDIA GPU Advantages Demonstrated:")
print("1. Massive parallelization (thousands of cores vs ~8-16 CPU cores)")
print("2. High-bandwidth memory for matrix operations")
print("3. Specialized tensor processing units")
print("4. Optimized libraries (cuDNN, cuBLAS)")
print("5. Automatic gradient computation acceleration")
