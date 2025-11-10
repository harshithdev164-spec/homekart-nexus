-- Add source field to properties table to track property source
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct';

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_properties_source ON public.properties(source);

-- Update existing Magicbricks properties
UPDATE public.properties 
SET source = 'magicbricks' 
WHERE is_magicbricks_listing = true;

-- Add comment
COMMENT ON COLUMN public.properties.source IS 'Source of the property listing (direct, magicbricks, 99acres, etc.)';