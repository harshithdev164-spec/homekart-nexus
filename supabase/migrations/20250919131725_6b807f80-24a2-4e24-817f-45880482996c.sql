-- Update RLS policy for reports table to allow admins and managers (HR) to view all reports
DROP POLICY IF EXISTS "Users can view public reports or their own reports" ON public.reports;

CREATE POLICY "Users can view public reports, own reports, or all reports if admin/manager" 
ON public.reports 
FOR SELECT 
USING (
  (is_public = true) OR 
  (generated_by IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())) OR 
  is_admin() OR 
  has_role('manager'::user_role)
);

-- Also update the daily_reports table policy to be consistent
-- First check if there are existing policies that need updating
DROP POLICY IF EXISTS "Users can view all daily reports" ON public.daily_reports;

CREATE POLICY "Users can view all daily reports" 
ON public.daily_reports 
FOR SELECT 
USING (true);

-- Ensure managers can also update daily reports if needed
DROP POLICY IF EXISTS "Users can update their own daily reports" ON public.daily_reports;

CREATE POLICY "Users can update their own daily reports or admins/managers can update all" 
ON public.daily_reports 
FOR UPDATE 
USING (
  (submitted_by IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())) OR 
  is_admin() OR 
  has_role('manager'::user_role)
);