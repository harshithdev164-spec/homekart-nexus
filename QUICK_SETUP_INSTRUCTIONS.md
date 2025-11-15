# Quick Setup Instructions - Fix "Organizations table does not exist" Error

## The Problem
You're seeing this error:
```
Failed to create organization: Could not find the table 'public.organizations' in the schema cache
```

This means the database tables for organizations haven't been created yet.

## Solution: Run the SQL Migration

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run the Migration
1. Click **New Query**
2. Open the file `SETUP_ORGANIZATIONS_TABLE.sql` from your project root
3. Copy **ALL** the contents of that file
4. Paste it into the SQL Editor
5. Click **Run** (or press `Ctrl+Enter` / `Cmd+Enter`)

### Step 3: Verify Success
You should see a success message. To verify:
1. Go to **Table Editor** in Supabase
2. You should now see these new tables:
   - `organizations`
   - `organization_members`
   - `subscriptions`
   - `billing_history`
   - `organization_settings`

### Step 4: Run the User Assignment Script
After the tables are created, you can:
1. Go to `/admin-tools` in your app
2. Click "Setup Axiss Realty Corp Organization"
3. OR log in normally - it will auto-assign you

## Alternative: Run via Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## What This Does

The migration script:
- ✅ Creates all organization-related tables
- ✅ Adds `organization_id` columns to existing tables (leads, properties, etc.)
- ✅ Sets up Row Level Security (RLS) policies
- ✅ Creates necessary indexes for performance
- ✅ Makes everything safe to run multiple times (uses `IF NOT EXISTS`)

## After Running the Migration

Once the migration is complete:
1. **Refresh your app** (or log out and log back in)
2. The app will automatically:
   - Create "Axiss Realty Corp" organization
   - Assign all existing users to it
   - Update all existing data to belong to this organization

## Need Help?

If you still see errors after running the migration:
1. Check the SQL Editor output for any error messages
2. Make sure you copied the entire SQL file
3. Try running it section by section if needed
4. Check that your Supabase project has the necessary permissions

