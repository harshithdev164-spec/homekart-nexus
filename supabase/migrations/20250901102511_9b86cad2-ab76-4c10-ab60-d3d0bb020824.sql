-- Create message templates table
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for message templates
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for message templates
CREATE POLICY "Users can view active message templates" 
ON public.message_templates 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Users can create message templates" 
ON public.message_templates 
FOR INSERT 
WITH CHECK (created_by IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Users can update their own templates or admins can update all" 
ON public.message_templates 
FOR UPDATE 
USING (created_by IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()) OR is_admin());

-- Create lead transfers table for tracking lead ownership changes
CREATE TABLE public.lead_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  reason TEXT,
  transferred_by UUID NOT NULL,
  transferred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for lead transfers
ALTER TABLE public.lead_transfers ENABLE ROW LEVEL SECURITY;

-- Create policies for lead transfers
CREATE POLICY "Users can view transfers they are involved in or admins can view all" 
ON public.lead_transfers 
FOR SELECT 
USING (from_user_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()) 
       OR to_user_id IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()) 
       OR transferred_by IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid())
       OR is_admin());

CREATE POLICY "Users can create lead transfers" 
ON public.lead_transfers 
FOR INSERT 
WITH CHECK (transferred_by IN (SELECT profiles.id FROM profiles WHERE profiles.user_id = auth.uid()));

-- Add trigger for message templates updated_at
CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime for new tables only
ALTER TABLE public.message_templates REPLICA IDENTITY FULL;
ALTER TABLE public.lead_transfers REPLICA IDENTITY FULL;

-- Add only new tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_templates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_transfers;

-- Add some default message templates (only if profiles exist)
INSERT INTO public.message_templates (title, content, category, created_by) 
SELECT 
  'Welcome Message' as title,
  'Hi {name}, welcome to HomeKart! We''re excited to help you find your dream property. Our team will be in touch shortly.' as content,
  'welcome' as category,
  id as created_by
FROM public.profiles 
WHERE role = 'admin' 
LIMIT 1;

INSERT INTO public.message_templates (title, content, category, created_by) 
SELECT 
  'Follow Up' as title,
  'Hi {name}, following up on your property inquiry. Are you available for a quick call to discuss your requirements?' as content,
  'followup' as category,
  id as created_by
FROM public.profiles 
WHERE role = 'admin' 
LIMIT 1;

INSERT INTO public.message_templates (title, content, category, created_by) 
SELECT 
  'Property Match' as title,
  'Great news {name}! We found a property that matches your criteria: {property_details}. Would you like to schedule a viewing?' as content,
  'property_match' as category,
  id as created_by
FROM public.profiles 
WHERE role = 'admin' 
LIMIT 1;

INSERT INTO public.message_templates (title, content, category, created_by) 
SELECT 
  'Meeting Reminder' as title,
  'Hi {name}, this is a reminder about our meeting tomorrow at {time}. Looking forward to seeing you!' as content,
  'reminder' as category,
  id as created_by
FROM public.profiles 
WHERE role = 'admin' 
LIMIT 1;