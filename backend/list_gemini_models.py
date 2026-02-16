#!/usr/bin/env python3
"""List available Gemini models"""

import google.generativeai as genai

GEMINI_API_KEY = "REDACTED"

genai.configure(api_key=GEMINI_API_KEY)

print("Available Gemini models that support generateContent:\n")
for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"  - {model.name}")
        print(f"    Display name: {model.display_name}")
        print(f"    Description: {model.description[:80]}..." if len(model.description) > 80 else f"    Description: {model.description}")
        print()
