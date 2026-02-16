#!/usr/bin/env python3
"""
Test BiteScan backend with real food images
Downloads sample images and tests the vision API
"""

import asyncio
import base64
import json
import os
import sys
import tempfile
import urllib.request
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from server import UserPreferences, analyze_with_gemini


# Test food images (public domain / Creative Commons)
TEST_IMAGES = {
    "burger": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800",  # Burger
    "salad": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800",  # Salad
    "pizza": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800",  # Pizza
}


def download_image(url: str, filename: str) -> str:
    """Download test image"""
    print(f"📥 Downloading {filename}...")
    
    # Create temp directory
    temp_dir = Path(tempfile.gettempdir()) / "bitescan_test"
    temp_dir.mkdir(exist_ok=True)
    
    image_path = temp_dir / filename
    
    if image_path.exists():
        print(f"   ✓ Using cached image")
        return str(image_path)
    
    try:
        urllib.request.urlretrieve(url, str(image_path))
        print(f"   ✓ Downloaded to {image_path}")
        return str(image_path)
    except Exception as e:
        print(f"   ✗ Download failed: {e}")
        raise


async def test_image(name: str, url: str):
    """Test analyzing a food image"""
    
    print(f"\n{'='*60}")
    print(f"🍔 Testing: {name.upper()}")
    print(f"{'='*60}")
    
    # Download image
    image_path = download_image(url, f"{name}.jpg")
    
    # Test preferences (weight loss + muscle gain)
    preferences = UserPreferences(
        goals=["lose weight", "build muscle"],
        priorities={
            "lose weight": 80,
            "build muscle": 70
        }
    )
    
    print(f"\n🔄 Analyzing with AI...")
    print(f"   Goals: {', '.join(preferences.goals)}")
    
    try:
        result = await analyze_with_gemini(image_path, preferences)
        
        print(f"\n✅ SUCCESS! Analysis complete:")
        print(f"\n📊 Overall Grade: {result.get('overallGrade', 'N/A')}")
        print(f"   User Goals Match: {result.get('userGoalsMatch', 0)}%")
        print(f"\n💭 Recommendation:")
        print(f"   {result.get('recommendation', 'N/A')}")
        
        print(f"\n🍽️  Detected Foods ({len(result.get('foods', []))}):")
        for food in result.get('foods', []):
            nutrition = food.get('nutrition', {})
            print(f"\n   • {food.get('name', 'Unknown')}")
            print(f"     Portion: {food.get('portion', 'N/A')}")
            print(f"     Grade: {food.get('grade', 'N/A')} - {food.get('gradeReason', 'N/A')}")
            print(f"     Calories: {nutrition.get('calories', 0)} kcal")
            print(f"     Protein: {nutrition.get('protein', 0)}g | " +
                  f"Carbs: {nutrition.get('carbs', 0)}g | " +
                  f"Fat: {nutrition.get('fat', 0)}g")
            print(f"     Confidence: {food.get('confidence', 0)}%")
        
        return True
        
    except ValueError as e:
        if "No vision API available" in str(e):
            print(f"\n❌ ERROR: No API key configured!")
            print(f"\n{e}")
            print(f"\nQuick fix:")
            print(f"  export ANTHROPIC_API_KEY='your-key-here'")
            return False
        else:
            raise
    except Exception as e:
        print(f"\n❌ FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests"""
    
    print("=" * 60)
    print("BiteScan Backend - Real Food Vision Test")
    print("=" * 60)
    
    # Check for API keys
    has_api = (
        os.environ.get("ANTHROPIC_API_KEY") or
        os.environ.get("OPENAI_API_KEY") or
        os.environ.get("GOOGLE_API_KEY")
    )
    
    if not has_api:
        print("\n⚠️  No API key found!")
        print("\nPlease set one of these environment variables:")
        print("  export ANTHROPIC_API_KEY='sk-ant-api...'")
        print("  export OPENAI_API_KEY='sk-...'")
        print("  export GOOGLE_API_KEY='...'")
        print("\nSee README.md for details.")
        return False
    
    if os.environ.get("ANTHROPIC_API_KEY"):
        key = os.environ.get("ANTHROPIC_API_KEY")
        if key.startswith("sk-ant-oat"):
            print("\n⚠️  WARNING: You're using an OAuth token (sk-ant-oat...)")
            print("   This won't work for direct API calls.")
            print("   Please get a regular API key from:")
            print("   https://console.anthropic.com/settings/keys")
            print("   (It should start with sk-ant-api...)")
            return False
        else:
            print(f"\n✓ Using Anthropic API key: {key[:20]}...")
    elif os.environ.get("OPENAI_API_KEY"):
        print(f"\n✓ Using OpenAI API key")
    elif os.environ.get("GOOGLE_API_KEY"):
        print(f"\n✓ Using Google API key")
    
    # Test each image
    results = []
    for name, url in TEST_IMAGES.items():
        success = await test_image(name, url)
        results.append((name, success))
    
    # Summary
    print(f"\n\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    
    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
    
    all_passed = all(success for _, success in results)
    
    if all_passed:
        print(f"\n🎉 All tests passed! BiteScan backend is working correctly.")
        print(f"\nYou can now:")
        print(f"  1. Start the backend: ./start.sh")
        print(f"  2. Test from mobile app")
        print(f"  3. Try scanning McDonald's, salads, etc.")
    else:
        print(f"\n❌ Some tests failed. Check the errors above.")
    
    return all_passed


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
