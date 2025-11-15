# Vercel Deployment Guide

This guide will walk you through deploying the HomeKart Nexus CRM application to Vercel.

## Prerequisites

- A Vercel account (sign up at [vercel.com](https://vercel.com))
- Your Supabase project credentials
- Git repository (GitHub, GitLab, or Bitbucket) - optional but recommended

## Step 1: Prepare Your Environment Variables

Before deploying, you need to gather your Supabase credentials:

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL** (e.g., `https://your-project-id.supabase.co`)
   - **anon/public key** (under "Project API keys")

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Import Your Project**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click **Import Git Repository**
   - Select your repository (GitHub, GitLab, or Bitbucket)
   - If you don't have a Git repository, you can use Vercel CLI (see Option B)

2. **Configure Project Settings**
   - **Framework Preset**: Vite (should be auto-detected)
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build` (should be auto-detected)
   - **Output Directory**: `dist` (should be auto-detected)
   - **Install Command**: `npm install` (should be auto-detected)

3. **Add Environment Variables**
   - Click **Environment Variables** section
   - Add the following variables:
     ```
     VITE_SUPABASE_URL=https://your-project-id.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     ```
   - Make sure to add them for all environments (Production, Preview, Development)
   - Click **Add** for each variable

4. **Deploy**
   - Click **Deploy** button
   - Wait for the build to complete (usually 1-3 minutes)
   - Once deployed, you'll get a URL like: `https://your-project.vercel.app`

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   - Follow the prompts to link your project
   - When asked about environment variables, you can add them now or later in the dashboard

4. **Set Environment Variables**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```
   - Enter the values when prompted
   - Select which environments to apply to (Production, Preview, Development)

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Step 3: Configure Supabase Redirect URLs

After deployment, you need to update your Supabase project to allow authentication from your Vercel URL:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **URL Configuration**
3. Add your Vercel URL to **Redirect URLs**:
   - `https://your-project.vercel.app`
   - `https://your-project.vercel.app/**` (for all routes)
4. Add your Vercel URL to **Site URL**:
   - `https://your-project.vercel.app`
5. Click **Save**

## Step 4: Verify Deployment

1. **Test the Application**
   - Visit your Vercel deployment URL
   - Test authentication (sign up/login)
   - Verify that data loads correctly
   - Test key features (dashboard, leads, properties, etc.)

2. **Check Build Logs**
   - Go to your Vercel project dashboard
   - Click on the latest deployment
   - Review build logs for any warnings or errors

3. **Monitor Performance**
   - Check Vercel Analytics (if enabled)
   - Monitor Supabase dashboard for API usage
   - Check browser console for any errors

## Step 5: Custom Domain (Optional)

If you want to use a custom domain:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Domains**
3. Add your custom domain
4. Follow the DNS configuration instructions
5. Update Supabase redirect URLs with your custom domain

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Important Notes

- **VITE_ Prefix**: All client-side environment variables in Vite must be prefixed with `VITE_`
- **Public Variables**: These variables are exposed to the browser, so never put sensitive keys here
- **Service Role Key**: Never use the service role key in client-side code - it's only for server-side operations

## Troubleshooting

### Build Fails

- **Check build logs** in Vercel dashboard for specific errors
- **Verify environment variables** are set correctly
- **Test build locally**: Run `npm run build` to see if it works locally
- **Check Node version**: Vercel uses Node 18.x by default (can be changed in project settings)

### Authentication Not Working

- **Verify redirect URLs** in Supabase dashboard match your Vercel URL
- **Check environment variables** are set correctly in Vercel
- **Clear browser cache** and try again
- **Check browser console** for error messages

### Environment Variables Not Working

- **Redeploy** after adding/changing environment variables
- **Verify variable names** match exactly (case-sensitive)
- **Check variable scope** (Production, Preview, Development)
- **Restart deployment** if variables were added after initial deploy

### 404 Errors on Routes

- **Verify `vercel.json`** is in the root directory
- **Check rewrites configuration** in `vercel.json`
- **Ensure SPA routing** is configured correctly

## Continuous Deployment

Vercel automatically deploys when you push to your connected Git repository:

- **Production**: Deploys from your main/master branch
- **Preview**: Creates preview deployments for pull requests and other branches

### Branch Protection

To ensure only tested code goes to production:

1. Go to **Settings** → **Git**
2. Enable **Production Branch Protection**
3. Require pull request reviews before merging

## Performance Optimization

The application is already optimized for production:

- **Code Splitting**: Automatic chunk splitting for optimal loading
- **Asset Optimization**: Images and assets are optimized during build
- **Caching**: Static assets are cached with long-term headers
- **Minification**: JavaScript and CSS are minified

## Monitoring and Analytics

### Vercel Analytics

1. Go to **Analytics** tab in your Vercel dashboard
2. Enable Web Analytics (if available in your plan)
3. Monitor page views, performance metrics, and user behavior

### Supabase Monitoring

1. Go to your Supabase project dashboard
2. Check **Database** → **Logs** for query performance
3. Monitor **API** usage and limits
4. Review **Authentication** logs for sign-in issues

## Support

- **Vercel Documentation**: https://vercel.com/docs
- **Supabase Documentation**: https://supabase.com/docs
- **Vite Documentation**: https://vitejs.dev

## Post-Deployment Checklist

- [ ] Environment variables configured in Vercel
- [ ] Supabase redirect URLs updated
- [ ] Application tested on production URL
- [ ] Authentication working correctly
- [ ] All features tested and working
- [ ] Custom domain configured (if applicable)
- [ ] Analytics enabled (optional)
- [ ] Team members have access (if applicable)

## Rollback

If you need to rollback to a previous deployment:

1. Go to your Vercel project dashboard
2. Click on **Deployments**
3. Find the deployment you want to rollback to
4. Click the **⋯** menu → **Promote to Production**

---

**Congratulations!** Your HomeKart Nexus CRM is now live on Vercel! 🚀

