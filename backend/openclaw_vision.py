"""
OpenClaw Vision Proxy
Uses OpenClaw's built-in AI capabilities to analyze images
"""

import json
import os
import subprocess
import tempfile
from pathlib import Path


def analyze_with_openclaw(image_path: str, prompt: str) -> str:
    """
    Analyze an image using OpenClaw's CLI
    
    This uses the `openclaw` command to analyze images through
    OpenClaw's configured AI models.
    """
    
    # Create a temporary file for the prompt
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write(prompt)
        prompt_file = f.name
    
    try:
        # Use openclaw to analyze the image
        # This will use the configured model (Claude Sonnet 4.5)
        result = subprocess.run(
            ['openclaw', 'chat', '--no-stream', '--image', image_path, prompt],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode != 0:
            raise Exception(f"OpenClaw command failed: {result.stderr}")
        
        return result.stdout.strip()
        
    finally:
        # Clean up temp file
        if os.path.exists(prompt_file):
            os.unlink(prompt_file)


async def analyze_image_with_openclaw(image_path: str, preferences) -> dict:
    """
    Analyze food image using OpenClaw's AI capabilities
    
    This function uses OpenClaw's CLI to analyze images, which means
    it uses whatever AI provider is configured in OpenClaw (Claude, OpenAI, etc.)
    """
    
    goals_str = ", ".join([
        f"{goal} (priority: {preferences.priorities.get(goal, 50)}%)" 
        for goal in preferences.goals
    ]) or "general health"
    
    prompt = f"""Analyze this food image and provide detailed nutritional information in JSON format.

User's health goals: {goals_str}

Return ONLY valid JSON (no markdown, no explanation) in this exact structure:
{{
  "foods": [
    {{
      "name": "Food name",
      "nameLocalized": "Original language name if applicable (null if same)",
      "cuisine": "Cuisine type (e.g., Japanese, American, Thai)",
      "portion": "serving size (e.g., 1 burger, 2 pieces, medium serving)",
      "nutrition": {{
        "calories": number,
        "protein": number,
        "carbs": number,
        "fat": number,
        "fiber": number,
        "sugar": number,
        "sodium": number
      }},
      "grade": "S/A/B/C/D/F",
      "gradeReason": "why this grade based on user's goals",
      "confidence": 0-100
    }}
  ],
  "overallGrade": "S/A/B/C/D/F",
  "recommendation": "brief personalized advice based on user goals",
  "userGoalsMatch": 0-100
}}

Grade scale (consider user's specific goals):
- S: Superb (nutrient-dense, low calorie, high fiber/protein, perfect for goals)
- A: Excellent (balanced, healthy, aligns well with goals)
- B: Good (decent but could be better for goals)
- C: Average (not ideal for health goals)
- D: Poor (high calorie, low nutrients, conflicts with goals)
- F: Fail (fast food, junk food, very unhealthy, strongly conflicts with goals)

Be realistic with portions and nutritional values. If you see multiple items (like a combo meal), list each separately.
IMPORTANT: Return ONLY the JSON, no other text."""

    try:
        response_text = analyze_with_openclaw(image_path, prompt)
        
        # Clean up response
        text = response_text.strip()
        
        # Remove markdown code blocks if present
        if text.startswith("```"):
            lines = text.split("\n")
            # Find the start and end of the JSON block
            start_idx = 0
            end_idx = len(lines)
            for i, line in enumerate(lines):
                if line.strip().startswith("{"):
                    start_idx = i
                    break
            for i in range(len(lines) - 1, -1, -1):
                if lines[i].strip().endswith("}"):
                    end_idx = i + 1
                    break
            text = "\n".join(lines[start_idx:end_idx])
        
        # Parse JSON
        result = json.loads(text)
        
        # Validate structure
        if "foods" not in result or not isinstance(result["foods"], list):
            raise ValueError("Invalid response structure: missing 'foods' array")
        
        return result
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print(f"Response text: {response_text[:500]}")
        raise ValueError(f"Failed to parse AI response as JSON: {e}")
    except Exception as e:
        print(f"OpenClaw vision error: {e}")
        raise
