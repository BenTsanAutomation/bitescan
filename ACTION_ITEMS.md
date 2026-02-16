# Action Items (Remaining)

## P0 (High priority)

1. **Replace deprecated Gemini SDK path (`google.generativeai`)**
   - Migrate to `google.genai` and update provider wrapper tests.
   - Reason: current SDK emits deprecation warnings and has end-of-support notice.

2. **Introduce proper auth strategy for production clients**
   - Replace shared token model with signed user/session auth (JWT/OAuth gateway) if app is internet-exposed.
   - Reason: shared token is acceptable for internal service calls but not end-user auth.

3. **Image content-type validation and optional malware scanning hook**
   - Validate magic bytes + MIME type after decode.
   - Reason: base64/size checks are in place, but deeper file-type validation is still needed.

## P1 (Medium priority)

4. **Move rate limiting to distributed store (Redis) if horizontally scaling**
   - Current in-memory limiter is per-process only.

5. **Split provider adapters into separate modules + contract tests**
   - Improve maintainability and enable provider-specific retries/backoff policies.

6. **Add OpenTelemetry metrics/traces**
   - Track provider latency, error rates, and throttle events.

7. **CI pipeline enforcement**
   - Add required checks: `pytest`, `tsc --noEmit`, `npm audit`.

## P2 (Nice to have)

8. **Frontend UX hardening**
   - Add specific user-facing messages for 401/429/timeout conditions.

9. **Backend schema versioning for response contracts**
   - Prepare for backward-compatible API evolution.

10. **Data lifecycle policy and privacy controls**
   - Document retention/deletion and user data export policy for compliance.
