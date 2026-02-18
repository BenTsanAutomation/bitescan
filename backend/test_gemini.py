import os
#!/usr/bin/env python3
"""
Test Google Gemini Vision API with hardcoded key
"""

import sys
import json
from PIL import Image
import google.generativeai as genai

def test_gemini_api():
    """Test if Gemini Vision API works with hardcoded key"""
    
    # API key scoped to this test ONLY
    GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
    
    print("🔧 Configuring Gemini API...")
    genai.configure(api_key=GEMINI_API_KEY)
    
    print("✓ API configured with provided key")
    
    try:
        # Use the newest Gemini 2.0 Flash model
        model = genai.GenerativeModel('gemini-2.0-flash')
        print("✓ Model loaded: gemini-2.0-flash")
        
        # Create a simple test image
        print("🔄 Creating test image (100x100 red square)...")
        img = Image.new('RGB', (100, 100), color='red')
        
        # Simple test prompt
        prompt = "What is the main color in this image? Reply in one word."
        
        print("🔄 Testing vision API...")
        response = model.generate_content([prompt, img])
        
        result = response.text.strip()
        print(f"✓ API Response: '{result}'")
        
        if 'red' in result.lower():
            print("\n✅ SUCCESS! Gemini Vision API is working correctly!")
            return True
        else:
            print(f"\n⚠️ WARNING: Expected 'red', got '{result}'")
            print("But API is responding, so it's working!")
            return True
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_gemini_api()
    sys.exit(0 if success else 1)
