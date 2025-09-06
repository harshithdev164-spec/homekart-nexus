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

interface EmailTemplate {
  subject: string;
  content: string;
  from_address?: string;
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

    const { action, template, lead_ids } = await req.json();
    console.log(`Zoho Mail action: ${action}`);

    // Get Zoho credentials
    const clientId = Deno.env.get('ZOHO_CLIENT_ID');
    const clientSecret = Deno.env.get('ZOHO_CLIENT_SECRET');
    const refreshToken = Deno.env.get('ZOHO_REFRESH_TOKEN');
    const fromAddress = Deno.env.get('ZOHO_FROM_ADDRESS') || 'noreply@yourcompany.com';

    // Demo mode if credentials not configured
    if (!clientId || !clientSecret || !refreshToken) {
      console.log('Zoho credentials not configured, running in demo mode');
      
      // Get some leads for demo
      const { data: leads, error } = await supabase
        .from('leads')
        .select('customer_name, email, phone')
        .not('email', 'is', null)
        .limit(5);

      if (error) {
        throw error;
      }

      const emailCount = leads?.length || 0;

      // Log demo communication
      if (leads && leads.length > 0) {
        const communications = leads.map(lead => ({
          lead_id: null, // Demo mode
          type: 'email' as const,
          message: `Demo: Welcome to our services, ${lead.customer_name}! This is a sample email that would be sent via Zoho Mail integration.`,
          status: 'demo' as const,
          sent_to: lead.email,
          sent_by: null
        }));

        await supabase
          .from('communications')
          .insert(communications);
      }

      return new Response(
        JSON.stringify({
          success: true,
          demo: true,
          message: `Demo: Would send emails to ${emailCount} leads. Configure Zoho Mail API credentials for real email sending.`,
          email_count: emailCount
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

    if (action === 'send_bulk_emails') {
      // Get leads to send emails to
      let leadsQuery = supabase
        .from('leads')
        .select('id, customer_name, email, phone, project_name')
        .not('email', 'is', null);

      if (lead_ids && lead_ids.length > 0) {
        leadsQuery = leadsQuery.in('id', lead_ids);
      } else {
        // Default: send to recent leads
        leadsQuery = leadsQuery
          .eq('status', 'new')
          .order('created_at', { ascending: false })
          .limit(10);
      }

      const { data: leads, error } = await leadsQuery;

      if (error) {
        throw error;
      }

      if (!leads || leads.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            message: 'No leads found with valid email addresses'
          }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 400,
          }
        );
      }

      // Default email template if none provided
      const emailTemplate: EmailTemplate = template || {
        subject: 'Welcome to Our Real Estate Services',
        content: `
          <html>
            <body>
              <h2>Thank you for your interest!</h2>
              <p>Dear {{customer_name}},</p>
              <p>We have received your inquiry regarding {{project_name}}. Our team will get back to you shortly with more details.</p>
              <p>In the meantime, feel free to browse our other projects or contact us directly.</p>
              <p>Best regards,<br>Your Real Estate Team</p>
            </body>
          </html>
        `,
        from_address: fromAddress
      };

      let successCount = 0;
      let failureCount = 0;
      const communications = [];

      // Send emails to each lead
      for (const lead of leads) {
        try {
          // Personalize email content
          let personalizedContent = emailTemplate.content
            .replace(/{{customer_name}}/g, lead.customer_name || 'Valued Customer')
            .replace(/{{project_name}}/g, lead.project_name || 'our projects');

          // Send email via Zoho Mail API
          const emailResponse = await fetch('https://mail.zoho.com/api/accounts/{{account_id}}/messages', {
            method: 'POST',
            headers: {
              'Authorization': `Zoho-oauthtoken ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fromAddress: emailTemplate.from_address || fromAddress,
              toAddress: lead.email,
              subject: emailTemplate.subject,
              content: personalizedContent,
              mailFormat: 'html'
            }),
          });

          if (emailResponse.ok) {
            successCount++;
            communications.push({
              lead_id: lead.id,
              type: 'email' as const,
              message: `Subject: ${emailTemplate.subject}`,
              status: 'sent' as const,
              sent_to: lead.email,
              sent_by: null
            });
          } else {
            failureCount++;
            console.error(`Failed to send email to ${lead.email}:`, await emailResponse.text());
            communications.push({
              lead_id: lead.id,
              type: 'email' as const,
              message: `Failed: ${emailTemplate.subject}`,
              status: 'failed' as const,
              sent_to: lead.email,
              sent_by: null
            });
          }
        } catch (error) {
          failureCount++;
          console.error(`Error sending email to ${lead.email}:`, error);
          communications.push({
            lead_id: lead.id,
            type: 'email' as const,
            message: `Error: ${emailTemplate.subject}`,
            status: 'failed' as const,
            sent_to: lead.email,
            sent_by: null
          });
        }
      }

      // Log all communications
      if (communications.length > 0) {
        const { error: commError } = await supabase
          .from('communications')
          .insert(communications);

        if (commError) {
          console.error('Error logging communications:', commError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          demo: false,
          message: `Email campaign completed. Sent: ${successCount}, Failed: ${failureCount}`,
          success_count: successCount,
          failure_count: failureCount,
          total_leads: leads.length
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: 200,
        }
      );
    }

    if (action === 'send_single_email') {
      const { lead_id, email_content } = await req.json();
      
      if (!lead_id || !email_content) {
        return new Response(
          JSON.stringify({ error: 'Missing lead_id or email_content' }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 400,
          }
        );
      }

      // Get lead details
      const { data: lead, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', lead_id)
        .single();

      if (error || !lead || !lead.email) {
        return new Response(
          JSON.stringify({ error: 'Lead not found or no email address' }),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
            status: 400,
          }
        );
      }

      // Send email
      const emailResponse = await fetch('https://mail.zoho.com/api/accounts/{{account_id}}/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Zoho-oauthtoken ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromAddress: fromAddress,
          toAddress: lead.email,
          subject: email_content.subject,
          content: email_content.content,
          mailFormat: 'html'
        }),
      });

      const success = emailResponse.ok;

      // Log communication
      await supabase
        .from('communications')
        .insert({
          lead_id: lead.id,
          type: 'email',
          message: `Subject: ${email_content.subject}`,
          status: success ? 'sent' : 'failed',
          sent_to: lead.email,
          sent_by: null
        });

      return new Response(
        JSON.stringify({
          success,
          message: success ? 'Email sent successfully' : 'Failed to send email'
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          status: success ? 200 : 500,
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
    console.error('Error in zoho-mail function:', error);
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