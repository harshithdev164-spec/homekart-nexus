-- Drop the existing policy that allows all team members to view all leads
DROP POLICY IF EXISTS "All team members can view all leads" ON public.leads;

-- Create new policy that restricts lead visibility
-- Users can only see leads assigned to them or created by them
-- Admins can see all leads
CREATE POLICY "Users can view assigned and own leads or admins can view all"
ON public.leads
FOR SELECT
USING (
  assigned_to IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ) 
  OR created_by IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
  OR is_admin()
);