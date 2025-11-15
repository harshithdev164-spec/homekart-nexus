-- Create report_templates table
CREATE TABLE IF NOT EXISTS public.report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('sales_performance', 'lead_management', 'property', 'agent_performance', 'marketing', 'activity', 'financial', 'custom')),
  type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scheduled_reports table
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_config JSONB NOT NULL,
  schedule JSONB NOT NULL,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  format TEXT NOT NULL CHECK (format IN ('excel', 'pdf', 'csv', 'json')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_run TIMESTAMP WITH TIME ZONE,
  next_run TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report_favorites table
CREATE TABLE IF NOT EXISTS public.report_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, report_config)
);

-- Create report_shares table
CREATE TABLE IF NOT EXISTS public.report_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL,
  shared_with UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_id, shared_with)
);

-- Enable RLS on all tables
ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for report_templates
CREATE POLICY "Users can view public report templates"
ON public.report_templates FOR SELECT
USING (is_public = true OR created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own report templates"
ON public.report_templates FOR INSERT
WITH CHECK (created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own report templates"
ON public.report_templates FOR UPDATE
USING (created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own report templates"
ON public.report_templates FOR DELETE
USING (created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- RLS Policies for scheduled_reports
CREATE POLICY "Users can view their own scheduled reports"
ON public.scheduled_reports FOR SELECT
USING (created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR is_admin());

CREATE POLICY "Users can create their own scheduled reports"
ON public.scheduled_reports FOR INSERT
WITH CHECK (created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own scheduled reports"
ON public.scheduled_reports FOR UPDATE
USING (created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own scheduled reports"
ON public.scheduled_reports FOR DELETE
USING (created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- RLS Policies for report_favorites
CREATE POLICY "Users can view their own favorites"
ON public.report_favorites FOR SELECT
USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create their own favorites"
ON public.report_favorites FOR INSERT
WITH CHECK (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own favorites"
ON public.report_favorites FOR DELETE
USING (user_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- RLS Policies for report_shares
CREATE POLICY "Users can view reports shared with them"
ON public.report_shares FOR SELECT
USING (shared_with IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can share reports"
ON public.report_shares FOR INSERT
WITH CHECK (created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update shares they created"
ON public.report_shares FOR UPDATE
USING (created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete shares they created"
ON public.report_shares FOR DELETE
USING (created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_report_templates_category ON public.report_templates(category);
CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON public.report_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON public.scheduled_reports(next_run) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_created_by ON public.scheduled_reports(created_by);
CREATE INDEX IF NOT EXISTS idx_report_favorites_user_id ON public.report_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_shared_with ON public.report_shares(shared_with);
CREATE INDEX IF NOT EXISTS idx_report_shares_report_id ON public.report_shares(report_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_report_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_report_templates_updated_at
BEFORE UPDATE ON public.report_templates
FOR EACH ROW
EXECUTE FUNCTION update_report_tables_updated_at();

CREATE TRIGGER update_scheduled_reports_updated_at
BEFORE UPDATE ON public.scheduled_reports
FOR EACH ROW
EXECUTE FUNCTION update_report_tables_updated_at();

