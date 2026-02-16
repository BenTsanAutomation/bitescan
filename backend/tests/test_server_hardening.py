import base64

from fastapi.testclient import TestClient

import server


def _tiny_jpeg_b64() -> str:
    # 1x1 transparent PNG bytes (works for validation path only)
    tiny_png = (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00"
        b"\x00\x03\x01\x01\x00\x18\xdd\x8d\xb1\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    return base64.b64encode(tiny_png).decode()


def test_health_endpoint_ok():
    client = TestClient(server.app)
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "healthy"
    assert "providersConfigured" in payload


def test_reject_invalid_base64():
    client = TestClient(server.app)
    response = client.post(
        "/analyze",
        json={
            "imageBase64": "%%%not-base64%%%",
            "userPreferences": {"goals": ["protein"], "priorities": {"protein": 80}},
        },
    )
    assert response.status_code == 422


def test_reject_oversized_payload():
    client = TestClient(server.app)
    # Construct decoded payload above MAX_IMAGE_BYTES
    oversized = base64.b64encode(b"a" * (server.SETTINGS.max_image_bytes + 1)).decode()
    response = client.post(
        "/analyze",
        json={
            "imageBase64": oversized,
            "userPreferences": {"goals": ["protein"], "priorities": {"protein": 80}},
        },
    )
    assert response.status_code == 422


def test_rate_limit_middleware_blocks_when_exceeded(monkeypatch):
    client = TestClient(server.app)

    # Force limiter to deny requests
    async def deny(_: str):
        return False

    monkeypatch.setattr(server.rate_limiter, "allow", deny)

    response = client.post(
        "/analyze",
        json={
            "imageBase64": _tiny_jpeg_b64(),
            "userPreferences": {"goals": [], "priorities": {}},
        },
    )

    assert response.status_code == 429
    assert response.json()["detail"] == "Rate limit exceeded"
