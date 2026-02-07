import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  industry?: string;
  experience_level?: string;
}

// ===== REGION MAPPINGS =====
const REGION_NAME_MAP: Record<string, string> = {
  'see (southeast europe)': 'SEE', 'southeast europe': 'SEE', 'see': 'SEE',
  'dach (germany, austria, switzerland)': 'DACH', 'dach': 'DACH',
  'nordics': 'Nordics', 'uk & ireland': 'UK', 'uk': 'UK',
  'north america': 'North America', 'middle east': 'Middle East',
  'asia': 'Asia', 'oceania': 'Oceania', 'eastern europe': 'Eastern Europe',
  'latin america': 'Latin America', 'africa': 'Africa', 'benelux': 'Benelux',
  'france': 'France', 'iberia': 'Iberia', 'italy': 'Italy', 'baltics': 'Baltics',
  'south asia': 'Asia', 'southeast asia': 'Asia', 'east asia': 'Asia',
};

const ADZUNA_COUNTRIES: Record<string, string[]> = {
  'DACH': ['de', 'at', 'ch'], 'UK': ['gb'], 'North America': ['us', 'ca'],
  'Nordics': ['se', 'no', 'dk', 'fi'], 'SEE': ['pl'],
  'Eastern Europe': ['pl', 'cz', 'hu', 'ro'], 'Asia': ['sg', 'in'],
  'Oceania': ['au', 'nz'], 'Middle East': ['ae'], 'Latin America': ['br', 'mx'],
  'Africa': ['za'], 'Benelux': ['nl', 'be'], 'France': ['fr'], 'Italy': ['it'],
  'Iberia': ['es', 'pt'],
};

const JSEARCH_LOCATIONS: Record<string, string[]> = {
  'DACH': ['Germany', 'Munich', 'Berlin', 'Austria', 'Vienna', 'Switzerland', 'Zurich'],
  'SEE': ['Croatia', 'Zagreb', 'Serbia', 'Belgrade', 'Slovenia', 'Ljubljana', 'Bosnia', 'Sarajevo', 'Macedonia', 'Skopje', 'Montenegro', 'Albania', 'Kosovo'],
  'Nordics': ['Sweden', 'Stockholm', 'Norway', 'Oslo', 'Denmark', 'Copenhagen', 'Finland', 'Helsinki'],
  'UK': ['United Kingdom', 'London', 'Manchester', 'Dublin', 'Ireland'],
  'North America': ['United States', 'New York', 'San Francisco', 'Los Angeles', 'Canada', 'Toronto'],
  'Middle East': ['United Arab Emirates', 'Dubai', 'Saudi Arabia', 'Riyadh', 'Israel', 'Tel Aviv', 'Qatar', 'Doha'],
  'Asia': ['Singapore', 'Hong Kong', 'Japan', 'Tokyo', 'India', 'Bangalore', 'Mumbai'],
  'Oceania': ['Australia', 'Sydney', 'Melbourne', 'New Zealand', 'Auckland'],
  'Eastern Europe': ['Poland', 'Warsaw', 'Czech Republic', 'Prague', 'Hungary', 'Budapest', 'Romania', 'Bucharest', 'Bulgaria', 'Sofia'],
  'Latin America': ['Brazil', 'Sao Paulo', 'Argentina', 'Buenos Aires', 'Mexico', 'Mexico City', 'Chile', 'Colombia'],
  'Africa': ['South Africa', 'Johannesburg', 'Cape Town', 'Nigeria', 'Lagos', 'Kenya', 'Nairobi'],
  'Benelux': ['Netherlands', 'Amsterdam', 'Belgium', 'Brussels', 'Luxembourg'],
  'France': ['France', 'Paris', 'Lyon'], 'Italy': ['Italy', 'Milan', 'Rome'],
  'Iberia': ['Spain', 'Madrid', 'Barcelona', 'Portugal', 'Lisbon'],
  'Baltics': ['Estonia', 'Tallinn', 'Latvia', 'Riga', 'Lithuania', 'Vilnius'],
};

const REGION_LOCATION_KEYWORDS: Record<string, string[]> = {
  'SEE': ['croatia', 'zagreb', 'split', 'rijeka', 'serbia', 'belgrade', 'novi sad', 'slovenia', 'ljubljana', 'maribor', 'bosnia', 'sarajevo', 'banja luka', 'macedonia', 'skopje', 'montenegro', 'podgorica', 'albania', 'tirana', 'kosovo', 'pristina', 'balkan', 'southeast europe', 'adriatic'],
  'DACH': ['germany', 'deutschland', 'munich', 'münchen', 'berlin', 'frankfurt', 'hamburg', 'austria', 'österreich', 'vienna', 'wien', 'switzerland', 'schweiz', 'zurich', 'zürich', 'geneva', 'genf', 'basel', 'dach'],
  'Nordics': ['sweden', 'sverige', 'stockholm', 'gothenburg', 'norway', 'norge', 'oslo', 'bergen', 'denmark', 'danmark', 'copenhagen', 'finland', 'suomi', 'helsinki', 'nordic', 'scandinavia'],
  'UK': ['united kingdom', 'uk', 'london', 'manchester', 'birmingham', 'leeds', 'glasgow', 'edinburgh', 'ireland', 'dublin', 'belfast', 'britain', 'british', 'england', 'scotland', 'wales'],
  'North America': ['usa', 'united states', 'america', 'new york', 'california', 'san francisco', 'los angeles', 'chicago', 'boston', 'seattle', 'austin', 'texas', 'canada', 'toronto', 'vancouver', 'montreal'],
  'Middle East': ['uae', 'dubai', 'abu dhabi', 'saudi', 'riyadh', 'jeddah', 'qatar', 'doha', 'bahrain', 'israel', 'tel aviv', 'kuwait', 'oman', 'middle east', 'gcc', 'gulf'],
  'Asia': ['singapore', 'hong kong', 'japan', 'tokyo', 'osaka', 'china', 'shanghai', 'beijing', 'korea', 'seoul', 'india', 'mumbai', 'bangalore', 'delhi', 'malaysia', 'kuala lumpur', 'thailand', 'bangkok', 'vietnam', 'indonesia', 'jakarta', 'asia pacific', 'apac'],
  'Oceania': ['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'new zealand', 'auckland', 'wellington', 'oceania'],
  'Eastern Europe': ['poland', 'warsaw', 'krakow', 'czech', 'prague', 'hungary', 'budapest', 'romania', 'bucharest', 'bulgaria', 'sofia'],
  'Latin America': ['brazil', 'brasil', 'sao paulo', 'rio de janeiro', 'argentina', 'buenos aires', 'mexico', 'ciudad de mexico', 'chile', 'santiago', 'colombia', 'bogota', 'peru', 'lima', 'latam'],
  'Africa': ['south africa', 'johannesburg', 'cape town', 'nigeria', 'lagos', 'kenya', 'nairobi', 'egypt', 'cairo', 'morocco', 'casablanca', 'africa'],
  'Benelux': ['netherlands', 'holland', 'amsterdam', 'rotterdam', 'belgium', 'brussels', 'antwerp', 'luxembourg', 'benelux'],
  'France': ['france', 'paris', 'lyon', 'marseille', 'toulouse', 'french'],
  'Italy': ['italy', 'italia', 'milan', 'milano', 'rome', 'roma', 'turin', 'torino', 'italian'],
  'Iberia': ['spain', 'españa', 'madrid', 'barcelona', 'portugal', 'lisbon', 'lisboa', 'porto', 'iberia'],
  'Baltics': ['estonia', 'tallinn', 'latvia', 'riga', 'lithuania', 'vilnius', 'baltic'],
};

const REGION_CONFIGS: Record<string, {
  locations: string[], currency: string, languages: string[], realCompanies: string[]
}> = {
  'DACH': { 
    locations: ['Germany', 'Munich', 'Berlin', 'Frankfurt', 'Hamburg', 'Austria', 'Vienna', 'Switzerland', 'Zurich', 'Geneva'], 
    currency: '€', languages: ['de', 'en'],
    realCompanies: ['Siemens', 'SAP', 'Deutsche Bank', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'BASF', 'Bayer', 'Allianz', 'Deutsche Telekom', 'Bosch', 'Continental', 'Porsche', 'Zalando', 'Delivery Hero', 'HelloFresh', 'Erste Group', 'OMV', 'Nestle', 'Novartis', 'Roche', 'UBS', 'ABB', 'Zurich Insurance']
  },
  'SEE': { 
    locations: ['Croatia', 'Zagreb', 'Split', 'Serbia', 'Belgrade', 'Slovenia', 'Ljubljana', 'Bosnia', 'Sarajevo', 'North Macedonia', 'Skopje', 'Montenegro', 'Albania', 'Tirana', 'Kosovo', 'Pristina'], 
    currency: '€', languages: ['en', 'hr', 'sr', 'sl'],
    realCompanies: ['Rimac Automobili', 'Infobip', 'Span', 'Končar', 'Podravka', 'Atlantic Grupa', 'Fortenova Group', 'Pliva', 'INA', 'HEP', 'Zagrebačka banka', 'PBZ', 'Erste Bank Croatia', 'Telekom Slovenije', 'Krka', 'Gorenje', 'NLB', 'Telenor Serbia', 'NIS', 'MK Group', 'BH Telecom', 'Makedonski Telekom', 'ONE Montenegro']
  },
  'Nordics': { 
    locations: ['Sweden', 'Stockholm', 'Norway', 'Oslo', 'Denmark', 'Copenhagen', 'Finland', 'Helsinki'], 
    currency: 'SEK', languages: ['en', 'sv', 'no', 'da', 'fi'],
    realCompanies: ['Ericsson', 'Volvo', 'IKEA', 'H&M', 'Spotify', 'Klarna', 'Telenor', 'DNB', 'Equinor', 'Maersk', 'Novo Nordisk', 'Carlsberg', 'Vestas', 'Orsted', 'Danske Bank', 'Nordea', 'Nokia', 'Kone', 'Wärtsilä', 'Neste']
  },
  'UK': { 
    locations: ['United Kingdom', 'London', 'Manchester', 'Birmingham', 'Edinburgh', 'Bristol', 'Ireland', 'Dublin'], 
    currency: '£', languages: ['en'],
    realCompanies: ['HSBC', 'Barclays', 'BP', 'Shell UK', 'Unilever', 'GSK', 'AstraZeneca', 'Vodafone', 'BT Group', 'Tesco', 'Lloyds Banking', 'Rolls-Royce', 'BAE Systems', 'Diageo', 'Revolut', 'Wise', 'Deliveroo', 'Monzo']
  },
  'North America': { 
    locations: ['USA', 'New York', 'San Francisco', 'Los Angeles', 'Chicago', 'Boston', 'Seattle', 'Austin', 'Canada', 'Toronto', 'Vancouver'], 
    currency: '$', languages: ['en'],
    realCompanies: ['Apple', 'Microsoft', 'Google', 'Amazon', 'Meta', 'Tesla', 'NVIDIA', 'JPMorgan Chase', 'Goldman Sachs', 'Morgan Stanley', 'Johnson & Johnson', 'Pfizer', 'Walmart', 'Netflix', 'Salesforce', 'Oracle', 'Adobe', 'Uber', 'Airbnb', 'Shopify']
  },
  'Middle East': { 
    locations: ['UAE', 'Dubai', 'Abu Dhabi', 'Saudi Arabia', 'Riyadh', 'Qatar', 'Doha', 'Israel', 'Tel Aviv'], 
    currency: 'AED', languages: ['en', 'ar'],
    realCompanies: ['Saudi Aramco', 'SABIC', 'Emirates', 'Etihad', 'ADNOC', 'Mubadala', 'DP World', 'Majid Al Futtaim', 'Emaar', 'Qatar Airways', 'QatarEnergy', 'Teva Pharma', 'Check Point', 'Wix', 'Monday.com']
  },
  'Asia': { 
    locations: ['Singapore', 'Hong Kong', 'Japan', 'Tokyo', 'China', 'Shanghai', 'India', 'Mumbai', 'Bangalore'], 
    currency: 'SGD', languages: ['en'],
    realCompanies: ['DBS Bank', 'OCBC', 'Singtel', 'Grab', 'Sea Limited', 'Toyota', 'Sony', 'SoftBank', 'Samsung', 'Hyundai', 'Tata Group', 'Reliance Industries', 'Infosys', 'TCS', 'Alibaba', 'Tencent', 'ByteDance']
  },
  'Oceania': { 
    locations: ['Australia', 'Sydney', 'Melbourne', 'Brisbane', 'New Zealand', 'Auckland'], 
    currency: 'AUD', languages: ['en'],
    realCompanies: ['Commonwealth Bank', 'Westpac', 'ANZ', 'NAB', 'BHP', 'Rio Tinto', 'Telstra', 'Woolworths', 'CSL', 'Atlassian', 'Canva', 'Afterpay', 'Xero', 'Air New Zealand']
  },
  'Eastern Europe': { 
    locations: ['Poland', 'Warsaw', 'Czech Republic', 'Prague', 'Hungary', 'Budapest', 'Romania', 'Bucharest', 'Bulgaria', 'Sofia'], 
    currency: 'PLN', languages: ['en', 'pl'],
    realCompanies: ['PKO Bank Polski', 'Orlen', 'CD Projekt', 'Allegro', 'InPost', 'Skoda Auto', 'CEZ Group', 'OTP Bank', 'MOL Group', 'Wizz Air', 'OMV Petrom', 'UiPath']
  },
  'Latin America': { 
    locations: ['Brazil', 'São Paulo', 'Argentina', 'Buenos Aires', 'Mexico', 'Mexico City', 'Chile', 'Colombia'], 
    currency: 'BRL', languages: ['es', 'pt', 'en'],
    realCompanies: ['Petrobras', 'Vale', 'Itaú Unibanco', 'Nubank', 'MercadoLibre', 'América Móvil', 'Cemex', 'Femsa', 'LATAM Airlines', 'Rappi']
  },
  'Africa': { 
    locations: ['South Africa', 'Johannesburg', 'Cape Town', 'Nigeria', 'Lagos', 'Kenya', 'Nairobi'], 
    currency: 'ZAR', languages: ['en'],
    realCompanies: ['Naspers', 'Sasol', 'MTN Group', 'Standard Bank', 'FirstRand', 'Safaricom', 'Dangote Group']
  },
  'Benelux': { 
    locations: ['Netherlands', 'Amsterdam', 'Belgium', 'Brussels', 'Luxembourg'], 
    currency: '€', languages: ['en', 'nl'],
    realCompanies: ['Shell', 'Philips', 'ASML', 'ING', 'Heineken', 'AB InBev', 'KBC', 'ArcelorMittal']
  },
  'France': { 
    locations: ['France', 'Paris', 'Lyon', 'Marseille'], 
    currency: '€', languages: ['fr', 'en'],
    realCompanies: ['TotalEnergies', 'LVMH', 'Sanofi', 'BNP Paribas', 'AXA', 'Renault', 'Orange', 'Société Générale', 'Danone', 'L\'Oréal']
  },
  'Italy': { 
    locations: ['Italy', 'Milan', 'Rome', 'Turin'], 
    currency: '€', languages: ['it', 'en'],
    realCompanies: ['Enel', 'Eni', 'UniCredit', 'Intesa Sanpaolo', 'Ferrari', 'Fiat', 'Luxottica', 'Generali']
  },
  'Iberia': { 
    locations: ['Spain', 'Madrid', 'Barcelona', 'Portugal', 'Lisbon'], 
    currency: '€', languages: ['es', 'pt', 'en'],
    realCompanies: ['Santander', 'BBVA', 'Telefonica', 'Iberdrola', 'Inditex', 'EDP', 'Galp', 'BCP']
  },
  'Baltics': { 
    locations: ['Estonia', 'Tallinn', 'Latvia', 'Riga', 'Lithuania', 'Vilnius'], 
    currency: '€', languages: ['en', 'et', 'lv', 'lt'],
    realCompanies: ['Swedbank Baltic', 'SEB Baltic', 'Bolt', 'Wise', 'TransferGo', 'Ignitis Group']
  }
};

const EXECUTIVE_TITLES = [
  'CEO', 'Chief Executive Officer', 'President', 'CFO', 'Chief Financial Officer',
  'CTO', 'Chief Technology Officer', 'VP Engineering', 'COO', 'Chief Operating Officer',
  'CMO', 'Chief Marketing Officer', 'CHRO', 'CIO', 'Chief Information Officer',
  'CDO', 'Chief Data Officer', 'Chief Digital Officer', 'CSO', 'Chief Strategy Officer',
  'CPO', 'Chief Product Officer', 'VP Product', 'Managing Director', 'General Manager',
  'Director', 'Vice President', 'SVP', 'EVP', 'Head of', 'Senior Director'
];

const EXPERIENCE_LEVELS = [
  { id: 'c_level', name: 'C-Level', keywords: ['ceo', 'cto', 'cfo', 'coo', 'cmo', 'cio', 'cdo', 'cpo', 'chief'] },
  { id: 'vp', name: 'VP/SVP/EVP', keywords: ['vice president', 'vp', 'svp', 'evp', 'senior vice'] },
  { id: 'director', name: 'Director/Head', keywords: ['director', 'head of', 'senior director'] },
  { id: 'manager', name: 'Senior Manager', keywords: ['senior manager', 'manager', 'lead'] }
];

const LINKEDIN_GEOID_MAP: Record<string, { geoId: string; name: string }[]> = {
  'SEE': [
    { geoId: '104688944', name: 'Croatia' }, { geoId: '101855366', name: 'Serbia' },
    { geoId: '101727083', name: 'Slovenia' }, { geoId: '100994331', name: 'Bosnia and Herzegovina' },
    { geoId: '105149290', name: 'North Macedonia' }, { geoId: '101683237', name: 'Montenegro' },
    { geoId: '102845717', name: 'Albania' }, { geoId: '91000007', name: 'Southeast Europe' }
  ],
  'DACH': [
    { geoId: '101282230', name: 'Germany' }, { geoId: '103883259', name: 'Austria' },
    { geoId: '106693272', name: 'Switzerland' }
  ],
  'Nordics': [
    { geoId: '105117694', name: 'Sweden' }, { geoId: '103819153', name: 'Norway' },
    { geoId: '104514075', name: 'Denmark' }, { geoId: '100456013', name: 'Finland' }
  ],
  'UK': [{ geoId: '101165590', name: 'United Kingdom' }, { geoId: '104738515', name: 'Ireland' }],
  'North America': [{ geoId: '103644278', name: 'United States' }, { geoId: '101174742', name: 'Canada' }],
  'Middle East': [
    { geoId: '104305776', name: 'UAE' }, { geoId: '100459316', name: 'Saudi Arabia' },
    { geoId: '104396105', name: 'Israel' }, { geoId: '103495196', name: 'Qatar' }
  ],
  'Asia': [
    { geoId: '102454443', name: 'Singapore' }, { geoId: '103291313', name: 'Hong Kong' },
    { geoId: '101355337', name: 'Japan' }, { geoId: '102713980', name: 'India' }
  ],
  'Oceania': [{ geoId: '101452733', name: 'Australia' }, { geoId: '105490917', name: 'New Zealand' }],
  'Eastern Europe': [
    { geoId: '105072130', name: 'Poland' }, { geoId: '104508036', name: 'Czech Republic' },
    { geoId: '100288700', name: 'Hungary' }, { geoId: '106670623', name: 'Romania' }, { geoId: '105333783', name: 'Bulgaria' }
  ],
  'Europe': [{ geoId: '91000000', name: 'European Union' }]
};

// Jobicy region mapping
const JOBICY_REGIONS: Record<string, string[]> = {
  'DACH': ['dach', 'germany', 'austria', 'switzerland'],
  'SEE': ['europe', 'emea'],
  'Nordics': ['europe', 'nordic'],
  'UK': ['uk', 'europe'],
  'North America': ['usa', 'canada', 'north-america'],
  'Middle East': ['emea', 'middle-east'],
  'Asia': ['asia', 'apac'],
  'Oceania': ['oceania', 'australia'],
  'Eastern Europe': ['europe', 'eastern-europe'],
  'Latin America': ['latin-america', 'south-america'],
  'Africa': ['africa', 'emea'],
  'Benelux': ['europe', 'benelux'],
  'France': ['europe', 'france'],
  'Italy': ['europe', 'italy'],
  'Iberia': ['europe', 'spain', 'portugal'],
  'Baltics': ['europe', 'baltics']
};

// ===== HELPER FUNCTIONS =====
function normalizeRegionName(regionInput: string): string {
  return REGION_NAME_MAP[regionInput.toLowerCase().trim()] || regionInput;
}

function jobMatchesRegion(job: VerifiedOpportunity, normalizedRegions: string[]): boolean {
  const locationLower = (job.location || '').toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  const titleLower = (job.title || '').toLowerCase();
  
  const remoteKeywords = ['remote', 'worldwide', 'global', 'anywhere', 'work from home', 'wfh', 'fully remote', 'distributed'];
  if (remoteKeywords.some(kw => locationLower.includes(kw) || descLower.includes(kw) || titleLower.includes(kw))) {
    return true;
  }
  
  const europeanRegions = ['SEE', 'DACH', 'Nordics', 'UK', 'Eastern Europe', 'Benelux', 'France', 'Italy', 'Iberia', 'Baltics'];
  const isEuropeanSearch = normalizedRegions.some(r => europeanRegions.includes(r));
  if (isEuropeanSearch && ['europe', 'european', 'eu', 'emea'].some(kw => locationLower.includes(kw))) {
    return true;
  }
  
  for (const region of normalizedRegions) {
    const keywords = REGION_LOCATION_KEYWORDS[region] || [];
    if (keywords.some(keyword => locationLower.includes(keyword) || descLower.includes(keyword))) {
      return true;
    }
    const config = REGION_CONFIGS[region];
    if (config?.locations.some(loc => locationLower.includes(loc.toLowerCase()))) {
      return true;
    }
  }
  return false;
}

function isExecutiveTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return EXECUTIVE_TITLES.some(t => lower.includes(t.toLowerCase()));
}

function sanitizeInput(input: string, maxLength = 500): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, '').trim().substring(0, maxLength);
}

// ===== MAIN HANDLER =====
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const regions = body.regions || ['SEE'];
    const userProfile = body.userProfile || {};
    const maxResults = Math.min(body.maxResults || 1500, 3000); // Increased to 3000
    const industryFilter = sanitizeInput(body.industryFilter || '');
    const experienceLevelFilter = sanitizeInput(body.experienceLevelFilter || '');
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
    const ADZUNA_APP_ID = Deno.env.get('ADZUNA_APP_ID');
    const ADZUNA_API_KEY = Deno.env.get('ADZUNA_API_KEY');
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const FINDWORK_API_KEY = Deno.env.get('FINDWORK_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🚀 WORLD-CLASS OPPORTUNITY SCANNER - 11 API SOURCES');
    console.log('🔍 Scanning for regions:', regions);
    
    const targetRole = sanitizeInput(userProfile?.targetRole || 'Executive Leadership');
    const industries = sanitizeInput(userProfile?.industries || 'Technology, Finance');
    const bio = sanitizeInput(userProfile?.bio || '', 300);
    const roleKeywords = targetRole.split(/[\/\s,]+/).filter((k: string) => k.length > 2).slice(0, 5);

    const normalizedRegionNames = regions.map((r: string) => normalizeRegionName(r));
    const selectedConfigs = normalizedRegionNames.map(r => ({
      region: r,
      config: REGION_CONFIGS[r] || REGION_CONFIGS['SEE']
    }));

    const searchStats = {
      adzuna: 0, jsearch: 0, arbeitnow: 0, remotive: 0, themuse: 0, linkedin: 0,
      jobicy: 0, himalayas: 0, landingjobs: 0, findwork: 0, usajobs: 0,
      ai: 0, errors: [] as string[], totalRaw: 0, afterFilter: 0
    };

    // ===== PARALLEL API FETCHING - 11 SOURCES =====
    const perSourceLimit = Math.ceil(maxResults / 10);
    
    const apiPromises = [];

    // 1. Adzuna (requires API key)
    if (ADZUNA_APP_ID && ADZUNA_API_KEY) {
      apiPromises.push(
        fetchFromAdzuna(normalizedRegionNames, roleKeywords, ADZUNA_APP_ID, ADZUNA_API_KEY, perSourceLimit)
          .then(jobs => { searchStats.adzuna = jobs.length; return jobs; })
          .catch(e => { searchStats.errors.push(`Adzuna: ${e.message}`); return []; })
      );
    }

    // 2. JSearch (requires RapidAPI key)
    if (RAPIDAPI_KEY) {
      apiPromises.push(
        fetchFromJSearch(normalizedRegionNames, roleKeywords, RAPIDAPI_KEY, perSourceLimit)
          .then(jobs => { searchStats.jsearch = jobs.length; return jobs; })
          .catch(e => { searchStats.errors.push(`JSearch: ${e.message}`); return []; })
      );
    }

    // 3. Arbeitnow (FREE - no auth required)
    apiPromises.push(
      fetchFromArbeitnow(selectedConfigs, roleKeywords, perSourceLimit)
        .then(jobs => { searchStats.arbeitnow = jobs.length; return jobs; })
        .catch(e => { searchStats.errors.push(`Arbeitnow: ${e.message}`); return []; })
    );

    // 4. Remotive (FREE - no auth required)
    apiPromises.push(
      fetchFromRemotive(roleKeywords, perSourceLimit)
        .then(jobs => { searchStats.remotive = jobs.length; return jobs; })
        .catch(e => { searchStats.errors.push(`Remotive: ${e.message}`); return []; })
    );

    // 5. The Muse (FREE - no auth required)
    apiPromises.push(
      fetchFromTheMuse(normalizedRegionNames, perSourceLimit)
        .then(jobs => { searchStats.themuse = jobs.length; return jobs; })
        .catch(e => { searchStats.errors.push(`TheMuse: ${e.message}`); return []; })
    );

    // 6. Jobicy (FREE - no auth required) - NEW!
    apiPromises.push(
      fetchFromJobicy(normalizedRegionNames, perSourceLimit)
        .then(jobs => { searchStats.jobicy = jobs.length; return jobs; })
        .catch(e => { searchStats.errors.push(`Jobicy: ${e.message}`); return []; })
    );

    // 7. Himalayas (FREE - no auth required) - NEW!
    apiPromises.push(
      fetchFromHimalayas(roleKeywords, perSourceLimit)
        .then(jobs => { searchStats.himalayas = jobs.length; return jobs; })
        .catch(e => { searchStats.errors.push(`Himalayas: ${e.message}`); return []; })
    );

    // 8. Landing.jobs (FREE - EU tech jobs) - NEW!
    apiPromises.push(
      fetchFromLandingJobs(normalizedRegionNames, roleKeywords, perSourceLimit)
        .then(jobs => { searchStats.landingjobs = jobs.length; return jobs; })
        .catch(e => { searchStats.errors.push(`Landing.jobs: ${e.message}`); return []; })
    );

    // 9. Findwork.dev (requires API key but FREE signup)
    if (FINDWORK_API_KEY) {
      apiPromises.push(
        fetchFromFindwork(normalizedRegionNames, roleKeywords, FINDWORK_API_KEY, perSourceLimit)
          .then(jobs => { searchStats.findwork = jobs.length; return jobs; })
          .catch(e => { searchStats.errors.push(`Findwork: ${e.message}`); return []; })
      );
    }

    // 10. USAJobs (FREE - government jobs for North America)
    if (normalizedRegionNames.includes('North America')) {
      const USAJOBS_API_KEY = Deno.env.get('USAJOBS_API_KEY');
      const USAJOBS_EMAIL = Deno.env.get('USAJOBS_EMAIL');
      if (USAJOBS_API_KEY && USAJOBS_EMAIL) {
        apiPromises.push(
          fetchFromUSAJobs(roleKeywords, USAJOBS_API_KEY, USAJOBS_EMAIL, perSourceLimit)
            .then(jobs => { searchStats.usajobs = jobs.length; return jobs; })
            .catch(e => { searchStats.errors.push(`USAJobs: ${e.message}`); return []; })
        );
      }
    }

    // 11. LinkedIn via Firecrawl or AI fallback
    apiPromises.push(
      fetchFromLinkedIn(normalizedRegionNames, roleKeywords, FIRECRAWL_API_KEY || '', LOVABLE_API_KEY, perSourceLimit)
        .then(result => { searchStats.linkedin = result.opportunities.length; return result.opportunities; })
        .catch(e => { searchStats.errors.push(`LinkedIn: ${e.message}`); return []; })
    );

    // Execute all in parallel
    const results = await Promise.all(apiPromises);
    const allOpportunities = results.flat();
    searchStats.totalRaw = allOpportunities.length;
    
    console.log(`📊 Raw results from 11 sources: ${searchStats.totalRaw}`);
    console.log(`   Adzuna: ${searchStats.adzuna}, JSearch: ${searchStats.jsearch}, Arbeitnow: ${searchStats.arbeitnow}`);
    console.log(`   Remotive: ${searchStats.remotive}, TheMuse: ${searchStats.themuse}, LinkedIn: ${searchStats.linkedin}`);
    console.log(`   Jobicy: ${searchStats.jobicy}, Himalayas: ${searchStats.himalayas}, Landing.jobs: ${searchStats.landingjobs}`);
    console.log(`   Findwork: ${searchStats.findwork}, USAJobs: ${searchStats.usajobs}`);

    // ===== FILTERING =====
    let filtered = allOpportunities.filter(opp => 
      opp.data_quality === 'ai_generated' || jobMatchesRegion(opp, normalizedRegionNames)
    );

    if (industryFilter && industryFilter !== 'all') {
      const lower = industryFilter.toLowerCase();
      filtered = filtered.filter(opp => 
        (opp.description || '').toLowerCase().includes(lower) ||
        (opp.title || '').toLowerCase().includes(lower) ||
        (opp.company || '').toLowerCase().includes(lower)
      );
    }

    if (experienceLevelFilter && experienceLevelFilter !== 'all') {
      const level = EXPERIENCE_LEVELS.find(l => l.id === experienceLevelFilter);
      if (level) {
        filtered = filtered.filter(opp =>
          level.keywords.some(kw => (opp.title || '').toLowerCase().includes(kw))
        );
      }
    }

    // ===== AI SUPPLEMENTATION (if needed) =====
    if (filtered.length < maxResults / 3) {
      console.log('🤖 Generating AI opportunities to supplement...');
      try {
        const aiJobs = await generateAIOpportunities(
          selectedConfigs, targetRole, industries, bio, LOVABLE_API_KEY,
          Math.min(300, maxResults - filtered.length)
        );
        filtered.push(...aiJobs);
        searchStats.ai = aiJobs.length;
      } catch (e) {
        searchStats.errors.push(`AI: ${e instanceof Error ? e.message : 'Error'}`);
      }
    }

    // ===== SCORING =====
    const scored = await scoreOpportunities(filtered, targetRole, industries, bio, LOVABLE_API_KEY);
    
    // Sort by quality then score
    scored.sort((a, b) => {
      const qA = a.data_quality === 'verified' ? 3 : a.data_quality === 'scraped' ? 2 : 1;
      const qB = b.data_quality === 'verified' ? 3 : b.data_quality === 'scraped' ? 2 : 1;
      if (qA !== qB) return qB - qA;
      return (b.match_score || 0) - (a.match_score || 0);
    });

    // Deduplicate
    const seen = new Set<string>();
    const unique = scored.filter(opp => {
      const key = `${opp.company?.toLowerCase()}-${opp.title?.toLowerCase()}`.replace(/\s+/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    searchStats.afterFilter = unique.length;
    console.log(`✅ Final: ${unique.length} unique opportunities from 11 sources`);

    return new Response(
      JSON.stringify({
        opportunities: unique.slice(0, maxResults),
        stats: {
          total: unique.length,
          breakdown: {
            adzuna: searchStats.adzuna, jsearch: searchStats.jsearch,
            arbeitnow: searchStats.arbeitnow, remotive: searchStats.remotive,
            themuse: searchStats.themuse, linkedin: searchStats.linkedin,
            jobicy: searchStats.jobicy, himalayas: searchStats.himalayas,
            landingjobs: searchStats.landingjobs, findwork: searchStats.findwork,
            usajobs: searchStats.usajobs, ai: searchStats.ai
          },
          quality: {
            verified: unique.filter(o => o.data_quality === 'verified').length,
            scraped: unique.filter(o => o.data_quality === 'scraped').length,
            ai_generated: unique.filter(o => o.data_quality === 'ai_generated').length
          },
          regions: normalizedRegionNames,
          errors: searchStats.errors
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scan error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ===== API FETCHERS =====

// 1. Adzuna
async function fetchFromAdzuna(regions: string[], keywords: string[], appId: string, apiKey: string, max: number): Promise<VerifiedOpportunity[]> {
  const opps: VerifiedOpportunity[] = [];
  const countries = [...new Set(regions.flatMap(r => ADZUNA_COUNTRIES[r] || []))].slice(0, 6);
  const search = keywords.length > 0 ? keywords.slice(0, 3).join(' OR ') : 'CEO OR Director OR VP';
  
  for (const country of countries) {
    try {
      const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${apiKey}&results_per_page=${Math.ceil(max/countries.length)}&what=${encodeURIComponent(search)}&what_or=executive manager director&max_days_old=14&sort_by=date`;
      const res = await fetch(url);
      if (!res.ok) continue;
      
      const data = await res.json();
      for (const job of (data.results || [])) {
        if (!isExecutiveTitle(job.title || '')) continue;
        opps.push({
          id: `adzuna-${job.id}-${Date.now()}`,
          title: job.title || 'Executive Position',
          company: job.company?.display_name || 'Company',
          location: job.location?.display_name || country.toUpperCase(),
          salary_range: job.salary_min && job.salary_max ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}` : 'Competitive',
          status: 'New', source: 'Adzuna',
          posted_date: job.created ? new Date(job.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          description: (job.description || '').substring(0, 1500),
          match_score: 0, url: job.redirect_url || 'https://adzuna.com',
          verified: true, verification_score: 90,
          data_quality: 'verified', source_reliability: 'high',
          scraped_at: new Date().toISOString()
        });
      }
      await new Promise(r => setTimeout(r, 150));
    } catch (e) {
      console.error(`Adzuna ${country}:`, e);
    }
  }
  return opps;
}

// 2. JSearch
async function fetchFromJSearch(regions: string[], keywords: string[], rapidApiKey: string, max: number): Promise<VerifiedOpportunity[]> {
  const opps: VerifiedOpportunity[] = [];
  const locations = [...new Set(regions.flatMap(r => (JSEARCH_LOCATIONS[r] || []).slice(0, 3)))].slice(0, 8);
  const searchKws = keywords.length > 0 ? keywords.slice(0, 2) : ['CEO', 'Director'];
  
  for (const location of locations) {
    for (const keyword of searchKws) {
      try {
        const res = await fetch(
          `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(keyword + ' executive ' + location)}&page=1&num_pages=2&date_posted=week&remote_jobs_only=false`,
          { headers: { 'X-RapidAPI-Key': rapidApiKey, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' } }
        );
        if (res.status === 429) { await new Promise(r => setTimeout(r, 2000)); continue; }
        if (!res.ok) continue;
        
        const data = await res.json();
        for (const job of (data.data || []).slice(0, Math.ceil(max / locations.length / searchKws.length))) {
          if (!isExecutiveTitle(job.job_title || '')) continue;
          opps.push({
            id: `jsearch-${job.job_id}-${Date.now()}`,
            title: job.job_title || 'Executive Position',
            company: job.employer_name || 'Company',
            location: `${job.job_city || ''}, ${job.job_country || ''}`.replace(/^, |, $/g, '') || location,
            salary_range: job.job_min_salary && job.job_max_salary ? `${job.job_salary_currency || '$'}${job.job_min_salary.toLocaleString()} - ${job.job_max_salary.toLocaleString()}` : 'Competitive',
            status: 'New', source: job.job_publisher || 'JSearch',
            posted_date: job.job_posted_at_datetime_utc ? new Date(job.job_posted_at_datetime_utc).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            description: (job.job_description || '').substring(0, 1500),
            match_score: 0, url: job.job_apply_link || job.job_google_link || 'https://linkedin.com/jobs',
            verified: true, verification_score: 95,
            data_quality: 'verified', source_reliability: 'high',
            scraped_at: new Date().toISOString()
          });
        }
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        console.error('JSearch:', e);
      }
    }
  }
  return opps;
}

// 3. Arbeitnow (FREE)
async function fetchFromArbeitnow(configs: { region: string; config: typeof REGION_CONFIGS[string] }[], keywords: string[], max: number): Promise<VerifiedOpportunity[]> {
  const opps: VerifiedOpportunity[] = [];
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api');
    if (!res.ok) return [];
    const data = await res.json();
    
    const regionLocs = configs.flatMap(c => c.config.locations.map(l => l.toLowerCase()));
    for (const job of (data.data || []).filter((j: any) => isExecutiveTitle(j.title || '') || (j.title || '').toLowerCase().includes('senior')).slice(0, max * 2)) {
      const loc = (job.location || '').toLowerCase();
      const matches = regionLocs.some(l => loc.includes(l)) || job.remote || loc.includes('europe') || loc.includes('remote');
      if (!matches) continue;
      opps.push({
        id: `arbeitnow-${job.slug}-${Date.now()}`,
        title: job.title || 'Position',
        company: job.company_name || 'Company',
        location: job.remote ? `${job.location || 'Europe'} (Remote)` : (job.location || 'Europe'),
        salary_range: 'Competitive', status: 'New', source: 'Arbeitnow',
        posted_date: job.created_at ? new Date(job.created_at * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: (job.description || '').substring(0, 1500),
        match_score: 0, url: job.url || 'https://arbeitnow.com',
        verified: true, verification_score: 85,
        data_quality: 'verified', source_reliability: 'high',
        scraped_at: new Date().toISOString()
      });
    }
  } catch (e) { console.error('Arbeitnow:', e); }
  return opps.slice(0, max);
}

// 4. Remotive (FREE)
async function fetchFromRemotive(keywords: string[], max: number): Promise<VerifiedOpportunity[]> {
  const opps: VerifiedOpportunity[] = [];
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=500');
    if (!res.ok) return [];
    const data = await res.json();
    for (const job of (data.jobs || []).filter((j: any) => isExecutiveTitle(j.title || '') || (j.title || '').toLowerCase().includes('senior') || (j.title || '').toLowerCase().includes('lead')).slice(0, max)) {
      opps.push({
        id: `remotive-${job.id}-${Date.now()}`,
        title: job.title || 'Position',
        company: job.company_name || 'Company',
        location: job.candidate_required_location || 'Remote',
        salary_range: job.salary || 'Competitive', status: 'New', source: 'Remotive',
        posted_date: job.publication_date ? new Date(job.publication_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: (job.description || '').substring(0, 1500),
        match_score: 0, url: job.url || 'https://remotive.com',
        verified: true, verification_score: 80,
        data_quality: 'verified', source_reliability: 'high',
        scraped_at: new Date().toISOString()
      });
    }
  } catch (e) { console.error('Remotive:', e); }
  return opps;
}

// 5. The Muse (FREE)
async function fetchFromTheMuse(regions: string[], max: number): Promise<VerifiedOpportunity[]> {
  const opps: VerifiedOpportunity[] = [];
  try {
    for (const level of ['Senior Level', 'Management', 'Executive']) {
      const res = await fetch(`https://www.themuse.com/api/public/jobs?page=1&level=${encodeURIComponent(level)}&descending=true`);
      if (!res.ok) continue;
      const data = await res.json();
      for (const job of (data.results || []).filter((j: any) => isExecutiveTitle(j.name || '') || level === 'Executive').slice(0, Math.ceil(max / 3))) {
        opps.push({
          id: `muse-${job.id}-${Date.now()}`,
          title: job.name || 'Position',
          company: job.company?.name || 'Company',
          location: job.locations?.map((l: any) => l.name).join(', ') || 'USA',
          salary_range: 'Competitive', status: 'New', source: 'The Muse',
          posted_date: job.publication_date ? new Date(job.publication_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          description: (job.contents || '').substring(0, 1500),
          match_score: 0, url: job.refs?.landing_page || `https://themuse.com/jobs/${job.id}`,
          verified: true, verification_score: 85,
          data_quality: 'verified', source_reliability: 'high',
          scraped_at: new Date().toISOString()
        });
      }
      await new Promise(r => setTimeout(r, 200));
    }
  } catch (e) { console.error('TheMuse:', e); }
  return opps.slice(0, max);
}

// 6. Jobicy (FREE - no auth required) - NEW!
async function fetchFromJobicy(regions: string[], max: number): Promise<VerifiedOpportunity[]> {
  const opps: VerifiedOpportunity[] = [];
  try {
    // Get Jobicy region codes
    const jobicyGeos = [...new Set(regions.flatMap(r => JOBICY_REGIONS[r] || ['worldwide']))];
    
    for (const geo of jobicyGeos.slice(0, 3)) {
      const url = `https://jobicy.com/api/v2/remote-jobs?count=100&geo=${geo}`;
      const res = await fetch(url);
      if (!res.ok) continue;
      
      const data = await res.json();
      for (const job of (data.jobs || []).slice(0, Math.ceil(max / jobicyGeos.length))) {
        if (!isExecutiveTitle(job.jobTitle || '') && !(job.jobTitle || '').toLowerCase().includes('senior') && !(job.jobTitle || '').toLowerCase().includes('lead')) continue;
        
        opps.push({
          id: `jobicy-${job.id}-${Date.now()}`,
          title: job.jobTitle || 'Position',
          company: job.companyName || 'Company',
          location: job.jobGeo || 'Remote',
          salary_range: job.annualSalaryMin && job.annualSalaryMax 
            ? `$${job.annualSalaryMin.toLocaleString()} - $${job.annualSalaryMax.toLocaleString()}` 
            : 'Competitive',
          status: 'New', source: 'Jobicy',
          posted_date: job.pubDate ? new Date(job.pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          description: (job.jobDescription || job.jobExcerpt || '').substring(0, 1500),
          match_score: 0, url: job.url || 'https://jobicy.com',
          verified: true, verification_score: 85,
          data_quality: 'verified', source_reliability: 'high',
          scraped_at: new Date().toISOString(),
          industry: job.jobIndustry?.[0] || undefined
        });
      }
      await new Promise(r => setTimeout(r, 200));
    }
  } catch (e) { console.error('Jobicy:', e); }
  return opps.slice(0, max);
}

// 7. Himalayas (FREE - no auth required) - NEW!
async function fetchFromHimalayas(keywords: string[], max: number): Promise<VerifiedOpportunity[]> {
  const opps: VerifiedOpportunity[] = [];
  try {
    // Himalayas offers a free public API
    const res = await fetch('https://himalayas.app/jobs/api?limit=200');
    if (!res.ok) return [];
    
    const data = await res.json();
    for (const job of (data.jobs || []).filter((j: any) => 
      isExecutiveTitle(j.title || '') || 
      (j.title || '').toLowerCase().includes('senior') || 
      (j.title || '').toLowerCase().includes('lead') ||
      (j.title || '').toLowerCase().includes('manager')
    ).slice(0, max)) {
      opps.push({
        id: `himalayas-${job.id || Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title: job.title || 'Position',
        company: job.companyName || job.company?.name || 'Company',
        location: job.locationRestrictions?.join(', ') || 'Remote',
        salary_range: job.minSalary && job.maxSalary 
          ? `$${job.minSalary.toLocaleString()} - $${job.maxSalary.toLocaleString()}` 
          : 'Competitive',
        status: 'New', source: 'Himalayas',
        posted_date: job.pubDate || job.publishedAt ? new Date(job.pubDate || job.publishedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: (job.description || job.excerpt || '').substring(0, 1500),
        match_score: 0, url: job.applicationUrl || job.url || `https://himalayas.app/jobs/${job.slug || job.id}`,
        verified: true, verification_score: 80,
        data_quality: 'verified', source_reliability: 'high',
        scraped_at: new Date().toISOString(),
        industry: job.categories?.[0] || undefined
      });
    }
  } catch (e) { console.error('Himalayas:', e); }
  return opps;
}

// 8. Landing.jobs (FREE - EU tech jobs) - NEW!
async function fetchFromLandingJobs(regions: string[], keywords: string[], max: number): Promise<VerifiedOpportunity[]> {
  const opps: VerifiedOpportunity[] = [];
  try {
    // Landing.jobs focuses on European tech jobs - perfect for SEE, DACH, etc.
    const europeanRegions = ['SEE', 'DACH', 'Nordics', 'UK', 'Eastern Europe', 'Benelux', 'France', 'Italy', 'Iberia', 'Baltics'];
    const isEuropean = regions.some(r => europeanRegions.includes(r));
    
    if (!isEuropean) return [];
    
    const res = await fetch('https://landing.jobs/api/v1/jobs?limit=100&hd=true');
    if (!res.ok) return [];
    
    const data = await res.json();
    for (const job of (data.jobs || data || []).filter((j: any) => 
      isExecutiveTitle(j.title || j.job_title || '') || 
      (j.title || j.job_title || '').toLowerCase().includes('senior') ||
      (j.title || j.job_title || '').toLowerCase().includes('head')
    ).slice(0, max)) {
      opps.push({
        id: `landingjobs-${job.id || Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        title: job.title || job.job_title || 'Position',
        company: job.company?.name || job.company_name || 'Company',
        location: job.city || job.location || 'Europe',
        salary_range: job.salary_from && job.salary_to 
          ? `€${job.salary_from.toLocaleString()} - €${job.salary_to.toLocaleString()}` 
          : 'Competitive',
        status: 'New', source: 'Landing.jobs',
        posted_date: job.published_at || job.created_at ? new Date(job.published_at || job.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: (job.description || job.role_description || '').substring(0, 1500),
        match_score: 0, url: job.url || job.job_url || 'https://landing.jobs',
        verified: true, verification_score: 88,
        data_quality: 'verified', source_reliability: 'high',
        scraped_at: new Date().toISOString()
      });
    }
  } catch (e) { console.error('Landing.jobs:', e); }
  return opps;
}

// 9. Findwork.dev (FREE with API key)
async function fetchFromFindwork(regions: string[], keywords: string[], apiKey: string, max: number): Promise<VerifiedOpportunity[]> {
  const opps: VerifiedOpportunity[] = [];
  try {
    const search = keywords.length > 0 ? keywords.slice(0, 2).join(' ') : 'director manager';
    const res = await fetch(`https://findwork.dev/api/jobs/?search=${encodeURIComponent(search)}&sort_by=date`, {
      headers: { 'Authorization': `Token ${apiKey}` }
    });
    if (!res.ok) return [];
    
    const data = await res.json();
    for (const job of (data.results || []).filter((j: any) => 
      isExecutiveTitle(j.role || '') || 
      (j.role || '').toLowerCase().includes('senior')
    ).slice(0, max)) {
      opps.push({
        id: `findwork-${job.id}-${Date.now()}`,
        title: job.role || 'Position',
        company: job.company_name || 'Company',
        location: job.location || 'Remote',
        salary_range: 'Competitive', status: 'New', source: 'Findwork',
        posted_date: job.date_posted ? new Date(job.date_posted).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: (job.text || job.description || '').substring(0, 1500),
        match_score: 0, url: job.url || 'https://findwork.dev',
        verified: true, verification_score: 85,
        data_quality: 'verified', source_reliability: 'high',
        scraped_at: new Date().toISOString()
      });
    }
  } catch (e) { console.error('Findwork:', e); }
  return opps;
}

// 10. USAJobs (FREE government jobs)
async function fetchFromUSAJobs(keywords: string[], apiKey: string, email: string, max: number): Promise<VerifiedOpportunity[]> {
  const opps: VerifiedOpportunity[] = [];
  try {
    const search = keywords.length > 0 ? keywords.slice(0, 2).join(' ') : 'Director Executive';
    const res = await fetch(`https://data.usajobs.gov/api/search?Keyword=${encodeURIComponent(search)}&ResultsPerPage=${max}`, {
      headers: {
        'Authorization-Key': apiKey,
        'User-Agent': email
      }
    });
    if (!res.ok) return [];
    
    const data = await res.json();
    for (const result of (data.SearchResult?.SearchResultItems || []).slice(0, max)) {
      const job = result.MatchedObjectDescriptor;
      if (!job) continue;
      
      const title = job.PositionTitle || '';
      if (!isExecutiveTitle(title) && !title.toLowerCase().includes('director') && !title.toLowerCase().includes('executive')) continue;
      
      opps.push({
        id: `usajobs-${job.PositionID}-${Date.now()}`,
        title: job.PositionTitle || 'Position',
        company: job.OrganizationName || job.DepartmentName || 'US Government',
        location: job.PositionLocationDisplay || 'USA',
        salary_range: job.PositionRemuneration?.[0] 
          ? `$${job.PositionRemuneration[0].MinimumRange} - $${job.PositionRemuneration[0].MaximumRange}` 
          : 'Competitive',
        status: 'New', source: 'USAJobs',
        posted_date: job.PublicationStartDate ? new Date(job.PublicationStartDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        description: (job.UserArea?.Details?.JobSummary || job.QualificationSummary || '').substring(0, 1500),
        match_score: 0, url: job.PositionURI || 'https://usajobs.gov',
        verified: true, verification_score: 95,
        data_quality: 'verified', source_reliability: 'high',
        scraped_at: new Date().toISOString()
      });
    }
  } catch (e) { console.error('USAJobs:', e); }
  return opps;
}

// 11. LinkedIn via Firecrawl or AI fallback
async function fetchFromLinkedIn(regions: string[], keywords: string[], firecrawlKey: string, lovableKey: string, max: number): Promise<{ opportunities: VerifiedOpportunity[]; firecrawlFailed: boolean }> {
  const opps: VerifiedOpportunity[] = [];
  let failed = !firecrawlKey;
  
  const geoIds = [...new Map(regions.flatMap(r => LINKEDIN_GEOID_MAP[r] || LINKEDIN_GEOID_MAP['Europe'] || []).map(g => [g.geoId, g])).values()].slice(0, 5);
  
  if (firecrawlKey) {
    for (const geo of geoIds) {
      try {
        const kw = keywords.slice(0, 2).join(' OR ') || 'CEO OR Director';
        const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(kw)}&f_E=5%2C6&f_TPR=r604800&geoId=${geo.geoId}`;
        
        const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, formats: ['markdown', 'links'], onlyMainContent: true, waitFor: 3000 })
        });
        
        if (res.status === 402 || res.status === 429) { failed = true; break; }
        if (!res.ok) continue;
        
        const data = await res.json();
        const md = data.data?.markdown || '';
        const links = data.data?.links || [];
        
        const parsed = parseLinkedInMarkdown(md, links, geo.name);
        opps.push(...parsed);
        await new Promise(r => setTimeout(r, 1500));
      } catch (e) { console.error('LinkedIn Firecrawl:', e); }
    }
  }
  
  // AI fallback
  if (failed && lovableKey) {
    for (const geo of geoIds.slice(0, 3)) {
      try {
        const res = await fetch('https://api.lovable.dev/v1/ai', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: `Find current executive job openings in ${geo.name} from LinkedIn. Return JSON: [{"title":"","company":"","location":"","url":""}]` }],
            tools: [{ type: 'web_search', search: { enabled: true, context_size: 'high' } }]
          })
        });
        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content || '';
          const match = content.match(/\[[\s\S]*\]/);
          if (match) {
            for (const job of JSON.parse(match[0])) {
              if (job.title && job.company && isExecutiveTitle(job.title)) {
                opps.push({
                  id: `linkedin-ai-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                  title: job.title.substring(0, 100),
                  company: job.company.substring(0, 80),
                  location: job.location || geo.name,
                  salary_range: 'Competitive', status: 'New', source: 'LinkedIn',
                  posted_date: new Date().toISOString().split('T')[0],
                  description: `Executive opportunity at ${job.company}`,
                  match_score: 0, url: job.url || 'https://linkedin.com/jobs',
                  verified: true, verification_score: 85,
                  data_quality: 'scraped', source_reliability: 'high',
                  scraped_at: new Date().toISOString()
                });
              }
            }
          }
        }
        await new Promise(r => setTimeout(r, 800));
      } catch (e) { console.error('LinkedIn AI:', e); }
    }
  }
  return { opportunities: opps.slice(0, max), firecrawlFailed: failed };
}

function parseLinkedInMarkdown(markdown: string, links: string[], regionName: string): VerifiedOpportunity[] {
  const opps: VerifiedOpportunity[] = [];
  const jobLinks = links.filter(l => l.includes('linkedin.com/jobs'));
  const patterns = [
    /([A-Z][^.!?\n]{5,80})\s+at\s+([A-Z][^.!?\n\-]{2,50})/gi,
    /([A-Z][^.!?\n]{5,80})\s+[-–]\s+([A-Z][^.!?\n]{2,50})/gi
  ];
  
  const found: { title: string; company: string }[] = [];
  for (const pat of patterns) {
    let m;
    while ((m = pat.exec(markdown)) !== null) {
      if (isExecutiveTitle(m[1]) && m[1].length < 100 && m[2].length < 80) {
        found.push({ title: m[1].trim(), company: m[2].trim() });
      }
    }
  }
  
  for (let i = 0; i < Math.min(found.length, 20); i++) {
    opps.push({
      id: `linkedin-${Date.now()}-${i}`,
      title: found[i].title.substring(0, 100),
      company: found[i].company.substring(0, 80),
      location: regionName,
      salary_range: 'Competitive', status: 'New', source: 'LinkedIn',
      posted_date: new Date().toISOString().split('T')[0],
      description: `Executive opportunity at ${found[i].company}`,
      match_score: 0, url: jobLinks[i] || 'https://linkedin.com/jobs',
      verified: true, verification_score: 95,
      data_quality: 'verified', source_reliability: 'high',
      scraped_at: new Date().toISOString()
    });
  }
  return opps;
}

async function generateAIOpportunities(configs: { region: string; config: typeof REGION_CONFIGS[string] }[], targetRole: string, industries: string, bio: string, apiKey: string, count: number): Promise<VerifiedOpportunity[]> {
  const all: VerifiedOpportunity[] = [];
  for (const { region, config } of configs) {
    try {
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: `Expert recruiter for ${region}.` },
            { role: 'user', content: `Generate ${Math.ceil(count / configs.length)} executive opportunities for ${region}. Companies: ${config.realCompanies.slice(0, 15).join(', ')}. Locations: ${config.locations.slice(0, 5).join(', ')}. Target: ${targetRole}. Industries: ${industries}. Return JSON array: [{"title":"","company":"","location":"","salary_range":"","description":"","match_score":85}]` }
          ],
          max_tokens: 5000, temperature: 0.7
        })
      });
      if (!res.ok) continue;
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        for (const opp of JSON.parse(match[0])) {
          all.push({
            id: `ai-${region.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            title: opp.title || 'Executive Position',
            company: opp.company || config.realCompanies[0],
            location: opp.location || config.locations[0],
            salary_range: opp.salary_range || `${config.currency}Competitive`,
            status: 'New', source: 'AI Market Analysis',
            posted_date: new Date().toISOString().split('T')[0],
            description: opp.description || '',
            match_score: opp.match_score || 70,
            url: 'https://linkedin.com/jobs',
            verified: false, verification_score: 30,
            data_quality: 'ai_generated', source_reliability: 'medium'
          });
        }
      }
    } catch (e) { console.error('AI gen:', e); }
  }
  return all;
}

async function scoreOpportunities(opps: VerifiedOpportunity[], targetRole: string, industries: string, bio: string, apiKey: string): Promise<VerifiedOpportunity[]> {
  if (opps.length === 0) return [];
  try {
    const batch = 50;
    const results: VerifiedOpportunity[] = [];
    for (let i = 0; i < opps.length; i += batch) {
      const chunk = opps.slice(i, i + batch);
      const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Career advisor. Score jobs 0-100 based on fit.' },
            { role: 'user', content: `Score for ${targetRole} in ${industries}. Jobs: ${JSON.stringify(chunk.map(o => ({ t: o.title, c: o.company })))}. Return: [{"i":0,"s":85}]` }
          ],
          max_tokens: 2000
        })
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '';
        const match = content.match(/\[[\s\S]*\]/);
        if (match) {
          const scores = JSON.parse(match[0]);
          chunk.forEach((o, idx) => {
            const s = scores.find((x: any) => x.i === idx || x.index === idx);
            results.push({ ...o, match_score: s?.s || s?.score || s?.match_score || o.match_score || 60 });
          });
        } else results.push(...chunk);
      } else results.push(...chunk);
    }
    return results;
  } catch (e) {
    console.error('Scoring:', e);
    return opps;
  }
}
