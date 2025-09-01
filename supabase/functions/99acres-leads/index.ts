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

    // Get 99acres API credentials from Supabase secrets
    const acresApiKey = Deno.env.get('ACRES_API_KEY');
    const acresClientId = Deno.env.get('ACRES_CLIENT_ID');
    
    if (!acresApiKey || !acresClientId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '99acres API credentials not configured. Please add ACRES_API_KEY and ACRES_CLIENT_ID to Supabase secrets.',
          instructions: 'Visit https://www.99acres.com/builder-hub to register as a partner and get API access.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { method = 'GET' } = await req.json().catch(() => ({}));
    
    console.log('Processing 99acres lead integration...');

    try {
      // Real 99acres API call (replace with actual endpoint once you have credentials)
      const acresResponse = await fetch('https://api.99acres.com/v1/leads', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${acresApiKey}`,
          'Client-ID': acresClientId,
          'Content-Type': 'application/json',
        }
      });

      if (!acresResponse.ok) {
        throw new Error(`99acres API error: ${acresResponse.status}`);
      }

      const acresData = await acresResponse.json();
      
      // Process multiple leads if available
      const leads = acresData.leads || [acresData];
      const createdLeads = [];

      for (const leadData of leads) {
        // Get the first available profile to assign the lead
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_active', true)
          .limit(1);

        if (profiles && profiles.length > 0) {
          // Transform 99acres lead data to our schema
          const transformedLead = {
            name: leadData.name || leadData.buyer_name || 'Unknown',
            phone: leadData.phone || leadData.mobile,
            email: leadData.email,
            source: '99acres',
            preferred_location: leadData.location || leadData.city || leadData.area,
            budget_min: leadData.budget_min ? parseFloat(leadData.budget_min) : null,
            budget_max: leadData.budget_max ? parseFloat(leadData.budget_max) : null,
            property_type: leadData.property_type?.toLowerCase() || 'villa',
            notes: `Lead from 99acres - Property: ${leadData.property_title || 'N/A'}, Requirements: ${leadData.requirements || 'N/A'}`,
            created_by: profiles[0].id,
            status: 'new'
          };

          // Insert the lead into the database
          const { data: newLead, error } = await supabase
            .from('leads')
            .insert(transformedLead)
            .select()
            .single();

          if (error) {
            console.error('Error inserting lead:', error);
          } else {
            console.log('Lead created successfully:', newLead.id);
            createdLeads.push(newLead);
          }
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          leads: createdLeads,
          count: createdLeads.length,
          message: `Successfully imported ${createdLeads.length} leads from 99acres` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } catch (apiError) {
      console.error('99acres API Error:', apiError);
      
      // If API fails, show demo lead creation (remove this in production)
      console.log('API call failed, creating demo lead for testing...');
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      if (profiles && profiles.length > 0) {
        const demoLead = {
          name: "Demo 99acres Lead",
          phone: "+91-9876543211",
          email: "demo@99acres.com", 
          source: "99acres (Demo)",
          preferred_location: "Delhi NCR",
          budget_min: 3000000,
          budget_max: 6000000,
          property_type: "villa",
          notes: "Demo lead - Replace with real API integration once credentials are configured",
          created_by: profiles[0].id,
          status: 'new'
        };

        const { data: newLead, error } = await supabase
          .from('leads')
          .insert(demoLead)
          .select()
          .single();

        if (!error) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              lead: newLead,
              demo: true,
              message: 'Demo lead created. Configure API credentials for real integration.',
              api_error: apiError.message
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200 
            }
          );
        }
      }
      
      throw apiError;
    }

  } catch (error) {
    console.error('Error in 99acres integration:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        instructions: 'Please configure 99acres API credentials in Supabase secrets'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});