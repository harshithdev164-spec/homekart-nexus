-- Force update password and email confirmation for shalini@homekart.co
UPDATE auth.users 
SET 
  encrypted_password = crypt('Homekart@123', gen_salt('bf')),
  email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
  confirmation_token = NULL,
  confirmation_sent_at = NULL,
  updated_at = NOW()
WHERE email = 'shalini@homekart.co';

-- Verify the update
SELECT email, email_confirmed_at IS NOT NULL as email_confirmed, encrypted_password IS NOT NULL as has_password 
FROM auth.users 
WHERE email = 'shalini@homekart.co';