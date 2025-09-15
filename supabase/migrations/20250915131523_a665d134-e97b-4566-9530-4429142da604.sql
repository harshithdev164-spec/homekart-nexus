-- Create tasks table for to-do list functionality
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date DATE,
  assigned_to UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for tasks
CREATE POLICY "Users can view tasks assigned to them or created by them"
ON public.tasks FOR SELECT
USING (
  assigned_to IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  is_admin()
);

CREATE POLICY "Users can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (
  created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can update tasks assigned to them or created by them"
ON public.tasks FOR UPDATE
USING (
  assigned_to IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  is_admin()
);

-- Add feedback column to visit_schedules table
ALTER TABLE public.visit_schedules 
ADD COLUMN feedback TEXT,
ADD COLUMN completion_rating INTEGER CHECK (completion_rating >= 1 AND completion_rating <= 5);

-- Add property category for inventory segmentation
ALTER TABLE public.properties 
ADD COLUMN category TEXT DEFAULT 'primary' CHECK (category IN ('primary', 'resale', 'rent'));

-- Create trigger for tasks updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();