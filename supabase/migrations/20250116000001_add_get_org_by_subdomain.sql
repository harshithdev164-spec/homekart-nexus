-- Add function to get organization by subdomain
-- This is useful for subdomain-based routing/login

CREATE OR REPLACE FUNCTION public.get_organization_by_subdomain(subdomain_text TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  subdomain TEXT,
  domain TEXT,
  plan subscription_plan,
  subscription_status subscription_status,
  owner_id UUID,
  logo_url TEXT,
  settings JSONB,
  max_users INTEGER,
  max_leads INTEGER,
  max_properties INTEGER,
  features JSONB,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.subdomain,
    o.domain,
    o.plan,
    o.subscription_status,
    o.owner_id,
    o.logo_url,
    o.settings,
    o.max_users,
    o.max_leads,
    o.max_properties,
    o.features,
    o.trial_ends_at,
    o.subscription_ends_at,
    o.created_at,
    o.updated_at
  FROM public.organizations o
  WHERE LOWER(o.subdomain) = LOWER(subdomain_text)
    AND o.subdomain IS NOT NULL;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.get_organization_by_subdomain IS 'Get organization by subdomain for subdomain-based routing';

