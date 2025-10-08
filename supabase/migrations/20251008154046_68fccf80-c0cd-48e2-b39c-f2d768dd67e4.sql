-- Confirm email for shalini@homekart.co
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  confirmation_token = NULL,
  confirmation_sent_at = NULL
WHERE email = 'shalini@homekart.co';

-- Update password to Homekart@123 (encrypted with crypt)
UPDATE auth.users 
SET encrypted_password = crypt('Homekart@123', gen_salt('bf'))
WHERE email = 'shalini@homekart.co';