-- Daily Planner
-- Team members submit a daily plan (one per person per day); admins can view everyone's plans.

CREATE TABLE IF NOT EXISTS public.daily_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_date date NOT NULL DEFAULT current_date,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, plan_date)
);

ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;

-- Users manage their own plans
CREATE POLICY "Users manage own daily plans" ON public.daily_plans
  FOR ALL USING (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  ) WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Admins can view all plans
CREATE POLICY "Admins view all daily plans" ON public.daily_plans
  FOR SELECT USING (public.is_admin());

CREATE INDEX idx_daily_plans_profile_id ON public.daily_plans(profile_id);
CREATE INDEX idx_daily_plans_plan_date ON public.daily_plans(plan_date DESC);

CREATE TRIGGER update_daily_plans_updated_at
  BEFORE UPDATE ON public.daily_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
