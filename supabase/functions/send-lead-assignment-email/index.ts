import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");
const SENDGRID_FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL") || "noreply@yourdomain.com";

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

    // Fetch lead details
    const { data: lead, error: leadError } = await supabaseClient
      .from("leads")
      .select("name, phone, email, budget_min, budget_max, preferred_location, property_type")
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

    // Prepare email content
    const subject = isTransfer 
      ? `Lead Transferred: ${lead.name}` 
      : `New Lead Assigned: ${lead.name}`;

    const actionText = isTransfer ? "transferred to" : "assigned to";
    const byText = assignedByName ? ` by ${assignedByName}` : "";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Lead ${isTransfer ? 'Transfer' : 'Assignment'} Notification</h2>
        
        <p>Hi ${assignedUser.full_name},</p>
        
        <p>A lead has been ${actionText} you${byText}.</p>
        
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Lead Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0;"><strong>Name:</strong></td>
              <td style="padding: 8px 0;">${lead.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;"><strong>Phone:</strong></td>
              <td style="padding: 8px 0;">${lead.phone}</td>
            </tr>
            ${lead.email ? `
            <tr>
              <td style="padding: 8px 0;"><strong>Email:</strong></td>
              <td style="padding: 8px 0;">${lead.email}</td>
            </tr>
            ` : ''}
            ${lead.property_type ? `
            <tr>
              <td style="padding: 8px 0;"><strong>Property Type:</strong></td>
              <td style="padding: 8px 0;">${lead.property_type}</td>
            </tr>
            ` : ''}
            ${lead.preferred_location ? `
            <tr>
              <td style="padding: 8px 0;"><strong>Preferred Location:</strong></td>
              <td style="padding: 8px 0;">${lead.preferred_location}</td>
            </tr>
            ` : ''}
            ${lead.budget_min || lead.budget_max ? `
            <tr>
              <td style="padding: 8px 0;"><strong>Budget:</strong></td>
              <td style="padding: 8px 0;">${lead.budget_min ? `₹${lead.budget_min}` : ''} ${lead.budget_max ? `- ₹${lead.budget_max}` : ''}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <p>Please follow up with this lead as soon as possible.</p>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          This is an automated notification from your CRM system.
        </p>
      </div>
    `;

    // Send email using SendGrid
    const emailPayload = {
      personalizations: [
        {
          to: [{ email: assignedUser.email, name: assignedUser.full_name }],
          subject: subject,
        },
      ],
      from: {
        email: SENDGRID_FROM_EMAIL,
        name: "CRM Notifications",
      },
      content: [
        {
          type: "text/html",
          value: html,
        },
      ],
    };

    const emailResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("SendGrid API error:", errorText);
      throw new Error(`SendGrid API error: ${emailResponse.status} - ${errorText}`);
    }

    console.log("Email sent successfully via SendGrid");

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
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
