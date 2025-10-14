-- Update snmenon@homekart.co to admin role
UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'snmenon@homekart.co';

-- Update the raw_user_meta_data in auth.users to reflect admin role
UPDATE auth.users
SET raw_user_meta_data = '{"full_name":"SN Menon","role":"admin"}'::jsonb
WHERE email = 'snmenon@homekart.co';