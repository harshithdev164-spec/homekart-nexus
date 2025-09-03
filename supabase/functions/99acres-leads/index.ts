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
    const acresUsername = Deno.env.get('ACRES_USERNAME');
    const acresPassword = Deno.env.get('ACRES_PASSWORD');
    
    if (!acresUsername || !acresPassword) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: '99acres API credentials not configured. Please add ACRES_USERNAME and ACRES_PASSWORD to Supabase secrets.',
          instructions: 'Contact 99acres support to get your API username and password credentials.'
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
      // Create XML request for 99acres API
      const currentDate = new Date();
      const startDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
      const endDate = currentDate;
      
      const formatDate = (date: Date) => {
        return date.toISOString().slice(0, 19).replace('T', ' ');
      };
      
      const xmlRequest = `<?xml version='1.0'?><query><user_name>${acresUsername}</user_name><pswd>${acresPassword}</pswd><start_date>${formatDate(startDate)}</start_date><end_date>${formatDate(endDate)}</end_date></query>`;
      
      console.log('Sending 99acres XML request:', xmlRequest);
      
      // Make API call to 99acres
      const formData = new FormData();
      formData.append('xml', xmlRequest);
      
      const acresResponse = await fetch('http://www.99acres.com/99api/v1/getmy99Response/OeAuXClO43hwseaXEQ/uid/', {
        method: 'POST',
        body: formData
      });

      if (!acresResponse.ok) {
        throw new Error(`99acres API error: ${acresResponse.status}`);
      }

      const xmlResponseText = await acresResponse.text();
      console.log('99acres XML response:', xmlResponseText);
      
      // Parse XML response (simple parsing for the structure shown in docs)
      const leads = [];
      const createdLeads = [];
      
      // Check if response contains error
      if (xmlResponseText.includes('ActionStatus = "false"')) {
        throw new Error('99acres API authentication or request error');
      }
      
      // Extract leads from XML (simplified parsing)
      const respMatches = xmlResponseText.match(/<Resp>(.*?)<\/Resp>/gs);
      
      if (respMatches) {
        for (const respMatch of respMatches) {
          // Extract contact details
          const nameMatch = respMatch.match(/<Name>(.*?)<\/Name>/);
          const emailMatch = respMatch.match(/<Email>(.*?)<\/Email>/);
          const phoneMatch = respMatch.match(/<Phone>(.*?)<\/Phone>/);
          const queryInfoMatch = respMatch.match(/<QryInfo>(.*?)<\/QryInfo>/);
          const compactLabelMatch = respMatch.match(/<CmpctLabl>(.*?)<\/CmpctLabl>/);
          
          if (nameMatch && phoneMatch) {
            leads.push({
              name: nameMatch[1],
              email: emailMatch ? emailMatch[1] : null,
              phone: phoneMatch[1],
              queryInfo: queryInfoMatch ? queryInfoMatch[1] : '',
              propertyDetails: compactLabelMatch ? compactLabelMatch[1] : ''
            });
          }
        }
      }

      // Get the first available profile to assign leads
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true)
        .limit(1);

      if (profiles && profiles.length > 0) {
        for (const leadData of leads) {
          // Transform 99acres lead data to our schema
          const transformedLead = {
            name: leadData.name || 'Unknown',
            phone: leadData.phone,
            email: leadData.email,
            source: '99acres',
            preferred_location: 'Not specified',
            budget_min: null,
            budget_max: null,
            property_type: 'villa',
            notes: `Lead from 99acres - Query: ${leadData.queryInfo || 'N/A'}, Property: ${leadData.propertyDetails || 'N/A'}`,
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
          message: `Successfully imported ${createdLeads.length} leads from 99acres`,
          raw_response: xmlResponseText.substring(0, 500) // First 500 chars for debugging
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