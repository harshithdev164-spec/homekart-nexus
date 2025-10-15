-- Create call_logs table for tracking all calls
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id),
  agent_id UUID REFERENCES public.profiles(id),
  called_by UUID NOT NULL REFERENCES public.profiles(id),
  phone_number TEXT NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('outgoing', 'incoming', 'missed')),
  duration INTEGER, -- in seconds
  notes TEXT,
  call_status TEXT DEFAULT 'completed' CHECK (call_status IN ('completed', 'missed', 'cancelled', 'busy', 'no_answer')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own call logs"
  ON public.call_logs
  FOR SELECT
  USING (
    called_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    OR lead_id IN (
      SELECT id FROM leads 
      WHERE assigned_to IN (SELECT id FROM profiles WHERE user_id = auth.uid())
      OR created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
    OR is_admin()
  );

CREATE POLICY "Users can create call logs"
  ON public.call_logs
  FOR INSERT
  WITH CHECK (
    called_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own call logs"
  ON public.call_logs
  FOR UPDATE
  USING (
    called_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

-- Create trigger for updated_at
CREATE TRIGGER update_call_logs_updated_at
  BEFORE UPDATE ON public.call_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_call_logs_lead_id ON public.call_logs(lead_id);
CREATE INDEX idx_call_logs_agent_id ON public.call_logs(agent_id);
CREATE INDEX idx_call_logs_called_by ON public.call_logs(called_by);
CREATE INDEX idx_call_logs_created_at ON public.call_logs(created_at DESC);