#!/usr/bin/env python3
import secrets
import string

def generate_api_key():
    """Generate a secure API key"""
    return secrets.token_urlsafe(32)

if __name__ == "__main__":
    api_key = generate_api_key()
    print(f"Generated API Key: {api_key}")
    print(f"Length: {len(api_key)} characters")
    print("\nUse this key in your Render environment variables!")
