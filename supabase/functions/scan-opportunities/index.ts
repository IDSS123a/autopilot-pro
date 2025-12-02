import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { regions, userProfile } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scanning opportunities for regions:', regions);

    const regionNames = regions.join(', ');
    const profileContext = userProfile ? 
      `User profile: ${userProfile.targetRole || 'Executive'}, Industries: ${userProfile.industries || 'Various'}, Experience: ${userProfile.bio || 'Senior leadership'}` : 
      'Senior C-Level executive seeking leadership positions';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an executive job search AI that generates realistic C-level and senior executive job opportunities. Generate opportunities that are realistic for the given regions with appropriate companies, salaries (in local currency), and job requirements. Each opportunity should be unique and detailed.`
          },
          {
            role: 'user',
            content: `Generate 5 realistic executive job opportunities for these regions: ${regionNames}.

${profileContext}

Return a JSON array with exactly this structure:
[
  {
    "id": "unique_id",
    "title": "Job Title (C-level or VP level)",
    "company": "Realistic company name for the region",
    "location": "City, Country",
    "salary_range": "Salary in local currency (e.g., €150k-200k, CHF 250k, $180k-220k)",
    "status": "New",
    "source": "Source (LinkedIn, Executive Search, Company Website, etc.)",
    "posted_date": "Time ago (e.g., 2h ago, 1d ago)",
    "description": "Detailed job description with requirements and responsibilities (2-3 sentences)",
    "match_score": 0
  }
]

Make the opportunities diverse across the selected regions, with realistic companies and salaries for each region. Include various industries and seniority levels (CEO, COO, CFO, CTO, VP, Managing Director, etc.).`
          }
        ],
        max_tokens: 3000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to scan opportunities' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response received, parsing opportunities');

    // Extract JSON from response
    let opportunities = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        opportunities = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse opportunities' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully generated ${opportunities.length} opportunities`);

    return new Response(
      JSON.stringify({ opportunities }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error scanning opportunities:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
