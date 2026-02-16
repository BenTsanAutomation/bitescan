#!/bin/bash
# BiteScan Firewall Setup Script

set -e

echo "🔥 Setting up firewall rule for BiteScan backend..."

# Check if UFW is active
if ! sudo ufw status | grep -q "Status: active"; then
    echo "⚠️  UFW is not active. Enable it first with: sudo ufw enable"
    exit 1
fi

# Add firewall rule for local network
echo "Adding rule: Allow port 8420 from local network (10.0.0.0/24)"
sudo ufw allow from 10.0.0.0/24 to any port 8420 proto tcp comment 'BiteScan API'

echo ""
echo "✅ Firewall rule added!"
echo ""
echo "Current firewall status:"
sudo ufw status numbered | grep -E "(8420|Status)"
echo ""
echo "🧪 Test from your phone's browser: http://10.0.0.226:8420/health"
