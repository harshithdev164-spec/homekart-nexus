-- Create portal_listings table to track property listings across portals
CREATE TABLE IF NOT EXISTS public.portal_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  portal_name TEXT NOT NULL,
  portal_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'failed', 'expired')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  CONSTRAINT unique_listing_portal UNIQUE(listing_id, portal_name)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_portal_listings_listing_id ON public.portal_listings(listing_id);
CREATE INDEX IF NOT EXISTS idx_portal_listings_portal_name ON public.portal_listings(portal_name);
CREATE INDEX IF NOT EXISTS idx_portal_listings_status ON public.portal_listings(status);
CREATE INDEX IF NOT EXISTS idx_portal_listings_created_by ON public.portal_listings(created_by);
CREATE INDEX IF NOT EXISTS idx_portal_listings_created_at ON public.portal_listings(created_at);

-- Add RLS policies
ALTER TABLE public.portal_listings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own portal listings
CREATE POLICY "Users can view their own portal listings" ON public.portal_listings
  FOR SELECT USING (created_by = auth.uid());

-- Policy: Users can insert their own portal listings
CREATE POLICY "Users can insert their own portal listings" ON public.portal_listings
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Policy: Admins can view all portal listings
CREATE POLICY "Admins can view all portal listings" ON public.portal_listings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Policy: Admins can update portal listings
CREATE POLICY "Admins can update portal listings" ON public.portal_listings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );
