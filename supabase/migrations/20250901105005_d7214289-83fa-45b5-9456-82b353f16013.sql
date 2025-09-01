-- Create team messaging system
CREATE TABLE public.team_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  team_id UUID,
  recipient_id UUID,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'system')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create visit scheduling system
CREATE TABLE public.visit_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  property_id UUID NOT NULL,
  scheduled_by UUID NOT NULL,
  assigned_to UUID NOT NULL,
  visit_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  notes TEXT,
  visitor_name TEXT NOT NULL,
  visitor_phone TEXT NOT NULL,
  visitor_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports system
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('leads', 'properties', 'activities', 'team_performance', 'sales')),
  filters JSONB,
  generated_by UUID NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data JSONB,
  is_public BOOLEAN DEFAULT false
);

-- Create communication logs for WhatsApp/Email tracking
CREATE TABLE public.communication_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  sent_by UUID NOT NULL,
  communication_type TEXT NOT NULL CHECK (communication_type IN ('whatsapp', 'email', 'sms', 'call')),
  message_content TEXT,
  template_id UUID,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  external_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_messages
CREATE POLICY "Users can view messages they sent or received"
ON public.team_messages
FOR SELECT
USING (
  sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  recipient_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  (team_id IS NOT NULL AND team_id IN (
    SELECT team_id FROM team_members 
    WHERE profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  )) OR
  is_admin()
);

CREATE POLICY "Users can send messages"
ON public.team_messages
FOR INSERT
WITH CHECK (sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own messages"
ON public.team_messages
FOR UPDATE
USING (sender_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- RLS Policies for visit_schedules
CREATE POLICY "Users can view visits they created or are assigned to"
ON public.visit_schedules
FOR SELECT
USING (
  scheduled_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  assigned_to IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  is_admin()
);

CREATE POLICY "Users can create visit schedules"
ON public.visit_schedules
FOR INSERT
WITH CHECK (scheduled_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update visits they created or are assigned to"
ON public.visit_schedules
FOR UPDATE
USING (
  scheduled_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  assigned_to IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  is_admin()
);

-- RLS Policies for reports
CREATE POLICY "Users can view public reports or their own reports"
ON public.reports
FOR SELECT
USING (
  is_public = true OR
  generated_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  is_admin()
);

CREATE POLICY "Users can create reports"
ON public.reports
FOR INSERT
WITH CHECK (generated_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own reports"
ON public.reports
FOR UPDATE
USING (generated_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR is_admin());

-- RLS Policies for communication_logs
CREATE POLICY "Users can view communication logs for accessible leads"
ON public.communication_logs
FOR SELECT
USING (
  lead_id IN (
    SELECT id FROM leads WHERE 
    assigned_to IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
    created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  ) OR
  sent_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  is_admin()
);

CREATE POLICY "Users can create communication logs"
ON public.communication_logs
FOR INSERT
WITH CHECK (sent_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_team_messages_updated_at
BEFORE UPDATE ON public.team_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_visit_schedules_updated_at
BEFORE UPDATE ON public.visit_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add tables to realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visit_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;