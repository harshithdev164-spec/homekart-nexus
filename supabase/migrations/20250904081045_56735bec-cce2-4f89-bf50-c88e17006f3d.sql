-- Add files array column to sop_reports table
ALTER TABLE public.sop_reports 
ADD COLUMN files TEXT[] DEFAULT '{}';

-- Add comment to describe the files column
COMMENT ON COLUMN public.sop_reports.files IS 'Array of file paths/names uploaded with the report';

-- Create RLS policies for SOP report files (only if they don't exist)
DO $$
BEGIN
    -- Check if policies exist before creating them
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can upload their own SOP report files'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can upload their own SOP report files" 
        ON storage.objects 
        FOR INSERT 
        WITH CHECK (bucket_id = ''sop-reports'' AND auth.uid()::text = (storage.foldername(name))[1])';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can view their own SOP report files'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can view their own SOP report files" 
        ON storage.objects 
        FOR SELECT 
        USING (
          bucket_id = ''sop-reports'' AND 
          (auth.uid()::text = (storage.foldername(name))[1] OR is_admin())
        )';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Admins can view all SOP report files'
    ) THEN
        EXECUTE 'CREATE POLICY "Admins can view all SOP report files" 
        ON storage.objects 
        FOR SELECT 
        USING (bucket_id = ''sop-reports'' AND is_admin())';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can update their own SOP report files'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can update their own SOP report files" 
        ON storage.objects 
        FOR UPDATE 
        USING (bucket_id = ''sop-reports'' AND auth.uid()::text = (storage.foldername(name))[1])';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can delete their own SOP report files'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can delete their own SOP report files" 
        ON storage.objects 
        FOR DELETE 
        USING (bucket_id = ''sop-reports'' AND auth.uid()::text = (storage.foldername(name))[1])';
    END IF;
END $$;