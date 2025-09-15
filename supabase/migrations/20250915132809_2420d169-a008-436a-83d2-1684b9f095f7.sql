-- Enable real-time for the new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_reports;

-- Set REPLICA IDENTITY FULL for all tables to ensure complete row data
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.daily_reports REPLICA IDENTITY FULL;
ALTER TABLE public.visit_schedules REPLICA IDENTITY FULL;
ALTER TABLE public.activities REPLICA IDENTITY FULL;
ALTER TABLE public.properties REPLICA IDENTITY FULL;
ALTER TABLE public.leads REPLICA IDENTITY FULL;