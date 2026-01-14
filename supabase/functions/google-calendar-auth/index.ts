import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthRequest {
  action: 'get_auth_url' | 'exchange_code' | 'refresh_token' | 'disconnect';
  code?: string;
  redirect_uri?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, code, redirect_uri }: AuthRequest = await req.json();

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: 'Google Calendar integration not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case 'get_auth_url': {
        const scopes = [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events'
        ];
        
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', redirect_uri || `${supabaseUrl}/functions/v1/google-calendar-callback`);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', scopes.join(' '));
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
        authUrl.searchParams.set('state', user.id);
        
        return new Response(
          JSON.stringify({ auth_url: authUrl.toString() }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'exchange_code': {
        if (!code || !redirect_uri) {
          return new Response(
            JSON.stringify({ error: 'Missing code or redirect_uri' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri,
            grant_type: 'authorization_code'
          })
        });

        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
          console.error('Token exchange error:', tokenData);
          return new Response(
            JSON.stringify({ error: tokenData.error_description || 'Failed to exchange code' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const expiryDate = new Date(Date.now() + tokenData.expires_in * 1000);

        // Store tokens in database
        const { error: upsertError } = await supabase
          .from('google_calendar_tokens')
          .upsert({
            user_id: user.id,
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            token_expiry: expiryDate.toISOString(),
            sync_enabled: true
          }, {
            onConflict: 'user_id'
          });

        if (upsertError) {
          console.error('Error storing tokens:', upsertError);
          return new Response(
            JSON.stringify({ error: 'Failed to store tokens' }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Google Calendar connected successfully' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'refresh_token': {
        const { data: tokenData, error: tokenError } = await supabase
          .from('google_calendar_tokens')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (tokenError || !tokenData) {
          return new Response(
            JSON.stringify({ error: 'No Google Calendar connection found' }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            refresh_token: tokenData.refresh_token,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            grant_type: 'refresh_token'
          })
        });

        const refreshData = await refreshResponse.json();

        if (refreshData.error) {
          return new Response(
            JSON.stringify({ error: 'Failed to refresh token' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const expiryDate = new Date(Date.now() + refreshData.expires_in * 1000);

        await supabase
          .from('google_calendar_tokens')
          .update({
            access_token: refreshData.access_token,
            token_expiry: expiryDate.toISOString()
          })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ success: true, access_token: refreshData.access_token }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'disconnect': {
        const { error: deleteError } = await supabase
          .from('google_calendar_tokens')
          .delete()
          .eq('user_id', user.id);

        // Also delete sync records
        await supabase
          .from('calendar_event_sync')
          .delete()
          .eq('user_id', user.id);

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: 'Failed to disconnect' }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Google Calendar disconnected' }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: any) {
    console.error("Error in google-calendar-auth:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
