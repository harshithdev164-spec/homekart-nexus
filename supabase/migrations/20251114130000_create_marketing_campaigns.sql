-- Create marketing_campaigns table
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('email', 'sms', 'social', 'whatsapp')),
  property_type TEXT,
  target_audience TEXT NOT NULL,
  message_template TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'paused')),
  scheduled_date TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metrics JSONB DEFAULT '{"sent": 0, "opened": 0, "clicked": 0, "converted": 0}'::jsonb,
  
  CONSTRAINT valid_scheduled_date CHECK (scheduled_date IS NULL OR scheduled_date > NOW())
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_by ON public.marketing_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON public.marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_campaign_type ON public.marketing_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_created_at ON public.marketing_campaigns(created_at);

-- Add RLS policies
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own campaigns
CREATE POLICY "Users can view their own campaigns" ON public.marketing_campaigns
  FOR SELECT USING (created_by = auth.uid());

-- Policy: Users can insert their own campaigns
CREATE POLICY "Users can insert their own campaigns" ON public.marketing_campaigns
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- Policy: Users can update their own campaigns
CREATE POLICY "Users can update their own campaigns" ON public.marketing_campaigns
  FOR UPDATE USING (created_by = auth.uid());

-- Policy: Users can delete their own campaigns
CREATE POLICY "Users can delete their own campaigns" ON public.marketing_campaigns
  FOR DELETE USING (created_by = auth.uid());

-- Policy: Admins can view all campaigns
CREATE POLICY "Admins can view all campaigns" ON public.marketing_campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'manager')
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marketing_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER marketing_campaigns_updated_at_trigger
BEFORE UPDATE ON public.marketing_campaigns
FOR EACH ROW
EXECUTE FUNCTION update_marketing_campaigns_updated_at();
