#!/bin/bash
# BiteScan Complete Deployment Script
# Run this to set up everything at once

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 BiteScan Backend Deployment"
echo "================================"
echo ""

# Step 1: Firewall
echo "STEP 1: Firewall Configuration"
echo "-------------------------------"
./setup-firewall.sh
echo ""

# Step 2: Systemd Service
echo "STEP 2: Systemd Service Setup"
echo "------------------------------"
./setup-service.sh
echo ""

# Step 3: Test
echo "STEP 3: Testing Connectivity"
echo "-----------------------------"
sleep 2

if curl -s http://localhost:8420/health | grep -q "ok"; then
    echo "✅ Local health check: PASSED"
else
    echo "❌ Local health check: FAILED"
fi

if curl -s http://10.0.0.226:8420/health | grep -q "ok"; then
    echo "✅ Network health check: PASSED"
else
    echo "⚠️  Network health check: FAILED (firewall may need time to reload)"
fi

echo ""
echo "================================"
echo "✅ Deployment Complete!"
echo ""
echo "📱 Your mobile app can now connect to: http://10.0.0.226:8420"
echo ""
echo "🔧 Management commands:"
echo "  sudo systemctl status bitescan-backend   # Check status"
echo "  sudo systemctl restart bitescan-backend  # Restart"
echo "  sudo journalctl -u bitescan-backend -f   # View logs"
echo ""
echo "🧪 Test from your phone: http://10.0.0.226:8420/health"
