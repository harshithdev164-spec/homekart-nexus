-- SaaS Multi-Tenant Architecture: Organizations Schema
-- This migration adds organization/tenant support for multi-tenant SaaS functionality

-- Create subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'starter', 'professional', 'enterprise');
CREATE TYPE public.subscription_status AS ENUM ('active', 'cancelled', 'past_due', 'trialing', 'expired');

-- Create organizations table
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  domain TEXT, -- For custom domain support (future)
  plan subscription_plan NOT NULL DEFAULT 'free',
  subscription_status subscription_status NOT NULL DEFAULT 'active',
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  max_users INTEGER DEFAULT 5,
  max_leads INTEGER DEFAULT 100,
  max_properties INTEGER DEFAULT 50,
  features JSONB DEFAULT '{}'::jsonb, -- Feature flags per plan
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_members table
CREATE TABLE public.organization_members (
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

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL,
  status subscription_status NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  stripe_subscription_id TEXT, -- For Stripe integration (optional)
  stripe_customer_id TEXT, -- For Stripe integration (optional)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create billing_history table
CREATE TABLE public.billing_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id),
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL, -- 'paid', 'pending', 'failed', 'refunded'
  invoice_url TEXT,
  stripe_invoice_id TEXT, -- For Stripe integration (optional)
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organization_settings table
CREATE TABLE public.organization_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  branding JSONB DEFAULT '{}'::jsonb, -- Logo, colors, etc.
  notifications JSONB DEFAULT '{}'::jsonb,
  integrations JSONB DEFAULT '{}'::jsonb,
  lead_assignment_rules JSONB DEFAULT '{}'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add organization_id to existing tables
ALTER TABLE public.profiles ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.leads ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.properties ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.teams ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.activities ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.communication_logs ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.tasks ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.visit_schedules ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
ALTER TABLE public.lead_transfers ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Create indexes for performance
CREATE INDEX idx_organizations_subdomain ON public.organizations(subdomain);
CREATE INDEX idx_organizations_owner_id ON public.organizations(owner_id);
CREATE INDEX idx_organization_members_org_id ON public.organization_members(organization_id);
CREATE INDEX idx_organization_members_profile_id ON public.organization_members(profile_id);
CREATE INDEX idx_subscriptions_org_id ON public.subscriptions(organization_id);
CREATE INDEX idx_billing_history_org_id ON public.billing_history(organization_id);
CREATE INDEX idx_profiles_org_id ON public.profiles(organization_id);
CREATE INDEX idx_leads_org_id ON public.leads(organization_id);
CREATE INDEX idx_properties_org_id ON public.properties(organization_id);
CREATE INDEX idx_teams_org_id ON public.teams(organization_id);
CREATE INDEX idx_activities_org_id ON public.activities(organization_id);

-- Create function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization(user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT om.organization_id
  FROM public.organization_members om
  JOIN public.profiles p ON p.id = om.profile_id
  WHERE p.user_id = get_user_organization.user_id
    AND om.is_active = true
  LIMIT 1;
$$;

-- Create function to check if user belongs to organization
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(org_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members om
    JOIN public.profiles p ON p.id = om.profile_id
    WHERE p.user_id = auth.uid()
      AND om.organization_id = user_belongs_to_org.org_id
      AND om.is_active = true
  );
$$;

-- RLS Policies for organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.profile_id
      WHERE p.user_id = auth.uid() AND om.is_active = true
    )
  );

CREATE POLICY "Owners can update their organization" ON public.organizations
  FOR UPDATE TO authenticated
  USING (owner_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- RLS Policies for organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their organization" ON public.organization_members
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "Admins can manage organization members" ON public.organization_members
  FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.profile_id
      WHERE p.user_id = auth.uid()
        AND om.role IN ('admin', 'manager')
        AND om.is_active = true
    )
  );

-- RLS Policies for subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view subscriptions of their organization" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(organization_id));

-- RLS Policies for billing_history
ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view billing history of their organization" ON public.billing_history
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.profile_id
      WHERE p.user_id = auth.uid()
        AND om.role = 'admin'
        AND om.is_active = true
    )
  );

-- RLS Policies for organization_settings
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view settings of their organization" ON public.organization_settings
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_org(organization_id));

CREATE POLICY "Admins can update settings of their organization" ON public.organization_settings
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.profile_id
      WHERE p.user_id = auth.uid()
        AND om.role = 'admin'
        AND om.is_active = true
    )
  );

-- Update existing RLS policies to include organization_id checks
-- Note: This is a simplified approach. In production, you'd want to update each policy individually

-- Helper function to ensure organization context
CREATE OR REPLACE FUNCTION public.ensure_org_context()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Get user's primary organization
  SELECT om.organization_id INTO org_id
  FROM public.organization_members om
  JOIN public.profiles p ON p.id = om.profile_id
  WHERE p.user_id = auth.uid()
    AND om.is_active = true
  LIMIT 1;
  
  RETURN org_id;
END;
$$;

-- Add trigger to automatically set organization_id on insert for existing tables
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
CREATE TRIGGER set_org_id_on_leads
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

CREATE TRIGGER set_org_id_on_properties
  BEFORE INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

CREATE TRIGGER set_org_id_on_activities
  BEFORE INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

CREATE TRIGGER set_org_id_on_teams
  BEFORE INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

-- Add comments
COMMENT ON TABLE public.organizations IS 'Multi-tenant organizations/companies';
COMMENT ON TABLE public.organization_members IS 'Users belonging to organizations';
COMMENT ON TABLE public.subscriptions IS 'Subscription plans and billing periods';
COMMENT ON TABLE public.billing_history IS 'Payment and invoice history';
COMMENT ON TABLE public.organization_settings IS 'Customizable settings per organization';

