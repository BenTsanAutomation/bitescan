#!/bin/bash
# BiteScan Systemd Service Setup Script

set -e

SERVICE_FILE="bitescan-backend.service"
SERVICE_PATH="/etc/systemd/system/$SERVICE_FILE"

echo "🚀 Setting up BiteScan backend as a system service..."

# Check if service file exists in current directory
if [ ! -f "$SERVICE_FILE" ]; then
    echo "❌ Error: $SERVICE_FILE not found in current directory"
    exit 1
fi

# Copy service file
echo "Copying service file to $SERVICE_PATH"
sudo cp "$SERVICE_FILE" "$SERVICE_PATH"

# Reload systemd
echo "Reloading systemd daemon..."
sudo systemctl daemon-reload

# Enable service (auto-start on boot)
echo "Enabling service to start on boot..."
sudo systemctl enable bitescan-backend

# Start service
echo "Starting service..."
sudo systemctl start bitescan-backend

# Wait a moment
sleep 2

# Check status
echo ""
echo "✅ Service setup complete!"
echo ""
echo "📊 Service status:"
sudo systemctl status bitescan-backend --no-pager | head -15
echo ""
echo "📝 Useful commands:"
echo "  sudo systemctl status bitescan-backend   # Check status"
echo "  sudo systemctl restart bitescan-backend  # Restart"
echo "  sudo systemctl stop bitescan-backend     # Stop"
echo "  sudo journalctl -u bitescan-backend -f   # View logs"
