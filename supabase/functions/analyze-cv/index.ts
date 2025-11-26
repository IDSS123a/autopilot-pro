import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cvText, analysisType } = await req.json();
    
    if (!cvText) {
      return new Response(
        JSON.stringify({ error: "CV text is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (analysisType) {
      case "strengths":
        systemPrompt = "You are an expert executive career coach analyzing C-level CVs. Focus on identifying key strengths, achievements, and unique value propositions that would appeal to board-level decision makers.";
        userPrompt = `Analyze this executive CV and provide a detailed assessment of the candidate's key strengths, leadership qualities, and unique value propositions. Format your response in clear, professional language suitable for C-level positioning.\n\nCV:\n${cvText}`;
        break;

      case "gaps":
        systemPrompt = "You are a critical executive career advisor identifying development areas for C-level professionals. Focus on skills gaps, missing certifications, and areas for improvement.";
        userPrompt = `Analyze this executive CV and identify potential gaps, missing skills, or areas for development that could strengthen their C-level candidacy. Be constructive and specific.\n\nCV:\n${cvText}`;
        break;

      case "keywords":
        systemPrompt = "You are an ATS (Applicant Tracking System) specialist who understands executive recruiting. Extract relevant keywords, skills, and industry terms.";
        userPrompt = `Extract key industry terms, skills, leadership competencies, and relevant keywords from this executive CV. Focus on terms that would be valuable for C-level job applications.\n\nCV:\n${cvText}`;
        break;

      default:
        systemPrompt = "You are an expert executive career coach providing comprehensive CV analysis for C-level professionals.";
        userPrompt = `Provide a comprehensive analysis of this executive CV, including strengths, areas for improvement, and positioning recommendations.\n\nCV:\n${cvText}`;
    }

    console.log("Calling Lovable AI with analysis type:", analysisType);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    console.log("CV analysis completed successfully");

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in analyze-cv function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred during analysis" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
