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
    const { recruiterName, company, linkedinUrl, email } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Researching recruiter:', recruiterName, 'at', company);

    const searchContext = `
      Recruiter: ${recruiterName}
      Company: ${company || 'Not specified'}
      LinkedIn: ${linkedinUrl || 'Not provided'}
      Email: ${email || 'Not provided'}
    `;

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
            content: `You are an expert executive recruiter researcher. Based on the information provided, create a comprehensive profile of the recruiter including their likely focus areas, how to best approach them, and strategic recommendations for engagement.

Your analysis should be professional, actionable, and based on typical patterns in the executive recruitment industry.`
          },
          {
            role: 'user',
            content: `Research this recruiter and provide a comprehensive profile:

${searchContext}

Provide a detailed JSON response with this structure:
{
  "profile_summary": "Brief professional summary of the recruiter",
  "company_info": {
    "name": "Company name",
    "type": "Type of firm (Executive Search, Recruitment Agency, In-house, Boutique, etc.)",
    "specialization": "Their typical focus areas",
    "reputation": "Market reputation and standing"
  },
  "focus_areas": {
    "industries": ["List of industries they likely focus on"],
    "roles": ["Types of roles they typically recruit for"],
    "seniority_levels": ["C-Suite", "VP", "Director", etc.],
    "geographic_focus": ["Regions/countries they cover"]
  },
  "approach_strategy": {
    "best_contact_method": "Email/LinkedIn/Phone recommendation",
    "timing": "Best time to reach out",
    "tone": "Formal/Semi-formal/Professional casual",
    "key_points_to_highlight": ["What to emphasize when contacting them"]
  },
  "engagement_tips": [
    "Specific tips for engaging with this recruiter effectively"
  ],
  "red_flags_to_avoid": [
    "Things to avoid when contacting this recruiter"
  ],
  "sample_opening": "A sample opening message tailored for this recruiter",
  "follow_up_strategy": "How to follow up effectively"
}

Be specific and actionable. If company is well-known, include real information about their specialization.`
          }
        ],
        max_tokens: 2500
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
        JSON.stringify({ error: 'Failed to research recruiter' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('Research complete for:', recruiterName);

    // Extract JSON from response
    let research = null;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        research = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse research:', parseError);
      // Return raw content if JSON parsing fails
      research = {
        profile_summary: content,
        raw_response: true
      };
    }

    return new Response(
      JSON.stringify({ research }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error researching recruiter:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
