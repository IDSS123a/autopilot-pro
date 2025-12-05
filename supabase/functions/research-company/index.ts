import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Data source configurations based on research repositories
const DATA_SOURCES = {
  SEC_EDGAR: {
    name: 'SEC EDGAR',
    searchPatterns: [
      'site:sec.gov/cgi-bin/browse-edgar',
      'site:sec.gov/cgi-bin/viewer',
    ],
    description: 'US SEC filings (10-K, 10-Q, 8-K, DEF 14A)',
  },
  COMPANIES_HOUSE: {
    name: 'UK Companies House',
    searchPatterns: [
      'site:find-and-update.company-information.service.gov.uk',
      'site:beta.companieshouse.gov.uk',
    ],
    description: 'UK corporate filings and director info',
  },
  LINKEDIN: {
    name: 'LinkedIn',
    searchPatterns: [
      'site:linkedin.com/company',
      'site:linkedin.com/in',
    ],
    description: 'Company profiles and executive leadership',
  },
  GLASSDOOR: {
    name: 'Glassdoor',
    searchPatterns: [
      'site:glassdoor.com/Reviews',
      'site:glassdoor.de/Bewertungen',
    ],
    description: 'Employee reviews and culture insights',
  },
  NEWS: {
    name: 'Business News',
    searchPatterns: [
      'site:reuters.com',
      'site:bloomberg.com',
      'site:ft.com',
      'site:wsj.com',
      'site:handelsblatt.com',
    ],
    description: 'Recent news and press coverage',
  },
  CRUNCHBASE: {
    name: 'Crunchbase',
    searchPatterns: [
      'site:crunchbase.com/organization',
    ],
    description: 'Funding rounds, investors, and startup data',
  },
  COURT_RECORDS: {
    name: 'Legal/Court Records',
    searchPatterns: [
      'site:pacer.uscourts.gov',
      'site:courtlistener.com',
    ],
    description: 'Litigation history and legal proceedings',
  },
};

interface FirecrawlSearchResult {
  url: string;
  title: string;
  description?: string;
  markdown?: string;
}

interface ResearchData {
  source: string;
  results: {
    url: string;
    title: string;
    snippet: string;
    content?: string;
  }[];
}

async function searchWithFirecrawl(
  apiKey: string,
  query: string,
  limit: number = 5
): Promise<FirecrawlSearchResult[]> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        limit,
        lang: 'en',
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Firecrawl search error: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Firecrawl search failed:', error);
    return [];
  }
}

async function scrapeUrl(apiKey: string, url: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!response.ok) {
      console.error(`Scrape error for ${url}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.data?.markdown || null;
  } catch (error) {
    console.error(`Scrape failed for ${url}:`, error);
    return null;
  }
}

async function researchSource(
  apiKey: string,
  companyName: string,
  sourceKey: string,
  source: typeof DATA_SOURCES[keyof typeof DATA_SOURCES]
): Promise<ResearchData> {
  const results: ResearchData['results'] = [];
  
  // Search using the first pattern for this source
  const searchQuery = `${companyName} ${source.searchPatterns[0]}`;
  console.log(`Searching ${source.name}: ${searchQuery}`);
  
  const searchResults = await searchWithFirecrawl(apiKey, searchQuery, 3);
  
  for (const result of searchResults) {
    results.push({
      url: result.url,
      title: result.title || 'Untitled',
      snippet: result.description || '',
      content: result.markdown?.substring(0, 2000) || undefined,
    });
  }
  
  return {
    source: source.name,
    results,
  };
}

async function synthesizeWithAI(
  companyName: string,
  industry: string,
  researchData: ResearchData[]
): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  // Prepare research context
  const researchContext = researchData
    .filter(d => d.results.length > 0)
    .map(d => {
      const sourceInfo = d.results
        .map(r => `- ${r.title}: ${r.snippet}\n  URL: ${r.url}${r.content ? `\n  Content: ${r.content.substring(0, 500)}...` : ''}`)
        .join('\n');
      return `### ${d.source}\n${sourceInfo}`;
    })
    .join('\n\n');

  const prompt = `You are a world-class corporate intelligence analyst. Based on the following REAL research data scraped from authoritative sources, generate a comprehensive due diligence dossier.

COMPANY: ${companyName}
INDUSTRY: ${industry}

=== RESEARCH DATA FROM VERIFIED SOURCES ===
${researchContext || 'No specific data found - use your knowledge base.'}
=== END RESEARCH DATA ===

CRITICAL INSTRUCTIONS:
1. Prioritize information from the scraped sources above
2. If sources provide conflicting information, note the discrepancy
3. Clearly distinguish between verified data and educated estimates
4. Include source URLs where available
5. Be specific and actionable for executive interview preparation

Generate a JSON response:
{
  "companyName": "${companyName}",
  "marketCap": "Value from sources or 'Private/Unknown'",
  "headquarters": "City, Country",
  "executiveSummary": "3-4 paragraphs synthesizing key findings from sources",
  "keyChallenges": ["6-8 specific challenges with source context"],
  "strategicOpportunities": ["6-8 opportunities based on market data"],
  "cultureAnalysis": "Detailed analysis from Glassdoor/employee sources",
  "interviewQuestions": {
    "expected_from_ceo": ["8 specific questions based on company's current situation"],
    "to_ask_ceo": ["8 questions demonstrating deep research"]
  },
  "sources": [{"title": "Source name", "uri": "URL"}]
}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { 
          role: 'system', 
          content: 'You are a senior M&A due diligence analyst. Always respond with valid JSON. Synthesize real research data into actionable intelligence.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI synthesis error:', errorText);
    throw new Error(`AI synthesis failed: ${response.status}`);
  }

  const aiData = await response.json();
  const content = aiData.choices?.[0]?.message?.content || '';
  
  // Parse JSON from response
  try {
    // Remove markdown code blocks if present
    let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Extract JSON object
    const jsonStart = cleanContent.indexOf('{');
    const jsonEnd = cleanContent.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
    }
    
    return JSON.parse(cleanContent);
  } catch (e) {
    console.error('JSON parse error:', e, 'Content:', content.substring(0, 200));
    throw new Error('Failed to parse AI response');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, industry } = await req.json();
    
    if (!companyName) {
      return new Response(
        JSON.stringify({ error: 'Company name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      console.warn('FIRECRAWL_API_KEY not set, using AI-only mode');
    }

    console.log(`Starting due diligence research for: ${companyName} (${industry})`);

    let researchData: ResearchData[] = [];

    if (FIRECRAWL_API_KEY) {
      // Parallel research across multiple sources
      const researchPromises = [
        researchSource(FIRECRAWL_API_KEY, companyName, 'SEC_EDGAR', DATA_SOURCES.SEC_EDGAR),
        researchSource(FIRECRAWL_API_KEY, companyName, 'COMPANIES_HOUSE', DATA_SOURCES.COMPANIES_HOUSE),
        researchSource(FIRECRAWL_API_KEY, companyName, 'LINKEDIN', DATA_SOURCES.LINKEDIN),
        researchSource(FIRECRAWL_API_KEY, companyName, 'GLASSDOOR', DATA_SOURCES.GLASSDOOR),
        researchSource(FIRECRAWL_API_KEY, companyName, 'NEWS', DATA_SOURCES.NEWS),
        researchSource(FIRECRAWL_API_KEY, companyName, 'CRUNCHBASE', DATA_SOURCES.CRUNCHBASE),
      ];

      // Execute with timeout
      const timeoutPromise = new Promise<ResearchData[]>((resolve) => 
        setTimeout(() => resolve([]), 25000)
      );

      researchData = await Promise.race([
        Promise.all(researchPromises),
        timeoutPromise,
      ]) as ResearchData[];

      console.log(`Research completed. Sources with data: ${researchData.filter(d => d.results.length > 0).length}`);
    }

    // Synthesize with AI
    const dossier = await synthesizeWithAI(companyName, industry || 'General', researchData);

    // Add research metadata
    dossier.researchSources = researchData
      .filter(d => d.results.length > 0)
      .map(d => ({
        source: d.source,
        resultsCount: d.results.length,
        urls: d.results.map(r => r.url),
      }));

    return new Response(
      JSON.stringify(dossier),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Research company error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Research failed',
        details: 'Please try again or contact support if the issue persists.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});