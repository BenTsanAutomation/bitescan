import base64

from fastapi.testclient import TestClient

import server


def _tiny_jpeg_b64() -> str:
    tiny_png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00"
        b"\x00\x03\x01\x01\x00\x18\xdd\x8d\xb1\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    return base64.b64encode(tiny_png).decode()


def test_macro_fit_rewards_balance():
    targets = server.MacroTargets(calories=700, protein=40, carbs=70, fat=25)
    balanced = server.NutritionInfo(calories=680, protein=42, carbs=68, fat=23, fiber=5, sugar=3, sodium=500)
    oversized = server.NutritionInfo(calories=1200, protein=15, carbs=160, fat=70, fiber=2, sugar=15, sodium=1200)

    balanced_score = server._macro_fit_for_food(balanced, targets).score
    oversized_score = server._macro_fit_for_food(oversized, targets).score

    assert balanced_score > 80
    assert oversized_score < 40


def test_taste_prediction_uses_profile_and_crowd():
    prefs = server.UserPreferences(
        goals=["protein"],
        priorities={"protein": 90},
        tasteProfile=server.TasteProfile(
            likedFoods=["sushi"],
            dislikedFoods=["burger"],
            cuisineAffinity={"japanese": 95},
        ),
    )

    sushi = server.FoodItem(
        id="1",
        name="Salmon Sushi",
        cuisine="japanese",
        portion="1 plate",
        nutrition=server.NutritionInfo(calories=420, protein=30, carbs=55, fat=10, fiber=2, sugar=4, sodium=700),
        grade="A",
        gradeReason="good",
        confidence=92,
    )
    burger = sushi.model_copy(update={"id": "2", "name": "Double Burger", "cuisine": "american"})

    sushi_score = server._taste_prediction_for_food(sushi, prefs).score
    burger_score = server._taste_prediction_for_food(burger, prefs).score

    assert sushi_score > burger_score
    assert sushi_score >= 75


def test_analyze_includes_ranked_recommendations(monkeypatch):
    async def fake_analysis(*args, **kwargs):
        return {
            "foods": [
                {
                    "name": "Chicken Bowl",
                    "cuisine": "healthy",
                    "portion": "1 bowl",
                    "nutrition": {"calories": 560, "protein": 48, "carbs": 58, "fat": 15, "fiber": 6, "sugar": 5, "sodium": 780},
                    "grade": "A",
                    "gradeReason": "high protein",
                    "confidence": 90,
                },
                {
                    "name": "Cheese Burger",
                    "cuisine": "american",
                    "portion": "1 burger",
                    "nutrition": {"calories": 980, "protein": 30, "carbs": 85, "fat": 52, "fiber": 2, "sugar": 8, "sodium": 1600},
                    "grade": "C",
                    "gradeReason": "high fat",
                    "confidence": 88,
                },
            ],
            "overallGrade": "B",
            "recommendation": "Pick the chicken bowl",
            "userGoalsMatch": 60,
        }

    monkeypatch.setattr(server, "analyze_with_fallback", fake_analysis)

    client = TestClient(server.app)
    response = client.post(
        "/analyze",
        json={
            "imageBase64": _tiny_jpeg_b64(),
            "userPreferences": {
                "goals": ["protein", "low_calorie"],
                "priorities": {"protein": 90, "low_calorie": 85},
                "macroTargets": {"calories": 700, "protein": 45, "carbs": 70, "fat": 25},
                "tasteProfile": {"likedFoods": ["chicken"], "dislikedFoods": ["burger"], "cuisineAffinity": {"healthy": 90}},
            },
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    result = payload["result"]
    assert len(result["mealRecommendations"]) >= 1
    assert result["mealRecommendations"][0]["foodName"] == "Chicken Bowl"
    assert result["foods"][0]["macroFit"]["score"] >= result["foods"][1]["macroFit"]["score"]
