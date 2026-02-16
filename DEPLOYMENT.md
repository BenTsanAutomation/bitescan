# BiteScan Backend Deployment Guide

## Current Setup
- **Backend URL:** http://10.0.0.226:8420
- **Server:** FastAPI on port 8420
- **Firewall:** UFW active

---

## Option 1: Local Network Only (Recommended for Security)

### 1. Allow Port 8420 Through Firewall

```bash
# Allow port 8420 from local network only
sudo ufw allow from 10.0.0.0/24 to any port 8420 proto tcp comment 'BiteScan API'

# Verify rule was added
sudo ufw status numbered
```

### 2. Create Systemd Service (Auto-Start on Boot)

Create `/etc/systemd/system/bitescan-backend.service`:

```ini
[Unit]
Description=BiteScan FastAPI Backend
After=network.target

[Service]
Type=simple
User=deez
WorkingDirectory=/home/deez/.openclaw/workspace/bitescan/backend
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/bin/python3 -m uvicorn server:app --host 0.0.0.0 --port 8420 --workers 2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Install and enable:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable bitescan-backend
sudo systemctl start bitescan-backend
sudo systemctl status bitescan-backend
```

---

## Option 2: Remote Access (Cloudflared Tunnel)

If you want to access the app from anywhere (not just local network):

### 1. Install Cloudflared

```bash
# If not already installed
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### 2. Create Tunnel Configuration

```bash
# Create tunnel
cloudflared tunnel create bitescan-backend

# Create config
cat > ~/.cloudflared/config.yml <<EOF
tunnel: <TUNNEL_ID_FROM_ABOVE>
credentials-file: /home/deez/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: bitescan-api.yourdomain.com
    service: http://localhost:8420
  - service: http_status:404
EOF

# Route DNS
cloudflared tunnel route dns bitescan-backend bitescan-api.yourdomain.com

# Run tunnel
cloudflared tunnel run bitescan-backend
```

### 3. Update App Backend URL

In your React Native app, update:

```typescript
// src/config.ts
export const API_URL = __DEV__ 
  ? 'http://10.0.0.226:8420'  // Local network when developing
  : 'https://bitescan-api.yourdomain.com';  // Production tunnel
```

---

## Option 3: Hybrid (Recommended)

**Local network + Optional Remote:**

1. **Always allow local network** (fast, secure):
   ```bash
   sudo ufw allow from 10.0.0.0/24 to any port 8420 proto tcp comment 'BiteScan API Local'
   ```

2. **Set up systemd service** (above) for auto-start

3. **Optionally run cloudflared** when you need remote access:
   ```bash
   # Quick tunnel (no config needed)
   cloudflared tunnel --url http://localhost:8420
   # Returns: https://random-subdomain.trycloudflare.com
   ```

---

## Testing Connectivity

### From Mobile Device (Local Network)

```bash
# From your phone's browser or app:
curl http://10.0.0.226:8420/health

# Should return: {"status":"ok"}
```

### From Desktop

```bash
curl http://localhost:8420/health
curl http://10.0.0.226:8420/health
```

---

## Firewall Commands Cheat Sheet

```bash
# Check firewall status
sudo ufw status numbered

# Allow specific port from local network
sudo ufw allow from 10.0.0.0/24 to any port 8420 proto tcp

# Allow port from anywhere (NOT RECOMMENDED unless using tunnel)
sudo ufw allow 8420/tcp

# Delete a rule by number
sudo ufw delete <number>

# Reload firewall
sudo ufw reload
```

---

## Current Status Check

```bash
# Is backend running?
systemctl status bitescan-backend

# Is port listening?
ss -tlnp | grep 8420

# Is firewall blocking?
sudo ufw status | grep 8420

# Test endpoint
curl http://10.0.0.226:8420/health
```

---

## Recommended: Option 1 (Local Network + Systemd)

**Pros:**
- ✅ Fast (no internet roundtrip)
- ✅ Secure (only accessible from your local network)
- ✅ Auto-starts on boot
- ✅ Works even if internet is down

**Cons:**
- ❌ Can't access from outside your home network

---

## Next Steps

1. Choose your deployment option
2. Run the firewall command
3. Set up systemd service
4. Test from your mobile device
5. Update app config if needed
