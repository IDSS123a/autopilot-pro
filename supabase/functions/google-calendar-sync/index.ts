import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  action: 'sync_to_google' | 'sync_from_google' | 'sync_all' | 'sync_single_event';
  event_id?: string;
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

    const { action, event_id }: SyncRequest = await req.json();

    // Get user's Google Calendar tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ error: 'Google Calendar not connected' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if token needs refresh
    let accessToken = tokenData.access_token;
    if (new Date(tokenData.token_expiry) < new Date()) {
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: tokenData.refresh_token,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          grant_type: 'refresh_token'
        })
      });

      const refreshData = await refreshResponse.json();
      if (refreshData.access_token) {
        accessToken = refreshData.access_token;
        await supabase
          .from('google_calendar_tokens')
          .update({
            access_token: accessToken,
            token_expiry: new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
          })
          .eq('user_id', user.id);
      } else {
        return new Response(
          JSON.stringify({ error: 'Failed to refresh Google token' }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const calendarId = tokenData.calendar_id || 'primary';

    switch (action) {
      case 'sync_to_google': {
        // Get all local events that haven't been synced
        const { data: localEvents, error: eventsError } = await supabase
          .from('calendar_events')
          .select('*, calendar_event_sync(google_event_id)')
          .eq('user_id', user.id);

        if (eventsError) {
          throw eventsError;
        }

        const results = { created: 0, updated: 0, errors: 0 };

        for (const event of localEvents || []) {
          try {
            const syncRecord = event.calendar_event_sync?.[0];
            const googleEvent = formatEventForGoogle(event);

            if (syncRecord?.google_event_id) {
              // Update existing Google event
              const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${syncRecord.google_event_id}`,
                {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(googleEvent)
                }
              );

              if (response.ok) {
                results.updated++;
                await supabase
                  .from('calendar_event_sync')
                  .update({ last_synced_at: new Date().toISOString() })
                  .eq('local_event_id', event.id);
              } else {
                results.errors++;
              }
            } else {
              // Create new Google event
              const response = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(googleEvent)
                }
              );

              if (response.ok) {
                const createdEvent = await response.json();
                results.created++;
                
                await supabase
                  .from('calendar_event_sync')
                  .insert({
                    user_id: user.id,
                    local_event_id: event.id,
                    google_event_id: createdEvent.id,
                    sync_direction: 'to_google'
                  });
              } else {
                results.errors++;
              }
            }
          } catch (e) {
            console.error('Error syncing event:', e);
            results.errors++;
          }
        }

        // Update last sync time
        await supabase
          .from('google_calendar_tokens')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ success: true, results }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'sync_from_google': {
        // Get events from Google Calendar
        const now = new Date();
        const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
          new URLSearchParams({
            timeMin: now.toISOString(),
            timeMax: oneYearFromNow.toISOString(),
            singleEvents: 'true',
            orderBy: 'startTime'
          }),
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch Google Calendar events');
        }

        const data = await response.json();
        const results = { imported: 0, skipped: 0, errors: 0 };

        for (const gEvent of data.items || []) {
          try {
            // Check if already synced
            const { data: existingSync } = await supabase
              .from('calendar_event_sync')
              .select('local_event_id')
              .eq('user_id', user.id)
              .eq('google_event_id', gEvent.id)
              .single();

            if (existingSync) {
              results.skipped++;
              continue;
            }

            // Create local event
            const localEvent = formatEventFromGoogle(gEvent, user.id);
            const { data: createdEvent, error: createError } = await supabase
              .from('calendar_events')
              .insert(localEvent)
              .select()
              .single();

            if (createError) {
              results.errors++;
              continue;
            }

            // Create sync record
            await supabase
              .from('calendar_event_sync')
              .insert({
                user_id: user.id,
                local_event_id: createdEvent.id,
                google_event_id: gEvent.id,
                sync_direction: 'from_google'
              });

            results.imported++;
          } catch (e) {
            console.error('Error importing event:', e);
            results.errors++;
          }
        }

        // Update last sync time
        await supabase
          .from('google_calendar_tokens')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ success: true, results }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'sync_single_event': {
        if (!event_id) {
          return new Response(
            JSON.stringify({ error: 'Missing event_id' }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: event, error: eventError } = await supabase
          .from('calendar_events')
          .select('*, calendar_event_sync(google_event_id)')
          .eq('id', event_id)
          .eq('user_id', user.id)
          .single();

        if (eventError || !event) {
          return new Response(
            JSON.stringify({ error: 'Event not found' }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const syncRecord = event.calendar_event_sync?.[0];
        const googleEvent = formatEventForGoogle(event);

        if (syncRecord?.google_event_id) {
          // Update existing
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${syncRecord.google_event_id}`,
            {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(googleEvent)
            }
          );

          if (!response.ok) {
            throw new Error('Failed to update Google event');
          }

          await supabase
            .from('calendar_event_sync')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('local_event_id', event_id);

          return new Response(
            JSON.stringify({ success: true, action: 'updated' }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          // Create new
          const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(googleEvent)
            }
          );

          if (!response.ok) {
            throw new Error('Failed to create Google event');
          }

          const createdEvent = await response.json();

          await supabase
            .from('calendar_event_sync')
            .insert({
              user_id: user.id,
              local_event_id: event_id,
              google_event_id: createdEvent.id,
              sync_direction: 'to_google'
            });

          return new Response(
            JSON.stringify({ success: true, action: 'created', google_event_id: createdEvent.id }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      case 'sync_all': {
        // First sync to Google, then from Google
        // This is a simplified version - in production you'd want conflict resolution
        
        // Sync to Google first (our events take priority)
        const toGoogleResult = await syncToGoogle(supabase, user.id, accessToken, calendarId);
        
        // Then sync from Google (import new events only)
        const fromGoogleResult = await syncFromGoogle(supabase, user.id, accessToken, calendarId);

        // Update last sync time
        await supabase
          .from('google_calendar_tokens')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('user_id', user.id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            results: {
              to_google: toGoogleResult,
              from_google: fromGoogleResult
            }
          }),
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
    console.error("Error in google-calendar-sync:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

function formatEventForGoogle(event: any) {
  const startDate = new Date(event.event_date);
  const endDate = event.end_date ? new Date(event.end_date) : new Date(startDate.getTime() + 60 * 60 * 1000);

  return {
    summary: event.title,
    description: [
      event.description,
      event.company_name ? `Company: ${event.company_name}` : '',
      event.contact_name ? `Contact: ${event.contact_name}` : '',
      event.contact_email ? `Email: ${event.contact_email}` : '',
      event.notes ? `Notes: ${event.notes}` : ''
    ].filter(Boolean).join('\n'),
    location: event.location || event.meeting_link,
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'UTC'
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'UTC'
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: event.reminder_minutes || 60 }
      ]
    }
  };
}

function formatEventFromGoogle(gEvent: any, userId: string) {
  const startDateTime = gEvent.start?.dateTime || gEvent.start?.date;
  const endDateTime = gEvent.end?.dateTime || gEvent.end?.date;

  // Try to determine event type from summary
  let eventType = 'other';
  const summary = (gEvent.summary || '').toLowerCase();
  if (summary.includes('interview')) eventType = 'interview';
  else if (summary.includes('follow') || summary.includes('followup')) eventType = 'followup';
  else if (summary.includes('deadline')) eventType = 'deadline';

  return {
    user_id: userId,
    title: gEvent.summary || 'Untitled Event',
    description: gEvent.description || null,
    event_type: eventType,
    event_date: startDateTime,
    end_date: endDateTime || null,
    location: gEvent.location || null,
    meeting_link: gEvent.hangoutLink || null,
    reminder_minutes: 60,
    is_completed: false
  };
}

async function syncToGoogle(supabase: any, userId: string, accessToken: string, calendarId: string) {
  const { data: localEvents } = await supabase
    .from('calendar_events')
    .select('*, calendar_event_sync(google_event_id)')
    .eq('user_id', userId);

  const results = { created: 0, updated: 0, errors: 0 };

  for (const event of localEvents || []) {
    try {
      const syncRecord = event.calendar_event_sync?.[0];
      const googleEvent = formatEventForGoogle(event);

      if (syncRecord?.google_event_id) {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${syncRecord.google_event_id}`,
          {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(googleEvent)
          }
        );
        if (response.ok) results.updated++;
        else results.errors++;
      } else {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(googleEvent)
          }
        );
        if (response.ok) {
          const created = await response.json();
          await supabase.from('calendar_event_sync').insert({
            user_id: userId,
            local_event_id: event.id,
            google_event_id: created.id
          });
          results.created++;
        } else results.errors++;
      }
    } catch (e) {
      results.errors++;
    }
  }

  return results;
}

async function syncFromGoogle(supabase: any, userId: string, accessToken: string, calendarId: string) {
  const now = new Date();
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?` +
    new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: oneYearFromNow.toISOString(),
      singleEvents: 'true'
    }),
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );

  if (!response.ok) return { imported: 0, skipped: 0, errors: 1 };

  const data = await response.json();
  const results = { imported: 0, skipped: 0, errors: 0 };

  for (const gEvent of data.items || []) {
    const { data: existing } = await supabase
      .from('calendar_event_sync')
      .select('id')
      .eq('user_id', userId)
      .eq('google_event_id', gEvent.id)
      .maybeSingle();

    if (existing) {
      results.skipped++;
      continue;
    }

    const localEvent = formatEventFromGoogle(gEvent, userId);
    const { data: created, error } = await supabase
      .from('calendar_events')
      .insert(localEvent)
      .select()
      .single();

    if (error) {
      results.errors++;
      continue;
    }

    await supabase.from('calendar_event_sync').insert({
      user_id: userId,
      local_event_id: created.id,
      google_event_id: gEvent.id,
      sync_direction: 'from_google'
    });
    results.imported++;
  }

  return results;
}

serve(handler);
