-- Delete and recreate shalini's account completely
DELETE FROM public.profiles WHERE email = 'shalini@homekart.co';
DELETE FROM auth.users WHERE email = 'shalini@homekart.co';