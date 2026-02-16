# BiteScan Production Readiness Audit

Date: 2026-02-11
Scope: `/home/deez/.openclaw/workspace/bitescan` (mobile app + backend API)

## Executive Summary

BiteScan had major backend hardening gaps (open CORS, no auth/rate limit, weak input validation, weak error boundaries, and no reliable automated test gate). I implemented root-cause fixes focused on the critical request path (`POST /analyze`) and frontend API client reliability.

Current status: **Improved to production-baseline**, with some remaining follow-up items (see `ACTION_ITEMS.md`).

---

## Findings, Severity, and Fixes

| Area | Finding | Severity | Root Cause | Fix Implemented |
|---|---|---:|---|---|
| API Security | CORS `allow_origins=["*"]` with broad methods/headers | High | Development defaults leaked to runtime | Added configurable allowlist via `ALLOW_ORIGINS`; narrowed methods/headers; disabled credentialed wildcard behavior |
| Auth | No API authentication on backend | High | No service-to-service trust mechanism | Added optional token auth (`REQUIRE_API_TOKEN`, `BITESCAN_API_TOKEN`) via middleware |
| Abuse Controls | No rate limiting | High | Missing request throttling strategy | Added per-IP fixed-window limiter with 429 + `Retry-After` |
| Input Validation | Base64 image accepted without strict decoding/size caps | High | Request model lacked validation guards | Added strict base64 validation + max decoded bytes (`MAX_IMAGE_BYTES`) in Pydantic validator |
| Error Handling | Generic `except Exception` returned raw errors in places | Medium | No consistent error boundary | Added global exception handler; standardized client-safe errors; structured API-level handling |
| Timeouts | External provider calls could hang | High | No timeout boundary around vendor calls | Added `asyncio.wait_for` around provider calls with configurable timeout |
| Resilience | Sync provider SDK calls in async path | Medium | Blocking calls in event loop | Wrapped provider SDK calls with `asyncio.to_thread` |
| Provider Config | Inconsistent Gemini env var usage (`GOOGLE_API_KEY` vs `GEMINI_API_KEY`) | Medium | Drift between docs and code | Unified detection and support for both keys |
| Data Validation | AI outputs not bounded strongly before response | Medium | Trusting model output too directly | Added constrained Pydantic response models and normalization/clamping |
| Logging | Ad-hoc `print` logging | Medium | No operational logging standard | Added structured logger with request IDs + latency tracking |
| Frontend API Reliability | Hardcoded LAN URL and no request timeout | High | Non-configurable client endpoint and no abort handling | Added Expo-config driven API URL/token/timeouts + abortable fetch wrapper |
| Testability | No reliable CI-safe backend test selection | Medium | Manual/integration scripts mixed with pytest-discoverable files | Added `pytest.ini` (`testpaths=tests`) + hardening-focused automated tests |
| Dependency Risk | Unknown npm vulnerability posture | Low | No audit evidence captured | Ran `npm audit --json` (0 vulnerabilities) |

---

## Architecture Notes

- Backend remains a single FastAPI service (acceptable for current scope) with middleware boundary for auth + rate limiting.
- Provider fallback chain is retained, now with explicit timeout and warning logs.
- Frontend API layer now configurable from Expo `extra`, avoiding brittle environment assumptions.

---

## Test/Build/Lint Evidence

- Backend unit tests (critical hardening path): **4 passed**
- TypeScript type-check: **pass** (`npx tsc --noEmit` produced no errors)
- Dependency audit (npm): **0 vulnerabilities reported**
- Full legacy backend pytest suite still contains non-unit/manual tests unsuitable for CI without async plugin refactor; scoped test gate fixed via `pytest.ini`.

---

## Risk Posture After Changes

- **Before**: insecure-by-default API exposure and unbounded request path.
- **After**: bounded, validated, rate-limited, optionally authenticated API with better observability and deterministic automated checks on critical path.
