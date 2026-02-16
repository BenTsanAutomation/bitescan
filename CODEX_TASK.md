# BiteScan Upgrade Task

## Context
BiteScan is an Expo/React Native food scanning app at `/home/deez/.openclaw/workspace/bitescan/`.
- Frontend: React Native (Expo) with TypeScript
- Backend: FastAPI Python server at `backend/server.py`
- Key files: `src/screens/`, `src/components/`, `src/services/`, `src/types/`, `src/utils/`

## Competitor Reference (Cal AI)
Cal AI shows: daily tracking dashboard with circular progress rings for calories/protein/carbs/fat remaining, week calendar selector, streak counter, bottom tab navigation (Home/Progress/+Scan/Group/Profile), and a "Recently uploaded" feed showing scanned meals.

---

## ALL FIXES AND IMPROVEMENTS NEEDED

### 1. Code Bug Fixes (backend/server.py)

**A. Calorie/macro consistency validation**
- After AI returns nutrition, validate that `calories ≈ protein*4 + carbs*4 + fat*9` (within ±15% tolerance)
- If mismatch, recalculate calories from macros
- Add this in `_validated_food_items()`

**B. Grade validation**
- AI might return "A+", "B-", etc. Current `[:1].upper()` silently truncates
- Add explicit mapping: "A+" → "A", "B-" → "B", anything invalid → "C"

**C. Expand crowd taste baselines**
- `CROWD_TASTE_BASELINES` only has 9 entries, most foods default to 62
- Expand to at least 40-50 common foods (burrito, bowl, taco, pasta, rice, sandwich, wrap, soup, curry, noodles, poke, acai, oatmeal, pancakes, eggs, bacon, fish, salmon, shrimp, lobster, lamb, pork, wings, fries, nachos, quesadilla, hummus, falafel, kebab, gyro, pho, pad thai, fried rice, dumpling, spring roll, bibimbap, teriyaki, tempura, miso, edamame, etc.)

**D. Multi-item prompt improvement**
- Update `ANALYSIS_PROMPT` to explicitly instruct the AI to break composite meals into individual components
- e.g., "For composite meals like bowls or plates, break down into individual components (rice, protein, toppings, sauces, etc.) rather than listing as a single item"

**E. imageToBase64 robustness (frontend: src/services/api.ts)**
- Add error handling around the fetch→blob→FileReader pipeline
- Add a fallback using expo-file-system's readAsStringAsync with base64 encoding

### 2. New Daily Tracking Dashboard UI

**A. Create `src/screens/HomeScreen.tsx`** — Main daily dashboard
- Circular progress rings for: Calories (large, center), Protein, Carbs, Fat (smaller, row below)
- Show "X calories left" / "Xg protein left" etc.
- Week calendar selector (horizontal scroll, highlight today)
- "Recently uploaded" section showing today's scanned meals as cards
- Streak counter badge (top right)

**B. Create `src/components/CircularProgress.tsx`**
- Reusable SVG circular progress ring component
- Props: progress (0-1), size, strokeWidth, color, label, value text
- Animated fill on mount

**C. Create `src/components/WeekCalendar.tsx`**
- Horizontal day selector showing 7 days
- Highlight selected day, show dot indicator for days with logged meals

**D. Create `src/components/MealCard.tsx`**
- Compact card for "Recently uploaded" list
- Shows: food image thumbnail, meal name, time, calories, mini macro badges (P/C/F)

### 3. Bottom Tab Navigation

**A. Update `App.tsx`** to use a bottom tab navigator
- Tabs: Home (dashboard), Progress (placeholder), Scan (+button center), History (placeholder), Profile/Settings
- The center Scan button should be a raised FAB-style button
- Use the existing CameraScreen for the Scan tab

### 4. Streak & Gamification

**A. Add streak tracking to database (src/services/database.ts)**
- Track consecutive days with at least 1 scan
- Store in SQLite: `user_streaks` table (user_id, current_streak, longest_streak, last_active_date)

**B. Show streak badge on HomeScreen**

### 5. Progress Screen (basic)

**A. Create `src/screens/ProgressScreen.tsx`**
- Weekly calorie/macro summary bars
- Simple bar chart showing daily calories for the past 7 days
- Average macros for the week

### 6. UI Polish

- Use the existing theme (src/theme/colors.ts) consistently
- All new components should use the existing `colors`, `spacing`, `borderRadius`, `typography`, `shadows` from theme
- Animations: use React Native Animated API (already used in existing code)
- The circular progress rings should match Cal AI's clean aesthetic (dark ring on light background)

---

## File Structure Expected
```
src/
  components/
    CircularProgress.tsx (NEW)
    WeekCalendar.tsx (NEW)
    MealCard.tsx (NEW)
    ... (existing)
  screens/
    HomeScreen.tsx (NEW)
    ProgressScreen.tsx (NEW)
    ... (existing)
  services/
    database.ts (UPDATE - add streak tracking)
    api.ts (UPDATE - fix imageToBase64)
  types/
    index.ts (UPDATE - add streak types)
App.tsx (UPDATE - add tab navigation)
backend/
  server.py (UPDATE - fixes listed above)
```

## Rules
- Do NOT delete or break existing functionality
- Keep all existing screens working
- Use existing theme tokens everywhere
- TypeScript strict — no `any` types where avoidable
- Test that imports resolve correctly
