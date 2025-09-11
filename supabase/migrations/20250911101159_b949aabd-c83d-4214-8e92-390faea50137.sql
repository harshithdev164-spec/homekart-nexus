-- Update the RLS policy for leads to allow all team members to view all leads
DROP POLICY IF EXISTS "Users can view assigned leads and own created leads" ON public.leads;

-- Create new policy that allows all authenticated users to view all leads
CREATE POLICY "All team members can view all leads" 
ON public.leads 
FOR SELECT 
USING (true);