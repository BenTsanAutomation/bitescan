#!/usr/bin/env python3
"""
Test script for Claude Vision API
"""

import os
import sys
import base64
import json
import anthropic

def test_vision_api():
    """Test if Claude Vision API is accessible"""
    
    # Check for API key
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("❌ ERROR: ANTHROPIC_API_KEY not found in environment")
        print("\nAvailable environment variables:")
        for key in sorted(os.environ.keys()):
            if "KEY" in key or "TOKEN" in key or "API" in key:
                value = os.environ[key]
                if len(value) > 20:
                    print(f"  {key} = {value[:20]}...")
                else:
                    print(f"  {key} = {value}")
        return False
    
    print(f"✓ Found ANTHROPIC_API_KEY: {api_key[:20]}...")
    
    # Create a simple test image (1x1 red pixel PNG)
    test_image_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
    
    try:
        client = anthropic.Anthropic(api_key=api_key)
        
        print("✓ Anthropic client created")
        print("🔄 Testing vision API with test image...")
        
        response = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=500,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": test_image_base64
                        }
                    },
                    {
                        "type": "text",
                        "text": "What color is this image? Reply in one word."
                    }
                ]
            }]
        )
        
        result = response.content[0].text.strip()
        print(f"✓ Vision API response: {result}")
        print("\n✅ SUCCESS! Claude Vision API is working!")
        return True
        
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_vision_api()
    sys.exit(0 if success else 1)
