# Neural Network Training - CPU Only Version
# This demonstrates training without GPU acceleration

import time
import numpy as np
import matplotlib.pyplot as plt
from sklearn.datasets import make_classification
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split

print("🧠 Neural Network Training - CPU Only")
print("=" * 50)

# Generate a larger dataset to show performance differences
print("📊 Generating dataset...")
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

# Simple neural network implementation using NumPy (CPU only)
class NeuralNetworkCPU:
    def __init__(self, input_size, hidden_sizes, output_size):
        self.layers = []
        layer_sizes = [input_size] + hidden_sizes + [output_size]
        
        # Initialize weights and biases
        for i in range(len(layer_sizes) - 1):
            W = np.random.randn(layer_sizes[i], layer_sizes[i+1]) * 0.1
            b = np.zeros((1, layer_sizes[i+1]))
            self.layers.append({'W': W, 'b': b})
    
    def relu(self, x):
        return np.maximum(0, x)
    
    def softmax(self, x):
        exp_x = np.exp(x - np.max(x, axis=1, keepdims=True))
        return exp_x / np.sum(exp_x, axis=1, keepdims=True)
    
    def forward(self, X):
        self.activations = [X]
        current = X
        
        for i, layer in enumerate(self.layers):
            z = np.dot(current, layer['W']) + layer['b']
            if i < len(self.layers) - 1:  # Hidden layers
                current = self.relu(z)
            else:  # Output layer
                current = self.softmax(z)
            self.activations.append(current)
        
        return current
    
    def train_batch(self, X, y, learning_rate=0.001):
        batch_size = X.shape[0]
        
        # Forward pass
        output = self.forward(X)
        
        # One-hot encode labels
        y_onehot = np.zeros((batch_size, 10))
        y_onehot[np.arange(batch_size), y] = 1
        
        # Backward pass (simplified)
        loss = -np.mean(np.sum(y_onehot * np.log(output + 1e-8), axis=1))
        
        # Simple gradient descent (not full backprop for demo purposes)
        grad = (output - y_onehot) / batch_size
        
        # Update last layer
        self.layers[-1]['W'] -= learning_rate * np.dot(self.activations[-2].T, grad)
        self.layers[-1]['b'] -= learning_rate * np.sum(grad, axis=0, keepdims=True)
        
        return loss

# Initialize network
print("\n🔧 Initializing neural network...")
network = NeuralNetworkCPU(
    input_size=100,
    hidden_sizes=[256, 128, 64],  # Multiple hidden layers
    output_size=10
)

# Training loop with timing
print("\n🚀 Starting CPU training...")
start_time = time.time()
epochs = 50
batch_size = 512

losses = []
times_per_epoch = []

for epoch in range(epochs):
    epoch_start = time.time()
    epoch_loss = 0
    
    # Shuffle data
    indices = np.random.permutation(len(X_train_scaled))
    
    for i in range(0, len(X_train_scaled), batch_size):
        batch_indices = indices[i:i+batch_size]
        X_batch = X_train_scaled[batch_indices]
        y_batch = y_train[batch_indices]
        
        loss = network.train_batch(X_batch, y_batch)
        epoch_loss += loss
    
    epoch_time = time.time() - epoch_start
    times_per_epoch.append(epoch_time)
    avg_loss = epoch_loss / (len(X_train_scaled) // batch_size)
    losses.append(avg_loss)
    
    if epoch % 10 == 0:
        print(f"Epoch {epoch+1}/{epochs} - Loss: {avg_loss:.4f} - Time: {epoch_time:.2f}s")

total_time = time.time() - start_time

# Final evaluation
print("\n📈 Training Results:")
print(f"Total training time: {total_time:.2f} seconds")
print(f"Average time per epoch: {np.mean(times_per_epoch):.2f} seconds")
print(f"Final loss: {losses[-1]:.4f}")

# Test accuracy
test_output = network.forward(X_test_scaled)
predictions = np.argmax(test_output, axis=1)
accuracy = np.mean(predictions == y_test)
print(f"Test accuracy: {accuracy:.4f}")

print("\n⚠️  CPU Performance Limitations:")
print("- Training is slow due to sequential processing")
print("- Matrix operations are not optimized")
print("- No parallel computation benefits")
print("- Memory bandwidth limitations")

print(f"\n💡 This took {total_time:.1f} seconds on CPU")
print("Now try the GPU version to see the acceleration!")
