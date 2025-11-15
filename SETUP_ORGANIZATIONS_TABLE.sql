-- ============================================
-- SETUP ORGANIZATIONS TABLE - OPTIMIZED VERSION
-- ============================================
-- Copy and paste this entire file into Supabase SQL Editor and run it
-- This creates all the necessary tables for multi-tenancy with performance optimizations

-- ============================================
-- STEP 1: Create Enums (Idempotent)
-- ============================================
DO $$ BEGIN
  CREATE TYPE public.subscription_plan AS ENUM ('free', 'starter', 'professional', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- STEP 2: Create Helper Functions
-- ============================================

-- Function to set updated_at timestamp on UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to check if user belongs to organization (for RLS policies)
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(org_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    JOIN public.profiles p ON p.id = om.profile_id
    WHERE om.organization_id = org_uuid
      AND p.user_id = auth.uid()
      AND om.is_active = true
  );
$$;

-- Revoke public access to security definer function
REVOKE EXECUTE ON FUNCTION public.user_belongs_to_org(uuid) FROM anon, authenticated;

-- ============================================
-- STEP 3: Create Core Tables
-- ============================================

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  domain TEXT,
  plan subscription_plan NOT NULL DEFAULT 'free',
  subscription_status subscription_status NOT NULL DEFAULT 'active',
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  max_users INTEGER DEFAULT 5,
  max_leads INTEGER DEFAULT 100,
  max_properties INTEGER DEFAULT 50,
  features JSONB DEFAULT '{}'::jsonb,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Organization members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'employee',
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(organization_id, profile_id)
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Billing history table
CREATE TABLE IF NOT EXISTS public.billing_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL,
  invoice_url TEXT,
  stripe_invoice_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Organization settings table
CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  branding JSONB DEFAULT '{}'::jsonb,
  notifications JSONB DEFAULT '{}'::jsonb,
  integrations JSONB DEFAULT '{}'::jsonb,
  lead_assignment_rules JSONB DEFAULT '{}'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ============================================
-- STEP 4: Add organization_id Columns to Existing Tables
-- ============================================

-- Helper function to add organization_id column if missing
CREATE OR REPLACE FUNCTION public.add_org_column_if_missing(table_name text, column_name text DEFAULT 'organization_id')
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = add_org_column_if_missing.table_name
      AND column_name = add_org_column_if_missing.column_name
  ) THEN
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I UUID REFERENCES public.organizations(id)', 
                   add_org_column_if_missing.table_name, 
                   add_org_column_if_missing.column_name);
  END IF;
END;
$$;

-- Add organization_id to profiles
SELECT public.add_org_column_if_missing('profiles', 'organization_id');

-- Add organization_id to other tables
SELECT public.add_org_column_if_missing('leads', 'organization_id');
SELECT public.add_org_column_if_missing('properties', 'organization_id');
SELECT public.add_org_column_if_missing('activities', 'organization_id');
SELECT public.add_org_column_if_missing('teams', 'organization_id');
SELECT public.add_org_column_if_missing('communication_logs', 'organization_id');

-- Conditionally add to optional tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    PERFORM public.add_org_column_if_missing('tasks', 'organization_id');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visit_schedules') THEN
    PERFORM public.add_org_column_if_missing('visit_schedules', 'organization_id');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_transfers') THEN
    PERFORM public.add_org_column_if_missing('lead_transfers', 'organization_id');
  END IF;
END $$;

-- ============================================
-- STEP 5: Create Indexes for Performance
-- ============================================

-- Basic indexes on foreign keys and unique columns
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON public.organizations(subdomain) WHERE subdomain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(organization_id) WHERE organization_id IS NOT NULL;

-- Composite indexes for organization_members (optimized for RLS and common queries)
CREATE INDEX IF NOT EXISTS idx_org_members_profile_org_active ON public.organization_members (profile_id, organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_org_members_org_active ON public.organization_members (organization_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_profile_id ON public.organization_members(profile_id);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON public.subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- Indexes for billing_history
CREATE INDEX IF NOT EXISTS idx_billing_history_org_id ON public.billing_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_paid_at ON public.billing_history(paid_at) WHERE paid_at IS NOT NULL;

-- Indexes on organization_id columns in other tables
CREATE INDEX IF NOT EXISTS idx_leads_org_id ON public.leads(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_properties_org_id ON public.properties(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_teams_org_id ON public.teams(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_org_id ON public.activities(organization_id) WHERE organization_id IS NOT NULL;

-- ============================================
-- STEP 6: Create Triggers for updated_at
-- ============================================

-- Trigger for organizations
DROP TRIGGER IF EXISTS trg_organizations_set_updated_at ON public.organizations;
CREATE TRIGGER trg_organizations_set_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Trigger for subscriptions
DROP TRIGGER IF EXISTS trg_subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Trigger for organization_settings
DROP TRIGGER IF EXISTS trg_organization_settings_set_updated_at ON public.organization_settings;
CREATE TRIGGER trg_organization_settings_set_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- STEP 7: Enable Row Level Security
-- ============================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 8: Create RLS Policies (Optimized)
-- ============================================

-- Organizations policies
DO $$ 
BEGIN
  -- Drop existing policies if they exist (by name)
  DROP POLICY IF EXISTS "users_can_view_organization" ON public.organizations;
  DROP POLICY IF EXISTS "owners_can_update_organization" ON public.organizations;
  DROP POLICY IF EXISTS "owners_can_insert_organization" ON public.organizations;

  -- Users can view organizations they belong to
  CREATE POLICY "users_can_view_organization" ON public.organizations
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_org(id));

  -- Owners can update their organization
  CREATE POLICY "owners_can_update_organization" ON public.organizations
    FOR UPDATE TO authenticated
    USING (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

  -- Only authenticated users can insert (will be restricted by owner_id check)
  CREATE POLICY "owners_can_insert_organization" ON public.organizations
    FOR INSERT TO authenticated
    WITH CHECK (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
END $$;

-- Organization members policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "users_can_view_org_members" ON public.organization_members;
  DROP POLICY IF EXISTS "admins_can_manage_org_members" ON public.organization_members;

  -- Users can view members of their organization
  CREATE POLICY "users_can_view_org_members" ON public.organization_members
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_org(organization_id));

  -- Admins can manage members (insert, update, delete)
  CREATE POLICY "admins_can_manage_org_members" ON public.organization_members
    FOR ALL TO authenticated
    USING (
      organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        JOIN public.profiles p ON p.id = om.profile_id
        WHERE p.user_id = auth.uid()
          AND om.role IN ('admin', 'manager')
          AND om.is_active = true
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        JOIN public.profiles p ON p.id = om.profile_id
        WHERE p.user_id = auth.uid()
          AND om.role IN ('admin', 'manager')
          AND om.is_active = true
      )
    );
END $$;

-- Subscriptions policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "users_can_view_subscriptions" ON public.subscriptions;

  CREATE POLICY "users_can_view_subscriptions" ON public.subscriptions
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_org(organization_id));
END $$;

-- Billing history policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "admins_can_view_billing_history" ON public.billing_history;

  CREATE POLICY "admins_can_view_billing_history" ON public.billing_history
    FOR SELECT TO authenticated
    USING (
      organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        JOIN public.profiles p ON p.id = om.profile_id
        WHERE p.user_id = auth.uid()
          AND om.role = 'admin'
          AND om.is_active = true
      )
    );
END $$;

-- Organization settings policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "users_can_view_org_settings" ON public.organization_settings;
  DROP POLICY IF EXISTS "admins_can_update_org_settings" ON public.organization_settings;

  CREATE POLICY "users_can_view_org_settings" ON public.organization_settings
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_org(organization_id));

  CREATE POLICY "admins_can_update_org_settings" ON public.organization_settings
    FOR UPDATE TO authenticated
    USING (
      organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        JOIN public.profiles p ON p.id = om.profile_id
        WHERE p.user_id = auth.uid()
          AND om.role = 'admin'
          AND om.is_active = true
      )
    )
    WITH CHECK (
      organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        JOIN public.profiles p ON p.id = om.profile_id
        WHERE p.user_id = auth.uid()
          AND om.role = 'admin'
          AND om.is_active = true
      )
    );
END $$;

-- ============================================
-- STEP 9: Create Helper Functions for Auto-assignment
-- ============================================

-- Function to automatically set organization_id on insert (if not provided)
CREATE OR REPLACE FUNCTION public.set_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- If organization_id is not set, try to get it from the user's profile
  IF NEW.organization_id IS NULL THEN
    SELECT p.organization_id INTO org_id
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
    LIMIT 1;
    
    IF org_id IS NOT NULL THEN
      NEW.organization_id := org_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for automatic organization_id assignment
DROP TRIGGER IF EXISTS set_org_id_on_leads ON public.leads;
CREATE TRIGGER set_org_id_on_leads
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

DROP TRIGGER IF EXISTS set_org_id_on_properties ON public.properties;
CREATE TRIGGER set_org_id_on_properties
  BEFORE INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

DROP TRIGGER IF EXISTS set_org_id_on_activities ON public.activities;
CREATE TRIGGER set_org_id_on_activities
  BEFORE INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

DROP TRIGGER IF EXISTS set_org_id_on_teams ON public.teams;
CREATE TRIGGER set_org_id_on_teams
  BEFORE INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

-- ============================================
-- STEP 10: Add Comments for Documentation
-- ============================================

COMMENT ON TABLE public.organizations IS 'Multi-tenant organizations/companies';
COMMENT ON TABLE public.organization_members IS 'Users belonging to organizations with roles and membership status';
COMMENT ON TABLE public.subscriptions IS 'Subscription plans and billing periods for organizations';
COMMENT ON TABLE public.billing_history IS 'Payment and invoice history for organizations';
COMMENT ON TABLE public.organization_settings IS 'Customizable settings per organization (branding, notifications, integrations)';

COMMENT ON FUNCTION public.user_belongs_to_org(uuid) IS 'Helper function for RLS policies to check if current user belongs to an organization';
COMMENT ON FUNCTION public.set_updated_at() IS 'Trigger function to automatically update updated_at timestamp';
COMMENT ON FUNCTION public.set_organization_id() IS 'Trigger function to automatically assign organization_id from user profile';

-- ============================================
-- STEP 11: Success Message
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Organizations tables and indexes created successfully!';
  RAISE NOTICE '✅ RLS policies configured with optimized helper function';
  RAISE NOTICE '✅ Triggers set up for updated_at and organization_id auto-assignment';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run the user assignment script (20250116000000_add_all_users_to_axiss_realty.sql)';
  RAISE NOTICE '2. Test RLS policies with your application';
END $$;

-- ============================================
-- TESTING QUERIES (Run these as service_role to validate)
-- ============================================
-- Uncomment and run these queries to test the setup:

-- Test 1: Check if tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('organizations', 'organization_members', 'subscriptions', 'billing_history', 'organization_settings')
-- ORDER BY table_name;

-- Test 2: Check indexes
-- SELECT indexname, tablename FROM pg_indexes 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('organizations', 'organization_members', 'subscriptions', 'billing_history', 'organization_settings')
-- ORDER BY tablename, indexname;

-- Test 3: Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('organizations', 'organization_members', 'subscriptions', 'billing_history', 'organization_settings')
-- ORDER BY tablename, policyname;

-- Test 4: Verify helper function exists
-- SELECT proname, prosrc FROM pg_proc 
-- WHERE proname IN ('user_belongs_to_org', 'set_updated_at', 'set_organization_id');
