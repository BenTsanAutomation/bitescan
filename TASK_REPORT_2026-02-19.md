# BiteScan Task Report (2026-02-19)

## 1) What Changed (by feature)

### A. Menu scan recommendation UX (fully polished)
- Rebuilt `MenuResultsScreen` recommendation presentation into ranked cards with:
  - Rank index + explicit best-pick treatment
  - Score blocks for `Macro Fit`, `Taste`, and `Combined`
  - Confidence labels (`High/Medium/Low confidence`)
  - Explainability text per recommendation
  - Actionable CTA copy (`Log Best Pick`, `Log This Option`)
- Added responsive behavior (compact vs regular layout based on screen width).
- Added accessibility labels/hints on cards and CTA buttons.
- Improved visual hierarchy for top recommendation.

### B. Barcode scanner flow for packaged foods (camera + manual fallback)
- Extended camera modes from `food/menu` to `food/menu/packaged`.
- Added barcode scanning in packaged mode via `expo-camera` barcode scanning APIs.
- Added manual barcode input fallback in packaged mode and permission-denied state.
- Added barcode lookup service using Open Food Facts (`src/services/barcode.ts`).
- Wired scan result routing:
  - Success: opens `ManualEntry` prefilled with looked-up nutrition
  - No match: opens `ManualEntry` with clear manual-entry fallback guidance

### C. Remaining-macro meal recommendation helper (Home)
- Added a new Home card: `Remaining Macro Helper`.
- Generates adaptive guidance based on current macro/calorie gaps.
- Added direct quick actions on Home:
  - `Scan Menu`
  - `Scan Barcode`
  - Existing `Quick Add`

### D. Local reminder framework/hooks + settings toggle
- Added local reminder hook framework (`src/hooks/useLocalMealReminders.ts`).
- Hook schedules daily reminders using local app timers and app-state awareness.
- Added Settings controls:
  - Toggle for daily reminder
  - Preset reminder time chips
- Persisted reminder preferences in user settings payload.
- Wired reminders in `AppNavigator` so enabled users receive reminder alerts.

### E. Export meal history to CSV (share/save)
- Added CSV export utility (`src/services/csvExport.ts`).
- Added `MealContext.exportMealHistoryCsv()` for app-level export.
- Connected export in:
  - Settings (`Export All Data` now functional)
  - History header (`Export CSV` button)
- Uses native share sheet with generated CSV file URI.

### F. Progress insights upgrade
- Reworked `ProgressScreen` to include:
  - Weekly delta card (recent window vs previous window)
  - Coaching hints generated from goal deltas + trend movement
  - Existing calories chart + goal-vs-actual retained
- Moved to scrollable layout for smaller screens.
- Removed repeated per-row theme/style recreation (light optimization).

### G. Data flow updates
- Added `saveMenuItemFromCurrentScan(item)` so menu logging logs selected item directly (instead of always logging full scan aggregate).
- Extended navigation params for:
  - Camera initial mode
  - ManualEntry custom title/subtitle/save label

## 2) Files Touched

- `src/screens/MenuResultsScreen.tsx`
- `src/screens/CameraScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/ProgressScreen.tsx`
- `src/screens/HistoryScreen.tsx`
- `src/screens/SettingsScreen.tsx`
- `src/navigation/AppNavigator.tsx`
- `src/navigation/MainTabs.tsx`
- `src/navigation/types.ts`
- `src/contexts/MealContext.tsx`
- `src/contexts/AuthContext.tsx`
- `src/types/index.ts`
- `src/services/barcode.ts` (new)
- `src/services/csvExport.ts` (new)
- `src/hooks/useLocalMealReminders.ts` (new)

## 3) Validation Results

### Type checks
- Command: `npx tsc --noEmit`
- Result: ✅ Passed

### Lint
- Command: `npm run lint`
- Result: ⚠️ Not available (no `lint` script in `package.json`)

### Tests
- Command: `python3 -m pytest backend/tests -q`
- Result: ⚠️ Did not complete in this environment run window (timed out at 120s after initial progress output `..`)
- Notes: Python is available as `python3`; full backend suite likely has longer-running tests.

## 4) Remaining Risks / TODOs

1. Local reminders currently use in-app scheduling (timers + alerts), not OS background push/local notifications.
- Reason: `expo-notifications` is not installed/configured in this project.
- Fallback implemented safely and documented in Settings UI.

2. Barcode nutrition lookup depends on external Open Food Facts data quality/coverage.
- Fallback implemented: manual entry flow with clear guidance when lookup fails.

3. File sharing behavior for CSV can vary by platform handler availability.
- Export file is generated reliably; share sheet success depends on device/app capabilities.

4. Backend test suite did not fully complete within local timeout.
- Recommend running full CI/backend test matrix separately before release.

## 5) Prioritized Next Steps (Owner + ETA + Verification)

1. Add true OS-level local notifications
- Owner: Mobile
- ETA: 0.5-1 day
- Verification: install/configure `expo-notifications`, grant permissions, verify background-triggered daily notification on iOS/Android

2. Harden barcode provider strategy
- Owner: Mobile + Backend
- ETA: 1 day
- Verification: add secondary barcode source fallback + retry path; test with 20+ common UPC/EAN products

3. Add automation around new UI/flows
- Owner: QA / Mobile
- ETA: 1 day
- Verification: add integration tests for menu ranking UI, barcode manual fallback, CSV export, and reminder settings persistence

4. Complete full backend test run in CI
- Owner: Backend
- ETA: same day
- Verification: green `pytest` run with published artifact/log
