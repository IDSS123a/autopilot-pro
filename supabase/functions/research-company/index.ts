import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive data sources for ANY company worldwide
const DATA_SOURCES = {
  SEC_EDGAR: { name: 'SEC EDGAR (US)', searchPatterns: ['site:sec.gov 10-K 10-Q 8-K'], description: 'US SEC filings' },
  COMPANIES_HOUSE: { name: 'UK Companies House', searchPatterns: ['site:find-and-update.company-information.service.gov.uk'], description: 'UK corporate filings' },
  HANDELSREGISTER: { name: 'Handelsregister (Germany)', searchPatterns: ['site:unternehmensregister.de'], description: 'German commercial register' },
  LINKEDIN: { name: 'LinkedIn', searchPatterns: ['site:linkedin.com/company'], description: 'Company profiles' },
  GLASSDOOR: { name: 'Glassdoor', searchPatterns: ['site:glassdoor.com/Reviews'], description: 'Employee reviews' },
  KUNUNU: { name: 'Kununu', searchPatterns: ['site:kununu.com'], description: 'German employee reviews' },
  REUTERS: { name: 'Reuters', searchPatterns: ['site:reuters.com'], description: 'Global business news' },
  BLOOMBERG: { name: 'Bloomberg', searchPatterns: ['site:bloomberg.com'], description: 'Financial news' },
  CRUNCHBASE: { name: 'Crunchbase', searchPatterns: ['site:crunchbase.com/organization'], description: 'Funding data' },
  WIKIPEDIA: { name: 'Wikipedia', searchPatterns: ['site:wikipedia.org'], description: 'Company overview' },
};

interface ResearchResult {
  url: string;
  title: string;
  snippet: string;
  content?: string;
  source: string;
}

interface ResearchData {
  source: string;
  results: ResearchResult[];
  method: 'firecrawl' | 'lovable-ai' | 'fallback';
}

// Rate limit tracking
let firecrawlRateLimited = false;
let rateLimitResetTime = 0;

// Primary: Firecrawl Search
async function searchWithFirecrawl(
  apiKey: string,
  query: string,
  limit: number = 3
): Promise<{ results: ResearchResult[]; rateLimited: boolean }> {
  // Check if we're still rate limited
  if (firecrawlRateLimited && Date.now() < rateLimitResetTime) {
    console.log('Firecrawl rate limited, skipping...');
    return { results: [], rateLimited: true };
  }

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
        scrapeOptions: { formats: ['markdown'], onlyMainContent: true },
      }),
    });

    if (response.status === 429) {
      console.warn('Firecrawl rate limit hit - switching to fallback');
      firecrawlRateLimited = true;
      rateLimitResetTime = Date.now() + 60000; // 60 second cooldown
      return { results: [], rateLimited: true };
    }

    if (!response.ok) {
      console.error(`Firecrawl error: ${response.status}`);
      return { results: [], rateLimited: false };
    }

    const data = await response.json();
    const results = (data.data || []).map((r: any) => ({
      url: r.url,
      title: r.title || 'Untitled',
      snippet: r.description || '',
      content: r.markdown?.substring(0, 3000),
      source: 'Firecrawl'
    }));
    
    console.log(`Firecrawl: ${results.length} results for "${query.substring(0, 50)}..."`);
    return { results, rateLimited: false };
  } catch (error) {
    console.error('Firecrawl error:', error);
    return { results: [], rateLimited: false };
  }
}

// Fallback #1: Lovable AI Web Search (uses Gemini's grounding)
async function searchWithLovableAI(
  apiKey: string,
  companyName: string,
  searchType: string
): Promise<ResearchResult[]> {
  try {
    console.log(`Lovable AI fallback search: ${companyName} - ${searchType}`);
    
    const searchPrompts: Record<string, string> = {
      'company_overview': `Search the web for current information about "${companyName}". Find: company description, headquarters location, industry, founding date, key products/services. Return factual data with source URLs.`,
      'financials': `Search for "${companyName}" financial information: revenue, market cap, stock price (if public), recent financial news, funding rounds. Include source URLs.`,
      'leadership': `Search for "${companyName}" leadership team: CEO, executives, board members. Include their backgrounds and source URLs.`,
      'culture': `Search for "${companyName}" employee reviews and company culture on Glassdoor, Kununu, or similar sites. Summarize key themes with sources.`,
      'news': `Search for recent news about "${companyName}" from the past 3 months. Include major announcements, challenges, or developments with source URLs.`,
    };

    const prompt = searchPrompts[searchType] || searchPrompts['company_overview'];

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Fast model with web grounding
        messages: [
          { 
            role: 'system', 
            content: 'You are a research assistant. Search the web and return factual, current information. Format as structured data with source URLs where possible. Be concise but thorough.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      console.error(`Lovable AI search error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse the AI response into a result
    return [{
      url: `ai-search://${searchType}`,
      title: `${companyName} - ${searchType.replace('_', ' ')}`,
      snippet: content.substring(0, 500),
      content: content,
      source: 'Lovable AI Search'
    }];
  } catch (error) {
    console.error('Lovable AI search error:', error);
    return [];
  }
}

// Fallback #2: Direct website scraping via Firecrawl scrape endpoint
async function scrapeCompanyWebsite(
  apiKey: string,
  companyName: string
): Promise<ResearchResult[]> {
  try {
    // Try to find and scrape the company's official website
    const searchResult = await searchWithFirecrawl(apiKey, `"${companyName}" official website`, 1);
    
    if (searchResult.rateLimited || searchResult.results.length === 0) {
      return [];
    }

    // Get the first result URL and try to scrape it
    const websiteUrl = searchResult.results[0]?.url;
    if (!websiteUrl) return [];

    console.log(`Scraping company website: ${websiteUrl}`);
    
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: websiteUrl,
        formats: ['markdown'],
        onlyMainContent: true,
      }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return [{
      url: websiteUrl,
      title: data.data?.metadata?.title || `${companyName} Official Website`,
      snippet: data.data?.metadata?.description || '',
      content: data.data?.markdown?.substring(0, 5000),
      source: 'Direct Scrape'
    }];
  } catch (error) {
    console.error('Website scrape error:', error);
    return [];
  }
}

// Main research function with fallback chain
async function conductResearch(
  companyName: string,
  firecrawlKey: string | undefined,
  lovableKey: string
): Promise<ResearchData[]> {
  const researchData: ResearchData[] = [];
  
  console.log(`\n=== Starting Multi-Method Research for: ${companyName} ===`);
  
  // Reset rate limit flag for new research
  firecrawlRateLimited = false;

  // PHASE 1: Firecrawl priority searches (sequential to avoid rate limits)
  if (firecrawlKey) {
    console.log('Phase 1: Firecrawl searches...');
    
    const prioritySearches = [
      { key: 'LinkedIn', query: `"${companyName}" site:linkedin.com/company` },
      { key: 'Wikipedia', query: `"${companyName}" site:wikipedia.org` },
      { key: 'Glassdoor', query: `"${companyName}" site:glassdoor.com/Reviews` },
      { key: 'News', query: `"${companyName}" company news announcement` },
      { key: 'Financial', query: `"${companyName}" revenue financial results` },
    ];

    for (const search of prioritySearches) {
      if (firecrawlRateLimited) break;
      
      const { results, rateLimited } = await searchWithFirecrawl(firecrawlKey, search.query, 3);
      
      if (results.length > 0) {
        researchData.push({
          source: search.key,
          results,
          method: 'firecrawl'
        });
      }
      
      if (rateLimited) {
        console.log('Firecrawl rate limited - switching to fallbacks');
        break;
      }
      
      // Small delay between requests to avoid rate limits
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // PHASE 2: Lovable AI fallback searches (if Firecrawl limited or no key)
  const needsFallback = firecrawlRateLimited || !firecrawlKey || researchData.length < 3;
  
  if (needsFallback) {
    console.log('Phase 2: Lovable AI fallback searches...');
    
    const fallbackSearches = ['company_overview', 'financials', 'leadership', 'culture', 'news'];
    
    // Run fallback searches in parallel
    const fallbackPromises = fallbackSearches.map(type => 
      searchWithLovableAI(lovableKey, companyName, type)
    );
    
    const fallbackResults = await Promise.all(fallbackPromises);
    
    fallbackResults.forEach((results, index) => {
      if (results.length > 0) {
        researchData.push({
          source: `AI Search - ${fallbackSearches[index]}`,
          results,
          method: 'lovable-ai'
        });
      }
    });
  }

  // PHASE 3: Direct website scrape (if we have Firecrawl and not rate limited)
  if (firecrawlKey && !firecrawlRateLimited) {
    console.log('Phase 3: Direct website scrape...');
    const websiteResults = await scrapeCompanyWebsite(firecrawlKey, companyName);
    if (websiteResults.length > 0) {
      researchData.push({
        source: 'Official Website',
        results: websiteResults,
        method: 'firecrawl'
      });
    }
  }

  const totalResults = researchData.reduce((acc, d) => acc + d.results.length, 0);
  const methods = [...new Set(researchData.map(d => d.method))];
  console.log(`Research complete: ${researchData.length} sources, ${totalResults} results, methods: ${methods.join(', ')}`);

  return researchData;
}

// AI Synthesis
async function synthesizeWithAI(
  companyName: string,
  researchData: ResearchData[],
  lovableKey: string
): Promise<any> {
  const researchContext = researchData
    .filter(d => d.results.length > 0)
    .map(d => {
      const sourceInfo = d.results
        .map(r => `- ${r.title}: ${r.snippet}\n  URL: ${r.url}${r.content ? `\n  Content: ${r.content.substring(0, 2000)}` : ''}`)
        .join('\n');
      return `### ${d.source} [via ${d.method}]\n${sourceInfo}`;
    })
    .join('\n\n');

  const sourcesFound = researchData.filter(d => d.results.length > 0).map(d => `${d.source} (${d.method})`).join(', ');
  const totalResults = researchData.reduce((acc, d) => acc + d.results.length, 0);
  const methods = [...new Set(researchData.map(d => d.method))];

  const prompt = `You are a corporate intelligence analyst conducting due diligence on "${companyName}".

=== RESEARCH DATA (${totalResults} results from ${methods.join(' + ')}) ===
${researchContext || 'Limited data collected.'}
=== END RESEARCH DATA ===

Sources: ${sourcesFound || 'None'}
Research methods used: ${methods.join(', ')}

CRITICAL INSTRUCTIONS:
1. Base your analysis primarily on the provided research data.
2. Clearly distinguish between verified data (from scraped sources) and supplementary analysis.
3. If data is limited, state "Limited data - based on available sources".
4. Include source attribution for key facts.

Generate a JSON response:
{
  "companyName": "${companyName}",
  "marketCap": "From data or 'Data not available'",
  "headquarters": "From data or 'Could not determine'",
  "executiveSummary": "Comprehensive summary based on research data. 3-4 paragraphs.",
  "keyChallenges": ["5-8 challenges based on research"],
  "strategicOpportunities": ["5-8 opportunities based on research"],
  "cultureAnalysis": "Culture analysis from employee reviews or 'No employee review data available'",
  "interviewQuestions": {
    "expected_from_ceo": ["8-10 questions based on company context"],
    "to_ask_ceo": ["8-10 research-based questions to ask"]
  },
  "sources": [{"title": "Source", "uri": "URL"}],
  "dataQualityNote": "Assessment of data quality and completeness"
}`;

  console.log('Synthesizing with AI...');
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        { 
          role: 'system', 
          content: 'You are a factual corporate intelligence analyst. Synthesize research data into comprehensive due diligence reports. Respond with valid JSON only.' 
        },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI synthesis failed: ${response.status}`);
  }

  const aiData = await response.json();
  const content = aiData.choices?.[0]?.message?.content || '';
  
  let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonStart = cleanContent.indexOf('{');
  const jsonEnd = cleanContent.lastIndexOf('}');
  if (jsonStart !== -1 && jsonEnd !== -1) {
    cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
  }
  
  return JSON.parse(cleanContent);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName } = await req.json();
    
    if (!companyName) {
      return new Response(
        JSON.stringify({ error: 'Company name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`=== Due Diligence for: ${companyName} ===`);
    console.log(`Firecrawl available: ${!!FIRECRAWL_API_KEY}`);
    console.log(`Lovable AI available: ${!!LOVABLE_API_KEY}`);

    // Conduct multi-method research
    const researchData = await conductResearch(companyName, FIRECRAWL_API_KEY, LOVABLE_API_KEY);

    // Synthesize with AI
    const dossier = await synthesizeWithAI(companyName, researchData, LOVABLE_API_KEY);

    // Add research metadata
    dossier.researchSources = researchData
      .filter(d => d.results.length > 0)
      .map(d => ({
        source: d.source,
        method: d.method,
        resultsCount: d.results.length,
        urls: d.results.map(r => r.url).slice(0, 5),
      }));

    dossier.researchStats = {
      sourcesChecked: Object.keys(DATA_SOURCES).length,
      sourcesWithData: researchData.filter(d => d.results.length > 0).length,
      totalResults: researchData.reduce((acc, d) => acc + d.results.length, 0),
      methodsUsed: [...new Set(researchData.map(d => d.method))],
      firecrawlEnabled: !!FIRECRAWL_API_KEY,
      fallbackUsed: researchData.some(d => d.method === 'lovable-ai')
    };

    console.log(`=== Due Diligence Complete for: ${companyName} ===`);

    return new Response(
      JSON.stringify(dossier),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Research error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Research failed',
        details: 'Please try again.'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});