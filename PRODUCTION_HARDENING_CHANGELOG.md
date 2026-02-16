# Production Hardening Changelog

Date: 2026-02-11

## 1) Backend API hardening (`backend/server.py`)

### Before
- Wildcard CORS, no auth, no rate limiting
- No strict payload size/base64 validation
- Provider calls could block/hang without timeout boundaries
- Inconsistent key naming and ad-hoc logging

### After
- Configurable CORS allowlist (`ALLOW_ORIGINS`)
- Optional token auth (`REQUIRE_API_TOKEN`, `BITESCAN_API_TOKEN`)
- Per-IP rate limiter middleware (`RATE_LIMIT_PER_MINUTE`)
- Strict request validation (base64 validity + max image size)
- Provider timeout enforcement (`REQUEST_TIMEOUT_SECONDS`)
- Blocking SDK calls moved to worker threads (`asyncio.to_thread`)
- Structured logging with request ID and latency
- Safer global exception handler + sanitized outward errors
- Backward-compat helper retained for legacy scripts (`analyze_with_gemini`)

**Impact:** Reduced API abuse risk, improved stability under failure, improved operability.

---

## 2) Backend test gate and reliability (`backend/tests`, `backend/pytest.ini`)

### Before
- CI/pytest discovery picked up manual/integration scripts, causing non-deterministic failures

### After
- Introduced dedicated test path for automated tests (`tests/`)
- Added hardening-focused tests:
  - health endpoint
  - invalid base64 rejection
  - oversized payload rejection
  - rate-limit middleware behavior

**Impact:** Deterministic automated validation for critical security controls.

---

## 3) Frontend API client hardening (`src/services/api.ts`, `app.json`)

### Before
- Hardcoded local IP in dev path
- No request timeout or abort handling
- Limited error detail normalization

### After
- API base URL/token/timeout configurable via Expo `extra`
- AbortController timeout wrapper for all network calls
- Better server error extraction and reporting
- Base64 conversion guardrails

**Impact:** More reliable client behavior across environments and failure modes.

---

## 4) Docs/config consistency (`backend/README.md`, `backend/requirements.txt`)

### Before
- Contradictory/inaccurate key-security messaging
- Missing explicit test dependencies

### After
- Corrected API key handling guidance (env-based, no hardcoding)
- Added operational/security env var docs
- Added `pytest` and `httpx` in backend requirements

**Impact:** Reduced operator confusion; clearer deployment and security posture.
