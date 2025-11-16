-- Create function to notify lead assignment via Edge Function
-- This trigger will automatically send emails when leads are assigned or transferred

CREATE OR REPLACE FUNCTION notify_lead_assignment()
RETURNS TRIGGER AS $$
DECLARE
  supabase_url TEXT;
  supabase_anon_key TEXT;
  function_url TEXT;
  http_response TEXT;
BEGIN
  -- Only send email if assigned_to is set and changed
  IF NEW.assigned_to IS NOT NULL AND 
     (OLD IS NULL OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    
    -- Get Supabase configuration from environment
    -- These are set automatically by Supabase
    supabase_url := current_setting('app.settings.supabase_url', true);
    supabase_anon_key := current_setting('app.settings.supabase_anon_key', true);
    
    -- Fallback to direct URL construction if settings not available
    IF supabase_url IS NULL THEN
      -- Check if we're in local development (localhost)
      -- For local development, use localhost URL
      IF current_setting('app.settings.local', true) = 'true' OR 
         current_database() LIKE '%local%' OR
         current_setting('app.supabase_url', true) LIKE '%localhost%' OR
         current_setting('app.supabase_url', true) LIKE '%127.0.0.1%' THEN
        supabase_url := 'http://127.0.0.1:54321';
      ELSE
        -- Production: Extract from current database URL or use default
        supabase_url := COALESCE(
          current_setting('app.supabase_url', true),
          'https://' || current_database() || '.supabase.co'
        );
      END IF;
    END IF;
    
    -- Construct Edge Function URL
    function_url := supabase_url || '/functions/v1/send-lead-assignment-email';
    
    -- Determine if this is a transfer (OLD.assigned_to exists) or new assignment
    DECLARE
      is_transfer BOOLEAN := (OLD IS NOT NULL AND OLD.assigned_to IS NOT NULL);
      request_body JSONB;
    BEGIN
      -- Build request body
      request_body := jsonb_build_object(
        'leadId', NEW.id,
        'assignedToId', NEW.assigned_to,
        'isTransfer', is_transfer,
        'assignedByName', NULL -- Will be fetched in the Edge Function if needed
      );
      
      -- Call Edge Function via HTTP
      -- Note: This requires the http extension to be enabled
      -- If http extension is not available, this will fail silently
      -- The frontend/client-side calls will still work
      BEGIN
        SELECT content INTO http_response
        FROM http((
          'POST',
          function_url,
          ARRAY[
            http_header('Content-Type', 'application/json'),
            http_header('Authorization', 'Bearer ' || COALESCE(supabase_anon_key, '')),
            http_header('apikey', COALESCE(supabase_anon_key, ''))
          ],
          'application/json',
          request_body::text
        )::http_request);
        
        -- Log success (optional)
        RAISE NOTICE 'Lead assignment email triggered for lead % to user %', NEW.id, NEW.assigned_to;
      EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        -- This ensures lead assignment always succeeds even if email fails
        RAISE WARNING 'Failed to trigger email notification: %', SQLERRM;
      END;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires on INSERT or UPDATE
-- This will catch all assignment changes including:
-- - New leads with assigned_to set
-- - Lead transfers (assigned_to changed)
-- - Direct database updates
DROP TRIGGER IF EXISTS trigger_notify_lead_assignment ON public.leads;

CREATE TRIGGER trigger_notify_lead_assignment
  AFTER INSERT OR UPDATE OF assigned_to
  ON public.leads
  FOR EACH ROW
  WHEN (NEW.assigned_to IS NOT NULL)
  EXECUTE FUNCTION notify_lead_assignment();

-- Add comment for documentation
COMMENT ON FUNCTION notify_lead_assignment() IS 
  'Automatically sends email notifications when a lead is assigned or transferred. ' ||
  'Calls the send-lead-assignment-email Edge Function via HTTP. ' ||
  'Fails silently if HTTP extension is not available or function call fails, ' ||
  'ensuring lead assignment always succeeds.';

