# Vercel Deployment - Step by Step Guide

## ✅ Step 1: Code Pushed to GitHub
- All changes have been committed and pushed to GitHub
- Repository: `https://github.com/harshithdev164-spec/homekart-nexus.git`

## 🔐 Step 2: Login to Vercel

### Option A: Manual Browser Login (If browser doesn't open automatically)

1. Run this command in your terminal:
   ```bash
   npx vercel login
   ```

2. You'll see a URL like: `https://vercel.com/oauth/device?user_code=XXXX-XXXX`
   - **Copy this URL** from the terminal output
   - **Manually open it** in your browser
   - Or visit: https://vercel.com/login and use the device code shown in terminal

3. Sign in with GitHub (or email) and authorize Vercel

4. Return to the terminal - it should detect the authentication automatically

### Option B: Use Vercel Dashboard (Easier Alternative)

Instead of CLI, you can deploy directly from the web:
1. Go to: https://vercel.com/new
2. Sign in with GitHub
3. Import your repository: `harshithdev164-spec/homekart-nexus`
4. Follow the dashboard setup (see Step 3 below)

## 🚀 Step 3: Deploy to Vercel

After logging in, run:
```bash
vercel
```

You'll be asked several questions:
1. **Set up and deploy?** → Type `Y` and press Enter
2. **Which scope?** → Select your account
3. **Link to existing project?** → Type `N` (this is a new project)
4. **What's your project's name?** → Press Enter to use default (homekart-nexus) or type a custom name
5. **In which directory is your code located?** → Press Enter (use `./`)
6. **Want to override the settings?** → Type `N` (we already have vercel.json)

## 🔑 Step 4: Add Environment Variables

After the first deployment, you need to add environment variables. Run:

```bash
vercel env add VITE_SUPABASE_URL
```
- When prompted, enter: `https://qtugvzrvcuderfrebfxj.supabase.co`
- Select environments: Type `production,preview,development` or press Enter for all

```bash
vercel env add VITE_SUPABASE_ANON_KEY
```
- When prompted, enter: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dWd2enJ2Y3VkZXJmcmViZnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MTIzMTYsImV4cCI6MjA3MjE4ODMxNn0.x2789eB9SM9C841YJsipE1nWgS-P7sY0lj3LVhAgbKA`
- Select environments: Type `production,preview,development` or press Enter for all

## 🌐 Step 5: Deploy to Production

After adding environment variables, deploy to production:

```bash
vercel --prod
```

This will:
- Build your application
- Deploy to production
- Give you a production URL (e.g., `https://homekart-nexus.vercel.app`)

## 🔄 Step 6: Update Supabase Redirect URLs

After deployment, update Supabase:

1. Go to: https://app.supabase.com/project/qtugvzrvcuderfrebfxj
2. Navigate to: **Authentication** → **URL Configuration**
3. Add your Vercel URL to:
   - **Redirect URLs**: `https://your-project.vercel.app`
   - **Redirect URLs**: `https://your-project.vercel.app/**`
   - **Site URL**: `https://your-project.vercel.app`
4. Click **Save**

## ✅ Step 7: Verify Deployment

1. Visit your Vercel URL
2. Test authentication (sign up/login)
3. Verify all features work correctly
4. Check browser console for any errors

---

## Alternative: Deploy via Vercel Dashboard

If you prefer using the web interface:

1. Go to: https://vercel.com/new
2. Click **Import Git Repository**
3. Select: `harshithdev164-spec/homekart-nexus`
4. Configure:
   - Framework: Vite (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add Environment Variables:
   - `VITE_SUPABASE_URL` = `https://qtugvzrvcuderfrebfxj.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dWd2enJ2Y3VkZXJmcmViZnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MTIzMTYsImV4cCI6MjA3MjE4ODMxNn0.x2789eB9SM9C841YJsipE1nWgS-P7sY0lj3LVhAgbKA`
6. Click **Deploy**

---

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify environment variables are set
- Test build locally: `npm run build`

### Authentication Not Working
- Verify Supabase redirect URLs are updated
- Check environment variables in Vercel dashboard
- Clear browser cache

### Environment Variables Not Working
- Redeploy after adding variables: `vercel --prod`
- Verify variable names match exactly (case-sensitive)

