# Localhost Website Not Opening - Troubleshooting Guide

## Quick Fixes

### 1. Check if Dev Server is Running

**Check terminal output:**
- Look for: `VITE v5.x.x  ready in xxx ms`
- Look for: `➜  Local:   http://localhost:5173/`

**If not running, start it:**
```bash
npm run dev
```

### 2. Check Port Conflicts

**Port 5173 might be in use:**

**Windows PowerShell:**
```powershell
netstat -ano | findstr :5173
```

**Kill the process:**
```powershell
taskkill /PID <PID> /F
```

**Or use a different port:**
```bash
npm run dev -- --port 3000
```

### 3. Check Browser Console

1. Open browser Developer Tools (F12)
2. Go to **Console** tab
3. Look for red error messages
4. Common errors:
   - `Failed to fetch` - Supabase connection issue
   - `Cannot read property` - Code error
   - `Module not found` - Missing dependency

### 4. Check Environment Variables

**Create `.env` file in project root** (if not exists):

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

**Get local anon key:**
1. Start Supabase: `supabase start`
2. Go to: http://localhost:54323
3. Settings → API → Copy `anon` key

**Or use production values:**
```env
VITE_SUPABASE_URL=https://qtugvzrvcuderfrebfxj.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dWd2enJ2Y3VkZXJmcmViZnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MTIzMTYsImV4cCI6MjA3MjE4ODMxNn0.x2789eB9SM9C841YJsipE1nWgS-P7sY0lj3LVhAgbKA
```

### 5. Reinstall Dependencies

**If build errors:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### 6. Check Supabase is Running

**If using local Supabase:**
```bash
supabase status
```

**Should show:**
```
API URL: http://127.0.0.1:54321
Studio URL: http://127.0.0.1:54323
```

**If not running:**
```bash
supabase start
```

## Common Errors and Solutions

### Error: "Cannot GET /"

**Cause:** Server not running or wrong URL

**Fix:**
- Make sure `npm run dev` is running
- Use correct URL: http://localhost:5173 (not 3000 or 8080)

### Error: "Failed to fetch" or Supabase connection error

**Cause:** Supabase not accessible

**Fix:**
1. Check Supabase is running: `supabase status`
2. Verify `.env` file has correct URLs
3. Try using production Supabase URL instead

### Error: "Module not found" or import errors

**Cause:** Missing dependencies or build cache

**Fix:**
```bash
npm install
rm -rf node_modules/.vite
npm run dev
```

### Error: White screen or blank page

**Cause:** JavaScript error preventing render

**Fix:**
1. Open browser console (F12)
2. Check for errors
3. Look at Network tab for failed requests
4. Check terminal for build errors

### Error: Port already in use

**Cause:** Another process using port 5173

**Fix:**
```powershell
# Find process
netstat -ano | findstr :5173

# Kill it
taskkill /PID <PID> /F

# Or use different port
npm run dev -- --port 3000
```

## Step-by-Step Debugging

1. **Check terminal output:**
   ```
   ✓ Server running on http://localhost:5173
   ```

2. **Try accessing:**
   - http://localhost:5173
   - http://127.0.0.1:5173

3. **Check browser console (F12):**
   - Any red errors?
   - Network tab - any failed requests?

4. **Check terminal for errors:**
   - Build errors?
   - Compilation errors?

5. **Verify dependencies:**
   ```bash
   npm install
   ```

6. **Clear cache:**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

## Still Not Working?

**Share these details:**
1. Terminal output when running `npm run dev`
2. Browser console errors (F12 → Console)
3. Network tab errors (F12 → Network)
4. Any error messages you see

## Quick Test

**Minimal test:**
```bash
# 1. Clean install
rm -rf node_modules package-lock.json
npm install

# 2. Start dev server
npm run dev

# 3. Open browser
# Go to: http://localhost:5173
```

If this doesn't work, there's likely a configuration or dependency issue.

