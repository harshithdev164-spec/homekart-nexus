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

    // Only allow POST requests for webhook
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Only POST method allowed for webhooks' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405 
        }
      );
    }

    const webhookData = await req.json();
    console.log('Received webhook data:', JSON.stringify(webhookData));

    // Verify webhook source (add authentication here in production)
    const source = req.headers.get('x-lead-source') || webhookData.source || 'unknown';
    
    let transformedLead;

    // Transform lead data based on source
    switch (source.toLowerCase()) {
      case 'magicbricks':
        transformedLead = {
          name: webhookData.customer_name || webhookData.name || 'Unknown',
          phone: webhookData.phone || webhookData.mobile,
          email: webhookData.email,
          source: 'MagicBricks',
          preferred_location: webhookData.location || webhookData.city,
          budget_min: webhookData.budget_min ? parseFloat(webhookData.budget_min) : null,
          budget_max: webhookData.budget_max ? parseFloat(webhookData.budget_max) : null,
          property_type: webhookData.property_type?.toLowerCase() || 'apartment',
          notes: `Webhook lead from MagicBricks - Project: ${webhookData.project_name || 'N/A'}`,
          status: 'new'
        };
        break;

      case '99acres':
        transformedLead = {
          name: webhookData.name || webhookData.buyer_name || 'Unknown',
          phone: webhookData.phone || webhookData.mobile,
          email: webhookData.email,
          source: '99acres',
          preferred_location: webhookData.location || webhookData.city || webhookData.area,
          budget_min: webhookData.budget_min ? parseFloat(webhookData.budget_min) : null,
          budget_max: webhookData.budget_max ? parseFloat(webhookData.budget_max) : null,
          property_type: webhookData.property_type?.toLowerCase() || 'villa',
          notes: `Webhook lead from 99acres - Property: ${webhookData.property_title || 'N/A'}`,
          status: 'new'
        };
        break;

      default:
        // Generic lead format
        transformedLead = {
          name: webhookData.name || 'Unknown',
          phone: webhookData.phone || webhookData.mobile,
          email: webhookData.email,
          source: source || 'Webhook',
          preferred_location: webhookData.location || webhookData.city,
          budget_min: webhookData.budget_min ? parseFloat(webhookData.budget_min) : null,
          budget_max: webhookData.budget_max ? parseFloat(webhookData.budget_max) : null,
          property_type: webhookData.property_type?.toLowerCase() || 'apartment',
          notes: `Webhook lead from ${source}`,
          status: 'new'
        };
    }

    // Validate required fields
    if (!transformedLead.name || !transformedLead.phone) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: name and phone' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get the first available active profile to assign the lead
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_active', true)
      .limit(1);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No active profiles found to assign lead' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    // Add created_by to the lead
    transformedLead.created_by = profiles[0].id;

    // Insert the lead into the database
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert(transformedLead)
      .select()
      .single();

    if (error) {
      console.error('Error inserting lead:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Database error: ${error.message}` 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    console.log('Lead created successfully from webhook:', newLead.id);

    // Log the communication for tracking
    await supabase
      .from('communication_logs')
      .insert({
        lead_id: newLead.id,
        sent_by: profiles[0].id,
        communication_type: 'webhook_received',
        message_content: `Lead received via webhook from ${source}`,
        status: 'received'
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        lead: newLead,
        message: `Lead successfully received from ${source} webhook` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in webhook processing:', error);
    
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