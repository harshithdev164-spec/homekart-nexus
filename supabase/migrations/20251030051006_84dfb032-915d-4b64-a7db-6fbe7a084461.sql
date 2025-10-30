-- Add delete policy for properties table
-- Users can delete properties they created or admins can delete all
CREATE POLICY "Users can delete properties they created or admins can delete all"
ON public.properties
FOR DELETE
USING (
  created_by IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
  OR is_admin()
);