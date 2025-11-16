import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

// Validate Resend configuration
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
if (!RESEND_API_KEY) {
  console.warn("WARNING: RESEND_API_KEY not found in environment variables");
}

const resend = new Resend(RESEND_API_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AssignmentEmailRequest {
  leadId: string;
  assignedToId: string;
  assignedByName?: string;
  reason?: string;
  isTransfer: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { leadId, assignedToId, assignedByName, reason, isTransfer }: AssignmentEmailRequest = await req.json();

    // Fetch lead details with additional fields
    const { data: lead, error: leadError } = await supabaseClient
      .from("leads")
      .select("name, phone, email, budget_min, budget_max, preferred_location, property_type, source, status, project_name, notes")
      .eq("id", leadId)
      .single();

    if (leadError || !lead) {
      console.error("Error fetching lead:", leadError);
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch assigned user details
    const { data: assignedUser, error: userError } = await supabaseClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", assignedToId)
      .single();

    if (userError || !assignedUser) {
      console.error("Error fetching assigned user:", userError);
      return new Response(
        JSON.stringify({ error: "Assigned user not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get CRM base URL from environment or use default
    const CRM_BASE_URL = Deno.env.get("CRM_BASE_URL") || "https://homekart-nexus.vercel.app";
    const leadUrl = `${CRM_BASE_URL}/leads?leadId=${leadId}`;

    // Prepare email content
    const subject = isTransfer 
      ? `Lead Transferred: ${lead.name}` 
      : `New Lead Assigned: ${lead.name}`;

    const actionText = isTransfer ? "transferred to" : "assigned to";
    const byText = assignedByName ? ` by ${assignedByName}` : "";

    // Format budget for display
    const formatBudget = (min: number | null, max: number | null) => {
      if (min && max) return `₹${min.toLocaleString('en-IN')} - ₹${max.toLocaleString('en-IN')}`;
      if (min) return `₹${min.toLocaleString('en-IN')}+`;
      if (max) return `Up to ₹${max.toLocaleString('en-IN')}`;
      return 'Not specified';
    };

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="padding: 30px 30px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                      ${isTransfer ? '🔄 Lead Transferred' : '🎯 New Lead Assigned'}
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 30px;">
                    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                      Hi <strong>${assignedUser.full_name}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #555555; font-size: 15px; line-height: 1.6;">
                      A lead has been ${actionText} you${byText}.
                    </p>
                    
                    ${reason ? `
                    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
                      <p style="margin: 0; color: #856404; font-size: 14px;">
                        <strong>Reason:</strong> ${reason}
                      </p>
                    </div>
                    ` : ''}
                    
                    <!-- Lead Details Card -->
                    <div style="background-color: #f8f9fa; padding: 24px; border-radius: 8px; margin: 24px 0; border: 1px solid #e9ecef;">
                      <h2 style="margin: 0 0 20px; color: #333333; font-size: 18px; font-weight: 600;">Lead Details</h2>
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px; width: 140px;"><strong>Name:</strong></td>
                          <td style="padding: 10px 0; color: #333333; font-size: 14px;">${lead.name}</td>
                        </tr>
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px;"><strong>Phone:</strong></td>
                          <td style="padding: 10px 0; color: #333333; font-size: 14px;">
                            <a href="tel:${lead.phone}" style="color: #667eea; text-decoration: none;">${lead.phone}</a>
                          </td>
                        </tr>
                        ${lead.email ? `
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px;"><strong>Email:</strong></td>
                          <td style="padding: 10px 0; color: #333333; font-size: 14px;">
                            <a href="mailto:${lead.email}" style="color: #667eea; text-decoration: none;">${lead.email}</a>
                          </td>
                        </tr>
                        ` : ''}
                        ${lead.status ? `
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px;"><strong>Status:</strong></td>
                          <td style="padding: 10px 0; color: #333333; font-size: 14px; text-transform: capitalize;">${lead.status.replace('_', ' ')}</td>
                        </tr>
                        ` : ''}
                        ${lead.source ? `
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px;"><strong>Source:</strong></td>
                          <td style="padding: 10px 0; color: #333333; font-size: 14px;">${lead.source}</td>
                        </tr>
                        ` : ''}
                        ${lead.project_name ? `
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px;"><strong>Project:</strong></td>
                          <td style="padding: 10px 0; color: #333333; font-size: 14px;">${lead.project_name}</td>
                        </tr>
                        ` : ''}
                        ${lead.property_type ? `
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px;"><strong>Property Type:</strong></td>
                          <td style="padding: 10px 0; color: #333333; font-size: 14px; text-transform: capitalize;">${lead.property_type.replace('_', ' ')}</td>
                        </tr>
                        ` : ''}
                        ${lead.preferred_location ? `
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px;"><strong>Location:</strong></td>
                          <td style="padding: 10px 0; color: #333333; font-size: 14px;">${lead.preferred_location}</td>
                        </tr>
                        ` : ''}
                        ${lead.budget_min || lead.budget_max ? `
                        <tr>
                          <td style="padding: 10px 0; color: #666666; font-size: 14px;"><strong>Budget:</strong></td>
                          <td style="padding: 10px 0; color: #333333; font-size: 14px; font-weight: 600;">${formatBudget(lead.budget_min, lead.budget_max)}</td>
                        </tr>
                        ` : ''}
                      </table>
                      ${lead.notes ? `
                      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #dee2e6;">
                        <p style="margin: 0 0 8px; color: #666666; font-size: 13px; font-weight: 600;">Notes:</p>
                        <p style="margin: 0; color: #333333; font-size: 14px; line-height: 1.5; white-space: pre-wrap;">${lead.notes}</p>
                      </div>
                      ` : ''}
                    </div>
                    
                    <!-- CTA Button -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                      <tr>
                        <td align="center" style="padding: 0;">
                          <a href="${leadUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                            View Lead in CRM →
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Fallback Link -->
                    <p style="margin: 20px 0 0; text-align: center; color: #999999; font-size: 12px;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${leadUrl}" style="color: #667eea; word-break: break-all;">${leadUrl}</a>
                    </p>
                    
                    <p style="margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #e9ecef; color: #999999; font-size: 12px; text-align: center;">
                      This is an automated notification from your CRM system.<br>
                      Please follow up with this lead as soon as possible.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Validate Resend configuration
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured. Please set RESEND_API_KEY." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get sender email from environment
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "CRM Notifications <onboarding@resend.dev>";
    
    // Send email
    try {
      const emailResponse = await resend.emails.send({
        from: fromEmail,
        to: [assignedUser.email],
        subject: subject,
        html: html,
      });

      console.log("Email sent successfully:", {
        leadId,
        assignedTo: assignedUser.email,
        emailId: emailResponse.data?.id,
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          emailId: emailResponse.data?.id,
          message: "Email sent successfully"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    } catch (emailError: any) {
      console.error("Error sending email via Resend:", emailError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send email", 
          details: emailError.message 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }
  } catch (error: any) {
    console.error("Error in send-lead-assignment-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
