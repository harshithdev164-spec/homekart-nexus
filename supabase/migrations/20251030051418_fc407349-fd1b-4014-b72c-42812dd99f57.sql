-- Drop the restrictive delete policy
DROP POLICY IF EXISTS "Users can delete properties they created or admins can delete all" ON public.properties;

-- Create new policy that allows all users to delete Magicbricks listings
-- but only creators/admins can delete regular properties
CREATE POLICY "Users can delete Magicbricks or own properties"
ON public.properties
FOR DELETE
USING (
  is_magicbricks_listing = true -- Anyone can delete Magicbricks listings
  OR created_by IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
  OR is_admin()
);