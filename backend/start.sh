#!/bin/bash
# BiteScan Backend Startup Script

cd "$(dirname "$0")"

# Load .env if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check for API keys
if [ -z "$ANTHROPIC_API_KEY" ] && [ -z "$OPENAI_API_KEY" ] && [ -z "$GOOGLE_API_KEY" ]; then
    echo "❌ ERROR: No vision API key found!"
    echo ""
    echo "BiteScan needs a vision API to analyze food images."
    echo ""
    echo "Options:"
    echo "  1. Anthropic Claude (recommended):"
    echo "     - Get key: https://console.anthropic.com/settings/keys"
    echo "     - Export: export ANTHROPIC_API_KEY='sk-ant-...'"
    echo ""
    echo "  2. OpenAI GPT-4 Vision:"
    echo "     - Get key: https://platform.openai.com/api-keys"
    echo "     - Export: export OPENAI_API_KEY='sk-...'"
    echo ""
    echo "  3. Google Gemini:"
    echo "     - Get key: https://makersuite.google.com/app/apikey"
    echo "     - Export: export GOOGLE_API_KEY='...'"
    echo ""
    echo "Or create a .env file with your key:"
    echo "  cp .env.example .env"
    echo "  # Edit .env and add your API key"
    exit 1
fi

# Show which API is being used
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "✓ Using Anthropic Claude Vision API"
elif [ -n "$OPENAI_API_KEY" ]; then
    echo "✓ Using OpenAI GPT-4 Vision API"
elif [ -n "$GOOGLE_API_KEY" ]; then
    echo "✓ Using Google Gemini Vision API"
fi

# Start server
echo "🚀 Starting BiteScan backend on port ${PORT:-8420}..."
python3 server.py
