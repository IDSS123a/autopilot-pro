import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive region configurations with detailed locations
const REGION_CONFIGS: Record<string, { 
  locations: string[], 
  country_indeed: string, 
  currency: string,
  jobBoardDomains: string[],
  languages: string[]
}> = {
  'DACH': { 
    locations: ['Germany', 'Munich', 'Berlin', 'Frankfurt', 'Hamburg', 'Düsseldorf', 'Stuttgart', 'Cologne', 'Austria', 'Vienna', 'Salzburg', 'Switzerland', 'Zurich', 'Geneva', 'Basel', 'Bern'], 
    country_indeed: 'Germany',
    currency: '€',
    jobBoardDomains: ['linkedin.com', 'indeed.de', 'stepstone.de', 'xing.com', 'jobs.ch', 'karriere.at'],
    languages: ['de', 'en']
  },
  'SEE': { 
    locations: ['Croatia', 'Zagreb', 'Split', 'Serbia', 'Belgrade', 'Novi Sad', 'Slovenia', 'Ljubljana', 'Maribor', 'Bosnia', 'Sarajevo', 'North Macedonia', 'Skopje', 'Montenegro', 'Podgorica', 'Albania', 'Tirana', 'Kosovo', 'Pristina'], 
    country_indeed: 'Germany',
    currency: '€',
    jobBoardDomains: ['linkedin.com', 'posao.hr', 'moj-posao.net', 'infostud.com', 'mojedelo.com'],
    languages: ['en', 'hr', 'sr']
  },
  'Nordics': { 
    locations: ['Sweden', 'Stockholm', 'Gothenburg', 'Malmö', 'Norway', 'Oslo', 'Bergen', 'Trondheim', 'Denmark', 'Copenhagen', 'Aarhus', 'Finland', 'Helsinki', 'Tampere', 'Iceland', 'Reykjavik'], 
    country_indeed: 'Sweden',
    currency: 'SEK',
    jobBoardDomains: ['linkedin.com', 'indeed.se', 'finn.no', 'jobindex.dk', 'oikotie.fi'],
    languages: ['en', 'sv', 'no', 'da', 'fi']
  },
  'Benelux': { 
    locations: ['Netherlands', 'Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven', 'Belgium', 'Brussels', 'Antwerp', 'Ghent', 'Luxembourg'], 
    country_indeed: 'Netherlands',
    currency: '€',
    jobBoardDomains: ['linkedin.com', 'indeed.nl', 'indeed.be', 'stepstone.be', 'nationalevacaturebank.nl'],
    languages: ['en', 'nl', 'fr']
  },
  'UK': { 
    locations: ['United Kingdom', 'London', 'Manchester', 'Birmingham', 'Leeds', 'Liverpool', 'Bristol', 'Edinburgh', 'Glasgow', 'Cardiff', 'Belfast', 'Cambridge', 'Oxford', 'Ireland', 'Dublin'], 
    country_indeed: 'UK',
    currency: '£',
    jobBoardDomains: ['linkedin.com', 'indeed.co.uk', 'reed.co.uk', 'totaljobs.com', 'cwjobs.co.uk', 'irishjobs.ie'],
    languages: ['en']
  },
  'France': { 
    locations: ['France', 'Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Nantes', 'Strasbourg', 'Bordeaux', 'Lille', 'Monaco'], 
    country_indeed: 'France',
    currency: '€',
    jobBoardDomains: ['linkedin.com', 'indeed.fr', 'apec.fr', 'cadremploi.fr', 'monster.fr'],
    languages: ['fr', 'en']
  },
  'Iberia': { 
    locations: ['Spain', 'Madrid', 'Barcelona', 'Valencia', 'Seville', 'Bilbao', 'Malaga', 'Portugal', 'Lisbon', 'Porto', 'Braga'], 
    country_indeed: 'Spain',
    currency: '€',
    jobBoardDomains: ['linkedin.com', 'indeed.es', 'infojobs.net', 'indeed.pt', 'sapo.pt/emprego'],
    languages: ['es', 'pt', 'en']
  },
  'Italy': { 
    locations: ['Italy', 'Milan', 'Rome', 'Turin', 'Florence', 'Bologna', 'Naples', 'Venice', 'Genoa'], 
    country_indeed: 'Italy',
    currency: '€',
    jobBoardDomains: ['linkedin.com', 'indeed.it', 'monster.it', 'infojobs.it', 'subito.it'],
    languages: ['it', 'en']
  },
  'Eastern Europe': { 
    locations: ['Poland', 'Warsaw', 'Krakow', 'Wroclaw', 'Poznan', 'Gdansk', 'Czech Republic', 'Prague', 'Brno', 'Slovakia', 'Bratislava', 'Hungary', 'Budapest', 'Romania', 'Bucharest', 'Cluj-Napoca', 'Bulgaria', 'Sofia'], 
    country_indeed: 'Poland',
    currency: 'PLN',
    jobBoardDomains: ['linkedin.com', 'pracuj.pl', 'jobs.cz', 'profession.hu', 'ejobs.ro', 'jobs.bg'],
    languages: ['en', 'pl', 'cs', 'hu', 'ro']
  },
  'Baltics': { 
    locations: ['Estonia', 'Tallinn', 'Tartu', 'Latvia', 'Riga', 'Lithuania', 'Vilnius', 'Kaunas'], 
    country_indeed: 'Poland',
    currency: '€',
    jobBoardDomains: ['linkedin.com', 'cvbankas.lt', 'cv.ee', 'cv.lv'],
    languages: ['en', 'et', 'lv', 'lt']
  },
  'CIS': { 
    locations: ['Russia', 'Moscow', 'St Petersburg', 'Ukraine', 'Kyiv', 'Lviv', 'Kazakhstan', 'Almaty', 'Astana', 'Belarus', 'Minsk', 'Uzbekistan', 'Tashkent'], 
    country_indeed: 'USA',
    currency: 'RUB',
    jobBoardDomains: ['linkedin.com', 'hh.ru', 'superjob.ru', 'rabota.ua', 'headhunter.kz'],
    languages: ['en', 'ru', 'uk']
  },
  'Middle East': { 
    locations: ['United Arab Emirates', 'Dubai', 'Abu Dhabi', 'Saudi Arabia', 'Riyadh', 'Jeddah', 'Qatar', 'Doha', 'Bahrain', 'Manama', 'Kuwait', 'Kuwait City', 'Oman', 'Muscat', 'Israel', 'Tel Aviv', 'Turkey', 'Istanbul', 'Ankara', 'Egypt', 'Cairo'], 
    country_indeed: 'United Arab Emirates',
    currency: 'AED',
    jobBoardDomains: ['linkedin.com', 'bayt.com', 'gulftalent.com', 'naukrigulf.com', 'indeed.ae', 'kariyer.net'],
    languages: ['en', 'ar', 'tr']
  },
  'Asia': { 
    locations: ['Singapore', 'Hong Kong', 'Japan', 'Tokyo', 'Osaka', 'China', 'Shanghai', 'Beijing', 'Shenzhen', 'Guangzhou', 'South Korea', 'Seoul', 'Taiwan', 'Taipei', 'India', 'Mumbai', 'Bangalore', 'Delhi', 'Pune', 'Hyderabad'], 
    country_indeed: 'Singapore',
    currency: 'SGD',
    jobBoardDomains: ['linkedin.com', 'jobstreet.com', 'indeed.sg', 'indeed.hk', 'indeed.jp', '51job.com', 'saramin.co.kr', 'naukri.com'],
    languages: ['en', 'zh', 'ja', 'ko', 'hi']
  },
  'Southeast Asia': { 
    locations: ['Singapore', 'Malaysia', 'Kuala Lumpur', 'Thailand', 'Bangkok', 'Vietnam', 'Ho Chi Minh City', 'Hanoi', 'Indonesia', 'Jakarta', 'Philippines', 'Manila', 'Myanmar', 'Yangon'], 
    country_indeed: 'Singapore',
    currency: 'SGD',
    jobBoardDomains: ['linkedin.com', 'jobstreet.com', 'vietnamworks.com', 'jobsdb.com', 'indeed.com.sg'],
    languages: ['en']
  },
  'North America': { 
    locations: ['USA', 'New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Boston', 'Seattle', 'Austin', 'Denver', 'Atlanta', 'Miami', 'Dallas', 'Washington DC', 'Canada', 'Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Mexico', 'Mexico City', 'Monterrey'], 
    country_indeed: 'USA',
    currency: '$',
    jobBoardDomains: ['linkedin.com', 'indeed.com', 'glassdoor.com', 'monster.com', 'dice.com', 'ziprecruiter.com', 'indeed.ca', 'workopolis.com'],
    languages: ['en', 'es']
  },
  'Oceania': { 
    locations: ['Australia', 'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Canberra', 'New Zealand', 'Auckland', 'Wellington', 'Christchurch'], 
    country_indeed: 'Australia',
    currency: 'AUD',
    jobBoardDomains: ['linkedin.com', 'seek.com.au', 'indeed.com.au', 'trademe.co.nz', 'seek.co.nz'],
    languages: ['en']
  },
  'Africa': { 
    locations: ['South Africa', 'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Nigeria', 'Lagos', 'Abuja', 'Kenya', 'Nairobi', 'Ghana', 'Accra', 'Egypt', 'Cairo', 'Morocco', 'Casablanca'], 
    country_indeed: 'South Africa',
    currency: 'ZAR',
    jobBoardDomains: ['linkedin.com', 'careers24.com', 'pnet.co.za', 'jobberman.com', 'brightermonday.co.ke'],
    languages: ['en', 'ar', 'fr']
  },
  'Latin America': { 
    locations: ['Brazil', 'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Argentina', 'Buenos Aires', 'Chile', 'Santiago', 'Colombia', 'Bogotá', 'Medellín', 'Peru', 'Lima', 'Ecuador', 'Quito'], 
    country_indeed: 'Brazil',
    currency: 'BRL',
    jobBoardDomains: ['linkedin.com', 'indeed.com.br', 'vagas.com.br', 'bumeran.com.ar', 'computrabajo.com'],
    languages: ['es', 'pt', 'en']
  },
  'Caribbean': { 
    locations: ['Jamaica', 'Kingston', 'Bahamas', 'Nassau', 'Dominican Republic', 'Santo Domingo', 'Puerto Rico', 'San Juan', 'Trinidad', 'Port of Spain', 'Barbados', 'Bridgetown'], 
    country_indeed: 'USA',
    currency: '$',
    jobBoardDomains: ['linkedin.com', 'caribbeanjobs.com', 'indeed.com'],
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { regions, userProfile, daysBack = 7, maxResults = 1000 } = await req.json();
    
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!FIRECRAWL_API_KEY) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting comprehensive opportunity scan for regions:', regions);
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
      // Default to user's region or North America
      selectedConfigs.push({ region: 'North America', config: REGION_CONFIGS['North America'] });
    }

    const allOpportunities: any[] = [];
    const errors: string[] = [];
    const searchStats = { queries: 0, results: 0 };

    // Comprehensive search across all selected regions
    for (const { region, config } of selectedConfigs) {
      console.log(`Searching region: ${region}`);
      
      // Generate multiple search queries for comprehensive coverage
      const searchQueries: string[] = [];
      
      // Search each major location in the region
      for (const location of config.locations.slice(0, 8)) {
        // Search by title combinations
        for (const title of primaryTitles.slice(0, 3)) {
          searchQueries.push(`"${title}" jobs ${location} ${daysBack <= 7 ? 'posted this week' : ''}`);
        }
        
        // Search major job boards
        for (const domain of config.jobBoardDomains.slice(0, 3)) {
          searchQueries.push(`site:${domain} executive ${location}`);
          searchQueries.push(`site:${domain} director ${location}`);
          searchQueries.push(`site:${domain} VP ${location}`);
        }
      }

      // Add industry-specific searches
      if (industries) {
        const industryList = industries.split(',').map((i: string) => i.trim()).slice(0, 3);
        for (const ind of industryList) {
          searchQueries.push(`executive ${ind} jobs ${config.locations[0]}`);
          searchQueries.push(`"${primaryTitles[0]}" ${ind} ${config.locations[0]}`);
        }
      }

      // Execute searches with rate limiting
      const batchSize = 5;
      for (let i = 0; i < Math.min(searchQueries.length, 30); i += batchSize) {
        const batch = searchQueries.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(async (query) => {
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
                  limit: 20, // More results per query
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
                    parseJobFromSearchResult(result, region, config.currency)
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
            allOpportunities.push(...result.value);
            searchStats.results += result.value.length;
          }
        }

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < searchQueries.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    console.log(`Scraping complete: ${searchStats.queries} queries, ${searchStats.results} raw results`);

    // Deduplicate by company+title+location
    const seen = new Map<string, any>();
    for (const opp of allOpportunities) {
      const key = `${opp.company?.toLowerCase()}-${opp.title?.toLowerCase()}-${opp.location?.toLowerCase()}`.replace(/\s+/g, '');
      if (!seen.has(key)) {
        seen.set(key, opp);
      }
    }
    let uniqueOpportunities = Array.from(seen.values());
    console.log(`After deduplication: ${uniqueOpportunities.length} unique opportunities`);

    // Enhance with AI scoring if we have results
    if (uniqueOpportunities.length > 0 && LOVABLE_API_KEY) {
      try {
        // Process in batches for AI enhancement
        const enhancedBatches = [];
        const batchSize = 50;
        
        for (let i = 0; i < Math.min(uniqueOpportunities.length, 200); i += batchSize) {
          const batch = uniqueOpportunities.slice(i, i + batchSize);
          const enhanced = await enhanceOpportunitiesWithAI(batch, LOVABLE_API_KEY, targetRole, industries);
          enhancedBatches.push(...enhanced);
        }
        
        uniqueOpportunities = enhancedBatches;
      } catch (aiError) {
        console.error('AI enhancement failed:', aiError);
        // Assign basic scores based on title matching
        uniqueOpportunities = uniqueOpportunities.map(opp => ({
          ...opp,
          match_score: calculateBasicMatchScore(opp, primaryTitles, industries)
        }));
      }
    }

    // If no scraping results, generate AI-based comprehensive list
    if (uniqueOpportunities.length < 10 && LOVABLE_API_KEY) {
      console.log('Insufficient scraping results, generating AI opportunities');
      const aiOpportunities = await generateComprehensiveAIOpportunities(
        regions,
        userProfile,
        daysBack,
        LOVABLE_API_KEY,
        selectedConfigs,
        maxResults
      );
      uniqueOpportunities = [...uniqueOpportunities, ...aiOpportunities];
    }

    // Sort by match score
    uniqueOpportunities.sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0));

    console.log(`Returning ${uniqueOpportunities.length} opportunities`);

    return new Response(
      JSON.stringify({ 
        opportunities: uniqueOpportunities.slice(0, maxResults),
        stats: {
          totalScraped: searchStats.results,
          queriesExecuted: searchStats.queries,
          uniqueResults: uniqueOpportunities.length,
          regionsSearched: selectedConfigs.map(c => c.region)
        },
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

// Parse job from search result
function parseJobFromSearchResult(result: any, region: string, currency: string): any | null {
  try {
    const url = result.url || '';
    const title = result.title || '';
    const description = result.description || result.markdown || '';
    
    // Accept various job-related URLs
    const isJobUrl = url.includes('job') || url.includes('career') || url.includes('position') || 
                     url.includes('linkedin.com') || url.includes('indeed') || url.includes('glassdoor') ||
                     url.includes('stepstone') || url.includes('seek') || url.includes('monster');
    
    if (!url || !isJobUrl) return null;

    // Extract company name
    let company = 'Company';
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

    // Extract job title
    let jobTitle = 'Executive Position';
    const titleParts = title.split(/\s+at\s+|\s+[-|–]\s+/i);
    if (titleParts[0] && titleParts[0].length > 3) {
      jobTitle = titleParts[0].trim().substring(0, 100);
    }

    // Determine source
    let source = 'Job Board';
    if (url.includes('linkedin.com')) source = 'LinkedIn';
    else if (url.includes('indeed')) source = 'Indeed';
    else if (url.includes('glassdoor')) source = 'Glassdoor';
    else if (url.includes('stepstone')) source = 'StepStone';
    else if (url.includes('seek')) source = 'Seek';
    else if (url.includes('monster')) source = 'Monster';
    else if (url.includes('xing')) source = 'XING';

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

    return {
      id: `${source.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: jobTitle,
      company: company,
      location: location,
      salary_range: salary,
      status: 'New',
      source: source,
      posted_date: 'Recent',
      description: description.substring(0, 800),
      match_score: 0,
      url: url
    };
  } catch (error) {
    console.error('Parse error:', error);
    return null;
  }
}

// Basic match score without AI
function calculateBasicMatchScore(opp: any, targetTitles: string[], industries: string): number {
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
  
  return Math.min(score, 100);
}

// AI enhancement for opportunities
async function enhanceOpportunitiesWithAI(
  opportunities: any[], 
  apiKey: string, 
  targetRole: string,
  industries: string
): Promise<any[]> {
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
            content: `You are an executive career advisor. Calculate match scores (0-100) based on alignment between job opportunities and the candidate's target: ${targetRole}. Industries: ${industries || 'Various'}. Be precise and objective.`
          },
          {
            role: 'user',
            content: `Calculate match_score (0-100) for each job. Target: ${targetRole}. Industries: ${industries || 'Any'}.

Jobs:
${JSON.stringify(opportunities.map(o => ({ title: o.title, company: o.company, location: o.location, description: o.description?.substring(0, 200) })), null, 2)}

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

// Generate comprehensive AI opportunities
async function generateComprehensiveAIOpportunities(
  regions: string[],
  userProfile: any,
  daysBack: number,
  apiKey: string,
  configs: { region: string, config: { locations: string[], currency: string } }[],
  targetCount: number
): Promise<any[]> {
  const targetRole = userProfile?.targetRole || 'Executive Leadership';
  const industries = userProfile?.industries || 'Technology, Finance, Healthcare, Manufacturing, Retail';
  
  const regionDetails = configs.map(c => ({
    region: c.region,
    cities: c.config.locations.slice(0, 6),
    currency: c.config.currency
  }));

  const batchSize = 50;
  const batches = Math.min(Math.ceil(targetCount / batchSize), 5);
  const allOpportunities: any[] = [];

  for (let batch = 0; batch < batches; batch++) {
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
            content: `You are an executive job market analyst. Generate realistic executive opportunities from REAL companies that actually operate and hire executives in the specified regions. Use accurate company names, realistic salary ranges in local currencies, and current market conditions.`
          },
          {
            role: 'user',
            content: `Generate ${batchSize} unique executive job opportunities (batch ${batch + 1}/${batches}).

Regions: ${JSON.stringify(regionDetails)}

Candidate:
- Role: ${targetRole}
- Industries: ${industries}
- Level: C-suite, VP, Director

Requirements:
1. REAL companies operating in these regions (multinationals, regional leaders, scale-ups)
2. Mix: 30% C-level, 30% VP/SVP, 40% Director/Head of
3. Salary in LOCAL CURRENCY (${configs.map(c => c.config.currency).join(', ')})
4. Posted within ${daysBack} days
5. Realistic match_score based on ${targetRole}
6. Include: Tech giants, banks, industrials, consulting, pharma, consumer goods, startups

Return JSON array:
[{
  "id": "unique-${batch}-xxx",
  "title": "Chief Technology Officer",
  "company": "Real Company Name",
  "location": "City, Country",
  "salary_range": "€180k-250k",
  "status": "New",
  "source": "LinkedIn|Indeed|Executive Search|Company Website",
  "posted_date": "Xd ago",
  "description": "Role requirements and responsibilities...",
  "match_score": 85,
  "url": "https://linkedin.com/jobs/view/xxx"
}]`
          }
        ],
        max_tokens: 8000
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) throw new Error('Rate limit exceeded');
      if (status === 402) throw new Error('AI credits depleted');
      continue;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const opportunities = JSON.parse(jsonMatch[0]);
      allOpportunities.push(...opportunities.map((opp: any, i: number) => ({
        id: opp.id || `ai-${batch}-${Date.now()}-${i}`,
        title: opp.title || 'Executive Position',
        company: opp.company || 'Company',
        location: opp.location || configs[0]?.config.locations[0] || 'Location',
        salary_range: opp.salary_range || 'Competitive',
        status: 'New',
        source: opp.source || 'Job Board',
        posted_date: opp.posted_date || '1d ago',
        description: opp.description || '',
        match_score: opp.match_score || 0,
        url: opp.url || ''
      })));
    }
  }
  
  return allOpportunities;
}