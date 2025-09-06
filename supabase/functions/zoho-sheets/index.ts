import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ZohoTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface ZohoSheetsRow {
  values: {
    [key: string]: string;
  };
}

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

    const { action } = await req.json();
    console.log(`Zoho Sheets action: ${action}`);

    // Get Zoho credentials
    const clientId = Deno.env.get('ZOHO_CLIENT_ID');
    const clientSecret = Deno.env.get('ZOHO_CLIENT_SECRET');
    const refreshToken = Deno.env.get('ZOHO_REFRESH_TOKEN');

    // Demo mode if credentials not configured
    if (!clientId || !clientSecret || !refreshToken) {
      console.log('Zoho credentials not configured, running in demo mode');
      
      // Create demo lead
      const demoLead = {
        customer_name: 'Zoho Demo Lead',
        project_name: 'Demo Project via Zoho Sheets',
        phone: '+91 9876543210',
        email: 'zoho.demo@example.com',
        source: 'zoho_sheets',
        status: 'new',
        location: 'Mumbai, Maharashtra',
        requirements: 'Demo lead imported from Zoho Sheets integration',
        budget_min: 5000000,
        budget_max: 7500000,
        lead_score: 75,
        assigned_to: null
      };

      const { data, error } = await supabase
        .from('leads')
        .insert([demoLead])
        .select()
        .single();

      if (error) {
        console.error('Error creating demo lead:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          demo: true,
          message: 'Demo lead created from Zoho Sheets. Configure Zoho API credentials for real integration.',
          lead: data
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        }
      );
    }

    // Get access token using refresh token
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to refresh Zoho access token');
    }

    const tokenData: ZohoTokenResponse = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (action === 'sync_leads') {
      // Get leads from Zoho Sheets
      // Note: You'll need to specify the workbook ID and worksheet ID
      const workbookId = Deno.env.get('ZOHO_WORKBOOK_ID') || 'demo_workbook';
      const worksheetId = Deno.env.get('ZOHO_WORKSHEET_ID') || 'demo_worksheet';

      const sheetsResponse = await fetch(
        `https://sheet.zoho.com/api/v2/${workbookId}/${worksheetId}`,
        {
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!sheetsResponse.ok) {
        throw new Error('Failed to fetch data from Zoho Sheets');
      }

      const sheetsData = await sheetsResponse.json();
      console.log('Zoho Sheets data:', sheetsData);

      // Process and insert leads
      const leads = [];
      let importedCount = 0;

      // Assuming the first row contains headers
      if (sheetsData.rows && sheetsData.rows.length > 1) {
        const headers = sheetsData.rows[0];
        
        for (let i = 1; i < sheetsData.rows.length; i++) {
          const row = sheetsData.rows[i];
          const leadData: any = {
            source: 'zoho_sheets',
            status: 'new',
            assigned_to: null
          };

          // Map columns to lead fields
          for (let j = 0; j < headers.length; j++) {
            const header = headers[j].toLowerCase().trim();
            const value = row[j] || '';

            switch (header) {
              case 'name':
              case 'customer_name':
              case 'client_name':
                leadData.customer_name = value;
                break;
              case 'project':
              case 'project_name':
                leadData.project_name = value;
                break;
              case 'phone':
              case 'mobile':
              case 'contact':
                leadData.phone = value;
                break;
              case 'email':
                leadData.email = value;
                break;
              case 'location':
              case 'city':
                leadData.location = value;
                break;
              case 'budget':
              case 'budget_min':
                leadData.budget_min = parseInt(value) || null;
                break;
              case 'budget_max':
                leadData.budget_max = parseInt(value) || null;
                break;
              case 'requirements':
              case 'notes':
                leadData.requirements = value;
                break;
            }
          }

          if (leadData.customer_name || leadData.phone || leadData.email) {
            leads.push(leadData);
          }
        }

        // Insert leads into database
        if (leads.length > 0) {
          const { data, error } = await supabase
            .from('leads')
            .insert(leads)
            .select();

          if (error) {
            console.error('Error inserting leads:', error);
            throw error;
          }

          importedCount = data?.length || 0;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          demo: false,
          message: `Successfully imported ${importedCount} leads from Zoho Sheets`,
          imported_count: importedCount
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        }
      );
    }

    // Export leads to Zoho Sheets
    if (action === 'export_leads') {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      // Format data for Zoho Sheets
      const headers = ['Customer Name', 'Project', 'Phone', 'Email', 'Location', 'Status', 'Budget Min', 'Budget Max', 'Requirements', 'Created Date'];
      const rows = [headers];

      leads?.forEach(lead => {
        rows.push([
          lead.customer_name || '',
          lead.project_name || '',
          lead.phone || '',
          lead.email || '',
          lead.location || '',
          lead.status || '',
          lead.budget_min?.toString() || '',
          lead.budget_max?.toString() || '',
          lead.requirements || '',
          new Date(lead.created_at).toLocaleDateString()
        ]);
      });

      // Update Zoho Sheet (this is a simplified example)
      const workbookId = Deno.env.get('ZOHO_WORKBOOK_ID') || 'demo_workbook';
      const worksheetId = Deno.env.get('ZOHO_WORKSHEET_ID') || 'demo_worksheet';

      const updateResponse = await fetch(
        `https://sheet.zoho.com/api/v2/${workbookId}/${worksheetId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ rows }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error('Failed to update Zoho Sheets');
      }

      return new Response(
        JSON.stringify({
          success: true,
          demo: false,
          message: `Successfully exported ${leads?.length || 0} leads to Zoho Sheets`,
          exported_count: leads?.length || 0
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 400,
      }
    );

  } catch (error: any) {
    console.error('Error in zoho-sheets function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        demo: true,
        message: 'Error occurred. Running in demo mode - configure Zoho credentials for full functionality.'
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status: 500,
      }
    );
  }
})