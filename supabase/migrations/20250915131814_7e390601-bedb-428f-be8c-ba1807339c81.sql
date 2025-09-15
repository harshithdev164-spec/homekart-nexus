-- Create daily_reports table for integrated reporting
CREATE TABLE public.daily_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL,
  leads_contacted INTEGER DEFAULT 0,
  meetings_scheduled INTEGER DEFAULT 0,
  site_visits INTEGER DEFAULT 0,
  follow_ups_pending INTEGER DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  challenges_faced TEXT,
  achievements TEXT,
  next_day_plan TEXT,
  call_sheet_attached BOOLEAN DEFAULT false,
  submitted_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_date, submitted_by)
);

-- Enable RLS on daily_reports
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for daily_reports
CREATE POLICY "Users can view all daily reports"
ON public.daily_reports FOR SELECT
USING (true);

CREATE POLICY "Users can create their own daily reports"
ON public.daily_reports FOR INSERT
WITH CHECK (
  submitted_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update their own daily reports"
ON public.daily_reports FOR UPDATE
USING (
  submitted_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  is_admin()
);

-- Create trigger for daily_reports updated_at
CREATE TRIGGER update_daily_reports_updated_at
BEFORE UPDATE ON public.daily_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();