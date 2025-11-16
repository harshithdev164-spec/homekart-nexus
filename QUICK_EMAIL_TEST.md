# Quick Email Testing on Localhost

## The Problem

The database trigger uses HTTP extension which may not work in local Supabase. **But don't worry!** The frontend components will send emails directly, so testing works perfectly.

## Quick Fix: Test via Frontend (Works Immediately)

1. **Set local secrets:**
   ```bash
   supabase secrets set RESEND_API_KEY=your-resend-api-key-here
   ```

2. **Start Supabase:**
   ```bash
   supabase start
   ```

3. **Start dev server:**
   ```bash
   npm run dev
   ```

4. **Test:**
   - Go to http://localhost:5173/leads
   - Click "Assign to Me" on any lead
   - Check your email!

## If You Get Trigger Errors

The trigger might fail locally, but that's OK! The frontend will still send emails.

To disable trigger errors temporarily:
```sql
ALTER TABLE public.leads DISABLE TRIGGER trigger_notify_lead_assignment;
```

## Verify It's Working

1. Assign a lead
2. Check browser console - should see "Optimistic email notification attempted"
3. Check your email inbox
4. Check Supabase function logs: `supabase functions logs send-lead-assignment-email`

## Common Error: "RESEND_API_KEY not found"

**Fix:**
```bash
supabase secrets set RESEND_API_KEY=re_your_key_here
supabase secrets set RESEND_FROM_EMAIL="CRM Notifications <onboarding@resend.dev>"
```

## Common Error: "HTTP extension not available"

**This is normal for local development!** The frontend calls will handle emails. The trigger is mainly for production.

## Test Directly

You can also test the Edge Function directly:

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/send-lead-assignment-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "test-lead-id",
    "assignedToId": "test-profile-id",
    "isTransfer": false
  }'
```

Get anon key from: http://localhost:54323 → Settings → API

