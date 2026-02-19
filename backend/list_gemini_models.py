import os
#!/usr/bin/env python3
"""List available Gemini models"""

from google import genai

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
client = genai.Client(api_key=GEMINI_API_KEY)

print("Available Gemini models that support generateContent:\n")
for model in client.models.list():
    supported_methods = getattr(model, "supported_generation_methods", []) or []
    if "generateContent" in supported_methods:
        print(f"  - {model.name}")
        display_name = getattr(model, "display_name", model.name)
        description = getattr(model, "description", "")
        print(f"    Display name: {display_name}")
        print(f"    Description: {description[:80]}..." if len(description) > 80 else f"    Description: {description}")
        print()
