-- Check for and drop ALL triggers on auth.users table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'auth.users'::regclass
      AND NOT tgisinternal
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON auth.users';
    RAISE NOTICE 'Dropped trigger: %', r.tgname;
  END LOOP;
END $$;