import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!PERPLEXITY_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'PERPLEXITY_API_KEY is not configured. Please add it to Supabase secrets.',
          instructions: 'Get your API key from https://www.perplexity.ai/settings/api'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { leadId } = await req.json();

    if (!leadId) {
      return new Response(
        JSON.stringify({ error: 'leadId is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return new Response(
        JSON.stringify({ error: 'Lead not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    // Get available properties
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('*')
      .eq('status', 'available')
      .limit(50); // Limit for performance

    if (propertiesError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch properties' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    if (!properties || properties.length === 0) {
      return new Response(
        JSON.stringify({
          matches: [],
          summary: 'No available properties found to match'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build prompt for Perplexity AI
    const leadInfo = `
Lead Requirements:
- Budget Range: ₹${lead.budget_min || 0} - ₹${lead.budget_max || 'No limit'}
- Preferred Location: ${lead.preferred_location || 'Any'}
- Property Type: ${lead.property_type || 'Any'}
- Status: ${lead.status}
- Notes: ${lead.notes || 'None'}
`;

    const propertiesList = properties.map((prop, index) => `
Property ${index + 1}:
- ID: ${prop.id}
- Title: ${prop.title}
- Price: ₹${prop.price}
- Location: ${prop.location}, ${prop.city}, ${prop.state}
- Type: ${prop.property_type}
- Bedrooms: ${prop.bedrooms || 'N/A'}
- Bathrooms: ${prop.bathrooms || 'N/A'}
- Area: ${prop.area || 'N/A'} sq ft
- Amenities: ${prop.amenities ? prop.amenities.join(', ') : 'None'}
- Description: ${prop.description || 'N/A'}
`).join('\n');

    const prompt = `${leadInfo}

Available Properties:
${propertiesList}

Analyze and match these properties to the lead's requirements. For each property, provide:
1. Match score (0-100) based on budget, location, type, and preferences
2. Detailed reasoning for the match
3. Key highlights that make this property attractive
4. Potential concerns or objections

Return a JSON object with this structure:
{
  "matches": [
    {
      "propertyId": "uuid",
      "score": number,
      "reasoning": "detailed explanation",
      "highlights": ["point 1", "point 2"],
      "concerns": ["concern 1", "concern 2"]
    }
  ],
  "summary": "overall matching analysis"
}

Sort matches by score (highest first) and return top 10 matches.`;

    // Call Perplexity API
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: 'You are an expert real estate property matching AI. Analyze lead requirements and match them with available properties. Provide detailed, accurate matching scores and reasoning. Always return valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!perplexityResponse.ok) {
      const errorData = await perplexityResponse.text();
      console.error('Perplexity API Error:', errorData);
      throw new Error(`Perplexity API Error: ${perplexityResponse.status}`);
    }

    const perplexityData = await perplexityResponse.json();
    const aiResponse = perplexityData.choices[0].message.content;

    // Extract JSON from response (handle markdown code blocks)
    let jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/) || 
                    aiResponse.match(/```\s*([\s\S]*?)\s*```/) ||
                    [null, aiResponse];
    
    let result;
    try {
      result = JSON.parse(jsonMatch[1] || jsonMatch[0] || aiResponse);
    } catch (e) {
      console.error('Failed to parse AI response:', aiResponse);
      // Fallback: try to extract JSON object
      const jsonObjectMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        result = JSON.parse(jsonObjectMatch[0]);
      } else {
        throw new Error('Invalid AI response format');
      }
    }

    // Enrich matches with full property data
    if (result.matches && Array.isArray(result.matches)) {
      result.matches = result.matches
        .map((match: any) => {
          const property = properties.find(p => p.id === match.propertyId);
          return property ? { ...match, property } : null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 10);
    } else {
      result.matches = [];
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in perplexity-property-matcher function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Property matching failed',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

