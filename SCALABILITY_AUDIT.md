# BiteScan Scalability & Feature Audit
**Date:** 2026-02-11  
**Scope:** Production readiness for 10,000 concurrent users

---

## 📊 Current State

### Codebase Overview
- **Lines of Code:** ~4,248 (frontend + backend)
- **Backend:** FastAPI (Python 3.10), 476 lines
- **Frontend:** React Native (Expo), TypeScript
- **Database:** SQLite (local, client-side)
- **AI Provider:** Google Gemini 2.0 Flash

### Current Features
✅ **Working Features:**
1. Camera capture for food images
2. AI-powered food recognition and nutrition analysis
3. Health grade calculation (S, A, B, C, D, F)
4. User dietary goal tracking (10 goal types)
5. Personalized recommendations based on goals
6. Local scan history (SQLite, 30-day retention)
7. Multi-provider fallback (Gemini, Claude, OpenAI support)
8. CORS protection
9. Rate limiting (30 req/min per IP)
10. Request validation (Pydantic)

---

## 🚨 Critical Scalability Issues (10,000 Users)

### **BLOCKER 1: Backend is Single-Process**
- **Current:** Single uvicorn process on one machine
- **Problem:** Can't handle more than ~50-100 concurrent requests
- **Impact:** Complete service failure at 10K users

**Fix Required:**
- Deploy behind load balancer (Nginx/Cloudflare)
- Run multiple uvicorn workers (--workers 4)
- Consider containerization (Docker + K8s)
- Use managed hosting (Render, Railway, Fly.io)

---

### **BLOCKER 2: In-Memory Rate Limiting**
- **Current:** Python dict storing request times per IP
- **Problem:** Resets on server restart, not shared across workers
- **Impact:** Rate limits ineffective at scale

**Fix Required:**
- Migrate to Redis for distributed rate limiting
- Or use Cloudflare rate limiting (edge-level)

---

### **BLOCKER 3: No Database (Backend)**
- **Current:** All data stored client-side (SQLite on phone)
- **Problem:** No user data persistence, no cross-device sync
- **Impact:** Users lose data on app uninstall, can't sync across devices

**Fix Required:**
- Add PostgreSQL/MongoDB backend
- Implement user authentication (Firebase Auth, Supabase)
- Sync local SQLite with cloud DB

---

### **BLOCKER 4: Vision API Costs**
- **Current:** Direct calls to Gemini for every scan
- **Gemini Pricing:** ~$0.0008/image (2.0-flash)
- **Cost at scale:** 10K users × 5 scans/day = 50K scans/day = **$40/day = $1,200/month**

**Fix Required:**
- Add caching layer (Redis) for duplicate food images
- Implement batch processing for menu scans
- Add CDN caching for common foods (McDonald's menu, etc.)
- Consider fine-tuned smaller model for common foods

---

### **BLOCKER 5: Image Upload Size**
- **Current:** Max 8MB base64-encoded images
- **Problem:** High bandwidth usage, slow uploads on mobile networks
- **Impact:** Poor UX on 4G/3G, high CDN costs

**Fix Required:**
- Compress images client-side before upload (max 1920px width)
- Use WebP format instead of JPEG
- Add image CDN (Cloudflare Images, Imgix)

---

### **BLOCKER 6: No Persistent Sessions**
- **Current:** Single local user ("local-user")
- **Problem:** No multi-user support, no accounts
- **Impact:** Can't monetize, can't track usage analytics

**Fix Required:**
- Add authentication (email/password, Google, Apple Sign-In)
- Implement JWT or session tokens
- Add user profiles and settings sync

---

## ⚠️ Performance Issues

### Backend
1. **Synchronous File I/O:** Uses temp files, should use async file ops
2. **No Response Caching:** Repeated scans of same food hit API every time
3. **No CDN:** Static assets served from origin
4. **No Health Check Depth:** `/health` doesn't verify DB/AI connectivity

### Frontend
1. **No Image Optimization:** Full-res photos uploaded
2. **No Offline Support:** Requires network for all operations
3. **Aggressive 30-day Cleanup:** Could lose valuable history
4. **No Pagination:** Loads all 50 scans at once

---

## 🔒 Security Issues

### Critical
1. **No Authentication:** Anyone can call `/analyze` endpoint
2. **API Key Exposed:** GEMINI_API_KEY in `.env` (could be stolen)
3. **No HTTPS Enforced:** Running on HTTP (easy to intercept)
4. **No Input Sanitization:** User preferences not fully validated

### Moderate
1. **CORS Too Permissive:** Allows localhost origins in production
2. **No Request Size Limit:** Could DDoS with huge requests
3. **Error Messages Leak Info:** Stack traces visible in responses
4. **No Audit Logging:** Can't track who scanned what

---

## 📱 Current Feature Gaps (Macro Tracking Focus)

### Missing Core Features
1. **❌ No Manual Macro Input:** Can't manually enter nutrition if AI is wrong
2. **❌ No Daily Macro Targets:** No way to set "2000 cal, 150g protein" goals
3. **❌ No Running Total:** Doesn't track today's total macros across scans
4. **❌ No Macro Budget Display:** Can't see "500 cal left today"
5. **❌ No Meal Planning:** Can't plan tomorrow's meals
6. **❌ No Restaurant Menu Mode:** Doesn't optimize for scanning full menus
7. **❌ No Food Comparison:** Can't compare "Big Mac vs Whopper"
8. **❌ No Barcode Scanning:** Limited to photos only
9. **❌ No Favorites/Frequent Foods:** Can't quick-add "my usual Starbucks order"
10. **❌ No Export:** Can't export macro logs to CSV/MyFitnessPal

### Missing Menu-Scanning Features
1. **❌ No Multi-Item Selection:** Can't tap "I want items 3, 7, and 9"
2. **❌ No Best Fit Recommendation:** Doesn't suggest "Order #4, it's 95% match"
3. **❌ No Portion Adjustment:** Can't say "half portion" or "add extra rice"
4. **❌ No Price Integration:** Doesn't show cost alongside macros
5. **❌ No Restaurant Database:** Re-analyzes McDonald's menu every time

---

## ✨ Recommended Streamlined Features

### **Phase 1: Core Macro Tracking (MVP)**

#### 1. Daily Macro Dashboard
```
┌─────────────────────────────┐
│ TODAY'S MACROS              │
│ Calories:  1,450 / 2,000    │ [73% filled bar]
│ Protein:     95g / 150g     │ [63% filled bar]
│ Carbs:      180g / 200g     │ [90% filled bar]
│ Fat:         45g / 65g      │ [69% filled bar]
│                             │
│ [Scan Food]  [Add Manual]   │
└─────────────────────────────┘
```

**Implementation:**
- Add `DailyLog` table: date, user_id, target_cals, target_protein, etc.
- Add `MealEntry` table: log_id, scan_id, custom_name, macros, timestamp
- Show running total in home screen
- Reset at midnight (user's timezone)

---

#### 2. Macro Goals Setup (Onboarding)
```
What are your daily macro goals?

Calories:   [2000] cal/day
Protein:    [ 150] g/day
Carbs:      [ 200] g/day  (optional)
Fat:        [  65] g/day  (optional)

Or choose preset:
○ Weight Loss (1800 cal, high protein)
○ Muscle Gain (2500 cal, very high protein)
○ Maintenance (2000 cal, balanced)
● Custom (above)
```

**Implementation:**
- Add `macro_goals_json` to users table
- Default presets based on dietary science
- Calculate from age/weight/activity if available

---

#### 3. Menu Scan Mode
```
[Camera View]

📋 MENU MODE ON

Detected 8 items:

1. ✓ Big Mac         550 cal  25g P  [Select]
2. ✓ Quarter Pounder 520 cal  30g P  [Select]
3. ✓ McChicken       400 cal  14g P  [Select]
...

[Compare Selected (0)] [Find Best Match]
```

**Features:**
- Toggle "Menu Mode" in camera (scans entire menu, not single dish)
- Multi-select items
- Shows "Best Match" based on remaining macros
- "Compare" shows side-by-side nutrition

**Implementation:**
- Modify AI prompt: "List ALL food items visible, return array"
- Add selection checkboxes to results
- Calculate remaining budget: `target - consumed_today`
- Rank items by fit: `abs(remaining_cals - item_cals) + protein_bonus`

---

#### 4. Quick Add / Favorites
```
┌─────────────────────────────┐
│ QUICK ADD                   │
│                             │
│ Recent:                     │
│ • Chipotle Bowl (usual)     │ [+ Add]
│ • Starbucks Egg Bites       │ [+ Add]
│                             │
│ Favorites:                  │
│ ⭐ Chicken Breast (6oz)     │ [+ Add]
│ ⭐ Protein Shake (MyProtein)│ [+ Add]
│                             │
│ [Scan New Food]             │
└─────────────────────────────┘
```

**Implementation:**
- Add `favorites` table: user_id, food_name, macros_json, use_count
- Auto-add frequently scanned foods (>3 times)
- One-tap to add to today's log

---

#### 5. Smart Recommendations
```
🎯 MACRO ANALYSIS

✅ Great choice! This fits your goals.

You have left today:
• 550 calories
• 55g protein
• 20g carbs

💡 TIP: Add a protein shake (30g) to hit your target!

[Log This Meal] [Find Similar]
```

**Implementation:**
- Calculate remaining macros
- Show traffic light: 🟢 fits well, 🟡 borderline, 🔴 over budget
- Suggest complementary foods from database

---

#### 6. Manual Entry (Fallback)
```
AI couldn't identify this food? Add manually:

Food Name:    [________________]

Calories:     [____] cal
Protein:      [____] g
Carbs:        [____] g (optional)
Fat:          [____] g (optional)

[Save to Today's Log]
```

**Implementation:**
- Simple form with validation
- Optionally save as custom favorite
- Fallback when AI fails or for packaged foods

---

### **Phase 2: Power Features**

#### 7. Food Comparison
- Side-by-side nutrition table
- "Healthier Alternative" suggestions
- Price comparison (if available)

#### 8. Weekly Analytics
```
WEEK OF FEB 5-11

Avg Daily Calories: 1,920 / 2,000  (96%)
Protein Goal Hit:   5/7 days       (71%)
Best Day:           Tuesday ⭐
Needs Work:         Weekends

[View Detailed Breakdown]
```

#### 9. Restaurant Database
- Cache common restaurants (McDonald's, Chipotle, etc.)
- Instant lookup instead of AI analysis
- Community-contributed menus

#### 10. Barcode Scanner
- Quick scan packaged foods
- Pull nutrition from Open Food Facts database
- Faster than photo analysis

---

## 🏗️ Scalability Roadmap

### **Immediate (Week 1)**
1. Add daily macro tracking (most requested feature)
2. Implement macro goals setup
3. Add manual entry as fallback
4. Deploy to managed platform (Render/Railway)

### **Short-term (Month 1)**
1. Add Redis for caching & rate limiting
2. Implement user authentication (Firebase/Supabase)
3. Add menu scan mode
4. Build restaurant database (top 50 chains)
5. Migrate to PostgreSQL backend

### **Medium-term (Month 3)**
1. Add CDN for images (Cloudflare)
2. Implement food comparison
3. Add weekly analytics
4. Build favorites/quick-add system
5. Add barcode scanning

### **Long-term (Month 6+)**
1. Fine-tune custom vision model (reduce API costs)
2. Add meal planning
3. Build social features (share meals, leaderboards)
4. Add integrations (MyFitnessPal, Apple Health, etc.)
5. Launch premium tier

---

## 💰 Cost Estimates (10K Daily Active Users)

### Current Architecture (Will Fail)
- **Gemini API:** $1,200/month
- **Hosting:** $0 (won't scale)
- **Total:** $1,200/month + downtime

### Recommended Architecture
- **Gemini API (with caching):** $400/month (66% cache hit rate)
- **Redis Cache:** $15/month (Upstash)
- **PostgreSQL:** $25/month (Supabase)
- **Hosting:** $100/month (Railway/Render, 4 instances)
- **CDN:** $20/month (Cloudflare)
- **Auth:** $0 (Firebase free tier)
- **Total:** **$560/month** (~$0.056 per user/month)

### Revenue Potential
- **Free tier:** 5 scans/day
- **Premium:** $4.99/month (unlimited scans, meal planning, analytics)
- **If 10% convert:** $4,990/month revenue - $560 costs = **$4,430/month profit**

---

## 🎯 Recommended Priorities (Next 2 Weeks)

### Week 1: Make It Useful
1. ✅ Fix Gemini API bug (DONE)
2. **Add daily macro tracking** (core value prop)
3. **Add macro goals setup** (onboarding)
4. **Add manual entry** (when AI fails)
5. Deploy to production (Railway/Render)

### Week 2: Make It Scale
1. **Add menu scan mode** (key differentiator)
2. **Implement Redis caching**
3. **Add user authentication**
4. **Build restaurant database** (top 20 chains)
5. Add analytics tracking (PostHog/Mixpanel)

---

## 📋 Summary

### Current State: **Not Production Ready**
- Works for demo/MVP
- Will crash at 100+ concurrent users
- Missing core features (daily tracking, macro goals)

### Blockers to 10K Users:
1. Single-process backend (add load balancer + workers)
2. No database (add PostgreSQL)
3. No auth (add Firebase/Supabase)
4. High API costs (add caching)
5. No macro tracking (add daily log feature)

### Recommended Focus:
**Build the macro tracking features FIRST**, then scale infrastructure. The app works technically, but it's missing the core value proposition: helping users hit their daily macro goals.

### Estimated Timeline:
- **2 weeks:** Feature-complete MVP (macro tracking + menu mode)
- **1 month:** Production-ready (auth, DB, caching)
- **3 months:** Scale-ready for 10K users

---

**Next Steps:**
1. Review this audit with stakeholders
2. Prioritize features (macro tracking vs scalability)
3. Set up staging environment
4. Begin Week 1 implementation
