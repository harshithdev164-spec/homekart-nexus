-- Add subscription_plan column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'basic';

-- Add constraint for valid plans
ALTER TABLE public.profiles ADD CONSTRAINT valid_subscription_plan 
  CHECK (subscription_plan IN ('basic', 'standard', 'premium', 'enterprise'))
  NOT VALID;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_plan ON public.profiles(subscription_plan);

-- Add comment
COMMENT ON COLUMN public.profiles.subscription_plan IS 'User subscription plan tier (basic, standard, premium, enterprise)';
