-- Create employee account for snmenon@homekart.co
DO $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'snmenon@homekart.co',
    crypt('Homekart@123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"SN Menon","role":"employee"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  ) RETURNING id INTO new_user_id;

  -- Insert into profiles
  INSERT INTO public.profiles (
    user_id,
    email,
    full_name,
    role,
    is_active
  ) VALUES (
    new_user_id,
    'snmenon@homekart.co',
    'SN Menon',
    'employee',
    true
  );

  RAISE NOTICE 'Created employee user with ID: %', new_user_id;
END $$;