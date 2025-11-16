# Local Email Testing Guide

## Issue: Database Trigger Not Working Locally

The database trigger uses HTTP extension to call Edge Functions, which may not work properly in local Supabase. Here's how to test email functionality locally.

## Solution 1: Test via Frontend (Recommended for Local Testing)

The frontend components will call the Edge Function directly, bypassing the database trigger. This works perfectly for local testing.

### Steps:

1. **Set up local Supabase secrets:**
   ```bash
   supabase secrets set RESEND_API_KEY=your-resend-api-key
   supabase secrets set RESEND_FROM_EMAIL="CRM Notifications <onboarding@resend.dev>"
   supabase secrets set CRM_BASE_URL="http://localhost:5173"
   ```

2. **Start Supabase locally:**
   ```bash
   supabase start
   ```

3. **Start your dev server:**
   ```bash
   npm run dev
   ```

4. **Test email sending:**
   - Go to http://localhost:5173/leads
   - Assign a lead to yourself
   - Check your email inbox

## Solution 2: Disable Trigger for Local Development

If the trigger is causing errors, you can temporarily disable it:

```sql
-- Disable trigger for local testing
ALTER TABLE public.leads DISABLE TRIGGER trigger_notify_lead_assignment;
```

The frontend calls will still send emails.

To re-enable:
```sql
ALTER TABLE public.leads ENABLE TRIGGER trigger_notify_lead_assignment;
```

## Solution 3: Test Edge Function Directly

You can test the Edge Function directly using curl or Postman:

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/send-lead-assignment-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "your-lead-id",
    "assignedToId": "your-profile-id",
    "isTransfer": false
  }'
```

Get your anon key from:
- Supabase Studio: http://localhost:54323
- Go to Settings > API > anon/public key

## Solution 4: Fix Trigger for Local Development

The trigger has been updated to detect localhost. However, if you still get errors:

1. **Check if HTTP extension is enabled:**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'http';
   ```

2. **If not enabled, enable it:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS http;
   ```

3. **If HTTP extension is not available**, the trigger will fail silently and frontend calls will handle emails.

## Common Local Testing Errors

### Error: "function http() does not exist"

**Cause**: HTTP extension not available in local Supabase.

**Solution**: 
- Use Solution 1 (frontend testing) - this works without the trigger
- Or enable HTTP extension if available

### Error: "connection refused" or "network error"

**Cause**: Edge Function not running or wrong URL.

**Solution**:
1. Make sure Supabase is running: `supabase status`
2. Check Edge Function is deployed: `supabase functions list`
3. Verify the URL in trigger matches your local setup

### Error: "RESEND_API_KEY not found"

**Cause**: Secrets not set for local development.

**Solution**:
```bash
supabase secrets set RESEND_API_KEY=your-key
supabase secrets set RESEND_FROM_EMAIL="CRM Notifications <onboarding@resend.dev>"
```

## Recommended Local Testing Flow

1. **Skip the database trigger** - It's designed for production
2. **Use frontend components** - They call Edge Functions directly
3. **Test these scenarios:**
   - Assign lead via "Assign to Me" button
   - Transfer lead via Transfer button
   - Create lead via webhook (if testing webhooks)

## Production vs Local

- **Production**: Database trigger + Frontend calls (dual approach for reliability)
- **Local**: Frontend calls only (trigger may not work due to HTTP extension limitations)

The frontend calls ensure emails are sent even if the trigger fails, so local testing will work perfectly!

## Quick Test Checklist

- [ ] Supabase running locally (`supabase status`)
- [ ] Dev server running (`npm run dev`)
- [ ] Resend API key set (`supabase secrets list`)
- [ ] Test assign a lead
- [ ] Check email inbox
- [ ] Verify email content and CRM link

## Still Having Issues?

1. Check Supabase logs: `supabase functions logs send-lead-assignment-email`
2. Check browser console for errors
3. Verify Resend API key is valid
4. Test Edge Function directly with curl (see Solution 3)

