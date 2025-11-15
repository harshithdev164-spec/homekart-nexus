# Quick Vercel Deployment Guide

## 🚀 Easiest Method: Deploy via Vercel Dashboard

Since the browser didn't open automatically, here's the easiest way to deploy:

### Step 1: Go to Vercel Dashboard
1. Open your browser and go to: **https://vercel.com/new**
2. Click **"Sign in"** (top right)
3. Choose **"Continue with GitHub"**
4. Authorize Vercel to access your GitHub account

### Step 2: Import Your Project
1. After signing in, you'll see **"Import Git Repository"**
2. Find and select: **`harshithdev164-spec/homekart-nexus`**
3. Click **"Import"**

### Step 3: Configure Project
Vercel should auto-detect these settings:
- **Framework Preset**: Vite ✅
- **Root Directory**: `./` ✅
- **Build Command**: `npm run build` ✅
- **Output Directory**: `dist` ✅
- **Install Command**: `npm install` ✅

**Just verify these are correct, then continue.**

### Step 4: Add Environment Variables
**IMPORTANT:** Before clicking Deploy, add these environment variables:

1. Scroll down to **"Environment Variables"** section
2. Click **"Add"** and add the first variable:
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: `https://qtugvzrvcuderfrebfxj.supabase.co`
   - **Environments**: Select all (Production, Preview, Development)
   - Click **"Add"**

3. Click **"Add"** again and add the second variable:
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dWd2enJ2Y3VkZXJmcmViZnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MTIzMTYsImV4cCI6MjA3MjE4ODMxNn0.x2789eB9SM9C841YJsipE1nWgS-P7sY0lj3LVhAgbKA`
   - **Environments**: Select all (Production, Preview, Development)
   - Click **"Add"**

### Step 5: Deploy!
1. Click the big **"Deploy"** button
2. Wait 1-3 minutes for the build to complete
3. You'll see a success message with your deployment URL (e.g., `https://homekart-nexus.vercel.app`)

### Step 6: Update Supabase Redirect URLs
After deployment, you need to update Supabase:

1. Go to: **https://app.supabase.com/project/qtugvzrvcuderfrebfxj**
2. Navigate to: **Authentication** → **URL Configuration**
3. Add your Vercel URL to:
   - **Redirect URLs**: `https://your-project-name.vercel.app`
   - **Redirect URLs**: `https://your-project-name.vercel.app/**`
   - **Site URL**: `https://your-project-name.vercel.app`
   - (Replace `your-project-name` with your actual Vercel project name)
4. Click **"Save"**

### Step 7: Test Your Deployment
1. Visit your Vercel URL
2. Test authentication (sign up/login)
3. Verify all features work correctly

---

## Alternative: Complete CLI Login Manually

If you prefer using CLI, here's how to complete the login:

1. When you run `npx vercel login`, you'll see a URL like:
   ```
   Visit https://vercel.com/oauth/device?user_code=XXXX-XXXX
   ```

2. **Copy that entire URL** from the terminal

3. **Paste it into your browser** and press Enter

4. Sign in and authorize Vercel

5. Return to the terminal - it should complete automatically

---

## Need Help?

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Vercel Docs**: https://vercel.com/docs
- **Your Repository**: https://github.com/harshithdev164-spec/homekart-nexus

