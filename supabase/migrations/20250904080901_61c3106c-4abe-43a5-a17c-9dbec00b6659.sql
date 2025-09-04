-- Create storage bucket for SOP report files
INSERT INTO storage.buckets (id, name, public) VALUES ('sop-reports', 'sop-reports', false);

-- Create RLS policies for SOP report files
CREATE POLICY "Users can upload their own SOP report files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'sop-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own SOP report files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'sop-reports' AND 
  (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
);

CREATE POLICY "Admins can view all SOP report files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'sop-reports' AND is_admin());

CREATE POLICY "Users can update their own SOP report files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'sop-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own SOP report files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'sop-reports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add files array column to sop_reports table
ALTER TABLE public.sop_reports 
ADD COLUMN files TEXT[] DEFAULT '{}';

-- Add comment to describe the files column
COMMENT ON COLUMN public.sop_reports.files IS 'Array of file paths/names uploaded with the report';