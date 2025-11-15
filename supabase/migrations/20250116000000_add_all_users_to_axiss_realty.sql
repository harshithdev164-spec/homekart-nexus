-- Migration: Add all existing users to "Axiss Realty Corp" organization
-- This script creates the organization if it doesn't exist and adds all existing users

DO $$
DECLARE
  org_id UUID;
  owner_profile_id UUID;
  profile_record RECORD;
BEGIN
  -- Step 1: Find or create "Axiss Realty Corp" organization
  SELECT id INTO org_id
  FROM public.organizations
  WHERE LOWER(name) = 'axiss realty corp' OR LOWER(name) = 'axiss realty'
  LIMIT 1;

  -- If organization doesn't exist, create it
  IF org_id IS NULL THEN
    -- Get the first admin profile as owner (or first profile if no admin)
    SELECT id INTO owner_profile_id
    FROM public.profiles
    WHERE role = 'admin'
    ORDER BY created_at ASC
    LIMIT 1;

    -- If no admin, get first profile
    IF owner_profile_id IS NULL THEN
      SELECT id INTO owner_profile_id
      FROM public.profiles
      ORDER BY created_at ASC
      LIMIT 1;
    END IF;

    -- Create the organization
    INSERT INTO public.organizations (
      name,
      subdomain,
      plan,
      owner_id,
      subscription_status,
      max_users,
      max_leads,
      max_properties,
      created_at,
      updated_at
    ) VALUES (
      'Axiss Realty Corp',
      'axissrealty',
      'enterprise',
      owner_profile_id,
      'active',
      -1, -- Unlimited users
      -1, -- Unlimited leads
      -1, -- Unlimited properties
      NOW(),
      NOW()
    )
    RETURNING id INTO org_id;

    -- Create organization settings
    INSERT INTO public.organization_settings (
      organization_id,
      branding,
      notifications,
      integrations,
      lead_assignment_rules,
      custom_fields,
      created_at,
      updated_at
    ) VALUES (
      org_id,
      '{}'::jsonb,
      '{}'::jsonb,
      '{}'::jsonb,
      '{}'::jsonb,
      '{}'::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (organization_id) DO NOTHING;

    -- Create subscription record
    INSERT INTO public.subscriptions (
      organization_id,
      plan,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      created_at,
      updated_at
    ) VALUES (
      org_id,
      'enterprise',
      'active',
      NOW(),
      NOW() + INTERVAL '1 year',
      false,
      NOW(),
      NOW()
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created organization: Axiss Realty Corp (ID: %)', org_id;
  ELSE
    RAISE NOTICE 'Organization already exists: Axiss Realty Corp (ID: %)', org_id;
  END IF;

  -- Step 2: Add all existing profiles to the organization
  FOR profile_record IN 
    SELECT id, user_id, full_name, role
    FROM public.profiles
    WHERE organization_id IS NULL OR organization_id != org_id
  LOOP
    -- Update profile with organization_id
    UPDATE public.profiles
    SET organization_id = org_id
    WHERE id = profile_record.id;

    -- Add to organization_members if not already a member
    INSERT INTO public.organization_members (
      organization_id,
      profile_id,
      role,
      joined_at,
      is_active
    ) VALUES (
      org_id,
      profile_record.id,
      COALESCE(profile_record.role, 'employee')::user_role,
      NOW(),
      true
    )
    ON CONFLICT (organization_id, profile_id) 
    DO UPDATE SET 
      is_active = true,
      role = COALESCE(profile_record.role, 'employee')::user_role;

    RAISE NOTICE 'Added user to organization: % (Profile ID: %)', profile_record.full_name, profile_record.id;
  END LOOP;

  -- Step 3: Update all existing data to have organization_id
  -- Update leads
  UPDATE public.leads
  SET organization_id = org_id
  WHERE organization_id IS NULL;

  -- Update properties
  UPDATE public.properties
  SET organization_id = org_id
  WHERE organization_id IS NULL;

  -- Update activities
  UPDATE public.activities
  SET organization_id = org_id
  WHERE organization_id IS NULL;

  -- Update teams
  UPDATE public.teams
  SET organization_id = org_id
  WHERE organization_id IS NULL;

  -- Update communication_logs
  UPDATE public.communication_logs
  SET organization_id = org_id
  WHERE organization_id IS NULL;

  -- Update tasks
  UPDATE public.tasks
  SET organization_id = org_id
  WHERE organization_id IS NULL;

  -- Update visit_schedules
  UPDATE public.visit_schedules
  SET organization_id = org_id
  WHERE organization_id IS NULL;

  -- Update lead_transfers
  UPDATE public.lead_transfers
  SET organization_id = org_id
  WHERE organization_id IS NULL;

  RAISE NOTICE 'Migration completed successfully. All users added to Axiss Realty Corp.';
END $$;

