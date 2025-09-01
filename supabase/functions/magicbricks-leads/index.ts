import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { url, method } = await req.json();
    
    console.log('Processing MagicBricks lead integration...');

    // Simulate MagicBricks API call (replace with actual API integration)
    const mockLeadData = {
      name: "John Doe",
      phone: "+91-9876543210",
      email: "john.doe@example.com",
      source: "MagicBricks",
      preferred_location: "Mumbai",
      budget_min: 5000000,
      budget_max: 8000000,
      property_type: "apartment",
      notes: "Interested in 2-3 BHK apartment in Mumbai"
    };

    // Get the first available profile to assign the lead
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (profiles && profiles.length > 0) {
      // Insert the lead into the database
      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({
          ...mockLeadData,
          created_by: profiles[0].id,
          status: 'new'
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting lead:', error);
        throw error;
      }

      console.log('Lead created successfully:', newLead.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          lead: newLead,
          message: 'Lead imported from MagicBricks successfully' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    } else {
      throw new Error('No profiles found to assign lead');
    }

  } catch (error) {
    console.error('Error in MagicBricks integration:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});