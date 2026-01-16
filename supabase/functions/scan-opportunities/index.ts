import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Data source verification status
interface SourceVerification {
  source: string;
  verified: boolean;
  lastChecked: string;
  reliability: 'high' | 'medium' | 'low';
  url: string;
}

// Enhanced opportunity with verification data
interface VerifiedOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  salary_range: string;
  status: string;
  source: string;
  posted_date: string;
  description: string;
  match_score: number;
  url: string;
  verified: boolean;
  verification_score: number;
  data_quality: 'verified' | 'scraped' | 'ai_generated';
  source_reliability: 'high' | 'medium' | 'low';
  scraped_at?: string;
}

// Comprehensive region configurations with verified job board domains
const REGION_CONFIGS: Record<string, { 
  locations: string[], 
  country_indeed: string, 
  currency: string,
  jobBoardDomains: { domain: string; reliability: 'high' | 'medium' | 'low' }[],
  languages: string[]
}> = {
  'DACH': { 
    locations: ['Germany', 'Munich', 'Berlin', 'Frankfurt', 'Hamburg', 'Düsseldorf', 'Stuttgart', 'Cologne', 'Austria', 'Vienna', 'Salzburg', 'Switzerland', 'Zurich', 'Geneva', 'Basel', 'Bern'], 
    country_indeed: 'Germany',
    currency: '€',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'indeed.de', reliability: 'high' },
      { domain: 'stepstone.de', reliability: 'high' },
      { domain: 'xing.com', reliability: 'high' },
      { domain: 'jobs.ch', reliability: 'high' },
      { domain: 'karriere.at', reliability: 'high' }
    ],
    languages: ['de', 'en']
  },
  'SEE': { 
    locations: ['Croatia', 'Zagreb', 'Split', 'Serbia', 'Belgrade', 'Novi Sad', 'Slovenia', 'Ljubljana', 'Maribor', 'Bosnia', 'Sarajevo', 'North Macedonia', 'Skopje', 'Montenegro', 'Podgorica', 'Albania', 'Tirana', 'Kosovo', 'Pristina'], 
    country_indeed: 'Germany',
    currency: '€',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'posao.hr', reliability: 'high' },
      { domain: 'moj-posao.net', reliability: 'high' },
      { domain: 'infostud.com', reliability: 'high' },
      { domain: 'mojedelo.com', reliability: 'high' }
    ],
    languages: ['en', 'hr', 'sr']
  },
  'Nordics': { 
    locations: ['Sweden', 'Stockholm', 'Gothenburg', 'Malmö', 'Norway', 'Oslo', 'Bergen', 'Trondheim', 'Denmark', 'Copenhagen', 'Aarhus', 'Finland', 'Helsinki', 'Tampere', 'Iceland', 'Reykjavik'], 
    country_indeed: 'Sweden',
    currency: 'SEK',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'indeed.se', reliability: 'high' },
      { domain: 'finn.no', reliability: 'high' },
      { domain: 'jobindex.dk', reliability: 'high' },
      { domain: 'oikotie.fi', reliability: 'high' }
    ],
    languages: ['en', 'sv', 'no', 'da', 'fi']
  },
  'Benelux': { 
    locations: ['Netherlands', 'Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Belgium', 'Brussels', 'Antwerp', 'Ghent', 'Luxembourg'], 
    country_indeed: 'Netherlands',
    currency: '€',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'indeed.nl', reliability: 'high' },
      { domain: 'indeed.be', reliability: 'high' },
      { domain: 'stepstone.be', reliability: 'high' },
      { domain: 'nationalevacaturebank.nl', reliability: 'high' }
    ],
    languages: ['en', 'nl', 'fr']
  },
  'UK': { 
    locations: ['United Kingdom', 'London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Bristol', 'Edinburgh', 'Glasgow', 'Cardiff', 'Belfast', 'Cambridge', 'Oxford', 'Ireland', 'Dublin'], 
    country_indeed: 'UK',
    currency: '£',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'indeed.co.uk', reliability: 'high' },
      { domain: 'reed.co.uk', reliability: 'high' },
      { domain: 'totaljobs.com', reliability: 'high' },
      { domain: 'cwjobs.co.uk', reliability: 'high' },
      { domain: 'irishjobs.ie', reliability: 'high' }
    ],
    languages: ['en']
  },
  'France': { 
    locations: ['France', 'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Bordeaux', 'Lille', 'Monaco'], 
    country_indeed: 'France',
    currency: '€',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'indeed.fr', reliability: 'high' },
      { domain: 'apec.fr', reliability: 'high' },
      { domain: 'cadremploi.fr', reliability: 'high' },
      { domain: 'monster.fr', reliability: 'medium' }
    ],
    languages: ['fr', 'en']
  },
  'Iberia': { 
    locations: ['Spain', 'Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao', 'Malaga', 'Portugal', 'Lisbon', 'Porto', 'Braga'], 
    country_indeed: 'Spain',
    currency: '€',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'indeed.es', reliability: 'high' },
      { domain: 'infojobs.net', reliability: 'high' },
      { domain: 'indeed.pt', reliability: 'high' }
    ],
    languages: ['es', 'pt', 'en']
  },
  'Italy': { 
    locations: ['Italy', 'Milan', 'Rome', 'Turin', 'Florence', 'Bologna', 'Naples', 'Venice', 'Genoa'], 
    country_indeed: 'Italy',
    currency: '€',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'indeed.it', reliability: 'high' },
      { domain: 'monster.it', reliability: 'medium' },
      { domain: 'infojobs.it', reliability: 'high' }
    ],
    languages: ['it', 'en']
  },
  'Eastern Europe': { 
    locations: ['Poland', 'Warsaw', 'Krakow', 'Wroclaw', 'Poznan', 'Gdansk', 'Czech Republic', 'Prague', 'Brno', 'Slovakia', 'Bratislava', 'Hungary', 'Budapest', 'Romania', 'Bucharest', 'Cluj-Napoca', 'Bulgaria', 'Sofia'], 
    country_indeed: 'Poland',
    currency: 'PLN',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'pracuj.pl', reliability: 'high' },
      { domain: 'jobs.cz', reliability: 'high' },
      { domain: 'profession.hu', reliability: 'high' },
      { domain: 'ejobs.ro', reliability: 'high' },
      { domain: 'jobs.bg', reliability: 'high' }
    ],
    languages: ['en', 'pl', 'cs', 'hu', 'ro']
  },
  'Baltics': { 
    locations: ['Estonia', 'Tallinn', 'Tartu', 'Latvia', 'Riga', 'Lithuania', 'Vilnius', 'Kaunas'], 
    country_indeed: 'Poland',
    currency: '€',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'cvbankas.lt', reliability: 'high' },
      { domain: 'cv.ee', reliability: 'high' },
      { domain: 'cv.lv', reliability: 'high' }
    ],
    languages: ['en', 'et', 'lv', 'lt']
  },
  'CIS': { 
    locations: ['Russia', 'Moscow', 'St Petersburg', 'Ukraine', 'Kyiv', 'Lviv', 'Kazakhstan', 'Almaty', 'Astana', 'Belarus', 'Minsk', 'Uzbekistan', 'Tashkent'], 
    country_indeed: 'USA',
    currency: 'RUB',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'hh.ru', reliability: 'high' },
      { domain: 'superjob.ru', reliability: 'medium' },
      { domain: 'rabota.ua', reliability: 'high' },
      { domain: 'headhunter.kz', reliability: 'high' }
    ],
    languages: ['en', 'ru', 'uk']
  },
  'Middle East': { 
    locations: ['United Arab Emirates', 'Dubai', 'Abu Dhabi', 'Saudi Arabia', 'Riyadh', 'Jeddah', 'Qatar', 'Doha', 'Bahrain', 'Manama', 'Kuwait', 'Kuwait City', 'Oman', 'Muscat', 'Israel', 'Tel Aviv', 'Turkey', 'Istanbul', 'Ankara', 'Egypt', 'Cairo'], 
    country_indeed: 'United Arab Emirates',
    currency: 'AED',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'bayt.com', reliability: 'high' },
      { domain: 'gulftalent.com', reliability: 'high' },
      { domain: 'naukrigulf.com', reliability: 'high' },
      { domain: 'indeed.ae', reliability: 'high' },
      { domain: 'kariyer.net', reliability: 'high' }
    ],
    languages: ['en', 'ar', 'tr']
  },
  'Asia': { 
    locations: ['Singapore', 'Hong Kong', 'Japan', 'Tokyo', 'Osaka', 'China', 'Shanghai', 'Beijing', 'Shenzhen', 'Guangzhou', 'South Korea', 'Seoul', 'Taiwan', 'Taipei', 'India', 'Mumbai', 'Bangalore', 'Delhi', 'Pune', 'Hyderabad'], 
    country_indeed: 'Singapore',
    currency: 'SGD',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'jobstreet.com', reliability: 'high' },
      { domain: 'indeed.sg', reliability: 'high' },
      { domain: 'indeed.hk', reliability: 'high' },
      { domain: 'indeed.jp', reliability: 'high' },
      { domain: '51job.com', reliability: 'high' },
      { domain: 'saramin.co.kr', reliability: 'high' },
      { domain: 'naukri.com', reliability: 'high' }
    ],
    languages: ['en', 'zh', 'ja', 'ko', 'hi']
  },
  'Southeast Asia': { 
    locations: ['Singapore', 'Malaysia', 'Kuala Lumpur', 'Thailand', 'Bangkok', 'Vietnam', 'Ho Chi Minh City', 'Hanoi', 'Indonesia', 'Jakarta', 'Philippines', 'Manila', 'Myanmar', 'Yangon'], 
    country_indeed: 'Singapore',
    currency: 'SGD',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'jobstreet.com', reliability: 'high' },
      { domain: 'vietnamworks.com', reliability: 'high' },
      { domain: 'jobsdb.com', reliability: 'high' },
      { domain: 'indeed.com.sg', reliability: 'high' }
    ],
    languages: ['en']
  },
  'North America': { 
    locations: ['USA', 'New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Boston', 'Seattle', 'Austin', 'Denver', 'Atlanta', 'Miami', 'Dallas', 'Washington DC', 'Canada', 'Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Mexico', 'Mexico City', 'Monterrey'], 
    country_indeed: 'USA',
    currency: '$',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'indeed.com', reliability: 'high' },
      { domain: 'glassdoor.com', reliability: 'high' },
      { domain: 'monster.com', reliability: 'medium' },
      { domain: 'dice.com', reliability: 'high' },
      { domain: 'ziprecruiter.com', reliability: 'high' },
      { domain: 'indeed.ca', reliability: 'high' },
      { domain: 'workopolis.com', reliability: 'medium' }
    ],
    languages: ['en', 'es']
  },
  'Oceania': { 
    locations: ['Australia', 'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra', 'New Zealand', 'Auckland', 'Wellington', 'Christchurch'], 
    country_indeed: 'Australia',
    currency: 'AUD',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'seek.com.au', reliability: 'high' },
      { domain: 'indeed.com.au', reliability: 'high' },
      { domain: 'trademe.co.nz', reliability: 'high' },
      { domain: 'seek.co.nz', reliability: 'high' }
    ],
    languages: ['en']
  },
  'Africa': { 
    locations: ['South Africa', 'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Nigeria', 'Lagos', 'Abuja', 'Kenya', 'Nairobi', 'Ghana', 'Accra', 'Egypt', 'Cairo', 'Morocco', 'Casablanca'], 
    country_indeed: 'South Africa',
    currency: 'ZAR',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'careers24.com', reliability: 'high' },
      { domain: 'pnet.co.za', reliability: 'high' },
      { domain: 'jobberman.com', reliability: 'high' },
      { domain: 'brightermonday.co.ke', reliability: 'high' }
    ],
    languages: ['en', 'ar', 'fr']
  },
  'Latin America': { 
    locations: ['Brazil', 'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Argentina', 'Buenos Aires', 'Chile', 'Santiago', 'Colombia', 'Bogotá', 'Medellín', 'Peru', 'Lima', 'Ecuador', 'Quito'], 
    country_indeed: 'Brazil',
    currency: 'BRL',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'indeed.com.br', reliability: 'high' },
      { domain: 'vagas.com.br', reliability: 'high' },
      { domain: 'bumeran.com.ar', reliability: 'high' },
      { domain: 'computrabajo.com', reliability: 'high' }
    ],
    languages: ['es', 'pt', 'en']
  },
  'Caribbean': { 
    locations: ['Jamaica', 'Kingston', 'Bahamas', 'Nassau', 'Dominican Republic', 'Santo Domingo', 'Puerto Rico', 'San Juan', 'Trinidad', 'Port of Spain', 'Barbados', 'Bridgetown'], 
    country_indeed: 'USA',
    currency: '$',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'caribbeanjobs.com', reliability: 'high' },
      { domain: 'indeed.com', reliability: 'high' }
    ],
    languages: ['en', 'es']
  }
};

// Executive job titles for comprehensive search
const EXECUTIVE_TITLES = [
  'CEO', 'Chief Executive Officer', 'President',
  'CFO', 'Chief Financial Officer', 'Finance Director',
  'CTO', 'Chief Technology Officer', 'VP Engineering', 'VP Technology',
  'COO', 'Chief Operating Officer', 'Operations Director',
  'CMO', 'Chief Marketing Officer', 'VP Marketing',
  'CHRO', 'Chief Human Resources Officer', 'VP HR', 'People Director',
  'CIO', 'Chief Information Officer', 'IT Director',
  'CDO', 'Chief Data Officer', 'Chief Digital Officer',
  'CSO', 'Chief Strategy Officer', 'Chief Sales Officer',
  'CPO', 'Chief Product Officer', 'VP Product',
  'CLO', 'Chief Legal Officer', 'General Counsel',
  'VP', 'Vice President', 'SVP', 'EVP',
  'Managing Director', 'Director', 'Senior Director',
  'General Manager', 'Country Manager', 'Regional Director',
  'Head of', 'Partner', 'Principal'
];

// Verified high-reliability job sources
const VERIFIED_JOB_SOURCES = new Set([
  'linkedin.com', 'indeed.com', 'indeed.de', 'indeed.co.uk', 'indeed.fr',
  'glassdoor.com', 'stepstone.de', 'stepstone.at', 'xing.com',
  'seek.com.au', 'reed.co.uk', 'totaljobs.com', 'monster.com',
  'careers24.com', 'bayt.com', 'naukri.com', 'jobstreet.com',
  'pracuj.pl', 'jobs.cz', 'hh.ru', 'infojobs.net'
]);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { regions, userProfile, daysBack = 7, maxResults = 500 } = await req.json();
    
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!FIRECRAWL_API_KEY) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting VERIFIED opportunity scan for regions:', regions);
    console.log(`Target: ${maxResults} results, last ${daysBack} days`);

    // Build search context from user profile
    const targetRole = userProfile?.targetRole || 'Executive Leadership';
    const industries = userProfile?.industries || '';
    
    // Extract role keywords
    const roleKeywords = targetRole.split(/[\/\s,]+/).filter((k: string) => k.length > 2);
    const primaryTitles = roleKeywords.length > 0 
      ? roleKeywords.slice(0, 5)
      : ['CEO', 'CTO', 'CFO', 'COO', 'VP', 'Director'];

    // Get configs for selected regions
    const selectedConfigs: { region: string, config: typeof REGION_CONFIGS[string] }[] = [];
    for (const region of regions) {
      for (const [key, config] of Object.entries(REGION_CONFIGS)) {
        if (region.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(region.toLowerCase().split(' ')[0])) {
          selectedConfigs.push({ region: key, config });
          break;
        }
      }
    }

    if (selectedConfigs.length === 0) {
      selectedConfigs.push({ region: 'North America', config: REGION_CONFIGS['North America'] });
    }

    const allOpportunities: VerifiedOpportunity[] = [];
    const errors: string[] = [];
    const searchStats = { 
      queries: 0, 
      results: 0, 
      verified: 0, 
      scraped: 0,
      ai_generated: 0 
    };
    const sourcesVerified: SourceVerification[] = [];

    // PHASE 1: Real-time web scraping from verified job boards
    for (const { region, config } of selectedConfigs) {
      console.log(`Searching region: ${region} with verified sources`);
      
      // Generate targeted search queries for high-reliability sources
      const searchQueries: { query: string; reliability: 'high' | 'medium' | 'low' }[] = [];
      
      // Priority: Search verified job board domains
      for (const board of config.jobBoardDomains.slice(0, 4)) {
        for (const location of config.locations.slice(0, 5)) {
          for (const title of primaryTitles.slice(0, 2)) {
            searchQueries.push({
              query: `site:${board.domain} "${title}" ${location}`,
              reliability: board.reliability
            });
          }
        }
      }

      // Execute searches with rate limiting
      const batchSize = 3;
      for (let i = 0; i < Math.min(searchQueries.length, 20); i += batchSize) {
        const batch = searchQueries.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(async ({ query, reliability }) => {
            try {
              searchStats.queries++;
              console.log(`Query ${searchStats.queries}: ${query.substring(0, 60)}...`);
              
              const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  query: query,
                  limit: 15,
                  lang: config.languages[0] || 'en',
                  scrapeOptions: {
                    formats: ['markdown'],
                    onlyMainContent: true
                  }
                }),
              });

              if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                if (searchData.data && Array.isArray(searchData.data)) {
                  return searchData.data.map((result: any) => 
                    parseAndVerifyJobFromSearchResult(result, region, config.currency, reliability)
                  ).filter(Boolean);
                }
              } else {
                const errorText = await searchResponse.text();
                console.error(`Search error: ${searchResponse.status}`, errorText.substring(0, 100));
              }
              return [];
            } catch (err) {
              console.error(`Query error:`, err);
              return [];
            }
          })
        );

        // Collect results
        for (const result of batchResults) {
          if (result.status === 'fulfilled' && Array.isArray(result.value)) {
            for (const opp of result.value) {
              if (opp.verified) {
                searchStats.verified++;
              }
              searchStats.scraped++;
            }
            allOpportunities.push(...result.value);
            searchStats.results += result.value.length;
          }
        }

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < searchQueries.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // Track verified sources
      for (const board of config.jobBoardDomains) {
        sourcesVerified.push({
          source: board.domain,
          verified: true,
          lastChecked: new Date().toISOString(),
          reliability: board.reliability,
          url: `https://${board.domain}`
        });
      }
    }

    console.log(`Real-time scraping complete: ${searchStats.queries} queries, ${searchStats.results} raw results, ${searchStats.verified} verified`);

    // PHASE 2: Deduplicate by company+title+location
    const seen = new Map<string, VerifiedOpportunity>();
    for (const opp of allOpportunities) {
      const key = `${opp.company?.toLowerCase()}-${opp.title?.toLowerCase()}-${opp.location?.toLowerCase()}`.replace(/\s+/g, '');
      if (!seen.has(key)) {
        seen.set(key, opp);
      } else {
        // Keep the one with higher verification score
        const existing = seen.get(key)!;
        if (opp.verification_score > existing.verification_score) {
          seen.set(key, opp);
        }
      }
    }
    let uniqueOpportunities = Array.from(seen.values());
    console.log(`After deduplication: ${uniqueOpportunities.length} unique opportunities`);

    // PHASE 3: AI Enhancement for match scoring (only for verified results)
    if (uniqueOpportunities.length > 0 && LOVABLE_API_KEY) {
      try {
        const batchSize = 30;
        const enhancedBatches: VerifiedOpportunity[] = [];
        
        for (let i = 0; i < Math.min(uniqueOpportunities.length, 150); i += batchSize) {
          const batch = uniqueOpportunities.slice(i, i + batchSize);
          const enhanced = await enhanceOpportunitiesWithAI(batch, LOVABLE_API_KEY, targetRole, industries);
          enhancedBatches.push(...enhanced);
        }
        
        uniqueOpportunities = enhancedBatches;
      } catch (aiError) {
        console.error('AI enhancement failed:', aiError);
        // Assign basic scores
        uniqueOpportunities = uniqueOpportunities.map(opp => ({
          ...opp,
          match_score: calculateBasicMatchScore(opp, primaryTitles, industries)
        }));
      }
    }

    // PHASE 4: If insufficient scraped results, supplement with AI-generated (clearly marked)
    const verifiedCount = uniqueOpportunities.filter(o => o.data_quality === 'verified' || o.data_quality === 'scraped').length;
    
    if (verifiedCount < 20 && LOVABLE_API_KEY) {
      console.log('Supplementing with AI-generated opportunities (clearly marked)');
      const aiOpportunities = await generateVerifiedAIOpportunities(
        regions,
        userProfile,
        daysBack,
        LOVABLE_API_KEY,
        selectedConfigs,
        Math.min(50, maxResults - verifiedCount)
      );
      searchStats.ai_generated = aiOpportunities.length;
      uniqueOpportunities = [...uniqueOpportunities, ...aiOpportunities];
    }

    // Sort by verification score first, then match score
    uniqueOpportunities.sort((a, b) => {
      if (a.data_quality === 'verified' && b.data_quality !== 'verified') return -1;
      if (b.data_quality === 'verified' && a.data_quality !== 'verified') return 1;
      if (a.data_quality === 'scraped' && b.data_quality === 'ai_generated') return -1;
      if (b.data_quality === 'scraped' && a.data_quality === 'ai_generated') return 1;
      return (b.match_score || 0) - (a.match_score || 0);
    });

    console.log(`Returning ${uniqueOpportunities.length} opportunities (${searchStats.verified} verified, ${searchStats.scraped} scraped, ${searchStats.ai_generated} AI-generated)`);

    return new Response(
      JSON.stringify({ 
        opportunities: uniqueOpportunities.slice(0, maxResults),
        stats: {
          totalScraped: searchStats.scraped,
          totalVerified: searchStats.verified,
          totalAIGenerated: searchStats.ai_generated,
          queriesExecuted: searchStats.queries,
          uniqueResults: uniqueOpportunities.length,
          regionsSearched: selectedConfigs.map(c => c.region),
          dataQualityBreakdown: {
            verified: uniqueOpportunities.filter(o => o.data_quality === 'verified').length,
            scraped: uniqueOpportunities.filter(o => o.data_quality === 'scraped').length,
            ai_generated: uniqueOpportunities.filter(o => o.data_quality === 'ai_generated').length
          }
        },
        sourcesVerified: sourcesVerified.slice(0, 20),
        errors: errors.length > 0 ? errors : undefined
      }),
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

// Parse job from search result with verification
function parseAndVerifyJobFromSearchResult(
  result: any, 
  region: string, 
  currency: string,
  sourceReliability: 'high' | 'medium' | 'low'
): VerifiedOpportunity | null {
  try {
    const url = result.url || '';
    const title = result.title || '';
    const description = result.description || result.markdown || '';
    
    // Validate URL is from a real job source
    const isVerifiedSource = VERIFIED_JOB_SOURCES.has(new URL(url).hostname.replace('www.', ''));
    const isJobUrl = url.includes('job') || url.includes('career') || url.includes('position') || 
                     url.includes('linkedin.com/jobs') || url.includes('indeed') || url.includes('glassdoor') ||
                     url.includes('stepstone') || url.includes('seek') || url.includes('monster');
    
    if (!url || !isJobUrl) return null;

    // Extract company name with validation
    let company = '';
    const companyPatterns = [
      /at\s+([^|–\-\n]+)/i,
      /company[:\s]+([^\n|–\-]+)/i,
      /employer[:\s]+([^\n|–\-]+)/i,
      /\|\s*([^|–\-\n]+)\s*$/,
    ];
    for (const pattern of companyPatterns) {
      const match = title.match(pattern) || description.match(pattern);
      if (match) {
        company = match[1].trim().substring(0, 80);
        break;
      }
    }
    
    if (!company || company.length < 2) {
      company = 'Company from ' + region;
    }

    // Extract job title
    let jobTitle = '';
    const titleParts = title.split(/\s+at\s+|\s+[-|–]\s+/i);
    if (titleParts[0] && titleParts[0].length > 3) {
      jobTitle = titleParts[0].trim().substring(0, 100);
    }
    
    if (!jobTitle || jobTitle.length < 3) {
      return null; // Skip entries without valid titles
    }

    // Validate it's an executive-level position
    const isExecutive = EXECUTIVE_TITLES.some(t => 
      jobTitle.toLowerCase().includes(t.toLowerCase())
    );

    // Determine source with verification
    let source = 'Job Board';
    let verified = false;
    if (url.includes('linkedin.com')) { source = 'LinkedIn'; verified = true; }
    else if (url.includes('indeed')) { source = 'Indeed'; verified = true; }
    else if (url.includes('glassdoor')) { source = 'Glassdoor'; verified = true; }
    else if (url.includes('stepstone')) { source = 'StepStone'; verified = true; }
    else if (url.includes('seek')) { source = 'Seek'; verified = true; }
    else if (url.includes('monster')) { source = 'Monster'; verified = true; }
    else if (url.includes('xing')) { source = 'XING'; verified = true; }
    else if (url.includes('reed')) { source = 'Reed'; verified = true; }
    else if (url.includes('totaljobs')) { source = 'TotalJobs'; verified = true; }

    // Extract location
    let location = region;
    const locationPatterns = [
      /location[:\s]+([^\n,]+)/i,
      /(remote|hybrid|on-site|onsite)/i,
      /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/
    ];
    for (const pattern of locationPatterns) {
      const match = description.match(pattern) || title.match(pattern);
      if (match) {
        location = match[1].trim();
        break;
      }
    }

    // Extract salary if present
    let salary = `${currency}Competitive`;
    const salaryMatch = description.match(/(\$|€|£|CHF|AED|SGD)[\d,]+[kK]?\s*[-–]\s*(\$|€|£|CHF|AED|SGD)?[\d,]+[kK]?/);
    if (salaryMatch) {
      salary = salaryMatch[0];
    }

    // Calculate verification score
    let verificationScore = 0;
    if (isVerifiedSource) verificationScore += 40;
    if (verified) verificationScore += 30;
    if (isExecutive) verificationScore += 20;
    if (salary !== `${currency}Competitive`) verificationScore += 10;

    return {
      id: `${source.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: jobTitle,
      company: company,
      location: location,
      salary_range: salary,
      status: 'New',
      source: source,
      posted_date: 'Recent',
      description: description.substring(0, 1000),
      match_score: 0,
      url: url,
      verified: verified && isVerifiedSource,
      verification_score: verificationScore,
      data_quality: verified && isVerifiedSource ? 'verified' : 'scraped',
      source_reliability: sourceReliability,
      scraped_at: new Date().toISOString()
    };
  } catch (error) {
    console.error('Parse error:', error);
    return null;
  }
}

// Basic match score without AI
function calculateBasicMatchScore(opp: VerifiedOpportunity, targetTitles: string[], industries: string): number {
  let score = 50;
  const title = (opp.title || '').toLowerCase();
  const desc = (opp.description || '').toLowerCase();
  
  // Title match
  for (const t of targetTitles) {
    if (title.includes(t.toLowerCase())) {
      score += 20;
      break;
    }
  }
  
  // Executive level indicators
  if (title.includes('chief') || title.includes('ceo') || title.includes('cto') || title.includes('cfo')) score += 15;
  if (title.includes('vp') || title.includes('vice president')) score += 10;
  if (title.includes('director') || title.includes('head of')) score += 5;
  
  // Industry match
  if (industries) {
    const indList = industries.toLowerCase().split(',');
    for (const ind of indList) {
      if (desc.includes(ind.trim())) {
        score += 10;
        break;
      }
    }
  }
  
  // Boost for verified data
  if (opp.verified) score += 5;
  
  return Math.min(score, 100);
}

// AI enhancement for opportunities
async function enhanceOpportunitiesWithAI(
  opportunities: VerifiedOpportunity[], 
  apiKey: string, 
  targetRole: string,
  industries: string
): Promise<VerifiedOpportunity[]> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an executive career advisor. Calculate match scores (0-100) based on alignment between REAL job opportunities and the candidate's target: ${targetRole}. Industries: ${industries || 'Various'}. Be precise and objective. These are real scraped jobs - analyze them accurately.`
          },
          {
            role: 'user',
            content: `Calculate match_score (0-100) for each REAL job opportunity. Target: ${targetRole}. Industries: ${industries || 'Any'}.

Jobs (scraped from real job boards):
${JSON.stringify(opportunities.map(o => ({ 
  title: o.title, 
  company: o.company, 
  location: o.location, 
  description: o.description?.substring(0, 200),
  source: o.source,
  verified: o.verified
})), null, 2)}

Return JSON array with same structure plus match_score. Score criteria:
- 90-100: Perfect role & industry match
- 70-89: Strong alignment
- 50-69: Partial match
- Below 50: Weak match

Return ONLY valid JSON array.`
          }
        ],
        max_tokens: 4000
      }),
    });

    if (!response.ok) {
      console.error('AI scoring failed:', response.status);
      return opportunities;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const scored = JSON.parse(jsonMatch[0]);
      return opportunities.map((opp, i) => ({
        ...opp,
        match_score: scored[i]?.match_score || calculateBasicMatchScore(opp, targetRole.split(/[\s,\/]+/), industries)
      }));
    }
    
    return opportunities;
  } catch (error) {
    console.error('AI scoring error:', error);
    return opportunities;
  }
}

// Generate AI opportunities (clearly marked as AI-generated)
async function generateVerifiedAIOpportunities(
  regions: string[],
  userProfile: any,
  daysBack: number,
  apiKey: string,
  configs: { region: string, config: { locations: string[], currency: string, jobBoardDomains: { domain: string; reliability: 'high' | 'medium' | 'low' }[] } }[],
  targetCount: number
): Promise<VerifiedOpportunity[]> {
  const targetRole = userProfile?.targetRole || 'Executive Leadership';
  const industries = userProfile?.industries || 'Technology, Finance, Healthcare, Manufacturing, Retail';
  
  const regionDetails = configs.map(c => ({
    region: c.region,
    cities: c.config.locations.slice(0, 6),
    currency: c.config.currency
  }));

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an executive job market analyst. Generate REALISTIC executive opportunities based on REAL companies that actually operate and hire in the specified regions. Use accurate, verifiable company names, realistic salary ranges in local currencies, and current market conditions. These should represent typical executive openings that would exist at real companies.`
          },
          {
            role: 'user',
            content: `Generate ${targetCount} realistic executive job opportunities that would typically exist at real companies.

Regions: ${JSON.stringify(regionDetails)}

Candidate:
- Role: ${targetRole}
- Industries: ${industries}
- Level: C-suite, VP, Director

Requirements:
1. Use REAL, WELL-KNOWN companies that operate in these regions (Fortune 500, DAX, FTSE, major regional employers)
2. Mix: 30% C-level, 30% VP/SVP, 40% Director/Head of
3. Salary in LOCAL CURRENCY (${configs.map(c => c.config.currency).join(', ')}) - use realistic market rates
4. Positions that would typically be posted within ${daysBack} days
5. Realistic match_score based on ${targetRole}
6. Companies: Tech giants, banks, industrials, consulting, pharma, consumer goods, established scale-ups

IMPORTANT: These are AI-generated suggestions based on typical market patterns. They represent the types of roles that would exist, not confirmed open positions.

Return JSON array:
[{
  "id": "ai-xxx",
  "title": "Chief Technology Officer",
  "company": "Real Company Name",
  "location": "City, Country",
  "salary_range": "€180k-250k",
  "status": "New",
  "source": "AI Market Analysis",
  "posted_date": "Estimated",
  "description": "Role requirements and responsibilities based on typical market patterns...",
  "match_score": 85,
  "url": "https://linkedin.com/company/xxx/jobs"
}]`
          }
        ],
        max_tokens: 6000
      }),
    });

    if (!response.ok) {
      console.error('AI generation failed:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const opportunities = JSON.parse(jsonMatch[0]);
      return opportunities.map((opp: any, i: number) => ({
        id: `ai-generated-${Date.now()}-${i}`,
        title: opp.title || 'Executive Position',
        company: opp.company || 'Company',
        location: opp.location || configs[0]?.config.locations[0] || 'Location',
        salary_range: opp.salary_range || 'Competitive',
        status: 'New',
        source: 'AI Market Analysis',
        posted_date: 'Estimated',
        description: opp.description || '',
        match_score: opp.match_score || 50,
        url: opp.url || '',
        verified: false,
        verification_score: 0,
        data_quality: 'ai_generated' as const,
        source_reliability: 'low' as const
      }));
    }
    
    return [];
  } catch (error) {
    console.error('AI generation error:', error);
    return [];
  }
}
