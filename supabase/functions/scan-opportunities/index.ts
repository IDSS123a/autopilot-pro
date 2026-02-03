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

// Region name normalization - maps frontend names to config keys
const REGION_NAME_MAP: Record<string, string> = {
  'see (southeast europe)': 'SEE',
  'southeast europe': 'SEE',
  'see': 'SEE',
  'dach (germany, austria, switzerland)': 'DACH',
  'dach': 'DACH',
  'nordics': 'Nordics',
  'uk & ireland': 'UK',
  'uk': 'UK',
  'north america': 'North America',
  'middle east': 'Middle East',
  'asia': 'Asia',
  'oceania': 'Oceania',
  'eastern europe': 'Eastern Europe',
  'latin america': 'Latin America',
  'africa': 'Africa',
  'benelux': 'Benelux',
  'france': 'France',
  'iberia': 'Iberia',
  'italy': 'Italy',
  'baltics': 'Baltics',
  'south asia': 'Asia',
  'southeast asia': 'Asia',
  'east asia': 'Asia',
};

// Region to Adzuna country mapping
const ADZUNA_COUNTRIES: Record<string, string[]> = {
  'DACH': ['de', 'at', 'ch'],
  'UK': ['gb'],
  'North America': ['us', 'ca'],
  'Nordics': ['se', 'no', 'dk', 'fi'],
  'SEE': ['pl'], // Closest Adzuna market for SEE
  'Eastern Europe': ['pl', 'cz', 'hu', 'ro'],
  'Asia': ['sg', 'in'],
  'Oceania': ['au', 'nz'],
  'Middle East': ['ae'],
  'Latin America': ['br', 'mx'],
  'Africa': ['za'],
  'Benelux': ['nl', 'be'],
  'France': ['fr'],
  'Italy': ['it'],
  'Iberia': ['es', 'pt'],
};

// Region to JSearch location mapping - STRICT location queries
const JSEARCH_LOCATIONS: Record<string, string[]> = {
  'DACH': ['Germany', 'Munich Germany', 'Berlin Germany', 'Austria', 'Vienna Austria', 'Switzerland', 'Zurich Switzerland'],
  'SEE': ['Croatia', 'Zagreb Croatia', 'Serbia', 'Belgrade Serbia', 'Slovenia', 'Ljubljana Slovenia', 'Bosnia Herzegovina', 'Sarajevo', 'North Macedonia', 'Skopje', 'Montenegro', 'Podgorica', 'Albania', 'Tirana', 'Kosovo', 'Pristina'],
  'Nordics': ['Sweden', 'Stockholm Sweden', 'Norway', 'Oslo Norway', 'Denmark', 'Copenhagen Denmark', 'Finland', 'Helsinki Finland'],
  'UK': ['United Kingdom', 'London UK', 'Manchester UK', 'Dublin Ireland', 'Ireland'],
  'North America': ['United States', 'New York USA', 'San Francisco USA', 'Los Angeles USA', 'Canada', 'Toronto Canada'],
  'Middle East': ['United Arab Emirates', 'Dubai UAE', 'Saudi Arabia', 'Riyadh', 'Israel', 'Tel Aviv Israel', 'Qatar', 'Doha'],
  'Asia': ['Singapore', 'Hong Kong', 'Japan', 'Tokyo Japan', 'India', 'Bangalore India', 'Mumbai India'],
  'Oceania': ['Australia', 'Sydney Australia', 'Melbourne Australia', 'New Zealand', 'Auckland New Zealand'],
  'Eastern Europe': ['Poland', 'Warsaw Poland', 'Czech Republic', 'Prague', 'Hungary', 'Budapest Hungary', 'Romania', 'Bucharest Romania', 'Bulgaria', 'Sofia Bulgaria'],
  'Latin America': ['Brazil', 'Sao Paulo Brazil', 'Argentina', 'Buenos Aires Argentina', 'Mexico', 'Mexico City Mexico', 'Chile', 'Colombia'],
  'Africa': ['South Africa', 'Johannesburg South Africa', 'Cape Town', 'Nigeria', 'Lagos Nigeria', 'Kenya', 'Nairobi Kenya'],
  'Benelux': ['Netherlands', 'Amsterdam Netherlands', 'Belgium', 'Brussels Belgium', 'Luxembourg'],
  'France': ['France', 'Paris France', 'Lyon France'],
  'Italy': ['Italy', 'Milan Italy', 'Rome Italy'],
  'Iberia': ['Spain', 'Madrid Spain', 'Barcelona Spain', 'Portugal', 'Lisbon Portugal'],
  'Baltics': ['Estonia', 'Tallinn Estonia', 'Latvia', 'Riga Latvia', 'Lithuania', 'Vilnius Lithuania'],
};

// Location keywords for strict filtering - jobs MUST contain these to be included
const REGION_LOCATION_KEYWORDS: Record<string, string[]> = {
  'SEE': ['croatia', 'zagreb', 'split', 'rijeka', 'serbia', 'belgrade', 'novi sad', 'slovenia', 'ljubljana', 'maribor', 'bosnia', 'sarajevo', 'banja luka', 'macedonia', 'skopje', 'montenegro', 'podgorica', 'albania', 'tirana', 'kosovo', 'pristina', 'balkan'],
  'DACH': ['germany', 'deutschland', 'munich', 'münchen', 'berlin', 'frankfurt', 'hamburg', 'austria', 'österreich', 'vienna', 'wien', 'switzerland', 'schweiz', 'zurich', 'zürich', 'geneva', 'genf', 'basel'],
  'Nordics': ['sweden', 'sverige', 'stockholm', 'gothenburg', 'norway', 'norge', 'oslo', 'bergen', 'denmark', 'danmark', 'copenhagen', 'finland', 'suomi', 'helsinki'],
  'UK': ['united kingdom', 'uk', 'london', 'manchester', 'birmingham', 'leeds', 'glasgow', 'edinburgh', 'ireland', 'dublin', 'belfast', 'britain', 'british'],
  'North America': ['usa', 'united states', 'america', 'new york', 'california', 'san francisco', 'los angeles', 'chicago', 'boston', 'seattle', 'austin', 'texas', 'canada', 'toronto', 'vancouver', 'montreal'],
  'Middle East': ['uae', 'dubai', 'abu dhabi', 'saudi', 'riyadh', 'jeddah', 'qatar', 'doha', 'bahrain', 'israel', 'tel aviv', 'kuwait', 'oman'],
  'Asia': ['singapore', 'hong kong', 'japan', 'tokyo', 'osaka', 'china', 'shanghai', 'beijing', 'korea', 'seoul', 'india', 'mumbai', 'bangalore', 'delhi', 'malaysia', 'kuala lumpur', 'thailand', 'bangkok', 'vietnam', 'indonesia', 'jakarta'],
  'Oceania': ['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'new zealand', 'auckland', 'wellington'],
  'Eastern Europe': ['poland', 'warsaw', 'krakow', 'czech', 'prague', 'hungary', 'budapest', 'romania', 'bucharest', 'bulgaria', 'sofia'],
  'Latin America': ['brazil', 'brasil', 'sao paulo', 'rio de janeiro', 'argentina', 'buenos aires', 'mexico', 'ciudad de mexico', 'chile', 'santiago', 'colombia', 'bogota', 'peru', 'lima'],
  'Africa': ['south africa', 'johannesburg', 'cape town', 'nigeria', 'lagos', 'kenya', 'nairobi', 'egypt', 'cairo', 'morocco', 'casablanca'],
  'Benelux': ['netherlands', 'holland', 'amsterdam', 'rotterdam', 'belgium', 'brussels', 'antwerp', 'luxembourg'],
  'France': ['france', 'paris', 'lyon', 'marseille', 'toulouse'],
  'Italy': ['italy', 'italia', 'milan', 'milano', 'rome', 'roma', 'turin', 'torino'],
  'Iberia': ['spain', 'españa', 'madrid', 'barcelona', 'portugal', 'lisbon', 'lisboa', 'porto'],
  'Baltics': ['estonia', 'tallinn', 'latvia', 'riga', 'lithuania', 'vilnius'],
};
// Industry categories for filtering
const INDUSTRY_CATEGORIES = [
  'Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail',
  'Energy', 'Telecommunications', 'Automotive', 'Consulting', 'Media',
  'Real Estate', 'Logistics', 'Pharma', 'Insurance', 'Education'
];

// Experience levels
const EXPERIENCE_LEVELS = [
  { id: 'c_level', name: 'C-Level', keywords: ['ceo', 'cto', 'cfo', 'coo', 'cmo', 'cio', 'cdo', 'cpo', 'chief'] },
  { id: 'vp', name: 'VP/SVP/EVP', keywords: ['vice president', 'vp', 'svp', 'evp', 'senior vice'] },
  { id: 'director', name: 'Director/Head', keywords: ['director', 'head of', 'senior director'] },
  { id: 'manager', name: 'Senior Manager', keywords: ['senior manager', 'manager', 'lead'] }
];

// The Muse location mappings
const MUSE_LOCATIONS: Record<string, string[]> = {
  'DACH': ['Berlin, Germany', 'Munich, Germany', 'Frankfurt, Germany', 'Zurich, Switzerland', 'Vienna, Austria'],
  'UK': ['London, United Kingdom', 'Manchester, United Kingdom', 'Dublin, Ireland'],
  'North America': ['New York City Metro Area', 'San Francisco Bay Area', 'Los Angeles CA', 'Chicago IL', 'Seattle WA', 'Austin TX', 'Boston MA', 'Toronto, Canada'],
  'SEE': ['Europe'],
  'Nordics': ['Europe'],
  'Eastern Europe': ['Europe'],
  'Middle East': ['Dubai, United Arab Emirates'],
  'Asia': ['Singapore', 'Hong Kong', 'Tokyo, Japan', 'India'],
  'Oceania': ['Sydney, Australia', 'Melbourne, Australia'],
  'Latin America': ['Brazil', 'Mexico'],
  'Africa': ['South Africa'],
  'Benelux': ['Amsterdam, Netherlands', 'Brussels, Belgium'],
  'France': ['Paris, France'],
  'Italy': ['Milan, Italy', 'Rome, Italy'],
  'Iberia': ['Madrid, Spain', 'Barcelona, Spain', 'Lisbon, Portugal'],
  'Baltics': ['Europe'],
};

// Helper function to normalize region names
function normalizeRegionName(regionInput: string): string {
  const lower = regionInput.toLowerCase().trim();
  return REGION_NAME_MAP[lower] || regionInput;
}

// Helper function to filter jobs by region location - RELAXED for remote jobs
function jobMatchesRegion(job: VerifiedOpportunity, normalizedRegions: string[]): boolean {
  const locationLower = (job.location || '').toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  const companyLower = (job.company || '').toLowerCase();
  const titleLower = (job.title || '').toLowerCase();
  
  // ALWAYS include remote/worldwide jobs - they are available for all regions
  const remoteKeywords = ['remote', 'worldwide', 'global', 'anywhere', 'work from home', 'wfh', 'fully remote', 'distributed'];
  const isRemote = remoteKeywords.some(kw => 
    locationLower.includes(kw) || descLower.includes(kw) || titleLower.includes(kw)
  );
  if (isRemote) {
    console.log(`  ✅ Including remote job: ${job.title} at ${job.company}`);
    return true;
  }
  
  // Include jobs with generic "Europe" location for European regions
  const europeanRegions = ['SEE', 'DACH', 'Nordics', 'UK', 'Eastern Europe', 'Benelux', 'France', 'Italy', 'Iberia', 'Baltics'];
  const isEuropeanSearch = normalizedRegions.some(r => europeanRegions.includes(r));
  if (isEuropeanSearch) {
    const europeKeywords = ['europe', 'european', 'eu', 'emea'];
    const isEuropeWide = europeKeywords.some(kw => locationLower.includes(kw));
    if (isEuropeWide) {
      return true;
    }
  }
  
  for (const region of normalizedRegions) {
    const keywords = REGION_LOCATION_KEYWORDS[region] || [];
    for (const keyword of keywords) {
      if (locationLower.includes(keyword) || descLower.includes(keyword)) {
        return true;
      }
    }
    // Also check against config locations
    const config = REGION_CONFIGS[region];
    if (config) {
      for (const loc of config.locations) {
        if (locationLower.includes(loc.toLowerCase())) {
          return true;
        }
      }
      // Check if company is from this region
      for (const company of config.realCompanies) {
        if (companyLower.includes(company.toLowerCase())) {
          return true;
        }
      }
    }
  }
  return false;
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

// Executive titles for filtering
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
  'Vice President', 'SVP', 'EVP', 'Head of', 'Senior Director'
];

// Executive search keywords for API queries
const EXECUTIVE_KEYWORDS = [
  'CEO', 'CTO', 'CFO', 'COO', 'CMO',
  'Chief Executive', 'Chief Technology', 'Chief Financial', 'Chief Operating',
  'Vice President', 'VP', 'SVP', 'EVP',
  'Managing Director', 'General Manager',
  'Director', 'Head of', 'Senior Director',
  'C-Level', 'C-Suite', 'Executive'
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { regions, userProfile, daysBack = 7, maxResults = 500, industryFilter, experienceLevelFilter } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
    const ADZUNA_APP_ID = Deno.env.get('ADZUNA_APP_ID');
    const ADZUNA_API_KEY = Deno.env.get('ADZUNA_API_KEY');
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Starting comprehensive opportunity scan for regions:', regions);
    console.log('🔧 Filters - Industry:', industryFilter || 'All', 'Experience:', experienceLevelFilter || 'All');
    console.log('📊 API Keys available:', {
      rapidApi: !!RAPIDAPI_KEY,
      adzuna: !!ADZUNA_APP_ID && !!ADZUNA_API_KEY,
      firecrawl: !!FIRECRAWL_API_KEY
    });

    const targetRole = userProfile?.targetRole || 'Executive Leadership';
    const industries = userProfile?.industries || 'Technology, Finance, Manufacturing';
    const bio = userProfile?.bio || '';
    
    // Extract role keywords for search
    const roleKeywords = targetRole.split(/[\/\s,]+/).filter((k: string) => k.length > 2);

    // NORMALIZE region names from frontend to backend format
    const normalizedRegionNames: string[] = regions.map((r: string) => normalizeRegionName(r));
    console.log('📍 Normalized regions:', normalizedRegionNames);

    // Get configs for normalized regions
    const selectedConfigs: { region: string, config: typeof REGION_CONFIGS[string] }[] = [];
    for (const normalizedRegion of normalizedRegionNames) {
      const config = REGION_CONFIGS[normalizedRegion];
      if (config) {
        selectedConfigs.push({ region: normalizedRegion, config });
      } else {
        // Fallback: try partial match
        for (const [key, cfg] of Object.entries(REGION_CONFIGS)) {
          if (normalizedRegion.toLowerCase().includes(key.toLowerCase()) || 
              key.toLowerCase().includes(normalizedRegion.toLowerCase().split(' ')[0])) {
            selectedConfigs.push({ region: key, config: cfg });
            break;
          }
        }
      }
    }

    if (selectedConfigs.length === 0) {
      console.log('⚠️ No valid regions found, defaulting to SEE');
      selectedConfigs.push({ region: 'SEE', config: REGION_CONFIGS['SEE'] });
    }
    
    console.log('✅ Selected configs for regions:', selectedConfigs.map(c => c.region))

    const allOpportunities: VerifiedOpportunity[] = [];
    const searchStats = { 
      adzunaResults: 0,
      jsearchResults: 0,
      arbeitnowResults: 0,
      remotiveResults: 0,
      themuseResults: 0,
      firecrawlResults: 0,
      aiGenerated: 0,
      totalReturned: 0,
      apiErrors: [] as string[]
    };

    // PHASE 1: Adzuna API (Real verified job listings)
    if (ADZUNA_APP_ID && ADZUNA_API_KEY) {
      console.log('📡 Phase 1: Fetching from Adzuna API...');
      try {
        const adzunaJobs = await fetchFromAdzuna(
          selectedConfigs.map(c => c.region),
          roleKeywords,
          ADZUNA_APP_ID,
          ADZUNA_API_KEY,
          Math.ceil(maxResults / 4)
        );
        allOpportunities.push(...adzunaJobs);
        searchStats.adzunaResults = adzunaJobs.length;
        console.log(`✅ Adzuna: ${adzunaJobs.length} opportunities`);
      } catch (error) {
        console.error('❌ Adzuna API error:', error);
        searchStats.apiErrors.push('Adzuna: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }

    // PHASE 2: JSearch (RapidAPI) - LinkedIn, Indeed, Glassdoor aggregator
    if (RAPIDAPI_KEY) {
      console.log('📡 Phase 2: Fetching from JSearch (RapidAPI)...');
      try {
        const jsearchJobs = await fetchFromJSearch(
          selectedConfigs.map(c => c.region),
          roleKeywords,
          RAPIDAPI_KEY,
          Math.ceil(maxResults / 4)
        );
        allOpportunities.push(...jsearchJobs);
        searchStats.jsearchResults = jsearchJobs.length;
        console.log(`✅ JSearch: ${jsearchJobs.length} opportunities`);
      } catch (error) {
        console.error('❌ JSearch API error:', error);
        searchStats.apiErrors.push('JSearch: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }

    // PHASE 3: Arbeitnow API (Free, no key required - European focus)
    console.log('📡 Phase 3: Fetching from Arbeitnow (Free API)...');
    try {
      const arbeitnowJobs = await fetchFromArbeitnow(
        selectedConfigs,
        roleKeywords,
        Math.ceil(maxResults / 3) // Increased limit
      );
      allOpportunities.push(...arbeitnowJobs);
      searchStats.arbeitnowResults = arbeitnowJobs.length;
      console.log(`✅ Arbeitnow: ${arbeitnowJobs.length} opportunities`);
    } catch (error) {
      console.error('❌ Arbeitnow API error:', error);
      searchStats.apiErrors.push('Arbeitnow: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // PHASE 4: Remotive API (Free, no key required - Remote jobs focus)
    console.log('📡 Phase 4: Fetching from Remotive (Free API)...');
    try {
      const remotiveJobs = await fetchFromRemotive(
        roleKeywords,
        Math.ceil(maxResults / 3) // Increased limit
      );
      allOpportunities.push(...remotiveJobs);
      searchStats.remotiveResults = remotiveJobs.length;
      console.log(`✅ Remotive: ${remotiveJobs.length} opportunities`);
    } catch (error) {
      console.error('❌ Remotive API error:', error);
      searchStats.apiErrors.push('Remotive: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // PHASE 5: The Muse API (Free tier available)
    console.log('📡 Phase 5: Fetching from The Muse...');
    try {
      const museJobs = await fetchFromTheMuse(
        selectedConfigs.map(c => c.region),
        Math.ceil(maxResults / 6)
      );
      allOpportunities.push(...museJobs);
      searchStats.themuseResults = museJobs.length;
      console.log(`✅ The Muse: ${museJobs.length} opportunities`);
    } catch (error) {
      console.error('❌ The Muse API error:', error);
      searchStats.apiErrors.push('TheMuse: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // PHASE 6: Firecrawl as supplementary source (if available)
    if (FIRECRAWL_API_KEY && allOpportunities.length < maxResults / 2) {
      console.log('📡 Phase 6: Supplementing with Firecrawl scraping...');
      try {
        const firecrawlJobs = await scrapeWithFirecrawl(
          selectedConfigs,
          roleKeywords,
          FIRECRAWL_API_KEY,
          Math.min(30, maxResults / 10)
        );
        allOpportunities.push(...firecrawlJobs);
        searchStats.firecrawlResults = firecrawlJobs.length;
        console.log(`✅ Firecrawl: ${firecrawlJobs.length} opportunities`);
      } catch (error) {
        console.error('⚠️ Firecrawl limited:', error);
      }
    }

    // PHASE 7: AI-generated opportunities to fill gaps
    // For regions with limited API coverage (like SEE), generate more AI opportunities
    const realJobsCount = allOpportunities.length;
    const hasLimitedAPICoverage = selectedConfigs.some(c => 
      ['SEE', 'Eastern Europe', 'Baltics', 'Africa', 'Latin America', 'Middle East'].includes(c.region)
    );
    const aiThreshold = hasLimitedAPICoverage ? maxResults / 2 : maxResults / 3;
    
    if (realJobsCount < aiThreshold) {
      console.log('🤖 Phase 7: Generating AI market analysis opportunities...');
      console.log(`  Real jobs: ${realJobsCount}, threshold: ${aiThreshold}, generating AI opportunities...`);
      try {
        const aiOpportunities = await generateAIOpportunities(
          selectedConfigs,
          targetRole,
          industries,
          bio,
          LOVABLE_API_KEY,
          Math.min(150, maxResults - realJobsCount) // Generate more AI opportunities
        );
        allOpportunities.push(...aiOpportunities);
        searchStats.aiGenerated = aiOpportunities.length;
        console.log(`✅ AI Generated: ${aiOpportunities.length} opportunities`);
      } catch (error) {
        console.error('❌ AI generation error:', error);
      }
    }

    // PHASE 8: STRICT REGION FILTERING - Remove jobs from wrong regions
    console.log('🌍 Phase 8: Applying strict region filtering...');
    const regionFilteredOpportunities = allOpportunities.filter(opp => {
      // AI-generated jobs are already region-specific
      if (opp.data_quality === 'ai_generated') return true;
      
      // For scraped/verified jobs, check if location matches selected regions
      return jobMatchesRegion(opp, selectedConfigs.map(c => c.region));
    });
    
    const filteredOutCount = allOpportunities.length - regionFilteredOpportunities.length;
    console.log(`🚫 Filtered out ${filteredOutCount} jobs from non-matching regions`);

    // PHASE 9: Apply industry filter if specified
    let industryFilteredOpps = regionFilteredOpportunities;
    if (industryFilter && industryFilter !== 'all') {
      const industryLower = industryFilter.toLowerCase();
      industryFilteredOpps = regionFilteredOpportunities.filter(opp => {
        const descLower = (opp.description || '').toLowerCase();
        const titleLower = (opp.title || '').toLowerCase();
        const companyLower = (opp.company || '').toLowerCase();
        return descLower.includes(industryLower) || 
               titleLower.includes(industryLower) || 
               companyLower.includes(industryLower) ||
               opp.industry?.toLowerCase().includes(industryLower);
      });
      console.log(`🏭 Industry filter "${industryFilter}": ${industryFilteredOpps.length} jobs`);
    }

    // PHASE 10: Apply experience level filter if specified
    let experienceFilteredOpps = industryFilteredOpps;
    if (experienceLevelFilter && experienceLevelFilter !== 'all') {
      const levelConfig = EXPERIENCE_LEVELS.find(l => l.id === experienceLevelFilter);
      if (levelConfig) {
        experienceFilteredOpps = industryFilteredOpps.filter(opp => {
          const titleLower = (opp.title || '').toLowerCase();
          return levelConfig.keywords.some(kw => titleLower.includes(kw));
        });
        console.log(`📊 Experience filter "${experienceLevelFilter}": ${experienceFilteredOpps.length} jobs`);
      }
    }

    // PHASE 11: Score all opportunities with AI
    console.log('🎯 Phase 11: Calculating match scores...');
    const scoredOpportunities = await scoreOpportunities(
      experienceFilteredOpps,
      targetRole,
      industries,
      bio,
      LOVABLE_API_KEY
    );

    // Sort by match score and data quality
    scoredOpportunities.sort((a, b) => {
      const aQuality = a.data_quality === 'verified' ? 3 : a.data_quality === 'scraped' ? 2 : 1;
      const bQuality = b.data_quality === 'verified' ? 3 : b.data_quality === 'scraped' ? 2 : 1;
      if (aQuality !== bQuality) return bQuality - aQuality;
      return (b.match_score || 0) - (a.match_score || 0);
    });

    // Deduplicate by company + title
    const seen = new Set<string>();
    const uniqueOpportunities = scoredOpportunities.filter(opp => {
      const key = `${opp.company?.toLowerCase()}-${opp.title?.toLowerCase()}`.replace(/\s+/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    searchStats.totalReturned = uniqueOpportunities.length;
    
    console.log(`📈 Total unique opportunities after all filters: ${uniqueOpportunities.length}`);
    console.log('📊 Stats:', searchStats);

    return new Response(
      JSON.stringify({ 
        opportunities: uniqueOpportunities.slice(0, maxResults),
        stats: {
          totalReturned: uniqueOpportunities.length,
          breakdown: {
            adzuna: searchStats.adzunaResults,
            jsearch: searchStats.jsearchResults,
            arbeitnow: searchStats.arbeitnowResults,
            remotive: searchStats.remotiveResults,
            themuse: searchStats.themuseResults,
            firecrawl: searchStats.firecrawlResults,
            ai_generated: searchStats.aiGenerated
          },
          dataQualityBreakdown: {
            verified: uniqueOpportunities.filter(o => o.data_quality === 'verified').length,
            scraped: uniqueOpportunities.filter(o => o.data_quality === 'scraped').length,
            ai_generated: uniqueOpportunities.filter(o => o.data_quality === 'ai_generated').length
          },
          regionsSearched: selectedConfigs.map(c => c.region),
          apiErrors: searchStats.apiErrors
        }
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

// ===== API FETCHING FUNCTIONS =====

// Adzuna API - Real verified job listings
async function fetchFromAdzuna(
  regions: string[],
  keywords: string[],
  appId: string,
  apiKey: string,
  maxResults: number
): Promise<VerifiedOpportunity[]> {
  const opportunities: VerifiedOpportunity[] = [];
  const perCountryLimit = Math.ceil(maxResults / 5);
  
  // Get all Adzuna countries for selected regions
  const countries: string[] = [];
  for (const region of regions) {
    const regionCountries = ADZUNA_COUNTRIES[region] || [];
    countries.push(...regionCountries);
  }
  
  // Use unique countries
  const uniqueCountries = [...new Set(countries)].slice(0, 5);
  
  for (const country of uniqueCountries) {
    try {
      // Search for executive roles
      const searchTerms = keywords.length > 0 ? keywords.slice(0, 2).join(' OR ') : 'CEO OR Director OR VP';
      
      const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${apiKey}&results_per_page=${perCountryLimit}&what=${encodeURIComponent(searchTerms)}&what_or=executive manager director&max_days_old=7&sort_by=date`;
      
      console.log(`  Adzuna query: ${country} - ${searchTerms.substring(0, 30)}...`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log(`  Adzuna ${country}: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        for (const job of data.results) {
          // Filter for executive-level positions
          const isExecutive = EXECUTIVE_TITLES.some(title => 
            job.title?.toLowerCase().includes(title.toLowerCase())
          );
          
          if (!isExecutive && !job.title?.toLowerCase().includes('senior')) continue;
          
          opportunities.push({
            id: `adzuna-${job.id || Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            title: job.title || 'Executive Position',
            company: job.company?.display_name || 'Company',
            location: job.location?.display_name || country.toUpperCase(),
            salary_range: job.salary_min && job.salary_max 
              ? `${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}` 
              : 'Competitive',
            status: 'New',
            source: 'Adzuna',
            posted_date: job.created ? new Date(job.created).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            description: job.description || '',
            match_score: 0,
            url: job.redirect_url || `https://adzuna.com`,
            verified: true,
            verification_score: 90,
            data_quality: 'verified',
            source_reliability: 'high',
            scraped_at: new Date().toISOString()
          });
        }
      }
      
      // Small delay between requests
      await new Promise(r => setTimeout(r, 200));
      
    } catch (error) {
      console.error(`Adzuna ${country} error:`, error);
    }
  }
  
  return opportunities;
}

// JSearch (RapidAPI) - LinkedIn, Indeed, Glassdoor aggregator
async function fetchFromJSearch(
  regions: string[],
  keywords: string[],
  rapidApiKey: string,
  maxResults: number
): Promise<VerifiedOpportunity[]> {
  const opportunities: VerifiedOpportunity[] = [];
  const perQueryLimit = Math.ceil(maxResults / 6);
  
  // Build location queries
  const locations: string[] = [];
  for (const region of regions) {
    const regionLocations = JSEARCH_LOCATIONS[region] || [];
    locations.push(...regionLocations.slice(0, 2));
  }
  
  // Build search queries combining keywords with locations
  const searchKeywords = keywords.length > 0 ? keywords.slice(0, 2) : ['CEO', 'Director'];
  
  for (const location of locations.slice(0, 4)) {
    for (const keyword of searchKeywords.slice(0, 2)) {
      try {
        const query = `${keyword} executive`;
        
        console.log(`  JSearch query: ${query} in ${location}`);
        
        const response = await fetch(
          `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=1&num_pages=1&date_posted=week&remote_jobs_only=false`,
          {
            headers: {
              'X-RapidAPI-Key': rapidApiKey,
              'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
            }
          }
        );
        
        if (!response.ok) {
          if (response.status === 429) {
            console.log('  JSearch rate limited, pausing...');
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          console.log(`  JSearch error: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (data.data && Array.isArray(data.data)) {
          for (const job of data.data.slice(0, perQueryLimit)) {
            // Filter for executive-level positions
            const isExecutive = EXECUTIVE_TITLES.some(title => 
              job.job_title?.toLowerCase().includes(title.toLowerCase())
            );
            
            if (!isExecutive) continue;
            
            opportunities.push({
              id: `jsearch-${job.job_id || Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
              title: job.job_title || 'Executive Position',
              company: job.employer_name || 'Company',
              location: `${job.job_city || ''}, ${job.job_country || ''}`.replace(/^, |, $/g, '') || location,
              salary_range: job.job_min_salary && job.job_max_salary 
                ? `${job.job_salary_currency || '$'}${job.job_min_salary.toLocaleString()} - ${job.job_max_salary.toLocaleString()}` 
                : 'Competitive',
              status: 'New',
              source: job.job_publisher || 'JSearch',
              posted_date: job.job_posted_at_datetime_utc 
                ? new Date(job.job_posted_at_datetime_utc).toISOString().split('T')[0] 
                : new Date().toISOString().split('T')[0],
              description: job.job_description?.substring(0, 1500) || '',
              match_score: 0,
              url: job.job_apply_link || job.job_google_link || 'https://linkedin.com/jobs',
              verified: true,
              verification_score: 95,
              data_quality: 'verified',
              source_reliability: 'high',
              scraped_at: new Date().toISOString()
            });
          }
        }
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 500));
        
      } catch (error) {
        console.error(`JSearch error:`, error);
      }
    }
  }
  
  return opportunities;
}

// Arbeitnow API - Free European job board
async function fetchFromArbeitnow(
  configs: { region: string, config: typeof REGION_CONFIGS[string] }[],
  keywords: string[],
  maxResults: number
): Promise<VerifiedOpportunity[]> {
  const opportunities: VerifiedOpportunity[] = [];
  
  try {
    // Arbeitnow has limited filtering - fetch all and filter
    const response = await fetch('https://www.arbeitnow.com/api/job-board-api');
    
    if (!response.ok) {
      console.log(`Arbeitnow: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      // Filter for executive/senior positions (broader filter)
      const executiveJobs = data.data.filter((job: any) => {
        const title = job.title?.toLowerCase() || '';
        return EXECUTIVE_TITLES.some(t => title.includes(t.toLowerCase())) ||
               title.includes('senior') || title.includes('lead') || 
               title.includes('head') || title.includes('manager');
      });
      
      // Get region locations for filtering
      const regionLocations = configs.flatMap(c => c.config.locations.map(l => l.toLowerCase()));
      
      for (const job of executiveJobs.slice(0, maxResults * 2)) { // Take more, filter later
        const jobLocation = job.location?.toLowerCase() || '';
        
        // Check if job location matches selected regions
        const matchesRegion = regionLocations.some(loc => 
          jobLocation.includes(loc) || loc.includes(jobLocation.split(',')[0])
        );
        
        // Check if it's remote
        const isRemote = job.remote || jobLocation.includes('remote') || jobLocation.includes('worldwide');
        
        // Check if it's European (for European region searches)
        const isEuropean = jobLocation.includes('europe') || jobLocation.includes('eu') || jobLocation.includes('emea');
        
        // Include if matches region OR if it's remote OR if it's European
        if (!matchesRegion && !isRemote && !isEuropean) continue;
        
        opportunities.push({
          id: `arbeitnow-${job.slug || Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          title: job.title || 'Executive Position',
          company: job.company_name || 'Company',
          location: job.remote ? `${job.location || 'Europe'} (Remote)` : (job.location || 'Europe'),
          salary_range: 'Competitive',
          status: 'New',
          source: 'Arbeitnow',
          posted_date: job.created_at ? new Date(job.created_at * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          description: job.description?.substring(0, 1500) || '',
          match_score: 0,
          url: job.url || 'https://arbeitnow.com',
          verified: true,
          verification_score: 85,
          data_quality: 'verified',
          source_reliability: 'high',
          scraped_at: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('Arbeitnow error:', error);
  }
  
  return opportunities;
}

// Remotive API - Free remote jobs API
async function fetchFromRemotive(
  keywords: string[],
  maxResults: number
): Promise<VerifiedOpportunity[]> {
  const opportunities: VerifiedOpportunity[] = [];
  
  try {
    // Fetch more jobs from Remotive (they have a limit of 100+ jobs)
    const response = await fetch('https://remotive.com/api/remote-jobs?limit=500');
    
    if (!response.ok) {
      console.log(`Remotive: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.jobs && Array.isArray(data.jobs)) {
      // Filter for executive/senior positions
      const executiveJobs = data.jobs.filter((job: any) => {
        const title = job.title?.toLowerCase() || '';
        return EXECUTIVE_TITLES.some(t => title.includes(t.toLowerCase())) ||
               title.includes('senior') || title.includes('lead') || title.includes('head');
      });
      
      for (const job of executiveJobs.slice(0, maxResults)) {
        opportunities.push({
          id: `remotive-${job.id || Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          title: job.title || 'Executive Position',
          company: job.company_name || 'Company',
          location: job.candidate_required_location || 'Remote',
          salary_range: job.salary || 'Competitive',
          status: 'New',
          source: 'Remotive',
          posted_date: job.publication_date ? new Date(job.publication_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          description: job.description?.substring(0, 1500) || '',
          match_score: 0,
          url: job.url || 'https://remotive.com',
          verified: true,
          verification_score: 80,
          data_quality: 'verified',
          source_reliability: 'high',
          scraped_at: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    console.error('Remotive error:', error);
  }
  
  return opportunities;
}

// The Muse API - Free tier available
async function fetchFromTheMuse(
  regions: string[],
  maxResults: number
): Promise<VerifiedOpportunity[]> {
  const opportunities: VerifiedOpportunity[] = [];
  const perPageLimit = Math.min(20, maxResults);
  
  try {
    // Build location parameter
    const museLocations: string[] = [];
    for (const region of regions) {
      const locs = MUSE_LOCATIONS[region] || [];
      museLocations.push(...locs.slice(0, 2));
    }
    
    // The Muse has executive level filter
    const levels = ['Senior Level', 'Management', 'Executive'];
    
    for (const level of levels) {
      const url = `https://www.themuse.com/api/public/jobs?page=1&level=${encodeURIComponent(level)}&descending=true`;
      
      console.log(`  TheMuse query: ${level}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log(`  TheMuse: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.results && Array.isArray(data.results)) {
        for (const job of data.results.slice(0, perPageLimit)) {
          // Check if executive-level
          const isExecutive = EXECUTIVE_TITLES.some(title => 
            job.name?.toLowerCase().includes(title.toLowerCase())
          );
          
          if (!isExecutive && level !== 'Executive') continue;
          
          // Get location
          const locations = job.locations?.map((l: any) => l.name).join(', ') || 'USA';
          
          opportunities.push({
            id: `muse-${job.id || Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            title: job.name || 'Executive Position',
            company: job.company?.name || 'Company',
            location: locations,
            salary_range: 'Competitive',
            status: 'New',
            source: 'The Muse',
            posted_date: job.publication_date ? new Date(job.publication_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            description: job.contents?.substring(0, 1500) || '',
            match_score: 0,
            url: job.refs?.landing_page || `https://themuse.com/jobs/${job.id}`,
            verified: true,
            verification_score: 85,
            data_quality: 'verified',
            source_reliability: 'high',
            scraped_at: new Date().toISOString()
          });
        }
      }
      
      await new Promise(r => setTimeout(r, 300));
    }
  } catch (error) {
    console.error('TheMuse error:', error);
  }
  
  return opportunities;
}

// Firecrawl supplementary scraping
async function scrapeWithFirecrawl(
  configs: { region: string, config: typeof REGION_CONFIGS[string] }[],
  keywords: string[],
  firecrawlKey: string,
  maxResults: number
): Promise<VerifiedOpportunity[]> {
  const opportunities: VerifiedOpportunity[] = [];
  
  // Only do 2-3 queries to conserve credits
  const queries = [
    `"${keywords[0] || 'CEO'}" executive job ${configs[0]?.config.locations[0] || 'Europe'}`,
    `"${keywords[1] || 'Director'}" senior job ${configs[0]?.config.locations[1] || 'Germany'}`
  ];
  
  for (const query of queries.slice(0, 2)) {
    try {
      console.log(`  Firecrawl: ${query.substring(0, 40)}...`);
      
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
        console.log('  Firecrawl rate limited or credits exhausted');
        break;
      }
      
      if (!response.ok) continue;
      
      const data = await response.json();
      
      if (data.data && Array.isArray(data.data)) {
        for (const result of data.data.slice(0, 5)) {
          const parsed = parseFirecrawlResult(result);
          if (parsed) opportunities.push(parsed);
        }
      }
      
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (error) {
      console.error('Firecrawl error:', error);
    }
  }
  
  return opportunities.slice(0, maxResults);
}

function parseFirecrawlResult(result: any): VerifiedOpportunity | null {
  try {
    const url = result.url || '';
    const title = result.title || '';
    const description = result.description || result.markdown || '';
    
    if (!url || !title) return null;
    
    const isJobUrl = url.includes('job') || url.includes('career') || url.includes('linkedin.com/jobs');
    if (!isJobUrl) return null;
    
    let company = 'Company';
    const companyMatch = title.match(/at\s+([^|–\-\n]+)/i);
    if (companyMatch) company = companyMatch[1].trim();
    
    const titleParts = title.split(/\s+at\s+|\s+[-|–]\s+/i);
    const jobTitle = titleParts[0]?.trim() || title;
    
    const isExecutive = EXECUTIVE_TITLES.some(t => jobTitle.toLowerCase().includes(t.toLowerCase()));
    if (!isExecutive) return null;
    
    let source = 'Job Board';
    if (url.includes('linkedin')) source = 'LinkedIn';
    else if (url.includes('indeed')) source = 'Indeed';
    else if (url.includes('glassdoor')) source = 'Glassdoor';
    
    return {
      id: `scraped-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      title: jobTitle.substring(0, 100),
      company: company.substring(0, 80),
      location: 'From posting',
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

// AI-generated opportunities as fallback
async function generateAIOpportunities(
  configs: { region: string, config: typeof REGION_CONFIGS[string] }[],
  targetRole: string,
  industries: string,
  bio: string,
  apiKey: string,
  count: number
): Promise<VerifiedOpportunity[]> {
  const allOpportunities: VerifiedOpportunity[] = [];
  
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
              content: `You are an expert executive recruiter with deep knowledge of the ${region} job market. Generate REALISTIC executive job opportunities based on actual market conditions.`
            },
            {
              role: 'user',
              content: `Generate ${perRegionCount} realistic executive opportunities for ${region}.

CANDIDATE PROFILE:
- Target Role: ${targetRole}
- Industries: ${industries}
- Experience: ${bio.substring(0, 300) || 'Senior executive with 15+ years experience'}

REAL COMPANIES: ${config.realCompanies.slice(0, 20).join(', ')}
LOCATIONS: ${config.locations.slice(0, 5).join(', ')}
CURRENCY: ${config.currency}

Return ONLY valid JSON array:
[{
  "title": "Chief Technology Officer",
  "company": "Company from list",
  "location": "City, Country",
  "salary_range": "${config.currency}180,000 - ${config.currency}250,000",
  "description": "Detailed role description...",
  "posted_date": "${new Date().toISOString().split('T')[0]}",
  "match_score": 85
}]`
            }
          ],
          max_tokens: 6000,
          temperature: 0.8
        }),
      });

      if (!response.ok) continue;

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
            url: `https://linkedin.com/jobs`,
            verified: false,
            verification_score: 30,
            data_quality: 'ai_generated',
            source_reliability: 'medium'
          });
        }
      }
    } catch (error) {
      console.error(`AI generation error for ${region}:`, error);
    }
  }
  
  return allOpportunities;
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

Candidate: ${bio.substring(0, 200) || 'Senior executive'}

Opportunities:
${JSON.stringify(batch.map(o => ({ title: o.title, company: o.company, desc: o.description?.substring(0, 150) })), null, 2)}

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
