# BiteScan Implementation Task - Codex Sub-Agent

## Mission
Implement core macro tracking features + enhanced grade styling for BiteScan mobile app.

## Context
- **App:** React Native (Expo) food nutrition scanner
- **Backend:** FastAPI (Python), already working with Gemini API
- **Database:** SQLite (local, client-side)
- **Current State:** Basic food scanning works, but missing macro tracking features
- **Target Users:** People tracking daily macros (calories, protein, carbs, fat)

## What Already Works
✅ Camera capture
✅ AI food recognition (Gemini 2.0 Flash)
✅ Health grade calculation (S, A, B, C, D, F)
✅ User preferences (dietary goals)
✅ Local scan history (SQLite)
✅ Basic UI with animations

## Implementation Requirements

### 1. Daily Macro Dashboard (PRIORITY 1)
**Location:** Home screen (App.tsx)

**UI Design:**
```
┌───────────────────────────────────┐
│  TODAY - FEB 11                   │
│                                   │
│  🔥 1,450 / 2,000 cal             │
│  [▓▓▓▓▓▓▓░░░] 73%                 │
│                                   │
│  💪   95 / 150g protein           │
│  [▓▓▓▓▓▓░░░░] 63%                 │
│                                   │
│  🍞  180 / 200g carbs             │
│  [▓▓▓▓▓▓▓▓▓░] 90%                 │
│                                   │
│  🥑   45 / 65g fat                │
│  [▓▓▓▓▓▓▓░░░] 69%                 │
│                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  REMAINING TODAY:                 │
│  550 cal | 55g P | 20g C | 20g F │
│                                   │
│  [📸 Scan Food]  [➕ Add Manual]  │
└───────────────────────────────────┘
```

**Features:**
- Show today's total vs goals
- Animated progress bars (smooth fill animation)
- Color coding: green (<80%), yellow (80-100%), red (>100%)
- Calculate remaining macros
- Reset at midnight (user timezone)

**Database Changes:**
```sql
CREATE TABLE daily_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL,  -- YYYY-MM-DD
  target_calories INTEGER NOT NULL,
  target_protein REAL NOT NULL,
  target_carbs REAL,
  target_fat REAL,
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, date)
);

CREATE TABLE meal_entries (
  id TEXT PRIMARY KEY,
  log_id TEXT NOT NULL,
  scan_id TEXT,  -- nullable for manual entries
  food_name TEXT NOT NULL,
  calories INTEGER NOT NULL,
  protein REAL NOT NULL,
  carbs REAL NOT NULL,
  fat REAL NOT NULL,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (log_id) REFERENCES daily_logs(id)
);
```

---

### 2. Macro Goals Setup (PRIORITY 1)
**Location:** Onboarding flow (new screen) + Settings

**UI Design:**
```
┌─────────────────────────────────┐
│  SET YOUR DAILY GOALS           │
│                                 │
│  Daily Calories:                │
│  [2000____________] cal         │
│                                 │
│  Protein:                       │
│  [150_____________] g           │
│                                 │
│  Carbs: (optional)              │
│  [200_____________] g           │
│                                 │
│  Fat: (optional)                │
│  [65______________] g           │
│                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  Or choose preset:              │
│  ○ Cut (1800 cal, 150g P)       │
│  ○ Bulk (2800 cal, 200g P)      │
│  ○ Maintain (2200 cal, 150g P)  │
│  ● Custom (above)               │
│                                 │
│  [Save & Continue]              │
└─────────────────────────────────┘
```

**Features:**
- Numeric inputs with validation
- Preset buttons (auto-fill fields)
- Save to user preferences
- Show on first launch or when no goals set

**Database Changes:**
```sql
ALTER TABLE users ADD COLUMN macro_goals_json TEXT DEFAULT '{"calories":2000,"protein":150,"carbs":null,"fat":null}';
```

---

### 3. Scan → Instant Macro Fit (PRIORITY 1)
**Location:** ResultsScreen.tsx (after AI analysis)

**UI Design:**
```
┌─────────────────────────────────┐
│  🍔 BIG MAC                     │
│  550 cal | 25g P | 46g C | 30g F│
│                                 │
│  ┌─────────────────────────────┐│
│  │ MACRO FIT: 🟡 BORDERLINE    ││
│  │                             ││
│  │ This will use:              ││
│  │ • 550 cal  (100% ⚠️)        ││
│  │ • 25g protein (45% ✓)       ││
│  │ • 46g carbs (230% 🔴 OVER!) ││
│  │ • 30g fat (150% 🔴 OVER!)   ││
│  │                             ││
│  │ 💡 TIP: Low on carbs/fat    ││
│  │    budget. Try a protein    ││
│  │    bowl instead.            ││
│  └─────────────────────────────┘│
│                                 │
│  [✓ Log It]  [❌ Cancel]        │
└─────────────────────────────────┘
```

**Logic:**
1. Get today's remaining macros from daily_log
2. Calculate fit percentage for each macro: `(item_value / remaining) * 100`
3. Overall fit score: weighted average (calories 40%, protein 40%, carbs 10%, fat 10%)
4. Traffic light: 🟢 <80%, 🟡 80-120%, 🔴 >120%
5. Show smart tips based on what's lacking

---

### 4. Enhanced Grade Styling (PRIORITY 2)
**Location:** GradeDisplay.tsx component

**Current Design:** Simple letter in circle
**New Design:** Dopamine-inducing tier system

**S-Tier (Legendary):**
```tsx
- 🌟 Gold shimmer animation
- Particle effects (sparkles)
- Gradient background: gold → orange
- Pulsing glow effect
- Sound effect (optional): "ding!"
- Confetti burst on first appearance
```

**A-Tier (Excellent):**
```tsx
- 💎 Silver shimmer
- Subtle particle effects
- Gradient: silver → light blue
- Gentle glow
```

**B-Tier (Good):**
```tsx
- ✅ Green gradient
- Simple fade-in animation
- No particles
```

**C-Tier (Average):**
```tsx
- 🟡 Yellow/orange
- Flat color (no gradient)
- No animations
```

**D-Tier (Poor):**
```tsx
- 🟠 Orange → red gradient
- Warning icon
- Shake animation
```

**F-Tier (Bad):**
```tsx
- 🔴 Red with warning stripes
- Strong shake + fade
- "⚠️" icon overlay
```

**Implementation:**
- Use React Native Reanimated 2 for smooth 60fps animations
- Gradient backgrounds with LinearGradient
- Particle system using Animated.View array
- Haptic feedback on S/A grades (Haptics.impactAsync)

---

### 5. Manual Entry (PRIORITY 2)
**Location:** New screen (ManualEntryScreen.tsx)

**UI Design:**
```
┌─────────────────────────────────┐
│  ADD MANUALLY                   │
│                                 │
│  Food Name:                     │
│  [Protein Bar______________]    │
│                                 │
│  Calories:                      │
│  [200_____] cal                 │
│                                 │
│  Protein:                       │
│  [20______] g                   │
│                                 │
│  Carbs:                         │
│  [15______] g                   │
│                                 │
│  Fat:                           │
│  [8_______] g                   │
│                                 │
│  Time: [Now ▼]                  │
│                                 │
│  [Save to Today]  [Cancel]      │
└─────────────────────────────────┘
```

**Features:**
- Simple form with validation
- Auto-focus on food name
- Numeric keyboards for macro inputs
- Optionally save as favorite for later
- Add directly to today's log

---

### 6. Menu Scan Mode (PRIORITY 3)
**Location:** CameraScreen.tsx + new ResultsScreen variant

**Changes to AI Prompt:**
```python
MENU_SCAN_PROMPT = """Analyze this restaurant menu image and list ALL food items visible.

For each item, provide:
- Name
- Estimated calories, protein, carbs, fat
- Health grade (S/A/B/C/D/F)

Return as JSON array of food items.
User's remaining macros today: {remaining_cals} cal, {remaining_protein}g protein

Rank items by best fit for these remaining macros.
"""
```

**UI Changes:**
- Toggle "Menu Mode" button in camera
- After scan, show list of ALL detected items (not just single dish)
- Each item shows macro fit score
- "Best Match" badge on top item
- Multi-select capability (future)

---

## Enhanced Features (If Time Permits)

### 7. Quick Stats Widget
Show on home screen above macro dashboard:
```
┌────────────────────────────┐
│  THIS WEEK                 │
│  Protein goal: 5/7 days ✓  │
│  Avg: 1,920 cal/day        │
└────────────────────────────┘
```

### 8. Today's Meal History
Show below macro bars:
```
TODAY'S MEALS:
• 8:00 AM - Oatmeal & Eggs     (450 cal)
• 12:30 PM - Chipotle Bowl     (680 cal)
• 3:00 PM - Protein Shake      (120 cal)
                              --------
                              1,250 cal
```

---

## Technical Requirements

### Code Quality
- TypeScript strict mode
- Proper error handling
- Loading states for all async operations
- Offline support (queue changes, sync when online)
- Performance: 60fps animations, <100ms response times

### Testing
- Manual testing on both iOS and Android
- Test edge cases: 0 macros remaining, over budget, etc.
- Test midnight rollover logic

### Database Migrations
- Add new tables (daily_logs, meal_entries)
- Add macro_goals_json to users table
- Migration script to preserve existing data

---

## File Structure

### New Files to Create:
```
src/screens/MacroGoalsScreen.tsx       # Goal setup
src/screens/ManualEntryScreen.tsx      # Manual food entry
src/components/MacroDashboard.tsx      # Daily progress widget
src/components/MacroFitCard.tsx        # Fit analysis display
src/components/EnhancedGradeDisplay.tsx # Dopamine-inducing grades
src/services/macroTracking.ts          # Business logic
src/utils/macroCalculations.ts         # Fit scoring algorithms
```

### Files to Modify:
```
App.tsx                         # Add macro dashboard to home
src/screens/ResultsScreen.tsx   # Add macro fit analysis
src/screens/CameraScreen.tsx    # Add menu mode toggle
src/services/database.ts        # Add new tables + queries
src/components/GradeDisplay.tsx # Replace with enhanced version
backend/server.py               # Add menu scan mode prompt
```

---

## Deliverables

### Must Have:
1. ✅ Daily macro dashboard (home screen)
2. ✅ Macro goals setup (onboarding + settings)
3. ✅ Instant macro fit analysis (after scan)
4. ✅ Enhanced grade styling (S-F tiers with animations)
5. ✅ Manual entry screen
6. ✅ Database migrations

### Nice to Have:
7. Menu scan mode (multi-item detection)
8. Quick stats widget
9. Today's meal history list

---

## Success Criteria

**User Flow:**
1. User opens app → sees macro dashboard with today's progress
2. User taps "Scan Food" → takes photo of Big Mac
3. App shows instant fit: "🟡 Borderline - 100% of remaining calories"
4. User decides to log it anyway → updates dashboard in real-time
5. Dashboard shows new totals, remaining macros decrease
6. User sees dopamine hit: food grade is A-tier with shimmer effect ✨

**Visual Polish:**
- Smooth animations (60fps)
- Haptic feedback on important actions
- Clear visual hierarchy
- Consistent color scheme
- Delightful micro-interactions

---

## Notes for Codex Agent

- **User's IP:** 10.0.0.226 (backend accessible from phone)
- **Backend running:** http://10.0.0.226:8420
- **Metro Bundler:** User will run manually in terminal
- **Database:** SQLite, client-side (no server DB yet)
- **Current Grade Bug:** Gemini prompt was fixed (JSON escaping issue)

**Existing Codebase:**
- ~4,248 lines of code
- Well-structured (screens, components, services)
- Theme system already in place (colors, spacing, etc.)
- Animations already used (LeafParticles, FadeSlide)

**User Preference:**
- MORE dopamine on high grades (S/A should feel amazing)
- Focus on macro tracking as core value
- Clean, modern UI (current design is good, enhance it)

---

## Timeline Estimate
- Daily macro dashboard: 2-3 hours
- Macro goals setup: 1 hour
- Instant fit analysis: 2 hours
- Enhanced grades: 2-3 hours
- Manual entry: 1 hour
- Testing + polish: 2 hours

**Total:** 10-12 hours of focused work

---

**GO TIME! 🚀**

Build the macro tracking features that make BiteScan the best food scanner for hitting daily nutrition goals.
