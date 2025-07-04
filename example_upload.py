# Example Python File for Upload Demo
# This demonstrates basic Python functionality

import time
import random

print("🐍 Python Upload Demo")
print("=" * 30)

# Basic arithmetic
a = 10
b = 25
result = a + b
print(f"Addition: {a} + {b} = {result}")

# List operations
numbers = [1, 2, 3, 4, 5]
print(f"Original list: {numbers}")
numbers.append(6)
print(f"After append: {numbers}")

# Loop demonstration
print("\nCounting down:")
for i in range(5, 0, -1):
    print(f"  {i}...")
    time.sleep(0.1)  # Small delay for effect

print("🚀 Blast off!")

# Random number generation
print(f"\nRandom number: {random.randint(1, 100)}")

# String operations
message = "Hello from uploaded file!"
print(f"\nMessage: {message}")
print(f"Reversed: {message[::-1]}")
print(f"Uppercase: {message.upper()}")

# Dictionary example
person = {
    "name": "Python Developer",
    "language": "Python",
    "experience": "Expert"
}

print(f"\nDeveloper info:")
for key, value in person.items():
    print(f"  {key}: {value}")

print("\n✅ Upload demo completed successfully!")
