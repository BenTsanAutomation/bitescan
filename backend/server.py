#!/usr/bin/env python3
"""BiteScan Backend API (hardened and recommendation-focused)."""

from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import logging
import os
import tempfile
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator

load_dotenv()

logger = logging.getLogger("bitescan.api")
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


@dataclass(frozen=True)
class Settings:
    host: str = os.getenv("HOST", "127.0.0.1")
    port: int = int(os.getenv("PORT", "8420"))
    request_timeout_seconds: int = int(os.getenv("REQUEST_TIMEOUT_SECONDS", "45"))
    max_image_bytes: int = int(os.getenv("MAX_IMAGE_BYTES", str(8 * 1024 * 1024)))
    max_goals: int = int(os.getenv("MAX_GOALS", "10"))
    allow_origins: list[str] = tuple(
        origin.strip() for origin in os.getenv("ALLOW_ORIGINS", "http://localhost:8081,http://localhost:19006").split(",") if origin.strip()
    )
    require_api_token: bool = os.getenv("REQUIRE_API_TOKEN", "false").lower() == "true"
    api_token: str = os.getenv("BITESCAN_API_TOKEN", "")
    rate_limit_per_minute: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "30"))
    analysis_cache_ttl_seconds: int = int(os.getenv("ANALYSIS_CACHE_TTL_SECONDS", "90"))
    max_recommendations: int = int(os.getenv("MAX_RECOMMENDATIONS", "5"))


SETTINGS = Settings()

if SETTINGS.require_api_token and not SETTINGS.api_token:
    raise RuntimeError("REQUIRE_API_TOKEN=true but BITESCAN_API_TOKEN is not set")


class MacroTargets(BaseModel):
    model_config = ConfigDict(extra="forbid")

    calories: int = Field(default=700, ge=200, le=2500)
    protein: float = Field(default=35, ge=0, le=250)
    carbs: float = Field(default=70, ge=0, le=300)
    fat: float = Field(default=25, ge=0, le=150)


class TasteProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    likedFoods: list[str] = Field(default_factory=list, max_length=30)
    dislikedFoods: list[str] = Field(default_factory=list, max_length=30)
    cuisineAffinity: dict[str, int] = Field(default_factory=dict)

    @field_validator("likedFoods", "dislikedFoods")
    @classmethod
    def normalize_food_terms(cls, values: list[str]) -> list[str]:
        normalized: list[str] = []
        for value in values:
            term = value.strip().lower()
            if term and term not in normalized:
                normalized.append(term)
        return normalized

    @field_validator("cuisineAffinity")
    @classmethod
    def normalize_cuisine_affinity(cls, values: dict[str, int]) -> dict[str, int]:
        normalized: dict[str, int] = {}
        for cuisine, score in values.items():
            key = cuisine.strip().lower()
            if key:
                normalized[key] = max(0, min(int(score), 100))
        return normalized


class UserPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid")

    goals: list[str] = Field(default_factory=list, max_length=10)
    priorities: dict[str, int] = Field(default_factory=dict)
    macroTargets: Optional[MacroTargets] = None
    tasteProfile: Optional[TasteProfile] = None

    @field_validator("goals")
    @classmethod
    def validate_goals(cls, goals: list[str]) -> list[str]:
        deduped: list[str] = []
        for goal in goals:
            normalized = goal.strip().lower().replace(" ", "_")
            if not normalized:
                continue
            if normalized not in deduped:
                deduped.append(normalized)
        if len(deduped) > SETTINGS.max_goals:
            raise ValueError(f"Too many goals: max {SETTINGS.max_goals}")
        return deduped

    @field_validator("priorities")
    @classmethod
    def validate_priorities(cls, priorities: dict[str, int]) -> dict[str, int]:
        normalized: dict[str, int] = {}
        for key, value in priorities.items():
            k = key.strip().lower().replace(" ", "_")
            normalized[k] = max(0, min(int(value), 100))
        return normalized


class AnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    imageBase64: str = Field(min_length=16, max_length=20_000_000)
    userPreferences: UserPreferences

    @field_validator("imageBase64")
    @classmethod
    def validate_image_base64(cls, value: str) -> str:
        try:
            decoded = base64.b64decode(value, validate=True)
        except Exception as exc:  # noqa: BLE001
            raise ValueError("imageBase64 must be valid base64") from exc

        if len(decoded) > SETTINGS.max_image_bytes:
            max_mb = SETTINGS.max_image_bytes / (1024 * 1024)
            raise ValueError(f"Image too large. Max size is {max_mb:.1f}MB")

        return value


class NutritionInfo(BaseModel):
    calories: int = Field(ge=0, le=5000)
    protein: float = Field(ge=0, le=500)
    carbs: float = Field(ge=0, le=500)
    fat: float = Field(ge=0, le=500)
    fiber: float = Field(ge=0, le=200)
    sugar: float = Field(ge=0, le=500)
    sodium: float = Field(ge=0, le=10000)


class MacroFitBreakdown(BaseModel):
    score: int = Field(ge=0, le=100)
    calorieImpactPct: int = Field(ge=0, le=250)
    proteinImpactPct: int = Field(ge=0, le=250)
    carbsImpactPct: int = Field(ge=0, le=250)
    fatImpactPct: int = Field(ge=0, le=250)


class TastePrediction(BaseModel):
    score: int = Field(ge=0, le=100)
    confidence: int = Field(ge=0, le=100)
    crowdScore: int = Field(ge=0, le=100)


class FoodItem(BaseModel):
    id: str
    name: str = Field(min_length=1, max_length=200)
    nameLocalized: Optional[str] = Field(default=None, max_length=200)
    cuisine: Optional[str] = Field(default=None, max_length=100)
    portion: str = Field(min_length=1, max_length=100)
    nutrition: NutritionInfo
    grade: str = Field(pattern=r"^[SABCDF]$")
    gradeReason: str = Field(min_length=1, max_length=500)
    confidence: int = Field(ge=0, le=100)
    macroFit: Optional[MacroFitBreakdown] = None
    taste: Optional[TastePrediction] = None


class MealRecommendation(BaseModel):
    foodId: str
    foodName: str
    macroFitScore: int = Field(ge=0, le=100)
    tasteScore: int = Field(ge=0, le=100)
    combinedScore: int = Field(ge=0, le=100)
    reason: str = Field(min_length=1, max_length=240)


class ScanResult(BaseModel):
    id: str
    timestamp: int
    imageUri: str
    foods: list[FoodItem]
    totalCalories: int
    overallGrade: str = Field(pattern=r"^[SABCDF]$")
    recommendation: str
    userGoalsMatch: int = Field(ge=0, le=100)
    mealRecommendations: list[MealRecommendation] = Field(default_factory=list)


class AnalyzeResponse(BaseModel):
    success: bool
    result: Optional[ScanResult] = None
    error: Optional[str] = None


class TTLCache:
    def __init__(self, ttl_seconds: int, max_items: int = 10_000) -> None:
        self.ttl_seconds = ttl_seconds
        self.max_items = max_items
        self._store: dict[str, tuple[float, dict[str, Any]]] = {}
        self._lock = asyncio.Lock()

    async def get(self, key: str) -> Optional[dict[str, Any]]:
        now = time.time()
        async with self._lock:
            entry = self._store.get(key)
            if not entry:
                return None
            expires_at, payload = entry
            if expires_at < now:
                self._store.pop(key, None)
                return None
            return payload

    async def set(self, key: str, payload: dict[str, Any]) -> None:
        now = time.time()
        async with self._lock:
            if len(self._store) >= self.max_items:
                self._store = {k: v for k, v in self._store.items() if v[0] > now}
                if len(self._store) >= self.max_items:
                    # deterministic oldest eviction
                    oldest_key = min(self._store, key=lambda k: self._store[k][0])
                    self._store.pop(oldest_key, None)
            self._store[key] = (now + self.ttl_seconds, payload)


analysis_cache = TTLCache(ttl_seconds=SETTINGS.analysis_cache_ttl_seconds)


app = FastAPI(title="BiteScan API", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(SETTINGS.allow_origins),
    allow_credentials=False,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Token"],
)


class RateLimiter:
    """Simple in-memory fixed-window limiter per client IP."""

    def __init__(self, per_minute: int) -> None:
        self.per_minute = per_minute
        self._buckets: dict[str, list[float]] = {}
        self._lock = asyncio.Lock()

    async def allow(self, key: str) -> bool:
        now = time.time()
        window_start = now - 60
        async with self._lock:
            bucket = self._buckets.get(key, [])
            bucket = [t for t in bucket if t >= window_start]
            if len(bucket) >= self.per_minute:
                self._buckets[key] = bucket
                return False
            bucket.append(now)
            self._buckets[key] = bucket
            if len(self._buckets) > 10_000:
                self._buckets = {k: v for k, v in self._buckets.items() if v and v[-1] >= window_start}
            return True


rate_limiter = RateLimiter(SETTINGS.rate_limit_per_minute)


@app.middleware("http")
async def auth_and_rate_limit(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)

    if SETTINGS.require_api_token:
        token = request.headers.get("X-API-Token") or request.headers.get("Authorization", "").removeprefix("Bearer ")
        if token != SETTINGS.api_token:
            return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": "Unauthorized"})

    client_ip = request.client.host if request.client else "unknown"
    if not await rate_limiter.allow(client_ip):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Rate limit exceeded"},
            headers={"Retry-After": "60"},
        )

    return await call_next(request)


ANALYSIS_PROMPT = """Analyze this food image and provide detailed nutritional information in JSON.

User goals: {goals}

Important:
- For composite meals (bowls, plates, combo meals), break them into individual components
  (rice, protein, toppings, sauces, sides, etc.) instead of returning one combined food item.
- If multiple foods are visible, return each distinct item in the foods array.

Return only valid JSON:
{{
  "foods": [
    {{
      "name": "...",
      "nameLocalized": null,
      "cuisine": "...",
      "portion": "...",
      "nutrition": {{
        "calories": 350,
        "protein": 25.5,
        "carbs": 40,
        "fat": 12,
        "fiber": 3,
        "sugar": 5,
        "sodium": 800
      }},
      "grade": "B",
      "gradeReason": "...",
      "confidence": 85
    }}
  ],
  "overallGrade": "B",
  "recommendation": "...",
  "userGoalsMatch": 70
}}
"""

MENU_SCAN_PROMPT = """Analyze this restaurant menu image and detect every visible food item.

User goals: {goals}
Macro targets per meal: calories={calories} kcal, protein={protein} g, carbs={carbs} g, fat={fat} g

Important:
- Detect ALL distinct menu items visible in the image (do not skip items).
- Estimate realistic nutrition for each item based on common restaurant portions.
- Rank foods from best to worst macro fit for the user's macro targets.
- Keep the foods array ordered by that ranking (best fit first).

Return only valid JSON:
{{
  "foods": [
    {{
      "name": "...",
      "nameLocalized": null,
      "cuisine": "...",
      "portion": "...",
      "nutrition": {{
        "calories": 350,
        "protein": 25.5,
        "carbs": 40,
        "fat": 12,
        "fiber": 3,
        "sugar": 5,
        "sodium": 800
      }},
      "grade": "B",
      "gradeReason": "...",
      "confidence": 85
    }}
  ],
  "overallGrade": "B",
  "recommendation": "...",
  "userGoalsMatch": 70
}}
"""


CROWD_TASTE_BASELINES: dict[str, int] = {
    "burrito": 78,
    "bowl": 74,
    "taco": 81,
    "pasta": 79,
    "rice": 73,
    "sandwich": 76,
    "wrap": 74,
    "soup": 70,
    "curry": 82,
    "noodles": 80,
    "poke": 84,
    "acai": 69,
    "oatmeal": 66,
    "pancakes": 77,
    "eggs": 75,
    "bacon": 79,
    "fish": 76,
    "salmon": 82,
    "shrimp": 80,
    "lobster": 85,
    "lamb": 78,
    "pork": 75,
    "wings": 82,
    "fries": 81,
    "nachos": 79,
    "quesadilla": 80,
    "hummus": 71,
    "falafel": 76,
    "kebab": 79,
    "gyro": 78,
    "pho": 83,
    "pad thai": 82,
    "fried rice": 80,
    "dumpling": 81,
    "spring roll": 75,
    "bibimbap": 82,
    "teriyaki": 79,
    "tempura": 80,
    "miso": 68,
    "edamame": 69,
    "sushi": 83,
    "salad": 68,
    "burger": 76,
    "pizza": 79,
    "ramen": 81,
    "udon": 77,
    "yakisoba": 79,
    "sandwich": 76,
    "panini": 75,
    "bagel": 72,
    "avocado toast": 73,
    "omelette": 74,
    "steak": 80,
    "chicken": 74,
    "turkey": 71,
    "beef": 76,
    "tofu": 62,
    "lentil": 67,
    "chili": 74,
    "mac and cheese": 78,
    "lasagna": 80,
    "samosa": 76,
    "shawarma": 81,
    "paella": 82,
    "risotto": 79,
    "gnocchi": 77,
    "ceasar salad": 69,
    "caesar salad": 69,
    "grilled cheese": 77,
    "smoothie": 71,
    "waffle": 76,
    "croissant": 75,
    "donut": 74,
    "boba": 73,
    "milk tea": 72,
    "protein shake": 67,
    "sashimi": 82,
    "kimchi": 70,
    "sausage": 76,
    "hot dog": 74,
    "meatball": 75,
    "enchilada": 79,
    "fajita": 80,
    "chow mein": 79,
    "mapo tofu": 77,
    "congee": 68,
    "porridge": 66,
    "granola": 68,
    "yogurt": 67,
    "ice cream": 82,
    "cake": 79,
    "cookie": 76,
    "brownie": 78,
    "empanada": 77,
    "pierogi": 76,
    "falooda": 71,
    "churro": 78,
    "arepa": 75,
    "tamale": 74,
    "bao": 78,
    "bibim": 80,
    "tofu": 62,
}


VALID_GRADES = {"S", "A", "B", "C", "D", "F"}
PLUS_MINUS_GRADE_MAP: dict[str, str] = {
    "S+": "S",
    "S-": "S",
    "A+": "A",
    "A-": "A",
    "B+": "B",
    "B-": "B",
    "C+": "C",
    "C-": "C",
    "D+": "D",
    "D-": "D",
    "F+": "F",
    "F-": "F",
}
CALORIE_FROM_MACRO_TOLERANCE = 0.15


def _clean_json_response(text: str) -> str:
    if "```" in text:
        lines = text.split("\n")
        start_idx = next((i for i, line in enumerate(lines) if line.strip().startswith("{")), 0)
        end_idx = len(lines)
        for i in range(len(lines) - 1, -1, -1):
            if lines[i].strip().endswith("}"):
                end_idx = i + 1
                break
        text = "\n".join(lines[start_idx:end_idx])

    text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or start > end:
        raise ValueError(f"No valid JSON object found in response. Text starts with: {text[:100]}")
    return text[start : end + 1]


def _build_analysis_prompt(preferences: UserPreferences) -> str:
    goals_str = _goals_string(preferences)
    return ANALYSIS_PROMPT.format(goals=goals_str)


def _goals_string(preferences: UserPreferences) -> str:
    goals_str = ", ".join(
        f"{goal} (priority: {preferences.priorities.get(goal, 50)}%)" for goal in preferences.goals
    ) or "general health"
    return goals_str


def _build_menu_scan_prompt(preferences: UserPreferences) -> str:
    goals_str = _goals_string(preferences)
    targets = _derive_macro_targets(preferences)
    return MENU_SCAN_PROMPT.format(
        goals=goals_str,
        calories=targets.calories,
        protein=targets.protein,
        carbs=targets.carbs,
        fat=targets.fat,
    )


def _derive_macro_targets(preferences: UserPreferences) -> MacroTargets:
    if preferences.macroTargets:
        return preferences.macroTargets

    # sensible default for a single meal recommendation window
    targets = MacroTargets()
    if "low_carb" in preferences.goals:
        targets = targets.model_copy(update={"carbs": 45})
    if "low_fat" in preferences.goals:
        targets = targets.model_copy(update={"fat": 18})
    if "protein" in preferences.goals:
        targets = targets.model_copy(update={"protein": 45})
    if "low_calorie" in preferences.goals:
        targets = targets.model_copy(update={"calories": 550})
    return targets


def _macro_fit_for_food(nutrition: NutritionInfo, targets: MacroTargets) -> MacroFitBreakdown:
    def impact(value: float, target: float) -> int:
        if target <= 0:
            return 100
        return int(min(250, round((value / target) * 100)))

    cal_i = impact(nutrition.calories, targets.calories)
    pro_i = impact(nutrition.protein, targets.protein)
    carb_i = impact(nutrition.carbs, targets.carbs)
    fat_i = impact(nutrition.fat, targets.fat)

    # peak at 100 when impact is near 100, penalize both under/over but over more sharply
    def centered_score(imp: int, over_penalty: float = 1.25) -> float:
        delta = imp - 100
        if delta <= 0:
            return max(0.0, 100 - (abs(delta) * 0.6))
        return max(0.0, 100 - (delta * over_penalty))

    weighted = (
        centered_score(cal_i, 1.4) * 0.35
        + centered_score(pro_i, 1.1) * 0.35
        + centered_score(carb_i, 1.25) * 0.15
        + centered_score(fat_i, 1.25) * 0.15
    )

    return MacroFitBreakdown(
        score=int(max(0, min(100, round(weighted)))),
        calorieImpactPct=cal_i,
        proteinImpactPct=pro_i,
        carbsImpactPct=carb_i,
        fatImpactPct=fat_i,
    )


def _crowd_taste_for_food(food_name: str) -> int:
    normalized = food_name.lower()
    for keyword, score in CROWD_TASTE_BASELINES.items():
        if keyword in normalized:
            return score
    return 62


def _taste_prediction_for_food(food: FoodItem, preferences: UserPreferences) -> TastePrediction:
    profile = preferences.tasteProfile or TasteProfile()
    name = food.name.lower()
    crowd = _crowd_taste_for_food(name)

    personalized = 50.0
    if any(term in name for term in profile.likedFoods):
        personalized += 28
    if any(term in name for term in profile.dislikedFoods):
        personalized -= 36

    cuisine = (food.cuisine or "").strip().lower()
    if cuisine and cuisine in profile.cuisineAffinity:
        personalized += (profile.cuisineAffinity[cuisine] - 50) * 0.35

    combined = int(max(0, min(100, round((crowd * 0.45) + (personalized * 0.55)))))
    confidence = 72 if profile.likedFoods or profile.dislikedFoods or profile.cuisineAffinity else 45
    return TastePrediction(score=combined, confidence=confidence, crowdScore=crowd)


def _recommendation_reason(macro_fit: int, taste: int) -> str:
    if macro_fit >= 80 and taste >= 80:
        return "Strong fit for your macros and likely very enjoyable."
    if macro_fit >= 80:
        return "Great macro fit; taste is acceptable but not top-tier for you."
    if taste >= 80:
        return "Tasty pick, but macro balance is weaker for your targets."
    if macro_fit < 45 and taste < 45:
        return "Low fit on both macro alignment and predicted taste."
    return "Balanced option with moderate macro and taste fit."


def _build_meal_recommendations(foods: list[FoodItem], max_items: int) -> list[MealRecommendation]:
    ranked: list[MealRecommendation] = []
    for item in foods:
        macro_score = item.macroFit.score if item.macroFit else 50
        taste_score = item.taste.score if item.taste else 50
        combined = int(round((macro_score * 0.55) + (taste_score * 0.45)))
        ranked.append(
            MealRecommendation(
                foodId=item.id,
                foodName=item.name,
                macroFitScore=macro_score,
                tasteScore=taste_score,
                combinedScore=max(0, min(100, combined)),
                reason=_recommendation_reason(macro_score, taste_score),
            )
        )

    ranked.sort(key=lambda rec: (rec.combinedScore, rec.macroFitScore, rec.tasteScore), reverse=True)
    return ranked[:max_items]


def _normalize_grade(raw_grade: Any) -> str:
    raw = str(raw_grade or "").strip().upper()
    if raw in VALID_GRADES:
        return raw
    if raw in PLUS_MINUS_GRADE_MAP:
        return PLUS_MINUS_GRADE_MAP[raw]
    if len(raw) >= 2 and raw[:2] in PLUS_MINUS_GRADE_MAP:
        return PLUS_MINUS_GRADE_MAP[raw[:2]]
    return "C"


def _normalize_nutrition(nutrition: dict[str, Any], request_id: str) -> NutritionInfo:
    calories = int(nutrition.get("calories", 0))
    protein = float(nutrition.get("protein", 0))
    carbs = float(nutrition.get("carbs", 0))
    fat = float(nutrition.get("fat", 0))
    macro_calories = (protein * 4) + (carbs * 4) + (fat * 9)

    corrected_calories = calories
    if macro_calories > 0:
        if calories <= 0:
            corrected_calories = int(round(macro_calories))
        else:
            mismatch_ratio = abs(calories - macro_calories) / macro_calories
            if mismatch_ratio > CALORIE_FROM_MACRO_TOLERANCE:
                corrected_calories = int(round(macro_calories))

    if corrected_calories != calories:
        logger.info(
            "nutrition_calorie_adjusted request_id=%s calories=%s macro_calories=%.2f corrected=%s",
            request_id,
            calories,
            macro_calories,
            corrected_calories,
        )

    return NutritionInfo(
        calories=corrected_calories,
        protein=protein,
        carbs=carbs,
        fat=fat,
        fiber=float(nutrition.get("fiber", 0)),
        sugar=float(nutrition.get("sugar", 0)),
        sodium=float(nutrition.get("sodium", 0)),
    )


async def _analyze_with_claude(
    image_path: str,
    preferences: UserPreferences,
    api_key: str,
    prompt: Optional[str] = None,
) -> dict[str, Any]:
    import anthropic

    client = anthropic.Anthropic(api_key=api_key)
    request_prompt = prompt or _build_analysis_prompt(preferences)
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    media_type = "image/jpeg"
    if image_path.lower().endswith(".png"):
        media_type = "image/png"

    response = await asyncio.to_thread(
        client.messages.create,
        model="claude-3-5-sonnet-20241022",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": image_data}},
                {"type": "text", "text": request_prompt},
            ],
        }],
    )

    text = _clean_json_response(response.content[0].text.strip())
    return json.loads(text)


async def _analyze_with_openai(
    image_path: str,
    preferences: UserPreferences,
    api_key: str,
    prompt: Optional[str] = None,
) -> dict[str, Any]:
    import openai

    client = openai.OpenAI(api_key=api_key)
    request_prompt = prompt or _build_analysis_prompt(preferences)
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    response = await asyncio.to_thread(
        client.chat.completions.create,
        model="gpt-4o-mini",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}},
                {"type": "text", "text": request_prompt},
            ],
        }],
    )

    text = _clean_json_response(response.choices[0].message.content.strip())
    return json.loads(text)


async def _analyze_with_gemini(
    image_path: str,
    preferences: UserPreferences,
    api_key: str,
    prompt: Optional[str] = None,
) -> dict[str, Any]:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    request_prompt = prompt or _build_analysis_prompt(preferences)
    with open(image_path, "rb") as f:
        image_data = f.read()

    mime_type = "image/jpeg"
    if image_path.lower().endswith(".png"):
        mime_type = "image/png"

    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-2.0-flash",
        contents=[
            types.Part.from_text(text=request_prompt),
            types.Part.from_bytes(data=image_data, mime_type=mime_type),
        ],
    )

    response_text = getattr(response, "text", None)
    if not response_text:
        raise ValueError("Gemini response missing text")

    text = _clean_json_response(response_text.strip())
    return json.loads(text)


def _providers() -> list[tuple[str, str]]:
    providers: list[tuple[str, str]] = []
    anth = os.getenv("ANTHROPIC_API_KEY", "")
    openai_key = os.getenv("OPENAI_API_KEY", "")
    google_key = os.getenv("GOOGLE_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")

    if anth:
        providers.append(("anthropic", anth))
    if openai_key:
        providers.append(("openai", openai_key))
    if google_key:
        providers.append(("gemini", google_key))
    return providers


async def analyze_with_fallback(
    image_path: str,
    preferences: UserPreferences,
    prompt: Optional[str] = None,
) -> dict[str, Any]:
    providers = _providers()
    if not providers:
        raise RuntimeError("No vision API configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY.")

    last_error: Exception | None = None
    for provider_name, key in providers:
        try:
            if provider_name == "anthropic":
                return await asyncio.wait_for(
                    _analyze_with_claude(image_path, preferences, key, prompt=prompt),
                    timeout=SETTINGS.request_timeout_seconds,
                )
            if provider_name == "openai":
                return await asyncio.wait_for(
                    _analyze_with_openai(image_path, preferences, key, prompt=prompt),
                    timeout=SETTINGS.request_timeout_seconds,
                )
            return await asyncio.wait_for(
                _analyze_with_gemini(image_path, preferences, key, prompt=prompt),
                timeout=SETTINGS.request_timeout_seconds,
            )
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            logger.warning("Provider %s failed: %s", provider_name, exc)

    raise RuntimeError(f"All vision providers failed. Last error: {last_error}")


async def analyze_with_gemini(
    image_path: str,
    preferences: UserPreferences,
    prompt: Optional[str] = None,
) -> dict[str, Any]:
    # backward compatibility for older tests/scripts
    return await analyze_with_fallback(image_path, preferences, prompt=prompt)


def _validated_food_items(analysis: dict[str, Any], scan_id: str, preferences: UserPreferences) -> tuple[list[FoodItem], int]:
    if "foods" not in analysis or not isinstance(analysis["foods"], list):
        raise ValueError("Model response missing 'foods' array")

    targets = _derive_macro_targets(preferences)
    foods: list[FoodItem] = []
    total_calories = 0

    for i, food_data in enumerate(analysis["foods"]):
        nutrition = food_data.get("nutrition", {})
        nutrition_obj = _normalize_nutrition(nutrition, scan_id)

        candidate = FoodItem(
            id=f"{scan_id}-{i}",
            name=food_data.get("name", "Unknown"),
            nameLocalized=food_data.get("nameLocalized"),
            cuisine=food_data.get("cuisine"),
            portion=food_data.get("portion", "1 serving"),
            nutrition=nutrition_obj,
            grade=_normalize_grade(food_data.get("grade", "C")),
            gradeReason=food_data.get("gradeReason", "No rationale provided"),
            confidence=int(food_data.get("confidence", 70)),
            macroFit=_macro_fit_for_food(nutrition_obj, targets),
            taste=_taste_prediction_for_food(
                FoodItem(
                    id="temp",
                    name=food_data.get("name", "Unknown"),
                    cuisine=food_data.get("cuisine"),
                    portion=food_data.get("portion", "1 serving"),
                    nutrition=nutrition_obj,
                    grade="C",
                    gradeReason="tmp",
                    confidence=70,
                ),
                preferences,
            ),
        )

        foods.append(candidate)
        total_calories += candidate.nutrition.calories

    return foods, total_calories


def _cache_key(image_bytes: bytes, preferences: UserPreferences, cache_namespace: str = "food") -> str:
    pref_blob = preferences.model_dump_json(exclude_none=True, exclude_defaults=False)
    digest = hashlib.sha256(image_bytes + pref_blob.encode("utf-8") + cache_namespace.encode("utf-8")).hexdigest()
    return digest


async def _run_analysis(
    request: AnalyzeRequest,
    *,
    endpoint_name: str,
    prompt: Optional[str] = None,
    cache_namespace: str = "food",
    rank_by_macro_fit: bool = False,
) -> AnalyzeResponse:
    request_id = str(uuid.uuid4())
    start = time.perf_counter()

    temp_path: Optional[str] = None
    try:
        image_data = base64.b64decode(request.imageBase64, validate=True)
        cache_key = _cache_key(image_data, request.userPreferences, cache_namespace=cache_namespace)
        cached = await analysis_cache.get(cache_key)
        if cached:
            logger.info("%s_cache_hit request_id=%s", endpoint_name, request_id)
            return AnalyzeResponse.model_validate(cached)

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            f.write(image_data)
            temp_path = f.name

        analysis = await analyze_with_fallback(temp_path, request.userPreferences, prompt=prompt)

        scan_id = str(uuid.uuid4())
        foods, total_calories = _validated_food_items(analysis, scan_id, request.userPreferences)
        if rank_by_macro_fit:
            foods.sort(
                key=lambda item: (
                    item.macroFit.score if item.macroFit else 0,
                    item.confidence,
                ),
                reverse=True,
            )
        meal_recs = _build_meal_recommendations(foods, SETTINGS.max_recommendations)

        user_match = int(analysis.get("userGoalsMatch", 50))
        if meal_recs:
            user_match = int(round((user_match * 0.5) + (meal_recs[0].combinedScore * 0.5)))

        result = ScanResult(
            id=scan_id,
            timestamp=int(datetime.now(tz=timezone.utc).timestamp() * 1000),
            imageUri=f"scan://{scan_id}",
            foods=foods,
            totalCalories=total_calories,
            overallGrade=_normalize_grade(analysis.get("overallGrade", "C")),
            recommendation=str(analysis.get("recommendation", ""))[:500],
            userGoalsMatch=max(0, min(user_match, 100)),
            mealRecommendations=meal_recs,
        )

        payload = AnalyzeResponse(success=True, result=result)
        await analysis_cache.set(cache_key, payload.model_dump(mode="json"))

        elapsed_ms = int((time.perf_counter() - start) * 1000)
        logger.info("%s_success request_id=%s foods=%d elapsed_ms=%d", endpoint_name, request_id, len(result.foods), elapsed_ms)
        return payload

    except (ValueError, json.JSONDecodeError) as exc:
        logger.warning("%s_validation_failed request_id=%s error=%s", endpoint_name, request_id, exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        logger.exception("%s_failed request_id=%s error=%s", endpoint_name, request_id, exc)
        return AnalyzeResponse(success=False, error="Failed to analyze image")
    finally:
        if temp_path:
            path = Path(temp_path)
            if path.exists():
                path.unlink(missing_ok=True)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception):
    logger.exception("Unhandled server error: %s", exc)
    return JSONResponse(status_code=500, content={"success": False, "error": "Internal server error"})


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_food(request: AnalyzeRequest):
    return await _run_analysis(
        request,
        endpoint_name="analyze",
        cache_namespace="food",
    )


@app.post("/analyze-menu", response_model=AnalyzeResponse)
async def analyze_menu(request: AnalyzeRequest):
    return await _run_analysis(
        request,
        endpoint_name="analyze_menu",
        prompt=_build_menu_scan_prompt(request.userPreferences),
        cache_namespace="menu",
        rank_by_macro_fit=True,
    )


@app.get("/health")
async def health_check():
    configured = [name for name, _ in _providers()]
    return {
        "status": "healthy",
        "service": "bitescan-api",
        "providersConfigured": configured,
        "rateLimitPerMinute": SETTINGS.rate_limit_per_minute,
        "analysisCacheTtlSeconds": SETTINGS.analysis_cache_ttl_seconds,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=SETTINGS.host, port=SETTINGS.port)
