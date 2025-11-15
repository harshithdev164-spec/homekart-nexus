-- ============================================
-- SETUP ORGANIZATIONS TABLE - RUN THIS FIRST
-- ============================================
-- Copy and paste this entire file into Supabase SQL Editor and run it
-- This creates all the necessary tables for multi-tenancy

-- Step 1: Create subscription plan enum
DO $$ BEGIN
  CREATE TYPE public.subscription_plan AS ENUM ('free', 'starter', 'professional', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create subscription status enum
DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 3: Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  domain TEXT,
  plan subscription_plan NOT NULL DEFAULT 'free',
  subscription_status subscription_status NOT NULL DEFAULT 'active',
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
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

-- Step 4: Create organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'employee',
  invited_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  joined_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(organization_id, profile_id)
);

-- Step 5: Create subscriptions table
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

-- Step 6: Create billing_history table
CREATE TABLE IF NOT EXISTS public.billing_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL,
  invoice_url TEXT,
  stripe_invoice_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 7: Create organization_settings table
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

-- Step 8: Add organization_id column to profiles (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;
END $$;

-- Step 9: Add organization_id to other tables (if not exists)
DO $$ 
BEGIN
  -- Leads
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;

  -- Properties
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;

  -- Activities
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.activities ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;

  -- Teams
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'teams' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.teams ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;

  -- Communication logs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'communication_logs' AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.communication_logs ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;

  -- Tasks (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'tasks' AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE public.tasks ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
  END IF;

  -- Visit schedules (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visit_schedules') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'visit_schedules' AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE public.visit_schedules ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
  END IF;

  -- Lead transfers (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_transfers') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'lead_transfers' AND column_name = 'organization_id'
    ) THEN
      ALTER TABLE public.lead_transfers ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    END IF;
  END IF;
END $$;

-- Step 10: Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON public.organizations(subdomain);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_profile_id ON public.organization_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON public.subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_org_id ON public.billing_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_org_id ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_properties_org_id ON public.properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_org_id ON public.teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_org_id ON public.activities(organization_id);

-- Step 11: Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Step 12: Create RLS Policies
-- Organizations policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organizations' 
    AND policyname = 'Users can view their organization'
  ) THEN
    CREATE POLICY "Users can view their organization" ON public.organizations
      FOR SELECT TO authenticated
      USING (
        id IN (
          SELECT organization_id FROM public.organization_members om
          JOIN public.profiles p ON p.id = om.profile_id
          WHERE p.user_id = auth.uid() AND om.is_active = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organizations' 
    AND policyname = 'Owners can update their organization'
  ) THEN
    CREATE POLICY "Owners can update their organization" ON public.organizations
      FOR UPDATE TO authenticated
      USING (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Organization members policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organization_members' 
    AND policyname = 'Users can view members of their organization'
  ) THEN
    CREATE POLICY "Users can view members of their organization" ON public.organization_members
      FOR SELECT TO authenticated
      USING (
        organization_id IN (
          SELECT om.organization_id FROM public.organization_members om
          JOIN public.profiles p ON p.id = om.profile_id
          WHERE p.user_id = auth.uid() AND om.is_active = true
        )
      );
  END IF;
END $$;

-- Subscriptions policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'subscriptions' 
    AND policyname = 'Users can view subscriptions of their organization'
  ) THEN
    CREATE POLICY "Users can view subscriptions of their organization" ON public.subscriptions
      FOR SELECT TO authenticated
      USING (
        organization_id IN (
          SELECT om.organization_id FROM public.organization_members om
          JOIN public.profiles p ON p.id = om.profile_id
          WHERE p.user_id = auth.uid() AND om.is_active = true
        )
      );
  END IF;
END $$;

-- Organization settings policies
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'organization_settings' 
    AND policyname = 'Users can view settings of their organization'
  ) THEN
    CREATE POLICY "Users can view settings of their organization" ON public.organization_settings
      FOR SELECT TO authenticated
      USING (
        organization_id IN (
          SELECT om.organization_id FROM public.organization_members om
          JOIN public.profiles p ON p.id = om.profile_id
          WHERE p.user_id = auth.uid() AND om.is_active = true
        )
      );
  END IF;
END $$;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE 'Organizations tables created successfully!';
END $$;

