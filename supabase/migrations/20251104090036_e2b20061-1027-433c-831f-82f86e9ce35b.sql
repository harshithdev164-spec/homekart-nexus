-- Drop existing UPDATE policy for leads
DROP POLICY IF EXISTS "Users can update assigned leads and own created leads" ON public.leads;

-- Create new UPDATE policy that allows transfers
CREATE POLICY "Users can update assigned leads, own created leads, or transfer leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (
  -- User is assigned to the lead
  (assigned_to IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR
  -- User created the lead
  (created_by IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR
  -- User is an active team member (can transfer any lead)
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_active = true))
  OR
  -- User is admin
  is_admin()
);