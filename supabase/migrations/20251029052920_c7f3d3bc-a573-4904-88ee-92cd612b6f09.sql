-- Add is_magicbricks_listing field to properties table
ALTER TABLE public.properties
ADD COLUMN is_magicbricks_listing BOOLEAN NOT NULL DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.properties.is_magicbricks_listing IS 'Indicates if this property is actively listed on Magicbricks platform';