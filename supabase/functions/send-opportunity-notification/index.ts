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
    data_quality?: 'verified' | 'scraped' | 'ai_generated';
  }>;
  priority?: 'high' | 'normal' | 'low';
  is_verified?: boolean;
  notification_type?: 'instant' | 'digest' | 'weekly';
}

const getPriorityStyles = (priority: string, isVerified: boolean) => {
  if (isVerified) {
    return {
      headerBg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      accentColor: '#10b981',
      badge: '✅ VERIFIED',
      badgeBg: '#d1fae5',
      badgeColor: '#065f46',
    };
  }
  
  switch (priority) {
    case 'high':
      return {
        headerBg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
        accentColor: '#ef4444',
        badge: '🔥 HIGH PRIORITY',
        badgeBg: '#fee2e2',
        badgeColor: '#991b1b',
      };
    default:
      return {
        headerBg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        accentColor: '#6366f1',
        badge: '🎯 NEW MATCH',
        badgeBg: '#e0e7ff',
        badgeColor: '#3730a3',
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      user_id, 
      opportunities, 
      priority = 'normal',
      is_verified = false,
      notification_type = 'instant'
    }: OpportunityNotificationRequest = await req.json();

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
    const styles = getPriorityStyles(priority, is_verified);

    // Generate HTML for opportunities with enhanced styling
    const opportunitiesHtml = opportunities.map(opp => {
      const qualityBadge = opp.data_quality === 'verified' 
        ? '<span style="background: #d1fae5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">✅ VERIFIED</span>'
        : opp.data_quality === 'scraped'
        ? '<span style="background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">📊 SCRAPED</span>'
        : '<span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">🤖 AI</span>';

      return `
        <div style="margin-bottom: 20px; padding: 20px; background: #ffffff; border-radius: 12px; border-left: 4px solid ${styles.accentColor}; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <h3 style="margin: 0; color: #1a1a2e; font-size: 18px; font-weight: 700;">${opp.position_title}</h3>
            ${qualityBadge}
          </div>
          <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 15px;">
            <strong style="color: #1a1a2e;">${opp.company_name}</strong>${opp.location ? ` • 📍 ${opp.location}` : ''}
          </p>
          ${opp.salary_range ? `<p style="margin: 0 0 8px 0; color: #059669; font-size: 14px; font-weight: 600;">💰 ${opp.salary_range}</p>` : ''}
          ${opp.match_score ? `
            <div style="margin: 12px 0; background: #f8fafc; border-radius: 8px; padding: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 24px; font-weight: 700; color: ${opp.match_score >= 80 ? '#059669' : opp.match_score >= 60 ? '#f59e0b' : '#6366f1'};">${opp.match_score}%</span>
                <span style="color: #64748b; font-size: 13px;">Match Score</span>
              </div>
              <div style="margin-top: 8px; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                <div style="height: 100%; width: ${opp.match_score}%; background: ${opp.match_score >= 80 ? '#059669' : opp.match_score >= 60 ? '#f59e0b' : '#6366f1'}; border-radius: 3px;"></div>
              </div>
            </div>
          ` : ''}
          ${opp.job_url ? `<a href="${opp.job_url}" style="display: inline-block; margin-top: 8px; color: ${styles.accentColor}; text-decoration: none; font-size: 14px; font-weight: 600;">View Full Listing →</a>` : ''}
        </div>
      `;
    }).join('');

    // Get subject based on priority and content
    const highestMatch = Math.max(...opportunities.map(o => o.match_score || 0));
    const verifiedCount = opportunities.filter(o => o.data_quality === 'verified').length;
    
    let subject = '';
    if (is_verified || verifiedCount > 0) {
      subject = `✅ ${verifiedCount || opportunities.length} Verified ${opportunities.length === 1 ? 'Opportunity' : 'Opportunities'} Found`;
    } else if (priority === 'high' || highestMatch >= 85) {
      subject = `🔥 High Priority: ${highestMatch}% Match Found!`;
    } else {
      subject = `🎯 ${opportunities.length} New ${opportunities.length === 1 ? 'Opportunity' : 'Opportunities'} (${highestMatch}% Best Match)`;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #f1f5f9;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <!-- Priority Badge -->
          <div style="text-align: center; margin-bottom: 16px;">
            <span style="display: inline-block; background: ${styles.badgeBg}; color: ${styles.badgeColor}; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              ${styles.badge}
            </span>
          </div>
          
          <!-- Header -->
          <div style="background: ${styles.headerBg}; padding: 40px 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800;">
              ${is_verified ? '✅ Verified Opportunities' : priority === 'high' ? '🔥 High-Match Alert!' : '🎯 New Opportunities'}
            </h1>
            <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 16px;">
              C-Level AutoPilot Pro
            </p>
          </div>
          
          <!-- Content -->
          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px;">
            <p style="font-size: 17px; color: #1e293b; margin-bottom: 8px;">
              Hi ${userName}! 👋
            </p>
            
            <p style="font-size: 15px; color: #475569; margin-bottom: 24px; line-height: 1.6;">
              ${is_verified 
                ? `Great news! We've found <strong>${opportunities.length} verified</strong> executive opportunit${opportunities.length === 1 ? 'y' : 'ies'} from trusted sources that match your profile.`
                : priority === 'high'
                ? `🔥 <strong>High-priority alert!</strong> We found ${opportunities.length} excellent opportunit${opportunities.length === 1 ? 'y' : 'ies'} with match scores up to <strong>${highestMatch}%</strong>.`
                : `We've discovered <strong>${opportunities.length} new opportunit${opportunities.length === 1 ? 'y' : 'ies'}</strong> that align with your career goals.`
              }
            </p>
            
            ${opportunitiesHtml}
            
            <!-- CTA Button -->
            <div style="margin-top: 32px; text-align: center;">
              <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/app/opportunities" 
                 style="display: inline-block; background: ${styles.accentColor}; color: white; padding: 16px 32px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px ${styles.accentColor}40;">
                View All Opportunities →
              </a>
            </div>
            
            <!-- Stats -->
            <div style="margin-top: 32px; padding: 20px; background: #ffffff; border-radius: 12px; text-align: center;">
              <p style="color: #64748b; font-size: 13px; margin: 0;">
                📊 <strong>${opportunities.length}</strong> opportunities found
                ${verifiedCount > 0 ? ` • ✅ <strong>${verifiedCount}</strong> verified` : ''}
                ${highestMatch > 0 ? ` • 🎯 <strong>${highestMatch}%</strong> best match` : ''}
              </p>
            </div>
            
            <!-- Footer -->
            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; text-align: center; line-height: 1.6;">
              You're receiving this because you have email notifications enabled.<br/>
              <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/app/settings" style="color: #6366f1; text-decoration: none;">Manage notification preferences</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log(`Sending ${priority} priority notification to ${userEmail} for ${opportunities.length} opportunities`);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "AutoPilot Pro <notifications@resend.dev>",
        to: [userEmail],
        subject: subject,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();
    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ 
      success: true, 
      emailResult,
      stats: {
        total: opportunities.length,
        verified: verifiedCount,
        highestMatch,
        priority,
      }
    }), {
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
