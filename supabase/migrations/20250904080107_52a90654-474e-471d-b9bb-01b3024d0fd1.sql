-- Create SOP completion reports table
CREATE TABLE public.sop_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submitted_by UUID NOT NULL,
  report_date DATE NOT NULL,
  sop_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'submitted',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(submitted_by, report_date)
);

-- Enable Row Level Security
ALTER TABLE public.sop_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for SOP reports
CREATE POLICY "Users can create their own SOP reports" 
ON public.sop_reports 
FOR INSERT 
WITH CHECK (submitted_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own SOP reports" 
ON public.sop_reports 
FOR SELECT 
USING (submitted_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR is_admin());

CREATE POLICY "Users can update their own SOP reports" 
ON public.sop_reports 
FOR UPDATE 
USING (submitted_by IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins and managers can view all SOP reports" 
ON public.sop_reports 
FOR SELECT 
USING (is_admin() OR has_role('manager'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_sop_reports_updated_at
BEFORE UPDATE ON public.sop_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();