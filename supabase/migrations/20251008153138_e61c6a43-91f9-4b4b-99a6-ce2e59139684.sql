-- Create admin profile for existing user
INSERT INTO public.profiles (user_id, email, full_name, role, is_active)
VALUES (
  'cccf90c2-f2e1-4dfe-9c6e-9b5e31cbdcd0',
  'shalini@homekart.co',
  'Shalini',
  'admin',
  true
)
ON CONFLICT (user_id) DO UPDATE
SET role = 'admin', is_active = true;