# Vercel Deployment Checklist - Email Notifications

## ✅ Step 1: Code Deployed

Code has been committed and pushed to GitHub. Vercel should auto-deploy, or you can trigger deployment manually.

## ⚙️ Step 2: Set Environment Variables in Vercel

Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

Add these variables:

### Required:
1. **VITE_SUPABASE_URL**
   - Value: `https://qtugvzrvcuderfrebfxj.supabase.co`
   - Environments: Production, Preview, Development

2. **VITE_SUPABASE_ANON_KEY**
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0dWd2enJ2Y3VkZXJmcmViZnhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MTIzMTYsImV4cCI6MjA3MjE4ODMxNn0.x2789eB9SM9C841YJsipE1nWgS-P7sY0lj3LVhAgbKA`
   - Environments: Production, Preview, Development

## 🔐 Step 3: Set Supabase Edge Function Secrets

Go to **Supabase Dashboard** → Your Project → **Project Settings** → **Edge Functions** → **Secrets**

Add these secrets:

1. **RESEND_API_KEY** (Required)
   - Get from: https://resend.com/api-keys
   - Format: `re_xxxxxxxxxxxxx`

2. **RESEND_FROM_EMAIL** (Optional, but recommended)
   - Use verified domain: `"CRM Notifications <noreply@yourdomain.com>"`
   - Or test domain: `"CRM Notifications <onboarding@resend.dev>"`

3. **CRM_BASE_URL** (Optional)
   - Your Vercel production URL: `"https://homekart-nexus.vercel.app"`
   - Or your custom domain if you have one

## 🗄️ Step 4: Run Database Migration

Go to **Supabase Dashboard** → **SQL Editor**

1. Open the migration file: `supabase/migrations/20251116113806_create_lead_assignment_email_trigger.sql`
2. Copy the entire contents
3. Paste into SQL Editor
4. Click **Run**
5. Verify success message

**Or use Supabase CLI:**
```bash
supabase db push
```

## ✅ Step 5: Verify Deployment

1. **Check Vercel Deployment:**
   - Go to Vercel Dashboard
   - Check latest deployment status
   - Should show "Ready" or "Building"

2. **Check Supabase Edge Functions:**
   - Go to Supabase Dashboard → Edge Functions
   - Verify `send-lead-assignment-email` function exists
   - Check function logs for any errors

3. **Test the Website:**
   - Visit your Vercel URL: `https://homekart-nexus.vercel.app`
   - Login to the app
   - Navigate to Leads page

## 🧪 Step 6: Test Email Functionality

### Test 1: Manual Assignment
1. Go to Leads page
2. Find an unassigned lead
3. Click "Assign to Me"
4. Check your email inbox
5. Verify email received with lead details
6. Click "View Lead in CRM" button
7. Verify it opens the correct lead

### Test 2: Lead Transfer
1. Open a lead detail modal
2. Click "Transfer" button
3. Select another employee
4. Check new assignee's email inbox
5. Verify email received

### Test 3: Webhook Import (if testing)
1. Send a test webhook to your webhook endpoint
2. Verify lead is created and assigned
3. Check assigned employee's email inbox

## 🔍 Step 7: Monitor and Debug

### Check Vercel Logs:
- Vercel Dashboard → Your Project → **Deployments** → Click deployment → **Functions** tab

### Check Supabase Logs:
- Supabase Dashboard → **Edge Functions** → `send-lead-assignment-email` → **Logs**

### Check Email Delivery:
- Resend Dashboard → **Emails** → Check delivery status

## 🐛 Troubleshooting

### Emails Not Sending

1. **Check Resend API Key:**
   - Verify it's set in Supabase secrets
   - Check Resend dashboard for API key status

2. **Check Edge Function Logs:**
   - Look for errors in Supabase Edge Function logs
   - Common errors: Missing API key, invalid email address

3. **Check Database Trigger:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_notify_lead_assignment';
   ```
   - Should return 1 row if trigger exists

4. **Test Edge Function Directly:**
   ```bash
   curl -X POST https://qtugvzrvcuderfrebfxj.supabase.co/functions/v1/send-lead-assignment-email \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "leadId": "test-lead-id",
       "assignedToId": "test-profile-id",
       "isTransfer": false
     }'
   ```

### Website Not Loading

1. Check Vercel deployment status
2. Check environment variables are set
3. Check browser console for errors
4. Verify Supabase connection

### Database Trigger Not Working

- The trigger may fail silently if HTTP extension is not available
- Frontend calls will still send emails as backup
- Check Supabase logs for trigger errors

## 📋 Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel deployment successful
- [ ] Environment variables set in Vercel
- [ ] Supabase Edge Function secrets set
- [ ] Database migration run successfully
- [ ] Tested manual assignment email
- [ ] Tested lead transfer email
- [ ] Verified email template looks good
- [ ] Verified CRM link works
- [ ] Checked logs for any errors

## 🎉 Success Criteria

✅ Website loads on Vercel  
✅ Can login and navigate  
✅ Assigning a lead sends email  
✅ Email contains all lead details  
✅ "View Lead in CRM" button works  
✅ Email link opens correct lead in CRM  

## Next Steps After Deployment

1. Test all email scenarios
2. Monitor email delivery rates
3. Check Resend dashboard for any bounces
4. Verify email template renders correctly on mobile
5. Test with different email clients (Gmail, Outlook, etc.)

