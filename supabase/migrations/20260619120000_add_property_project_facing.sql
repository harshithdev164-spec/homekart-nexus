-- Add project name and facing attributes to properties (used by the property filter & forms).
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS project_name text,
  ADD COLUMN IF NOT EXISTS facing text;

CREATE INDEX IF NOT EXISTS idx_properties_project_name ON public.properties(project_name);
CREATE INDEX IF NOT EXISTS idx_properties_facing ON public.properties(facing);
