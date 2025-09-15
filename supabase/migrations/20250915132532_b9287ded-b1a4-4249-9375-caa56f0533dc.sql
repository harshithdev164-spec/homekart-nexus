-- Fix RLS policies for better data visibility

-- Update tasks RLS policies for better visibility
DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks assigned to them or created by them" ON public.tasks;

CREATE POLICY "Users can view all tasks"
ON public.tasks FOR SELECT
USING (true);

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

-- Ensure visit_schedules table allows updates for feedback
DROP POLICY IF EXISTS "Users can update visits they created or are assigned to" ON public.visit_schedules;

CREATE POLICY "Users can update visits they created or are assigned to"
ON public.visit_schedules FOR UPDATE
USING (
  scheduled_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  assigned_to IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  is_admin()
);

-- Add DELETE policy for tasks
CREATE POLICY "Users can delete their own tasks"
ON public.tasks FOR DELETE
USING (
  created_by IN (SELECT id FROM profiles WHERE user_id = auth.uid()) OR
  is_admin()
);