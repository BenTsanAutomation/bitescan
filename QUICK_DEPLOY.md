# 🚀 Quick Deploy - BiteScan Backend

## TL;DR - One Command Deploy

```bash
cd ~/.openclaw/workspace/bitescan
./deploy.sh
```

This will:
1. ✅ Configure firewall to allow port 8420 from local network
2. ✅ Set up systemd service to auto-start backend on boot
3. ✅ Test connectivity
4. ✅ Show status and management commands

---

## What This Solves

**Problem:** Mobile app can't connect unless firewall is disabled

**Solution:** 
- Firewall rule allows port 8420 from your local network (10.0.0.0/24)
- Systemd service ensures backend starts automatically on boot
- Backend remains secure (only accessible from your local network)

---

## Manual Steps (If You Prefer)

### 1. Firewall Only

```bash
cd ~/.openclaw/workspace/bitescan
./setup-firewall.sh
```

### 2. Service Only

```bash
cd ~/.openclaw/workspace/bitescan
./setup-service.sh
```

### 3. Both (Recommended)

```bash
cd ~/.openclaw/workspace/bitescan
./deploy.sh
```

---

## After Deployment

### Test from your phone:

Open browser and visit: `http://10.0.0.226:8420/health`

Should see: `{"status":"ok"}`

### Management Commands:

```bash
# Check if running
sudo systemctl status bitescan-backend

# Restart after code changes
sudo systemctl restart bitescan-backend

# View live logs
sudo journalctl -u bitescan-backend -f

# Stop service
sudo systemctl stop bitescan-backend

# Start service
sudo systemctl start bitescan-backend
```

---

## Current Backend Status

✅ **Already running** on port 8420  
✅ **Listening on all interfaces** (0.0.0.0)  
🔥 **Firewall active** (needs rule)  
❌ **Not set as service** (manual start only)

After running `./deploy.sh`:

✅ **Firewall configured** (port 8420 allowed from local network)  
✅ **Auto-starts on boot** (systemd service)  
✅ **Always available** (restarts on failure)

---

## Your Mobile App Configuration

No changes needed! Already configured correctly:

```typescript
// Backend URL: http://10.0.0.226:8420
```

---

## Troubleshooting

### "Connection refused" from phone

```bash
# Check if backend is running
sudo systemctl status bitescan-backend

# Check if firewall is blocking
sudo ufw status | grep 8420

# Test from desktop
curl http://10.0.0.226:8420/health
```

### Backend won't start

```bash
# View logs
sudo journalctl -u bitescan-backend -n 50

# Common issues:
# - Port already in use (kill old process)
# - Missing dependencies (install in backend folder)
```

### Firewall issues

```bash
# Verify rule exists
sudo ufw status numbered | grep 8420

# Re-add rule
sudo ufw allow from 10.0.0.0/24 to any port 8420 proto tcp

# Reload
sudo ufw reload
```

---

## Security Notes

- ✅ Only accessible from your local network (10.0.0.0/24)
- ✅ Not exposed to the internet
- ✅ Firewall remains enabled and secure
- ⚠️ If you need remote access, see `DEPLOYMENT.md` for cloudflared tunnel setup

---

**Ready?** Run `./deploy.sh` and your mobile app will always be able to connect! 📱
