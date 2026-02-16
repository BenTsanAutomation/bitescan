# BiteScan: Streamlined Feature Set
**Core Mission:** Help people know what food fits their macros and what meal to get from menus

---

## 🎯 The Problem We Solve

**User Story:**
> "I'm at Chipotle. I have 600 calories and 40g protein left today. Which bowl should I order?"

**Current Solution:** Open MyFitnessPal, manually search each ingredient, calculate totals, compare options.  
**BiteScan Solution:** Scan menu → See instant macro fit → Get recommendation.

---

## ✨ Essential Features (Must-Have)

### 1. **Daily Macro Dashboard** ⭐ CRITICAL
**What:** Live running total of today's macros.

**UI:**
```
┌───────────────────────────────────┐
│  TODAY - FEB 11                   │
│                                   │
│  🔥 1,450 / 2,000 cal  [▓▓▓▓▓░░░] │
│  💪   95 / 150g protein [▓▓▓▓▓▓░░] │
│  🍞  180 / 200g carbs   [▓▓▓▓▓▓▓▓░] │
│  🥑   45 / 65g fat      [▓▓▓▓▓▓░░░] │
│                                   │
│  REMAINING:                       │
│  550 cal | 55g P | 20g C | 20g F │
│                                   │
│  [➕ Scan Food]  [📝 Add Manual]  │
└───────────────────────────────────┘
```

**Why Essential:** Without this, the app is just a food identifier. This makes it a macro tracker.

---

### 2. **Set Macro Goals** ⭐ CRITICAL
**What:** One-time setup to define daily targets.

**UI (Onboarding):**
```
What are your daily goals?

Daily Calories:  [2000____] cal
Protein:         [150_____] g
Carbs:           [200_____] g
Fat:             [65______] g

Or choose preset:
○ Cut (weight loss): 1800 cal, 45/25/30
○ Bulk (muscle gain): 2800 cal, 40/30/30
○ Maintain: 2200 cal, 40/30/30
● Custom

[Save & Continue]
```

**Why Essential:** The app needs to know your targets to show "remaining" macros.

---

### 3. **Scan → Instant Macro Fit** ⭐ CRITICAL
**What:** After scanning, immediately show if it fits today's budget.

**UI:**
```
🍔 BIG MAC
550 cal | 25g P | 46g C | 30g F

┌─────────────────────────────────┐
│ MACRO FIT:  🟡 BORDERLINE       │
│                                 │
│ This will use:                  │
│ • 550 cal (28% of remaining)    │
│ • 25g protein (45% of remaining)│
│ • 46g carbs (230% ⚠️ OVER!)     │
│ • 30g fat (150% ⚠️ OVER!)       │
│                                 │
│ 💡 TIP: You're low on carbs/fat │
│    budget. Consider a protein   │
│    bowl instead.                │
│                                 │
│ [✓ Log It Anyway] [❌ Cancel]   │
└─────────────────────────────────┘
```

**Why Essential:** This is the core value prop. Users decide instantly if they can eat it.

---

### 4. **Menu Scan Mode** ⭐ CRITICAL
**What:** Scan entire menu, pick the best item.

**Flow:**
1. User taps "Menu Mode" in camera
2. Scans restaurant menu (e.g., McDonald's board)
3. AI detects all items
4. App shows list with macro fit scores
5. User sees "Best Match" recommendation

**UI:**
```
🍔 MCDONALD'S MENU (8 items)

Sorted by Best Fit (550 cal, 55g P remaining):

1. 🟢 ARTISAN CHICKEN SANDWICH    96% FIT ⭐
   430 cal | 37g P | 44g C | 16g F
   [View Details] [+ Log This]

2. 🟢 PREMIUM GRILLED CHICKEN     94% FIT
   350 cal | 37g P | 42g C | 7g F
   [View Details] [+ Log This]

3. 🟡 6-PIECE NUGGETS              78% FIT
   270 cal | 15g P | 16g C | 16g F
   [View Details] [+ Log This]

4. 🔴 BIG MAC                      42% FIT
   550 cal | 25g P | 46g C | 30g F
   (Over on carbs/fat)
   [View Details] [+ Log This]

[Rescan Menu] [Filter Options]
```

**Why Essential:** This is the "killer feature" that sets BiteScan apart from MyFitnessPal.

---

### 5. **Manual Entry** ⭐ CRITICAL
**What:** When AI fails or for pre-packaged foods.

**UI:**
```
ADD MANUALLY

Food Name:  [Protein Bar___________]

Calories:   [200____] cal
Protein:    [20_____] g
Carbs:      [15_____] g
Fat:        [8______] g

Time:       [Now ▼] or [Custom Time]

[Save to Today]  [Cancel]
```

**Why Essential:** AI isn't perfect. Users need a fallback.

---

## 💎 Nice-to-Have Features (High Value)

### 6. **Quick Add Favorites**
**What:** One-tap to log frequently eaten foods.

**UI:**
```
QUICK ADD

⭐ FAVORITES:
• Chipotle Bowl (usual)      [+ Add 680 cal]
• Starbucks Egg Bites (2)    [+ Add 340 cal]
• Protein Shake (1 scoop)    [+ Add 120 cal]

📅 RECENT (Last 7 Days):
• Chicken Breast, 6oz        [+ Add 280 cal]
• Greek Yogurt, Fage         [+ Add 140 cal]

[Manage Favorites]
```

**Why Valuable:** Saves time for repeat meals (breakfast, protein shakes, etc.).

---

### 7. **Food Comparison**
**What:** Compare 2-3 menu items side-by-side.

**UI:**
```
COMPARE (2 items)

                BIG MAC    GRILLED CHICKEN
Calories          550           350
Protein           25g           37g  ✓ WINNER
Carbs             46g           42g  ✓ WINNER
Fat               30g            7g  ✓ WINNER

Macro Fit         42%           94%  ⭐ BEST FIT

[Log Big Mac]  [Log Chicken]  [Add 3rd Item]
```

**Why Valuable:** Helps indecisive users make better choices.

---

### 8. **Weekly Summary**
**What:** See macro trends over time.

**UI:**
```
WEEK OF FEB 5-11

        Mon  Tue  Wed  Thu  Fri  Sat  Sun
Cals:   ✓    ✓    ✓    ✗    ✓    ✗    ✗
Protein:✓    ✓    ✓    ✓    ✓    ✗    ✓

✅ You hit protein goal 6/7 days!
⚠️  Weekend calories over target

Avg Daily: 2,150 cal | 145g P

[View Detailed Breakdown]
```

**Why Valuable:** Motivates users, shows progress.

---

### 9. **Restaurant Database (Cached)**
**What:** Pre-cached nutrition data for major chains.

**How It Works:**
1. User scans "McDonald's" sign
2. App recognizes logo → pulls from local DB
3. Shows menu instantly (no AI call needed)
4. Saves 95% of API costs for repeat restaurants

**Database:**
- Top 50 chains (McDonald's, Chipotle, Starbucks, etc.)
- ~200 items per chain
- Update monthly via API

**Why Valuable:** Faster, cheaper, more accurate than AI for known restaurants.

---

### 10. **Portion Adjustment**
**What:** Scale nutrition up/down for different portions.

**UI:**
```
🍕 MARGHERITA PIZZA
1 slice: 250 cal | 10g P | 30g C | 10g F

How many slices? [▼ 2]

TOTAL: 500 cal | 20g P | 60g C | 20g F

[Log 2 Slices]
```

**Why Valuable:** Most foods are eaten in non-standard portions.

---

## ⏳ Later / Maybe Features (Lower Priority)

### 11. **Barcode Scanner**
- Scan packaged food barcodes
- Pull from Open Food Facts database
- Faster than taking photo

**Why Later:** Niche use case (home eating), but valuable for completeness.

---

### 12. **Meal Planning**
- Plan tomorrow's meals
- See projected macros
- Get shopping list

**Why Later:** Complex feature, lower ROI than core tracking.

---

### 13. **Social Features**
- Share meals with friends
- Leaderboards (protein kings)
- Community challenges

**Why Later:** Only valuable with large user base.

---

### 14. **Apple Health / MyFitnessPal Sync**
- Export daily logs
- Import exercise calories
- Two-way sync

**Why Later:** Integration overhead, maintenance burden.

---

## 🚫 Features to Avoid (Out of Scope)

### ❌ Recipe Builder
**Why:** Not core to "scan menu → fit macros" use case.

### ❌ Workout Tracking
**Why:** Plenty of workout apps exist. Stay focused on nutrition.

### ❌ Calorie Burn Estimation
**Why:** Inaccurate and distracting from macro tracking.

### ❌ Social Media Integration (Instagram, TikTok)
**Why:** Privacy concerns, feature creep.

### ❌ Grocery Price Comparison
**Why:** Outside core value prop.

---

## 📱 Minimal Feature Set (MVP for Launch)

If you had to ship **tomorrow** with only 3 features:

1. **Daily Macro Dashboard** (see today's total)
2. **Scan → Instant Fit** (scan food → see if it fits)
3. **Manual Entry** (fallback when AI fails)

**This alone** would be valuable enough for early adopters.

---

## 🎯 Recommended Phased Rollout

### **Phase 1: Launch (Week 1-2)**
- ✅ Daily macro dashboard
- ✅ Set macro goals
- ✅ Scan → instant fit
- ✅ Manual entry
- ✅ Basic scan history

**Target:** 100 beta users, validate core value prop

---

### **Phase 2: Differentiation (Week 3-4)**
- ✅ Menu scan mode (killer feature)
- ✅ Food comparison
- ✅ Quick add favorites
- ✅ Restaurant database (top 20 chains)

**Target:** 1,000 users, early revenue

---

### **Phase 3: Retention (Month 2-3)**
- ✅ Weekly summary / analytics
- ✅ Portion adjustment
- ✅ Barcode scanner
- ✅ Apple Health sync

**Target:** 10,000 users, product-market fit

---

### **Phase 4: Growth (Month 4-6)**
- ✅ Meal planning
- ✅ Social features (optional)
- ✅ Premium tier
- ✅ Integrations (MyFitnessPal, etc.)

**Target:** 50,000+ users, scale revenue

---

## 💡 Key Insights

### What Makes BiteScan Different?
**MyFitnessPal:** Manual entry, huge food database, tedious.  
**Lose It:** Similar to MFP, better UI.  
**Cronometer:** Super detailed, hardcore users.  
**BiteScan:** **Scan menu → instant recommendation.** Zero manual work.

### The "Aha!" Moment:
User scans McDonald's menu, app says "Get the Artisan Chicken, it's 96% fit" → User orders it → Hits macro goal → Comes back tomorrow.

### The Core Loop:
1. Set macro goals (one time)
2. Scan menu when eating out
3. See instant fit + recommendation
4. Log the meal
5. Track progress toward daily goal
6. Repeat tomorrow

**If we nail this loop, everything else is gravy.**

---

## 🎬 Summary

**Build This First:**
1. Daily macro tracking (core value)
2. Menu scan mode (differentiation)
3. Instant fit scoring (decision support)

**Avoid:**
- Feature creep (workout tracking, recipes, etc.)
- Competing with MFP on breadth (100M foods)
- Over-engineering (meal planning, social features)

**Focus On:**
- Making menu scanning **magical** (10x better than manual entry)
- Accurate macro tracking (trust is everything)
- Speed (scan → decision in <5 seconds)

**Tagline Ideas:**
- "Scan any menu. Know what fits."
- "Your macros, solved in seconds."
- "Stop guessing. Start hitting your goals."

---

**Next Step:** Build the Daily Macro Dashboard + Menu Scan Mode. Everything else can wait.
