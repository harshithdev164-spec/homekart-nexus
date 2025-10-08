-- Temporarily drop the trigger to test if it's causing the auth issue
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;