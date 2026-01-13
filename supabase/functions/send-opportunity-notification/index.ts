import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OpportunityNotificationRequest {
  user_id: string;
  opportunities: Array<{
    id: string;
    company_name: string;
    position_title: string;
    location?: string;
    salary_range?: string;
    match_score?: number;
    job_url?: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, opportunities }: OpportunityNotificationRequest = await req.json();

    if (!user_id || !opportunities || opportunities.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing user_id or opportunities" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', user_id)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userName = profile.full_name || 'there';
    const userEmail = profile.email;

    // Generate HTML for opportunities
    const opportunitiesHtml = opportunities.map(opp => `
      <div style="margin-bottom: 20px; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #6366f1;">
        <h3 style="margin: 0 0 8px 0; color: #1a1a2e; font-size: 16px;">${opp.position_title}</h3>
        <p style="margin: 0 0 4px 0; color: #4a5568; font-size: 14px;">
          <strong>${opp.company_name}</strong>${opp.location ? ` • ${opp.location}` : ''}
        </p>
        ${opp.salary_range ? `<p style="margin: 0 0 4px 0; color: #48bb78; font-size: 14px;">💰 ${opp.salary_range}</p>` : ''}
        ${opp.match_score ? `<p style="margin: 0 0 8px 0; color: #6366f1; font-size: 14px;">✨ ${opp.match_score}% Match</p>` : ''}
        ${opp.job_url ? `<a href="${opp.job_url}" style="color: #6366f1; text-decoration: none; font-size: 14px;">View Opportunity →</a>` : ''}
      </div>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎯 New Opportunities Found!</h1>
            <p style="color: #a0aec0; margin: 10px 0 0 0;">C-Level AutoPilot Pro</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px;">
            <p style="font-size: 16px; color: #2d3748; margin-bottom: 20px;">
              Hi ${userName},
            </p>
            
            <p style="font-size: 14px; color: #4a5568; margin-bottom: 24px;">
              Great news! We've found <strong>${opportunities.length} new opportunit${opportunities.length === 1 ? 'y' : 'ies'}</strong> that match your profile:
            </p>
            
            ${opportunitiesHtml}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
              <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/app/opportunities" 
                 style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                View All Opportunities
              </a>
            </div>
            
            <p style="font-size: 12px; color: #a0aec0; margin-top: 30px; text-align: center;">
              You're receiving this because you have email notifications enabled in AutoPilot Pro.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "AutoPilot Pro <notifications@resend.dev>",
        to: [userEmail],
        subject: `🎯 ${opportunities.length} New ${opportunities.length === 1 ? 'Opportunity' : 'Opportunities'} Matching Your Profile`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, emailResult }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-opportunity-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
