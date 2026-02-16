#!/usr/bin/env python3
"""
Test OpenClaw vision proxy
"""

import asyncio
import sys
import tempfile
from pathlib import Path
from pydantic import BaseModel

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from openclaw_vision import analyze_image_with_openclaw


class UserPreferences(BaseModel):
    goals: list[str]
    priorities: dict[str, int]


async def test():
    # Create a test image (minimal PNG)
    test_image_data = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f"
        "15c4890000000a49444154789c636000010000050001bc9d9b0000000049"
        "454e44ae426082"
    )
    
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        f.write(test_image_data)
        test_image = f.name
    
    preferences = UserPreferences(
        goals=["lose weight", "build muscle"],
        priorities={"lose weight": 80, "build muscle": 70}
    )
    
    print("🔄 Testing OpenClaw vision proxy...")
    print(f"Test image: {test_image}")
    print(f"Preferences: {preferences}")
    print()
    
    try:
        result = await analyze_image_with_openclaw(test_image, preferences)
        print("✅ SUCCESS!")
        print(f"Result: {result}")
        return True
    except Exception as e:
        print(f"❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test())
    sys.exit(0 if success else 1)
