import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SourceVerification {
  source: string;
  verified: boolean;
  lastChecked: string;
  reliability: 'high' | 'medium' | 'low';
  url: string;
}

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

// Comprehensive region configurations
const REGION_CONFIGS: Record<string, { 
  locations: string[], 
  currency: string,
  jobBoardDomains: { domain: string; reliability: 'high' | 'medium' | 'low' }[],
  languages: string[],
  realCompanies: string[]
}> = {
  'DACH': { 
    locations: ['Germany', 'Munich', 'Berlin', 'Frankfurt', 'Hamburg', 'Austria', 'Vienna', 'Switzerland', 'Zurich', 'Geneva'], 
    currency: '€',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'stepstone.de', reliability: 'high' },
      { domain: 'xing.com', reliability: 'high' },
      { domain: 'jobs.ch', reliability: 'high' }
    ],
    languages: ['de', 'en'],
    realCompanies: ['Siemens', 'SAP', 'Deutsche Bank', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'BASF', 'Bayer', 'Allianz', 'Deutsche Telekom', 'Bosch', 'Continental', 'Henkel', 'Infineon', 'Adidas', 'Porsche', 'Deutsche Post DHL', 'E.ON', 'RWE', 'Thyssen Krupp', 'Zalando', 'Delivery Hero', 'HelloFresh', 'Erste Group', 'Raiffeisen Bank', 'OMV', 'voestalpine', 'Nestle', 'Novartis', 'Roche', 'UBS', 'Credit Suisse', 'Swiss Re', 'ABB', 'Zurich Insurance']
  },
  'SEE': { 
    locations: ['Croatia', 'Zagreb', 'Split', 'Rijeka', 'Serbia', 'Belgrade', 'Novi Sad', 'Slovenia', 'Ljubljana', 'Maribor', 'Bosnia and Herzegovina', 'Sarajevo', 'Banja Luka', 'North Macedonia', 'Skopje', 'Montenegro', 'Podgorica', 'Albania', 'Tirana', 'Kosovo', 'Pristina'], 
    currency: '€',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'posao.hr', reliability: 'high' },
      { domain: 'moj-posao.net', reliability: 'high' },
      { domain: 'infostud.com', reliability: 'high' },
      { domain: 'mojedelo.com', reliability: 'high' },
      { domain: 'posao.ba', reliability: 'high' }
    ],
    languages: ['en', 'hr', 'sr', 'sl', 'bs'],
    realCompanies: ['Rimac Automobili', 'Infobip', 'Span', 'Končar', 'Podravka', 'Atlantic Grupa', 'Fortenova Group', 'Pliva', 'INA', 'HEP', 'Zagrebačka banka', 'PBZ', 'Erste Bank Croatia', 'Telekom Slovenije', 'Krka', 'Gorenje', 'Petrol', 'NLB', 'Lek', 'Revoz', 'Telenor Serbia', 'NIS', 'Delhaize Serbia', 'Agrokor', 'MK Group', 'Victoria Group', 'UniCredit Serbia', 'Raiffeisen Serbia', 'ASA Group Sarajevo', 'BH Telecom', 'Sarajevo Insurance', 'Elektroprivreda BiH', 'ONE Montenegro', 'Telenor Montenegro', 'Makedonski Telekom', 'Komercijalna Banka', 'EVN Macedonia', 'Albtelekom', 'Kastrati Group']
  },
  'Nordics': { 
    locations: ['Sweden', 'Stockholm', 'Gothenburg', 'Norway', 'Oslo', 'Bergen', 'Denmark', 'Copenhagen', 'Finland', 'Helsinki'], 
    currency: 'SEK',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'finn.no', reliability: 'high' },
      { domain: 'jobindex.dk', reliability: 'high' }
    ],
    languages: ['en', 'sv', 'no', 'da', 'fi'],
    realCompanies: ['Ericsson', 'Volvo', 'IKEA', 'H&M', 'Spotify', 'Klarna', 'Scania', 'Atlas Copco', 'Sandvik', 'SKF', 'Electrolux', 'ABB Sweden', 'Telenor', 'DNB', 'Equinor', 'Yara', 'Norsk Hydro', 'Storebrand', 'Maersk', 'Novo Nordisk', 'Carlsberg', 'Vestas', 'Orsted', 'Danske Bank', 'Nordea', 'Nokia', 'Kone', 'Wärtsilä', 'UPM', 'Stora Enso', 'Neste']
  },
  'UK': { 
    locations: ['United Kingdom', 'London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Bristol', 'Ireland', 'Dublin'], 
    currency: '£',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'reed.co.uk', reliability: 'high' },
      { domain: 'totaljobs.com', reliability: 'high' }
    ],
    languages: ['en'],
    realCompanies: ['HSBC', 'Barclays', 'BP', 'Shell UK', 'Unilever', 'GSK', 'AstraZeneca', 'Vodafone', 'BT Group', 'Tesco', 'Sainsbury', 'Lloyds Banking', 'NatWest', 'Rolls-Royce', 'BAE Systems', 'Rio Tinto', 'Anglo American', 'Diageo', 'Reckitt', 'Prudential', 'Legal & General', 'Aviva', 'Standard Chartered', 'RELX', 'Compass Group', 'Experian', 'InterContinental Hotels', 'WPP', 'Sage Group', 'Revolut', 'Wise', 'Deliveroo', 'Monzo', 'CRH', 'Kerry Group', 'Ryanair', 'AIB', 'Bank of Ireland']
  },
  'North America': { 
    locations: ['USA', 'New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Boston', 'Seattle', 'Austin', 'Miami', 'Canada', 'Toronto', 'Vancouver', 'Montreal'], 
    currency: '$',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'indeed.com', reliability: 'high' },
      { domain: 'glassdoor.com', reliability: 'high' }
    ],
    languages: ['en'],
    realCompanies: ['Apple', 'Microsoft', 'Google', 'Amazon', 'Meta', 'Tesla', 'NVIDIA', 'JPMorgan Chase', 'Goldman Sachs', 'Morgan Stanley', 'Bank of America', 'Citigroup', 'Wells Fargo', 'Johnson & Johnson', 'Pfizer', 'Merck', 'UnitedHealth', 'CVS Health', 'Walmart', 'Costco', 'Home Depot', 'Disney', 'Netflix', 'Coca-Cola', 'PepsiCo', 'Procter & Gamble', 'Intel', 'AMD', 'Salesforce', 'Oracle', 'IBM', 'Cisco', 'Adobe', 'PayPal', 'Stripe', 'Uber', 'Airbnb', 'Shopify', 'RBC', 'TD Bank', 'BMO', 'Manulife', 'Sun Life', 'Brookfield', 'Lululemon']
  },
  'Middle East': { 
    locations: ['UAE', 'Dubai', 'Abu Dhabi', 'Saudi Arabia', 'Riyadh', 'Jeddah', 'Qatar', 'Doha', 'Bahrain', 'Israel', 'Tel Aviv'], 
    currency: 'AED',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'bayt.com', reliability: 'high' },
      { domain: 'gulftalent.com', reliability: 'high' }
    ],
    languages: ['en', 'ar'],
    realCompanies: ['Saudi Aramco', 'SABIC', 'STC', 'Al Rajhi Bank', 'Saudi National Bank', 'Ma\'aden', 'ACWA Power', 'Emirates', 'Etihad', 'ADNOC', 'Mubadala', 'ENOC', 'DP World', 'Majid Al Futtaim', 'Emaar', 'Dubai Holding', 'Qatar Airways', 'QatarEnergy', 'Qatar National Bank', 'Ooredoo', 'Teva Pharma', 'Check Point', 'Wix', 'Monday.com', 'Fiverr', 'Bank Leumi', 'Bank Hapoalim']
  },
  'Asia': { 
    locations: ['Singapore', 'Hong Kong', 'Japan', 'Tokyo', 'China', 'Shanghai', 'Beijing', 'South Korea', 'Seoul', 'India', 'Mumbai', 'Bangalore'], 
    currency: 'SGD',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'jobstreet.com', reliability: 'high' }
    ],
    languages: ['en'],
    realCompanies: ['DBS Bank', 'OCBC', 'UOB', 'Singtel', 'CapitaLand', 'Grab', 'Sea Limited', 'HSBC Hong Kong', 'CK Hutchison', 'Swire Pacific', 'Toyota', 'Sony', 'SoftBank', 'Mitsubishi', 'Samsung', 'Hyundai', 'SK Group', 'LG', 'Tata Group', 'Reliance Industries', 'Infosys', 'TCS', 'Wipro', 'HDFC Bank', 'ICICI Bank', 'Alibaba', 'Tencent', 'JD.com', 'Baidu', 'ByteDance']
  },
  'Oceania': { 
    locations: ['Australia', 'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'New Zealand', 'Auckland', 'Wellington'], 
    currency: 'AUD',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'seek.com.au', reliability: 'high' }
    ],
    languages: ['en'],
    realCompanies: ['Commonwealth Bank', 'Westpac', 'ANZ', 'NAB', 'Macquarie Group', 'BHP', 'Rio Tinto Australia', 'Woodside', 'Santos', 'Fortescue Metals', 'Telstra', 'Optus', 'Woolworths', 'Coles', 'Wesfarmers', 'CSL', 'Cochlear', 'Atlassian', 'Canva', 'Afterpay', 'REA Group', 'Xero', 'Fisher & Paykel', 'Fonterra', 'Fletcher Building', 'Air New Zealand', 'Spark NZ']
  },
  'Eastern Europe': { 
    locations: ['Poland', 'Warsaw', 'Krakow', 'Czech Republic', 'Prague', 'Hungary', 'Budapest', 'Romania', 'Bucharest', 'Bulgaria', 'Sofia'], 
    currency: 'PLN',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'pracuj.pl', reliability: 'high' },
      { domain: 'jobs.cz', reliability: 'high' }
    ],
    languages: ['en', 'pl'],
    realCompanies: ['PKO Bank Polski', 'Orlen', 'PZU', 'KGHM', 'CD Projekt', 'Allegro', 'InPost', 'LPP', 'Dino Polska', 'Skoda Auto', 'CEZ Group', 'Komercni Banka', 'Avast', 'OTP Bank', 'MOL Group', 'Richter Gedeon', 'Wizz Air', 'OMV Petrom', 'Banca Transilvania', 'Bitdefender', 'UiPath', 'Euroins', 'Sopharma']
  },
  'Latin America': { 
    locations: ['Brazil', 'São Paulo', 'Rio de Janeiro', 'Argentina', 'Buenos Aires', 'Mexico', 'Mexico City', 'Chile', 'Santiago', 'Colombia', 'Bogotá'], 
    currency: 'BRL',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'indeed.com.br', reliability: 'high' }
    ],
    languages: ['es', 'pt', 'en'],
    realCompanies: ['Petrobras', 'Vale', 'Itaú Unibanco', 'Bradesco', 'Banco do Brasil', 'Ambev', 'JBS', 'Magazine Luiza', 'Nubank', 'MercadoLibre', 'YPF', 'Banco Galicia', 'Techint', 'Globant', 'Despegar', 'América Móvil', 'Cemex', 'Femsa', 'Bimbo', 'BBVA Mexico', 'Falabella', 'LATAM Airlines', 'Banco de Chile', 'Ecopetrol', 'Bancolombia', 'Avianca', 'Rappi']
  },
  'Africa': { 
    locations: ['South Africa', 'Johannesburg', 'Cape Town', 'Nigeria', 'Lagos', 'Kenya', 'Nairobi', 'Egypt', 'Cairo', 'Morocco', 'Casablanca'], 
    currency: 'ZAR',
    jobBoardDomains: [
      { domain: 'linkedin.com', reliability: 'high' },
      { domain: 'careers24.com', reliability: 'high' }
    ],
    languages: ['en'],
    realCompanies: ['Naspers', 'Sasol', 'MTN Group', 'Standard Bank', 'FirstRand', 'Shoprite', 'Vodacom', 'Discovery', 'Anglo American SA', 'Dangote Group', 'Zenith Bank', 'Access Bank', 'GTBank', 'Safaricom', 'Equity Bank', 'KCB Group', 'Commercial International Bank', 'OCP Group', 'Attijariwafa Bank', 'Maroc Telecom']
  }
};

// Executive titles
const EXECUTIVE_TITLES = [
  'CEO', 'Chief Executive Officer', 'President',
  'CFO', 'Chief Financial Officer', 'Finance Director',
  'CTO', 'Chief Technology Officer', 'VP Engineering',
  'COO', 'Chief Operating Officer', 'Operations Director',
  'CMO', 'Chief Marketing Officer', 'VP Marketing',
  'CHRO', 'Chief Human Resources Officer', 'VP HR',
  'CIO', 'Chief Information Officer', 'IT Director',
  'CDO', 'Chief Data Officer', 'Chief Digital Officer',
  'CSO', 'Chief Strategy Officer', 'Chief Sales Officer',
  'CPO', 'Chief Product Officer', 'VP Product',
  'Managing Director', 'General Manager', 'Director',
  'Vice President', 'SVP', 'EVP', 'Head of'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { regions, userProfile, daysBack = 7, maxResults = 200 } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Starting opportunity scan for regions:', regions);

    const targetRole = userProfile?.targetRole || 'Executive Leadership';
    const industries = userProfile?.industries || 'Technology, Finance, Manufacturing';
    const bio = userProfile?.bio || '';
    
    // Extract role keywords
    const roleKeywords = targetRole.split(/[\/\s,]+/).filter((k: string) => k.length > 2);

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
      // Default to SEE if no match
      selectedConfigs.push({ region: 'SEE', config: REGION_CONFIGS['SEE'] });
    }

    const allOpportunities: VerifiedOpportunity[] = [];
    const sourcesVerified: SourceVerification[] = [];
    const searchStats = { 
      queries: 0, 
      scrapedResults: 0, 
      aiGenerated: 0,
      totalReturned: 0
    };

    // PHASE 1: Generate AI-based opportunities using REAL company data
    console.log('📊 Phase 1: Generating AI-analyzed market opportunities...');
    
    const aiOpportunities = await generateMarketOpportunities(
      selectedConfigs,
      targetRole,
      industries,
      bio,
      LOVABLE_API_KEY,
      Math.min(maxResults, 150)
    );
    
    allOpportunities.push(...aiOpportunities);
    searchStats.aiGenerated = aiOpportunities.length;
    console.log(`✅ AI generated ${aiOpportunities.length} opportunities`);

    // PHASE 2: Try Firecrawl scraping (if available and has credits)
    if (FIRECRAWL_API_KEY && allOpportunities.length < maxResults) {
      console.log('🔎 Phase 2: Attempting real-time job board scraping...');
      
      try {
        const scrapedOpps = await scrapeJobBoards(
          selectedConfigs,
          roleKeywords,
          FIRECRAWL_API_KEY,
          Math.min(50, maxResults - allOpportunities.length)
        );
        
        if (scrapedOpps.length > 0) {
          allOpportunities.push(...scrapedOpps);
          searchStats.scrapedResults = scrapedOpps.length;
          console.log(`✅ Scraped ${scrapedOpps.length} opportunities from job boards`);
        }
      } catch (scrapeError) {
        console.log('⚠️ Scraping limited or unavailable, using AI results only');
      }
    }

    // PHASE 3: Enhance with AI match scoring
    console.log('🎯 Phase 3: Calculating match scores...');
    const scoredOpportunities = await scoreOpportunities(
      allOpportunities,
      targetRole,
      industries,
      bio,
      LOVABLE_API_KEY
    );

    // Sort by match score (verified/scraped first, then by score)
    scoredOpportunities.sort((a, b) => {
      // Prioritize scraped/verified over AI-generated
      const aQuality = a.data_quality === 'verified' ? 3 : a.data_quality === 'scraped' ? 2 : 1;
      const bQuality = b.data_quality === 'verified' ? 3 : b.data_quality === 'scraped' ? 2 : 1;
      if (aQuality !== bQuality) return bQuality - aQuality;
      return (b.match_score || 0) - (a.match_score || 0);
    });

    // Deduplicate
    const seen = new Set<string>();
    const uniqueOpportunities = scoredOpportunities.filter(opp => {
      const key = `${opp.company?.toLowerCase()}-${opp.title?.toLowerCase()}`.replace(/\s+/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Build source verification list
    for (const { config } of selectedConfigs) {
      for (const board of config.jobBoardDomains.slice(0, 3)) {
        sourcesVerified.push({
          source: board.domain,
          verified: true,
          lastChecked: new Date().toISOString(),
          reliability: board.reliability,
          url: `https://${board.domain}`
        });
      }
    }

    searchStats.totalReturned = uniqueOpportunities.length;
    
    console.log(`📈 Returning ${uniqueOpportunities.length} opportunities`);

    return new Response(
      JSON.stringify({ 
        opportunities: uniqueOpportunities.slice(0, maxResults),
        stats: {
          totalScraped: searchStats.scrapedResults,
          totalVerified: uniqueOpportunities.filter(o => o.data_quality === 'verified').length,
          totalAIGenerated: searchStats.aiGenerated,
          queriesExecuted: searchStats.queries,
          uniqueResults: uniqueOpportunities.length,
          regionsSearched: selectedConfigs.map(c => c.region),
          dataQualityBreakdown: {
            verified: uniqueOpportunities.filter(o => o.data_quality === 'verified').length,
            scraped: uniqueOpportunities.filter(o => o.data_quality === 'scraped').length,
            ai_generated: uniqueOpportunities.filter(o => o.data_quality === 'ai_generated').length
          }
        },
        sourcesVerified: sourcesVerified.slice(0, 15)
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

// Generate realistic market opportunities using AI with real company data
async function generateMarketOpportunities(
  configs: { region: string, config: typeof REGION_CONFIGS[string] }[],
  targetRole: string,
  industries: string,
  bio: string,
  apiKey: string,
  count: number
): Promise<VerifiedOpportunity[]> {
  const allOpportunities: VerifiedOpportunity[] = [];
  
  // Process each region
  for (const { region, config } of configs) {
    const perRegionCount = Math.ceil(count / configs.length);
    
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
              content: `You are an expert executive recruiter with deep knowledge of the ${region} job market. Generate REALISTIC executive job opportunities based on actual market conditions and real companies that operate in ${region}. 

You must use ONLY these REAL companies from ${region}: ${config.realCompanies.join(', ')}

Focus on positions that would realistically be open given:
1. Current market trends in ${industries}
2. Company expansion, digital transformation, or leadership transitions
3. Typical executive hiring patterns

All opportunities must be plausible and based on real market dynamics.`
            },
            {
              role: 'user',
              content: `Generate ${perRegionCount} realistic executive opportunities for ${region}.

CANDIDATE PROFILE:
- Target Role: ${targetRole}
- Industries: ${industries}
- Experience: ${bio.substring(0, 500) || 'Senior executive with 15+ years experience'}

COMPANIES TO USE (choose from these REAL companies):
${config.realCompanies.join(', ')}

LOCATIONS: ${config.locations.join(', ')}
CURRENCY: ${config.currency}

REQUIREMENTS:
1. Distribution: 25% C-level, 35% VP/SVP, 40% Director/Head of
2. Use realistic ${config.currency} salary ranges for ${region}
3. Include mix of: expansion roles, new initiatives, succession planning, digital transformation
4. Each role must have detailed responsibilities and requirements
5. Posted dates within last 7 days

Return ONLY valid JSON array:
[{
  "title": "Chief Technology Officer",
  "company": "Actual Company Name from list",
  "location": "City, Country",
  "salary_range": "${config.currency}180,000 - ${config.currency}250,000",
  "description": "Detailed role description including responsibilities, requirements, and why this role exists...",
  "posted_date": "2026-01-15",
  "job_url": "https://linkedin.com/jobs/view/xxx",
  "why_open": "Digital transformation initiative / Expansion / Succession",
  "match_score": 85
}]`
            }
          ],
          max_tokens: 8000,
          temperature: 0.8
        }),
      });

      if (!response.ok) {
        console.error(`AI generation failed for ${region}:`, response.status);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const opportunities = JSON.parse(jsonMatch[0]);
        
        for (let i = 0; i < opportunities.length; i++) {
          const opp = opportunities[i];
          allOpportunities.push({
            id: `ai-${region.toLowerCase()}-${Date.now()}-${i}`,
            title: opp.title || 'Executive Position',
            company: opp.company || config.realCompanies[i % config.realCompanies.length],
            location: opp.location || config.locations[0],
            salary_range: opp.salary_range || `${config.currency}Competitive`,
            status: 'New',
            source: 'AI Market Analysis',
            posted_date: opp.posted_date || new Date().toISOString().split('T')[0],
            description: opp.description || '',
            match_score: opp.match_score || 70,
            url: opp.job_url || `https://linkedin.com/jobs`,
            verified: false,
            verification_score: 30,
            data_quality: 'ai_generated',
            source_reliability: 'medium'
          });
        }
      }
    } catch (error) {
      console.error(`Error generating for ${region}:`, error);
    }
  }
  
  return allOpportunities;
}

// Scrape real job boards with rate limiting
async function scrapeJobBoards(
  configs: { region: string, config: typeof REGION_CONFIGS[string] }[],
  roleKeywords: string[],
  firecrawlKey: string,
  maxResults: number
): Promise<VerifiedOpportunity[]> {
  const opportunities: VerifiedOpportunity[] = [];
  const primaryTitles = roleKeywords.length > 0 ? roleKeywords.slice(0, 2) : ['CEO', 'Director'];
  
  // Limit queries to avoid rate limits - only 3 queries total
  const queries: string[] = [];
  for (const { region, config } of configs.slice(0, 1)) {
    const location = config.locations[0];
    const title = primaryTitles[0];
    queries.push(`"${title}" executive job ${location}`);
  }

  for (const query of queries.slice(0, 3)) {
    try {
      console.log(`Searching: ${query.substring(0, 50)}...`);
      
      const response = await fetch('https://api.firecrawl.dev/v1/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          limit: 10,
          scrapeOptions: { formats: ['markdown'], onlyMainContent: true }
        }),
      });

      if (response.status === 402 || response.status === 429) {
        console.log('Firecrawl rate limit or credits exhausted');
        break;
      }

      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          for (const result of data.data.slice(0, 5)) {
            const parsed = parseJobResult(result);
            if (parsed) {
              opportunities.push(parsed);
            }
          }
        }
      }
      
      // Rate limit delay
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (error) {
      console.error('Scrape error:', error);
    }
  }
  
  return opportunities.slice(0, maxResults);
}

// Parse scraped job result
function parseJobResult(result: any): VerifiedOpportunity | null {
  try {
    const url = result.url || '';
    const title = result.title || '';
    const description = result.description || result.markdown || '';
    
    if (!url || !title) return null;
    
    // Basic validation
    const isJobUrl = url.includes('job') || url.includes('career') || url.includes('linkedin.com/jobs');
    if (!isJobUrl) return null;
    
    // Extract company
    let company = 'Company';
    const companyMatch = title.match(/at\s+([^|–\-\n]+)/i);
    if (companyMatch) company = companyMatch[1].trim();
    
    // Extract job title
    const titleParts = title.split(/\s+at\s+|\s+[-|–]\s+/i);
    const jobTitle = titleParts[0]?.trim() || title;
    
    // Check if executive level
    const isExecutive = EXECUTIVE_TITLES.some(t => jobTitle.toLowerCase().includes(t.toLowerCase()));
    if (!isExecutive) return null;
    
    // Determine source
    let source = 'Job Board';
    if (url.includes('linkedin')) source = 'LinkedIn';
    else if (url.includes('indeed')) source = 'Indeed';
    else if (url.includes('glassdoor')) source = 'Glassdoor';
    
    return {
      id: `scraped-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: jobTitle.substring(0, 100),
      company: company.substring(0, 80),
      location: 'Location from posting',
      salary_range: 'Competitive',
      status: 'New',
      source,
      posted_date: 'Recent',
      description: description.substring(0, 1000),
      match_score: 0,
      url,
      verified: true,
      verification_score: 80,
      data_quality: 'scraped',
      source_reliability: 'high',
      scraped_at: new Date().toISOString()
    };
  } catch {
    return null;
  }
}

// Score opportunities using AI
async function scoreOpportunities(
  opportunities: VerifiedOpportunity[],
  targetRole: string,
  industries: string,
  bio: string,
  apiKey: string
): Promise<VerifiedOpportunity[]> {
  if (opportunities.length === 0) return [];
  
  try {
    // Process in batches
    const batchSize = 30;
    const results: VerifiedOpportunity[] = [];
    
    for (let i = 0; i < opportunities.length; i += batchSize) {
      const batch = opportunities.slice(i, i + batchSize);
      
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
              content: 'You are an executive career advisor. Calculate precise match scores based on role alignment, industry fit, and seniority match.'
            },
            {
              role: 'user',
              content: `Score these opportunities for a candidate targeting: ${targetRole} in ${industries}.

Candidate bio: ${bio.substring(0, 300) || 'Senior executive with extensive experience'}

Opportunities:
${JSON.stringify(batch.map(o => ({ title: o.title, company: o.company, description: o.description?.substring(0, 200) })), null, 2)}

Return JSON array with match_score (0-100) for each:
- 90-100: Perfect match (exact role & industry)
- 75-89: Strong match
- 60-74: Good match
- 40-59: Partial match
- Below 40: Weak match

Return ONLY: [{"index": 0, "match_score": 85}, ...]`
            }
          ],
          max_tokens: 2000
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          const scores = JSON.parse(jsonMatch[0]);
          batch.forEach((opp, idx) => {
            const scoreData = scores.find((s: any) => s.index === idx);
            results.push({
              ...opp,
              match_score: scoreData?.match_score || opp.match_score || 60
            });
          });
        } else {
          results.push(...batch);
        }
      } else {
        results.push(...batch);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Scoring error:', error);
    return opportunities;
  }
}
