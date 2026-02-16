# BiteScan Backend

Real-time food analysis API using AI vision models (Claude, GPT-4V, or Gemini).

## ⚡ Quick Start

### 1. Get an API Key

BiteScan needs a vision AI provider. Choose one:

**Option A: Anthropic Claude** (Recommended - best food analysis)
- Get key: https://console.anthropic.com/settings/keys
- Copy the key (starts with `sk-ant-api...`)

**Option B: OpenAI GPT-4 Vision**
- Get key: https://platform.openai.com/api-keys
- Copy the key (starts with `sk-...`)

**Option C: Google Gemini**
- Get key: https://makersuite.google.com/app/apikey
- Copy the key

### 2. Set Up Environment

```bash
cd ~/.openclaw/workspace/bitescan/backend

# Option 1: Export to current shell
export ANTHROPIC_API_KEY='sk-ant-api...'

# Option 2: Create .env file (persistent)
cat > .env << 'EOF'
ANTHROPIC_API_KEY=sk-ant-api...
EOF
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt

# If using OpenAI instead:
# pip install openai>=1.0.0

# If using Gemini instead:
# pip install google-generativeai Pillow
```

### 4. Start Server

```bash
# Using the startup script (checks for API keys)
./start.sh

# Or directly:
python3 server.py
```

Server will run on: http://localhost:8420

### 5. Test It

```bash
# Basic health check
curl http://localhost:8420/health

# Test with a food image (requires API key)
python3 test_real_food.py
```

## 🔧 Configuration

### Environment Variables

- `ANTHROPIC_API_KEY` - Anthropic Claude API key (recommended)
- `OPENAI_API_KEY` - OpenAI GPT-4 Vision API key (alternative)
- `GOOGLE_API_KEY` or `GEMINI_API_KEY` - Google Gemini API key (alternative)
- `PORT` - Server port (default: 8420)
- `HOST` - Server host (default: 127.0.0.1)
- `ALLOW_ORIGINS` - Comma-separated CORS allowlist
- `RATE_LIMIT_PER_MINUTE` - Per-IP request limit (default: 30)
- `REQUEST_TIMEOUT_SECONDS` - Provider timeout (default: 45)
- `MAX_IMAGE_BYTES` - Max decoded upload bytes (default: 8MB)
- `REQUIRE_API_TOKEN` - Set `true` to require API token auth
- `BITESCAN_API_TOKEN` - Shared API token when auth is enabled

### API Priority

The backend tries APIs in this order:
1. Anthropic Claude (if ANTHROPIC_API_KEY set and valid)
2. OpenAI GPT-4V (if OPENAI_API_KEY set)
3. Google Gemini (if GOOGLE_API_KEY set)

## 🧪 Testing

```bash
# Test API key setup
python3 test_vision.py

# Test with OpenClaw vision proxy (experimental)
python3 test_openclaw_vision.py

# Test with real food images
python3 test_real_food.py
```

## 📝 API Endpoints

### POST /analyze
Analyze a food image and return nutritional information.

**Request:**
```json
{
  "imageBase64": "base64-encoded-image",
  "userPreferences": {
    "goals": ["lose weight", "build muscle"],
    "priorities": {
      "lose weight": 80,
      "build muscle": 70
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "id": "scan-uuid",
    "timestamp": 1234567890,
    "foods": [
      {
        "id": "food-uuid",
        "name": "Grilled Chicken",
        "portion": "6 oz",
        "nutrition": {
          "calories": 280,
          "protein": 53,
          "carbs": 0,
          "fat": 6,
          "fiber": 0,
          "sugar": 0,
          "sodium": 120
        },
        "grade": "A",
        "gradeReason": "Excellent lean protein",
        "confidence": 95
      }
    ],
    "totalCalories": 280,
    "overallGrade": "A",
    "recommendation": "Great choice for your goals!",
    "userGoalsMatch": 90
  }
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "bitescan-api"
}
```

## 🐛 Troubleshooting

### "ANTHROPIC_API_KEY not found"
- Make sure you set the environment variable
- Check that the key starts with `sk-ant-api` (not `sk-ant-oat` which is OAuth)
- Try creating a `.env` file instead of exporting

### "Error code: 401 - authentication_error"
- Your API key is invalid or expired
- Generate a new key from the provider's console
- Make sure you copied the entire key

### "No vision API available"
- No API keys are set
- Run `./start.sh` which will show instructions
- Or manually export one of the API key variables

### Server won't start
- Check if port 8420 is already in use: `lsof -i :8420`
- Kill existing process: `pkill -f "python.*server.py"`
- Try a different port: `PORT=8421 python3 server.py`

## 🚀 Production Deployment

For production, use a proper WSGI server:

```bash
pip install gunicorn

gunicorn server:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8420
```

## 🔐 API Key Security

### Google Gemini API Key

Gemini keys must be provided via environment variables (`GOOGLE_API_KEY` or `GEMINI_API_KEY`).

**Security guarantees:**
- ✅ No hardcoded API keys in source
- ✅ Keys are loaded from environment / `.env`
- ✅ Optional API token auth (`REQUIRE_API_TOKEN=true`)
- ✅ CORS allowlist is configurable via `ALLOW_ORIGINS`
- ✅ Request validation + per-IP rate limiting enabled

## 📚 Learn More

- [Anthropic Claude API Docs](https://docs.anthropic.com/claude/reference/messages_post)
- [OpenAI Vision API Docs](https://platform.openai.com/docs/guides/vision)
- [Google Gemini API Docs](https://ai.google.dev/docs)
