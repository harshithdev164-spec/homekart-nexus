-- Create table for time tracking (login/logout for timing purposes)
CREATE TABLE public.time_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  login_time TIMESTAMP WITH TIME ZONE,
  logout_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'logged_out' CHECK (status IN ('logged_in', 'logged_out')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for time_logs
CREATE POLICY "Users can view all time logs" 
ON public.time_logs 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own time logs" 
ON public.time_logs 
FOR INSERT 
WITH CHECK (user_id IN (SELECT profiles.user_id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Users can update their own time logs" 
ON public.time_logs 
FOR UPDATE 
USING (user_id IN (SELECT profiles.user_id FROM profiles WHERE profiles.user_id = auth.uid()));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_time_logs_updated_at
BEFORE UPDATE ON public.time_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for time_logs
ALTER TABLE public.time_logs REPLICA IDENTITY FULL;

-- Add table to realtime publication
INSERT INTO supabase_realtime.stream (table_name, schema_name) VALUES ('time_logs', 'public');