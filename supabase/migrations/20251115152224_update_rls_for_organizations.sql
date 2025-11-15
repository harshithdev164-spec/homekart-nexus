-- Update RLS Policies for Multi-Tenant Support
-- This migration updates existing RLS policies to include organization_id checks

-- Drop existing policies that need to be updated
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view assigned leads and own created leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view activities" ON public.activities;

-- Update profiles policies with organization context
CREATE POLICY "Users can view profiles in their organization" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.profile_id
      WHERE p.user_id = auth.uid() AND om.is_active = true
    )
    OR organization_id IS NULL -- Allow viewing profiles without org (backward compatibility)
  );

-- Update leads policies with organization context
CREATE POLICY "Users can view leads in their organization" ON public.leads
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.profile_id
      WHERE p.user_id = auth.uid() AND om.is_active = true
    )
    OR organization_id IS NULL -- Allow viewing leads without org (backward compatibility)
    OR assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert leads in their organization" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.profile_id
      WHERE p.user_id = auth.uid() AND om.is_active = true
    )
    OR organization_id IS NULL
  );

CREATE POLICY "Users can update leads in their organization" ON public.leads
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.profile_id
      WHERE p.user_id = auth.uid() AND om.is_active = true
    )
    OR assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    OR created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Update properties policies with organization context
CREATE POLICY "Users can view properties in their organization" ON public.properties
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.profile_id
      WHERE p.user_id = auth.uid() AND om.is_active = true
    )
    OR organization_id IS NULL
  );

CREATE POLICY "Users can insert properties in their organization" ON public.properties
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.profile_id
      WHERE p.user_id = auth.uid() AND om.is_active = true
    )
    OR organization_id IS NULL
  );

CREATE POLICY "Users can update properties in their organization" ON public.properties
  FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.profile_id
      WHERE p.user_id = auth.uid() AND om.is_active = true
    )
    OR created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Update teams policies with organization context
CREATE POLICY "Users can view teams in their organization" ON public.teams
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.profile_id
      WHERE p.user_id = auth.uid() AND om.is_active = true
    )
    OR organization_id IS NULL
  );

CREATE POLICY "Users can insert teams in their organization" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.profile_id
      WHERE p.user_id = auth.uid() AND om.is_active = true
    )
    OR organization_id IS NULL
  );

-- Update team_members policies with organization context
CREATE POLICY "Users can view team members in their organization" ON public.team_members
  FOR SELECT TO authenticated
  USING (
    team_id IN (
      SELECT id FROM public.teams
      WHERE organization_id IN (
        SELECT om.organization_id
        FROM public.organization_members om
        JOIN public.profiles p ON p.id = om.profile_id
        WHERE p.user_id = auth.uid() AND om.is_active = true
      )
      OR organization_id IS NULL
    )
  );

-- Update activities policies with organization context
CREATE POLICY "Users can view activities in their organization" ON public.activities
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.profile_id
      WHERE p.user_id = auth.uid() AND om.is_active = true
    )
    OR organization_id IS NULL
    OR created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert activities in their organization" ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      JOIN public.profiles p ON p.id = om.profile_id
      WHERE p.user_id = auth.uid() AND om.is_active = true
    )
    OR organization_id IS NULL
  );

-- Update communication_logs policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'communication_logs') THEN
    DROP POLICY IF EXISTS "Users can view communication logs" ON public.communication_logs;
    
    CREATE POLICY "Users can view communication logs in their organization" ON public.communication_logs
      FOR SELECT TO authenticated
      USING (
        organization_id IN (
          SELECT om.organization_id
          FROM public.organization_members om
          JOIN public.profiles p ON p.id = om.profile_id
          WHERE p.user_id = auth.uid() AND om.is_active = true
        )
        OR organization_id IS NULL
        OR sent_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- Update tasks policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tasks') THEN
    DROP POLICY IF EXISTS "Users can view tasks" ON public.tasks;
    
    CREATE POLICY "Users can view tasks in their organization" ON public.tasks
      FOR SELECT TO authenticated
      USING (
        organization_id IN (
          SELECT om.organization_id
          FROM public.organization_members om
          JOIN public.profiles p ON p.id = om.profile_id
          WHERE p.user_id = auth.uid() AND om.is_active = true
        )
        OR organization_id IS NULL
        OR assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
        OR created_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- Update visit_schedules policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'visit_schedules') THEN
    DROP POLICY IF EXISTS "Users can view visit schedules" ON public.visit_schedules;
    
    CREATE POLICY "Users can view visit schedules in their organization" ON public.visit_schedules
      FOR SELECT TO authenticated
      USING (
        organization_id IN (
          SELECT om.organization_id
          FROM public.organization_members om
          JOIN public.profiles p ON p.id = om.profile_id
          WHERE p.user_id = auth.uid() AND om.is_active = true
        )
        OR organization_id IS NULL
        OR assigned_to IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      );
  END IF;
END $$;

-- Create helper function for organization context in queries
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT om.organization_id
  FROM public.organization_members om
  JOIN public.profiles p ON p.id = om.profile_id
  WHERE p.user_id = auth.uid()
    AND om.is_active = true
  LIMIT 1;
$$;

