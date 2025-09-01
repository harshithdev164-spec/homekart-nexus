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

    // Get MagicBricks API credentials from Supabase secrets
    const magicbricksApiKey = Deno.env.get('MAGICBRICKS_API_KEY');
    const magicbricksPartnerId = Deno.env.get('MAGICBRICKS_PARTNER_ID');
    
    if (!magicbricksApiKey || !magicbricksPartnerId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'MagicBricks API credentials not configured. Please add MAGICBRICKS_API_KEY and MAGICBRICKS_PARTNER_ID to Supabase secrets.',
          instructions: 'Visit https://www.magicbricks.com/builder-portal to register as a partner and get API access.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const { method = 'GET' } = await req.json().catch(() => ({}));
    
    console.log('Processing MagicBricks lead integration...');

    try {
      // Real MagicBricks API call (replace with actual endpoint once you have credentials)
      const magicbricksResponse = await fetch('https://api.magicbricks.com/v1/leads', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${magicbricksApiKey}`,
          'Partner-ID': magicbricksPartnerId,
          'Content-Type': 'application/json',
        }
      });

      if (!magicbricksResponse.ok) {
        throw new Error(`MagicBricks API error: ${magicbricksResponse.status}`);
      }

      const magicbricksData = await magicbricksResponse.json();
      
      // Process multiple leads if available
      const leads = magicbricksData.leads || [magicbricksData];
      const createdLeads = [];

      for (const leadData of leads) {
        // Get the first available profile to assign the lead
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('is_active', true)
          .limit(1);

        if (profiles && profiles.length > 0) {
          // Transform MagicBricks lead data to our schema
          const transformedLead = {
            name: leadData.customer_name || 'Unknown',
            phone: leadData.phone || leadData.mobile,
            email: leadData.email,
            source: 'MagicBricks',
            preferred_location: leadData.location || leadData.city,
            budget_min: leadData.budget_min ? parseFloat(leadData.budget_min) : null,
            budget_max: leadData.budget_max ? parseFloat(leadData.budget_max) : null,
            property_type: leadData.property_type?.toLowerCase() || 'apartment',
            notes: `Lead from MagicBricks - Project: ${leadData.project_name || 'N/A'}, Inquiry: ${leadData.inquiry_details || 'N/A'}`,
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
          message: `Successfully imported ${createdLeads.length} leads from MagicBricks` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } catch (apiError) {
      console.error('MagicBricks API Error:', apiError);
      
      // If API fails, show demo lead creation (remove this in production)
      console.log('API call failed, creating demo lead for testing...');
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      if (profiles && profiles.length > 0) {
        const demoLead = {
          name: "Demo MagicBricks Lead",
          phone: "+91-9876543210",
          email: "demo@magicbricks.com",
          source: "MagicBricks (Demo)",
          preferred_location: "Mumbai",
          budget_min: 5000000,
          budget_max: 8000000,
          property_type: "apartment",
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
    console.error('Error in MagicBricks integration:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        instructions: 'Please configure MagicBricks API credentials in Supabase secrets'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});