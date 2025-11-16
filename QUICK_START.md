# Quick Start - Localhost Website

## Important: Your Dev Server Runs on Port 8080

Based on your `vite.config.ts`, the website runs on **port 8080**, not 5173!

## Steps to Open Website

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Wait for this message:**
   ```
   VITE v5.x.x  ready in xxx ms
   
   ➜  Local:   http://localhost:8080/
   ```

3. **Open your browser and go to:**
   - **Main URL**: http://localhost:8080
   - **Alternative**: http://127.0.0.1:8080

## If Port 8080 is Already in Use

**Check what's using it:**
```powershell
netstat -ano | findstr :8080
```

**Kill the process:**
```powershell
taskkill /PID <PID> /F
```

**Or change the port in `vite.config.ts`:**
```typescript
server: {
  host: "::",
  port: 3000,  // Change to any available port
},
```

## Common Issues

### "Cannot GET /" or "Connection Refused"

**Fix:**
1. Make sure `npm run dev` is running
2. Check terminal for errors
3. Try: http://localhost:8080 (not 5173!)

### White Screen or Blank Page

**Fix:**
1. Open browser console (F12)
2. Check for errors
3. Look at terminal for build errors

### Supabase Connection Error

**Fix:**
1. The app will use production Supabase by default (fallback values)
2. Or create `.env` file:
   ```env
   VITE_SUPABASE_URL=https://qtugvzrvcuderfrebfxj.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dWd2enJ2Y3VkZXJmcmViZnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MTIzMTYsImV4cCI6MjA3MjE4ODMxNn0.x2789eB9SM9C841YJsipE1nWgS-P7sY0lj3LVhAgbKA
   ```

## Quick Test

```bash
# 1. Install dependencies (if needed)
npm install

# 2. Start server
npm run dev

# 3. Open browser
# Go to: http://localhost:8080
```

## Still Not Working?

**Check:**
1. Terminal output - any errors?
2. Browser console (F12) - any errors?
3. Port 8080 is not blocked by firewall
4. Node.js is installed: `node --version`

