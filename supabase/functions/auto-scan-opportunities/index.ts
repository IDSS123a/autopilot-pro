import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all users with profiles that have target roles configured
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, target_roles, target_industries, bio, target_locations')
      .not('target_roles', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return new Response(JSON.stringify({ error: 'Failed to fetch profiles' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Filter profiles that actually have target roles set
    const activeProfiles = (profiles || []).filter(p => 
      p.target_roles && Array.isArray(p.target_roles) && p.target_roles.length > 0
    );

    if (activeProfiles.length === 0) {
      console.log('No users with configured target roles found');
      return new Response(JSON.stringify({ 
        message: 'No users with configured profiles', 
        scanned: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Auto-scanning for ${activeProfiles.length} user(s)`);

    const results: { userId: string; found: number; saved: number }[] = [];

    for (const profile of activeProfiles) {
      try {
        // Determine regions from target_locations or default
        const regions = deriveRegions(profile.target_locations || []);
        
        const targetRole = (profile.target_roles || []).join(', ');
        const industries = (profile.target_industries || []).join(', ');
        const bio = profile.bio || '';

        // Call the existing scan-opportunities function internally
        const scanResponse = await fetch(`${SUPABASE_URL}/functions/v1/scan-opportunities`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            regions,
            userProfile: { targetRole, industries, bio },
            maxResults: 500,
          }),
        });

        if (!scanResponse.ok) {
          console.error(`Scan failed for user ${profile.id}: ${scanResponse.status}`);
          results.push({ userId: profile.id, found: 0, saved: 0 });
          continue;
        }

        const scanData = await scanResponse.json();
        const opportunities = scanData.opportunities || [];

        // Filter high-match opportunities (70%+)
        const highMatch = opportunities.filter((opp: any) => (opp.match_score || 0) >= 70);

        if (highMatch.length === 0) {
          console.log(`No high-match opportunities for user ${profile.id}`);
          results.push({ userId: profile.id, found: opportunities.length, saved: 0 });
          continue;
        }

        // Check for duplicates - get existing opportunities for this user
        const { data: existing } = await supabaseAdmin
          .from('opportunities')
          .select('position_title, company_name')
          .eq('user_id', profile.id)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

        const existingSet = new Set(
          (existing || []).map(e => `${e.position_title}|${e.company_name}`.toLowerCase())
        );

        // Filter out duplicates
        const newOpps = highMatch.filter((opp: any) => {
          const key = `${opp.title}|${opp.company}`.toLowerCase();
          return !existingSet.has(key);
        });

        if (newOpps.length === 0) {
          console.log(`All high-match opportunities already exist for user ${profile.id}`);
          results.push({ userId: profile.id, found: opportunities.length, saved: 0 });
          continue;
        }

        // Insert new opportunities
        const insertRows = newOpps.slice(0, 50).map((opp: any) => {
          let parsedDate: string | null = null;
          if (opp.posted_date) {
            const dateMatch = opp.posted_date.match(/\d{4}-\d{2}-\d{2}/);
            if (dateMatch) parsedDate = dateMatch[0];
          }
          return {
            user_id: profile.id,
            position_title: opp.title || 'Executive Position',
            company_name: opp.company || 'Unknown',
            location: opp.location || null,
            salary_range: opp.salary_range || null,
            match_score: opp.match_score || null,
            status: 'new',
            source: opp.source || 'Auto-Scan',
            posted_date: parsedDate,
            job_description: (opp.description || '').substring(0, 5000),
            job_url: opp.url || null,
            notes: JSON.stringify({
              data_quality: opp.data_quality || 'scraped',
              source_reliability: opp.source_reliability || 'medium',
              verification_status: opp.data_quality === 'verified' ? 'verified' : 'unverified',
              auto_saved: true,
              auto_scan: true,
              saved_at: new Date().toISOString()
            })
          };
        });

        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('opportunities')
          .insert(insertRows)
          .select('id');

        if (insertError) {
          console.error(`Insert error for user ${profile.id}:`, insertError);
          results.push({ userId: profile.id, found: opportunities.length, saved: 0 });
          continue;
        }

        const savedCount = inserted?.length || 0;
        results.push({ userId: profile.id, found: opportunities.length, saved: savedCount });
        console.log(`User ${profile.id}: found ${opportunities.length}, saved ${savedCount} new high-match opportunities`);

        // Send email notification for top opportunities
        if (savedCount > 0) {
          try {
            await fetch(`${SUPABASE_URL}/functions/v1/send-opportunity-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                user_id: profile.id,
                opportunities: newOpps.slice(0, 5).map((opp: any) => ({
                  company_name: opp.company,
                  position_title: opp.title,
                  location: opp.location,
                  match_score: opp.match_score,
                })),
                priority: 'normal',
                is_auto_scan: true,
              }),
            });
          } catch (notifError) {
            console.log('Notification skipped:', notifError);
          }
        }
      } catch (userError) {
        console.error(`Error processing user ${profile.id}:`, userError);
        results.push({ userId: profile.id, found: 0, saved: 0 });
      }
    }

    const totalSaved = results.reduce((sum, r) => sum + r.saved, 0);
    const totalFound = results.reduce((sum, r) => sum + r.found, 0);

    console.log(`Auto-scan complete: ${activeProfiles.length} users, ${totalFound} found, ${totalSaved} saved`);

    return new Response(JSON.stringify({
      message: 'Auto-scan complete',
      users_scanned: activeProfiles.length,
      total_found: totalFound,
      total_saved: totalSaved,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Auto-scan error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Derive region names from target_locations array
function deriveRegions(targetLocations: string[]): string[] {
  if (!targetLocations || targetLocations.length === 0) {
    return ['SEE (Southeast Europe)', 'DACH (Germany, Austria, Switzerland)'];
  }

  const regionMap: Record<string, string> = {
    'germany': 'DACH (Germany, Austria, Switzerland)',
    'austria': 'DACH (Germany, Austria, Switzerland)',
    'switzerland': 'DACH (Germany, Austria, Switzerland)',
    'dach': 'DACH (Germany, Austria, Switzerland)',
    'croatia': 'SEE (Southeast Europe)',
    'serbia': 'SEE (Southeast Europe)',
    'slovenia': 'SEE (Southeast Europe)',
    'bosnia': 'SEE (Southeast Europe)',
    'see': 'SEE (Southeast Europe)',
    'southeast europe': 'SEE (Southeast Europe)',
    'uk': 'UK & Ireland',
    'united kingdom': 'UK & Ireland',
    'ireland': 'UK & Ireland',
    'london': 'UK & Ireland',
    'usa': 'North America',
    'united states': 'North America',
    'canada': 'North America',
    'sweden': 'Nordics',
    'norway': 'Nordics',
    'denmark': 'Nordics',
    'finland': 'Nordics',
    'netherlands': 'Benelux',
    'belgium': 'Benelux',
    'france': 'France',
    'spain': 'Iberia',
    'portugal': 'Iberia',
    'italy': 'Italy',
    'poland': 'Eastern Europe',
    'czech': 'Eastern Europe',
    'hungary': 'Eastern Europe',
    'romania': 'Eastern Europe',
    'dubai': 'Middle East',
    'uae': 'Middle East',
    'saudi': 'Middle East',
    'singapore': 'Southeast Asia',
    'australia': 'Oceania',
    'remote': 'DACH (Germany, Austria, Switzerland)',
  };

  const regions = new Set<string>();
  for (const loc of targetLocations) {
    const lower = loc.toLowerCase().trim();
    const mapped = regionMap[lower];
    if (mapped) regions.add(mapped);
  }

  return regions.size > 0 
    ? Array.from(regions) 
    : ['SEE (Southeast Europe)', 'DACH (Germany, Austria, Switzerland)'];
}
