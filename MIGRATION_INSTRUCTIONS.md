# Migration Instructions: Add All Users to Axiss Realty Corp

## Overview
This migration will:
1. Create "Axiss Realty Corp" organization if it doesn't exist
2. Add all existing users to this organization
3. Update all existing data (leads, properties, etc.) to belong to this organization

## Steps to Run Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Copy the contents of `supabase/migrations/20250116000000_add_all_users_to_axiss_realty.sql`
6. Paste it into the SQL Editor
7. Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
8. Check the output for success messages

### Option 2: Using Supabase CLI

```bash
# Make sure you're in the project root
cd /path/to/homekart-nexus

# Link to your Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

### Option 3: Direct SQL Execution

If you have direct database access, you can run the SQL file directly using `psql` or your preferred database client.

## Verification

After running the migration, verify it worked:

1. **Check Organization Created:**
   ```sql
   SELECT * FROM public.organizations WHERE LOWER(name) LIKE '%axiss%';
   ```

2. **Check Users Added:**
   ```sql
   SELECT COUNT(*) FROM public.organization_members 
   WHERE organization_id = (SELECT id FROM public.organizations WHERE LOWER(name) LIKE '%axiss%');
   ```

3. **Check Profiles Updated:**
   ```sql
   SELECT COUNT(*) FROM public.profiles 
   WHERE organization_id IS NOT NULL;
   ```

## What the Migration Does

1. **Creates Organization:**
   - Name: "Axiss Realty Corp"
   - Subdomain: "axissrealty"
   - Plan: Enterprise (unlimited users, leads, properties)
   - Owner: First admin user (or first user if no admin)

2. **Adds All Users:**
   - Updates all profiles with `organization_id`
   - Adds all profiles to `organization_members` table
   - Preserves existing user roles

3. **Updates Existing Data:**
   - Sets `organization_id` on all leads
   - Sets `organization_id` on all properties
   - Sets `organization_id` on all activities
   - Sets `organization_id` on all teams
   - Sets `organization_id` on all communication logs
   - Sets `organization_id` on all tasks
   - Sets `organization_id` on all visit schedules
   - Sets `organization_id` on all lead transfers

4. **Creates Supporting Records:**
   - Organization settings
   - Subscription record

## Troubleshooting

### Error: "relation 'public.organizations' does not exist"
- **Solution:** Run the organization schema migration first: `supabase/migrations/20251115152223_create_organizations_schema.sql`

### Error: "duplicate key value violates unique constraint"
- **Solution:** The organization already exists. The migration will use the existing one.

### Error: "column 'organization_id' does not exist"
- **Solution:** Make sure you've run the organization schema migration that adds `organization_id` columns to existing tables.

## After Migration

1. All users should now be able to login and see the "Axiss Realty Corp" organization
2. All existing data will be associated with this organization
3. Users can access the dashboard without needing to create an organization

