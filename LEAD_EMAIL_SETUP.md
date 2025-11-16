# Lead Assignment Email Notifications - Setup Guide

## Overview
This system automatically sends email notifications to employees when leads are assigned or transferred to them. The emails include complete lead information and a direct link to view the lead in the CRM.

## Features
- ✅ Automatic email notifications for ALL lead assignments
- ✅ Works for manual assignments, transfers, webhook imports, and database updates
- ✅ Beautiful HTML email template with lead details
- ✅ Direct "View Lead in CRM" button in emails
- ✅ Database trigger ensures emails are sent even for direct database updates
- ✅ Backup client-side calls for immediate delivery

## Environment Variables Setup

### Required in Supabase Dashboard

Go to **Supabase Dashboard > Project Settings > Edge Functions > Secrets** and set:

1. **RESEND_API_KEY** (Required)
   - Get your API key from [Resend.com](https://resend.com/api-keys)
   - Format: `re_xxxxxxxxxxxxx`

2. **RESEND_FROM_EMAIL** (Optional, but recommended)
   - Use your verified domain: `"CRM Notifications <noreply@yourdomain.com>"`
   - Or use Resend's test domain: `"CRM Notifications <onboarding@resend.dev>"`
   - Default: `"CRM Notifications <onboarding@resend.dev>"`

3. **CRM_BASE_URL** (Optional)
   - Your production CRM URL
   - Example: `"https://homekart-nexus.vercel.app"`
   - Default: `"https://homekart-nexus.vercel.app"`

### Setting Environment Variables

1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** > **Edge Functions**
3. Click on **Secrets** tab
4. Add each environment variable:
   - Click **Add new secret**
   - Enter the variable name (e.g., `RESEND_API_KEY`)
   - Enter the value
   - Click **Save**

## Database Migration

Run the migration to create the database trigger:

```sql
-- The migration file is located at:
-- supabase/migrations/20251116113806_create_lead_assignment_email_trigger.sql
```

This migration:
- Creates a trigger function that automatically sends emails on lead assignment
- Works for both INSERT (new assignments) and UPDATE (transfers)
- Fails silently if HTTP extension is not available (client-side calls will still work)

### Running the Migration

1. Go to Supabase Dashboard > SQL Editor
2. Copy the contents of the migration file
3. Paste and run it
4. Verify the trigger was created:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_notify_lead_assignment';
   ```

## Email Template Features

The email includes:
- Lead name, phone, email
- Property type and preferred location
- Budget range (formatted in Indian Rupees)
- Lead status and source
- Project name (if available)
- Notes (if available)
- **Direct "View Lead in CRM" button** - Opens the lead in your CRM
- Fallback text link if button doesn't render

## How It Works

### Assignment Scenarios Covered

1. **Manual Assignment** (via UI)
   - User clicks "Assign to Me" in LeadAssignmentIndicator
   - Email sent via trigger + backup client call

2. **Lead Transfer** (via UI)
   - User transfers lead via LeadTransfer component
   - Email sent via trigger + backup client call

3. **Webhook Imports**
   - Leads created via webhook-leads function
   - Automatically assigned and email sent

4. **Portal Imports** (MagicBricks, 99acres)
   - Leads imported via portal functions
   - Automatically assigned and email sent

5. **Direct Database Updates**
   - Any direct SQL update to `assigned_to` column
   - Trigger automatically sends email

6. **Realtime Updates**
   - Assignment changes detected via Supabase Realtime
   - Backup email call ensures delivery

### Dual Email Strategy

The system uses a **dual approach** for reliability:

1. **Database Trigger** (Primary)
   - Automatically fires on any `assigned_to` change
   - Works even for direct database updates
   - Requires HTTP extension (may not be available in all Supabase plans)

2. **Client-Side Calls** (Backup/Optimistic)
   - Called immediately from frontend components
   - Ensures fast delivery even if trigger fails
   - Non-blocking (doesn't fail if email service is down)

## Testing

### Local Development Testing

**Important**: The database trigger may not work in local Supabase due to HTTP extension limitations. **This is OK!** The frontend components will send emails directly.

**Quick Local Test:**
1. Set secrets: `supabase secrets set RESEND_API_KEY=your-key`
2. Start Supabase: `supabase start`
3. Start dev server: `npm run dev`
4. Assign a lead via UI
5. Check email inbox

See `LOCAL_EMAIL_TESTING.md` for detailed local testing guide.

### Production Testing

1. **Manual Assignment Test**:
   - Go to Leads page
   - Click "Assign to Me" on an unassigned lead
   - Check assigned employee's email inbox

2. **Transfer Test**:
   - Open a lead detail modal
   - Click "Transfer" button
   - Select another employee
   - Check new assignee's email inbox

3. **Webhook Test**:
   - Send a test webhook to `/functions/v1/webhook-leads`
   - Verify lead is created and assigned
   - Check assigned employee's email inbox

### Verify Email Content

Emails should include:
- ✅ Correct lead information
- ✅ "View Lead in CRM" button
- ✅ Proper formatting on desktop and mobile
- ✅ All lead fields (name, phone, email, budget, location, etc.)

## Troubleshooting

### Emails Not Sending

1. **Check Resend API Key**:
   ```sql
   -- Verify in Supabase Dashboard > Edge Functions > Secrets
   -- RESEND_API_KEY should be set
   ```

2. **Check Edge Function Logs**:
   - Go to Supabase Dashboard > Edge Functions > Logs
   - Look for `send-lead-assignment-email` function logs
   - Check for error messages

3. **Verify Trigger Exists**:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_notify_lead_assignment';
   ```

4. **Test Edge Function Directly**:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/send-lead-assignment-email \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "leadId": "lead-uuid",
       "assignedToId": "profile-uuid",
       "isTransfer": false
     }'
   ```

### Email Template Issues

- Check browser console for HTML rendering issues
- Verify CRM_BASE_URL is set correctly
- Test email link manually by copying from email

### Database Trigger Not Firing

- Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_notify_lead_assignment';`
- Check if HTTP extension is enabled (may require Supabase Pro plan)
- Client-side calls will still work as backup

## Security Notes

- Email function validates user authentication
- Only sends emails to assigned employee
- Lead data is fetched securely via Supabase client
- Resend API key is stored securely in Supabase secrets

## Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Verify all environment variables are set
3. Test the Edge Function directly via curl/Postman
4. Check Resend dashboard for email delivery status

