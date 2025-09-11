import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_location?: string;
  property_type?: string;
  status: string;
  source?: string;
  notes?: string;
  created_at: string;
  last_contacted?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
    const { leadId, action } = await req.json();

    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead not found');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (action === 'score') {
      systemPrompt = `You are an AI lead scoring expert for a real estate CRM. Analyze leads and provide a score from 0-100 based on:
      - Budget range (higher budget = higher score)
      - Contact information completeness 
      - Location preferences specificity
      - Lead source quality
      - Time since creation
      - Current status progression
      
      Return ONLY a JSON object with: {"score": number, "reasoning": "brief explanation", "priority": "high/medium/low", "recommendations": ["action1", "action2"]}`;

      userPrompt = `Analyze this lead:
      Name: ${lead.name}
      Budget: ₹${lead.budget_min || 0} - ₹${lead.budget_max || 'Not specified'}
      Location: ${lead.preferred_location || 'Not specified'}
      Property Type: ${lead.property_type || 'Any'}
      Status: ${lead.status}
      Source: ${lead.source || 'Unknown'}
      Created: ${lead.created_at}
      Last Contacted: ${lead.last_contacted || 'Never'}
      Has Email: ${lead.email ? 'Yes' : 'No'}
      Notes: ${lead.notes || 'None'}`;
    } else if (action === 'insights') {
      systemPrompt = `You are an AI real estate advisor. Provide strategic insights about leads including:
      - Market positioning based on budget and preferences  
      - Best approach strategies
      - Potential objections and how to handle them
      - Optimal follow-up timing and methods
      
      Return ONLY a JSON object with: {"insights": ["insight1", "insight2"], "strategy": "recommended approach", "nextAction": "specific next step", "timeline": "suggested timing"}`;

      userPrompt = `Provide insights for this lead:
      Name: ${lead.name}
      Budget: ₹${lead.budget_min || 0} - ₹${lead.budget_max || 'Not specified'}
      Location: ${lead.preferred_location || 'Not specified'}
      Property Type: ${lead.property_type || 'Any'}
      Status: ${lead.status}
      Created: ${new Date(lead.created_at).toLocaleDateString()}
      Notes: ${lead.notes || 'None'}`;
    } else if (action === 'message') {
      const { messageType, context } = await req.json();
      
      systemPrompt = `You are an expert real estate sales professional. Generate personalized messages for leads based on their profile and current status. Keep messages professional, friendly, and action-oriented.`;

      userPrompt = `Generate a ${messageType} message for this lead:
      Name: ${lead.name}
      Budget: ₹${lead.budget_min || 0} - ₹${lead.budget_max || 'Not specified'}
      Location: ${lead.preferred_location || 'Not specified'}
      Property Type: ${lead.property_type || 'Any'}
      Status: ${lead.status}
      Context: ${context || 'General follow-up'}
      
      Return ONLY a JSON object with: {"subject": "message subject", "message": "message content", "tone": "professional/casual/urgent"}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API Error:', errorData);
      throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    let result;
    try {
      result = JSON.parse(aiResponse);
    } catch (e) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Invalid AI response format');
    }

    // Store AI insights in database for future reference
    if (action === 'score') {
      await supabase
        .from('leads')
        .update({ 
          ai_score: result.score,
          ai_insights: result
        })
        .eq('id', leadId);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-lead-insights function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'AI analysis failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});