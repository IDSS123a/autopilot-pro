import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ReminderRequest {
  event_id?: string;
  user_id?: string;
  check_upcoming?: boolean;
}

const formatEventType = (type: string): string => {
  const types: Record<string, string> = {
    interview: "🎯 Interview",
    followup: "📧 Follow-up",
    deadline: "⏰ Deadline",
    other: "📌 Event"
  };
  return types[type] || "📌 Event";
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { event_id, user_id, check_upcoming }: ReminderRequest = await req.json();

    // Mode 1: Check for all upcoming events needing reminders
    if (check_upcoming) {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
      
      // Get events happening in the next hour that haven't been reminded
      const { data: upcomingEvents, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*, profiles:user_id(email, full_name)')
        .eq('is_completed', false)
        .gte('event_date', now.toISOString())
        .lte('event_date', oneHourFromNow.toISOString());

      if (eventsError) {
        throw eventsError;
      }

      if (!upcomingEvents || upcomingEvents.length === 0) {
        return new Response(
          JSON.stringify({ message: "No upcoming events to remind" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send reminders for each event
      const results = [];
      for (const event of upcomingEvents) {
        const profile = event.profiles as any;
        if (profile?.email) {
          try {
            await sendReminderEmail(event, profile.email, profile.full_name || 'there');
            results.push({ event_id: event.id, success: true });
          } catch (e) {
            results.push({ event_id: event.id, success: false, error: (e as Error).message });
          }
        }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Mode 2: Send reminder for specific event
    if (event_id) {
      const { data: event, error: eventError } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', event_id)
        .single();

      if (eventError || !event) {
        return new Response(
          JSON.stringify({ error: "Event not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', event.user_id)
        .single();

      if (profileError || !profile) {
        return new Response(
          JSON.stringify({ error: "User profile not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await sendReminderEmail(event, profile.email, profile.full_name || 'there');

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(
      JSON.stringify({ error: "Missing event_id or check_upcoming flag" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-interview-reminder function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

async function sendReminderEmail(event: any, email: string, userName: string) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const formattedTime = eventDate.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

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
          <h1 style="color: white; margin: 0; font-size: 24px;">${formatEventType(event.event_type)}</h1>
          <p style="color: #a0aec0; margin: 10px 0 0 0;">Reminder from C-Level AutoPilot Pro</p>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #2d3748; margin-bottom: 20px;">
            Hi ${userName},
          </p>
          
          <p style="font-size: 14px; color: #4a5568; margin-bottom: 24px;">
            This is a reminder for your upcoming ${event.event_type}:
          </p>
          
          <div style="padding: 20px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #6366f1; margin-bottom: 20px;">
            <h2 style="margin: 0 0 12px 0; color: #1a1a2e; font-size: 20px;">${event.title}</h2>
            
            <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 14px;">
              📅 <strong>${formattedDate}</strong> at <strong>${formattedTime}</strong>
            </p>
            
            ${event.company_name ? `
            <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 14px;">
              🏢 <strong>${event.company_name}</strong>
            </p>
            ` : ''}
            
            ${event.location ? `
            <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 14px;">
              📍 ${event.location}
            </p>
            ` : ''}
            
            ${event.contact_name ? `
            <p style="margin: 0 0 8px 0; color: #4a5568; font-size: 14px;">
              👤 ${event.contact_name}${event.contact_email ? ` (${event.contact_email})` : ''}
            </p>
            ` : ''}
            
            ${event.meeting_link ? `
            <a href="${event.meeting_link}" style="display: inline-block; background: #10b981; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 12px;">
              Join Meeting
            </a>
            ` : ''}
          </div>
          
          ${event.description ? `
          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 14px; color: #2d3748; margin-bottom: 8px;">Description:</h3>
            <p style="font-size: 14px; color: #4a5568; margin: 0;">${event.description}</p>
          </div>
          ` : ''}
          
          ${event.notes ? `
          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 14px; color: #2d3748; margin-bottom: 8px;">Notes:</h3>
            <p style="font-size: 14px; color: #4a5568; margin: 0;">${event.notes}</p>
          </div>
          ` : ''}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 14px; color: #6366f1; font-weight: 600;">Good luck! 🍀</p>
          </div>
          
          <p style="font-size: 12px; color: #a0aec0; margin-top: 30px; text-align: center;">
            You're receiving this because you have reminder notifications enabled.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "AutoPilot Pro <notifications@resend.dev>",
      to: [email],
      subject: `⏰ Reminder: ${event.title} - ${formattedTime}`,
      html: emailHtml,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return await response.json();
}

serve(handler);
