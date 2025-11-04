-- Drop existing UPDATE policy for leads
DROP POLICY IF EXISTS "Users can update assigned leads, own created leads, or transfer leads" ON public.leads;

-- Create new UPDATE policy with proper USING and WITH CHECK clauses
CREATE POLICY "Users can update and transfer leads"
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
  -- User is admin
  is_admin()
  OR
  -- Any active authenticated user can update for transfers
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_active = true))
)
WITH CHECK (
  -- User is assigned to the lead
  (assigned_to IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR
  -- User created the lead
  (created_by IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()))
  OR
  -- User is admin
  is_admin()
  OR
  -- Any active authenticated user can update for transfers
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.is_active = true))
);