# BiteScan - Quick Start Guide

## 🚀 Launch Expo Dev Server

```bash
cd ~/.openclaw/workspace/bitescan
npx expo start
```

**Then press `space` to show QR code and connection URL**

---

## 📱 Connect Your Device

### On Android (Expo Go App):

1. **Install Expo Go** from Play Store
2. **Connect to same WiFi** as this computer
3. **Enter URL:**
   ```
   exp://10.0.0.226:8081
   ```

---

## 🐛 Troubleshooting

### "Request timed out"
**Fix:** 
```bash
# Kill all Expo processes
pkill -f expo

# Restart cleanly
cd ~/.openclaw/workspace/bitescan
npx expo start
```

### "Port 8081 already in use"
**Fix:**
```bash
lsof -ti :8081 | xargs kill -9
```

### "Metro stuck at 'Waiting...'"
**Fix:** Press `space` in the Expo terminal to trigger bundle build

---

## ✅ Health Checks

**Check Metro is running:**
```bash
curl http://localhost:8081/status
# Should return: packager-status:running
```

**Check network access:**
```bash
curl http://10.0.0.226:8081/status
```

**Check TypeScript:**
```bash
cd ~/.openclaw/workspace/bitescan
npx tsc --noEmit
```

---

## 🔧 Development Commands

**Start server:**
```bash
npm start
# or
npx expo start
```

**Clear cache:**
```bash
npx expo start --clear
```

**Build for production:**
```bash
npx expo export --platform android
```

**Type checking:**
```bash
npx tsc --noEmit
```

---

## 📝 Common Connection URLs

- **Metro Bundler:** http://10.0.0.226:8081
- **Expo Dev URL:** exp://10.0.0.226:8081
- **Web Version:** http://10.0.0.226:8081 (in browser)

---

**Current Status:** 🟢 Ready  
**Server IP:** 10.0.0.226  
**Port:** 8081
