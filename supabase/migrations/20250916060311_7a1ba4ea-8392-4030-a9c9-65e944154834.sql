-- Add source_type field to properties table to track agent/owner
ALTER TABLE public.properties 
ADD COLUMN source_type text DEFAULT 'owner' CHECK (source_type IN ('agent', 'owner'));