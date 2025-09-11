import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { leadId } = await req.json();

    // Get lead preferences
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead not found');
    }

    // Get all available properties
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('*')
      .eq('status', 'available');

    if (propertiesError) {
      throw new Error('Failed to fetch properties');
    }

    if (!properties || properties.length === 0) {
      return new Response(JSON.stringify({
        matches: [],
        message: 'No available properties found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to match properties to lead preferences
    const systemPrompt = `You are an AI property matching expert for real estate. Analyze a lead's preferences and match them with available properties.

    Evaluate each property based on:
    - Budget compatibility (property price vs lead budget)
    - Location preference match
    - Property type preference
    - Size requirements (bedrooms, bathrooms, area)
    - Amenities that might appeal to the lead

    For each property, provide a match score (0-100) and reasoning.
    Return ONLY a JSON object with: {
      "matches": [
        {
          "propertyId": "uuid", 
          "score": number,
          "reasoning": "why this property matches",
          "highlights": ["key selling points"],
          "concerns": ["potential objections"]
        }
      ],
      "summary": "overall matching analysis"
    }`;

    const leadProfile = `Lead Profile:
    Budget Range: ₹${lead.budget_min || 0} - ₹${lead.budget_max || 'No limit'}
    Preferred Location: ${lead.preferred_location || 'Any'}
    Property Type: ${lead.property_type || 'Any'}
    Status: ${lead.status}
    Notes: ${lead.notes || 'None'}`;

    const propertiesData = properties.map(prop => `
    Property ID: ${prop.id}
    Title: ${prop.title}
    Price: ₹${prop.price}
    Location: ${prop.location}, ${prop.city}, ${prop.state}
    Type: ${prop.property_type}
    Bedrooms: ${prop.bedrooms || 'N/A'}
    Bathrooms: ${prop.bathrooms || 'N/A'}
    Area: ${prop.area || 'N/A'} sq ft
    Amenities: ${prop.amenities ? prop.amenities.join(', ') : 'None'}
    Description: ${prop.description || 'N/A'}
    `).join('\n---\n');

    const userPrompt = `${leadProfile}

    Available Properties:
    ${propertiesData}

    Match properties to this lead's preferences and return the top matches with scores and reasoning.`;

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
        max_tokens: 2000,
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

    // Enrich matches with full property data
    if (result.matches) {
      result.matches = result.matches
        .map((match: any) => {
          const property = properties.find(p => p.id === match.propertyId);
          return property ? { ...match, property } : null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5); // Return top 5 matches
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-property-matcher function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Property matching failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});