-- Add foreign key constraint to link sop_reports to profiles
ALTER TABLE public.sop_reports 
ADD CONSTRAINT sop_reports_submitted_by_fkey 
FOREIGN KEY (submitted_by) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;