-- Add project_name to leads table
ALTER TABLE public.leads 
ADD COLUMN project_name text;

-- Add wings, towers, and floor to properties table
ALTER TABLE public.properties 
ADD COLUMN wings integer,
ADD COLUMN towers integer,
ADD COLUMN floor text;