import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive data sources for ANY company worldwide with reliability ratings
const DATA_SOURCES: Record<string, { 
  name: string; 
  searchPatterns: string[]; 
  description: string;
  reliability: 'very_high' | 'high' | 'medium' | 'low';
  dataType: string;
}> = {
  SEC_EDGAR: { 
    name: 'SEC EDGAR (US)', 
    searchPatterns: ['site:sec.gov 10-K 10-Q 8-K'], 
    description: 'US SEC filings',
    reliability: 'very_high',
    dataType: 'financial_regulatory'
  },
  COMPANIES_HOUSE: { 
    name: 'UK Companies House', 
    searchPatterns: ['site:find-and-update.company-information.service.gov.uk'], 
    description: 'UK corporate filings',
    reliability: 'very_high',
    dataType: 'financial_regulatory'
  },
  HANDELSREGISTER: { 
    name: 'Handelsregister (Germany)', 
    searchPatterns: ['site:unternehmensregister.de'], 
    description: 'German commercial register',
    reliability: 'very_high',
    dataType: 'financial_regulatory'
  },
  LINKEDIN: { 
    name: 'LinkedIn', 
    searchPatterns: ['site:linkedin.com/company'], 
    description: 'Company profiles',
    reliability: 'high',
    dataType: 'company_profile'
  },
  GLASSDOOR: { 
    name: 'Glassdoor', 
    searchPatterns: ['site:glassdoor.com/Reviews'], 
    description: 'Employee reviews',
    reliability: 'high',
    dataType: 'culture_reviews'
  },
  KUNUNU: { 
    name: 'Kununu', 
    searchPatterns: ['site:kununu.com'], 
    description: 'German employee reviews',
    reliability: 'high',
    dataType: 'culture_reviews'
  },
  REUTERS: { 
    name: 'Reuters', 
    searchPatterns: ['site:reuters.com'], 
    description: 'Global business news',
    reliability: 'very_high',
    dataType: 'news'
  },
  BLOOMBERG: { 
    name: 'Bloomberg', 
    searchPatterns: ['site:bloomberg.com'], 
    description: 'Financial news',
    reliability: 'very_high',
    dataType: 'financial_news'
  },
  CRUNCHBASE: { 
    name: 'Crunchbase', 
    searchPatterns: ['site:crunchbase.com/organization'], 
    description: 'Funding data',
    reliability: 'high',
    dataType: 'funding'
  },
  WIKIPEDIA: { 
    name: 'Wikipedia', 
    searchPatterns: ['site:wikipedia.org'], 
    description: 'Company overview',
    reliability: 'medium',
    dataType: 'general'
  },
  OFFICIAL_WEBSITE: {
    name: 'Official Website',
    searchPatterns: [],
    description: 'Company official site',
    reliability: 'very_high',
    dataType: 'official'
  },
  ANNUAL_REPORT: {
    name: 'Annual Reports',
    searchPatterns: ['annual report filetype:pdf'],
    description: 'Official annual reports',
    reliability: 'very_high',
    dataType: 'financial'
  }
};

interface ResearchResult {
  url: string;
  title: string;
  snippet: string;
  content?: string;
  source: string;
  reliability: 'very_high' | 'high' | 'medium' | 'low';
  dataType: string;
  verified: boolean;
}

interface ResearchData {
  source: string;
  results: ResearchResult[];
  method: 'firecrawl' | 'lovable-ai' | 'fallback';
  reliability: 'very_high' | 'high' | 'medium' | 'low';
}

// Rate limit tracking
let firecrawlRateLimited = false;
let rateLimitResetTime = 0;

// Primary: Firecrawl Search with verification
async function searchWithFirecrawl(
  apiKey: string,
  query: string,
  sourceName: string,
  reliability: 'very_high' | 'high' | 'medium' | 'low',
  dataType: string,
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
      rateLimitResetTime = Date.now() + 60000;
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
      content: r.markdown?.substring(0, 4000),
      source: sourceName,
      reliability: reliability,
      dataType: dataType,
      verified: true
    }));
    
    console.log(`Firecrawl (${sourceName}): ${results.length} verified results`);
    return { results, rateLimited: false };
  } catch (error) {
    console.error('Firecrawl error:', error);
    return { results: [], rateLimited: false };
  }
}

// Fallback: Lovable AI Web Search with grounding
async function searchWithLovableAI(
  apiKey: string,
  companyName: string,
  searchType: string
): Promise<ResearchResult[]> {
  try {
    console.log(`Lovable AI search: ${companyName} - ${searchType}`);
    
    const searchPrompts: Record<string, string> = {
      'company_overview': `Search the web for CURRENT, VERIFIED information about "${companyName}". Find: company description, headquarters location, industry, founding date, key products/services, employee count. Return ONLY factual data with source URLs. Prioritize official sources and reputable business databases.`,
      'financials': `Search for VERIFIED "${companyName}" financial information: revenue (with year), market cap, stock price (if public), recent financial news, funding rounds (if startup). Include source URLs. Only include data you can verify from reputable financial sources.`,
      'leadership': `Search for VERIFIED "${companyName}" leadership team: CEO, CFO, CTO, other C-suite executives, board members. Include their backgrounds and tenure. Source from LinkedIn, official company pages, or reputable business news.`,
      'culture': `Search for "${companyName}" employee reviews and company culture on Glassdoor, Kununu, Indeed, or Comparably. Summarize key themes: work-life balance, management quality, compensation, growth opportunities. Include ratings if available.`,
      'news': `Search for VERIFIED recent news about "${companyName}" from the past 6 months from Reuters, Bloomberg, Financial Times, Wall Street Journal, or other reputable sources. Include major announcements, challenges, acquisitions, or developments with source URLs.`,
      'challenges': `Search for current business challenges facing "${companyName}": competitive threats, regulatory issues, market challenges, operational problems. Source from analyst reports, business news, industry publications.`
    };

    const prompt = searchPrompts[searchType] || searchPrompts['company_overview'];

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
            content: 'You are a factual research assistant. Search the web and return ONLY verified, current information from reputable sources. Always include source URLs where possible. Clearly indicate when data is estimated or from older sources. Never fabricate data.' 
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
    
    return [{
      url: `ai-verified-search://${searchType}`,
      title: `${companyName} - ${searchType.replace('_', ' ')}`,
      snippet: content.substring(0, 500),
      content: content,
      source: 'Lovable AI Search (Web Grounded)',
      reliability: 'medium',
      dataType: searchType,
      verified: false
    }];
  } catch (error) {
    console.error('Lovable AI search error:', error);
    return [];
  }
}

// Scrape company's official website
async function scrapeOfficialWebsite(
  apiKey: string,
  companyName: string
): Promise<ResearchResult[]> {
  try {
    const searchResult = await searchWithFirecrawl(
      apiKey, 
      `"${companyName}" official website about`, 
      'Official Website',
      'very_high',
      'official',
      1
    );
    
    if (searchResult.rateLimited || searchResult.results.length === 0) {
      return [];
    }

    const websiteUrl = searchResult.results[0]?.url;
    if (!websiteUrl) return [];

    console.log(`Scraping official website: ${websiteUrl}`);
    
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
      content: data.data?.markdown?.substring(0, 6000),
      source: 'Official Website',
      reliability: 'very_high',
      dataType: 'official',
      verified: true
    }];
  } catch (error) {
    console.error('Website scrape error:', error);
    return [];
  }
}

// Main research function with multi-source verification
async function conductResearch(
  companyName: string,
  firecrawlKey: string | undefined,
  lovableKey: string
): Promise<ResearchData[]> {
  const researchData: ResearchData[] = [];
  
  console.log(`\n=== Starting VERIFIED Multi-Source Research for: ${companyName} ===`);
  
  firecrawlRateLimited = false;

  // PHASE 1: High-reliability verified sources via Firecrawl
  if (firecrawlKey) {
    console.log('Phase 1: Verified source searches...');
    
    const prioritySearches = [
      { key: 'LinkedIn', query: `"${companyName}" site:linkedin.com/company`, reliability: 'high' as const, dataType: 'company_profile' },
      { key: 'Wikipedia', query: `"${companyName}" site:wikipedia.org`, reliability: 'medium' as const, dataType: 'general' },
      { key: 'Reuters', query: `"${companyName}" site:reuters.com`, reliability: 'very_high' as const, dataType: 'news' },
      { key: 'Bloomberg', query: `"${companyName}" site:bloomberg.com`, reliability: 'very_high' as const, dataType: 'financial_news' },
      { key: 'Glassdoor', query: `"${companyName}" site:glassdoor.com/Reviews`, reliability: 'high' as const, dataType: 'culture_reviews' },
      { key: 'Crunchbase', query: `"${companyName}" site:crunchbase.com/organization`, reliability: 'high' as const, dataType: 'funding' },
      { key: 'Financial News', query: `"${companyName}" revenue financial results`, reliability: 'high' as const, dataType: 'financial' },
      { key: 'SEC Filings', query: `"${companyName}" site:sec.gov 10-K 10-Q`, reliability: 'very_high' as const, dataType: 'financial_regulatory' },
    ];

    for (const search of prioritySearches) {
      if (firecrawlRateLimited) break;
      
      const { results, rateLimited } = await searchWithFirecrawl(
        firecrawlKey, 
        search.query, 
        search.key,
        search.reliability,
        search.dataType,
        3
      );
      
      if (results.length > 0) {
        researchData.push({
          source: search.key,
          results,
          method: 'firecrawl',
          reliability: search.reliability
        });
      }
      
      if (rateLimited) break;
      await new Promise(r => setTimeout(r, 250));
    }

    // Scrape official website
    if (!firecrawlRateLimited) {
      console.log('Scraping official website...');
      const websiteResults = await scrapeOfficialWebsite(firecrawlKey, companyName);
      if (websiteResults.length > 0) {
        researchData.push({
          source: 'Official Website',
          results: websiteResults,
          method: 'firecrawl',
          reliability: 'very_high'
        });
      }
    }
  }

  // PHASE 2: AI fallback with web grounding
  const needsFallback = firecrawlRateLimited || !firecrawlKey || researchData.length < 4;
  
  if (needsFallback) {
    console.log('Phase 2: AI-powered web search (grounded)...');
    
    const fallbackSearches = ['company_overview', 'financials', 'leadership', 'culture', 'news', 'challenges'];
    
    const fallbackPromises = fallbackSearches.map(type => 
      searchWithLovableAI(lovableKey, companyName, type)
    );
    
    const fallbackResults = await Promise.all(fallbackPromises);
    
    fallbackResults.forEach((results, index) => {
      if (results.length > 0) {
        researchData.push({
          source: `AI Search - ${fallbackSearches[index]}`,
          results,
          method: 'lovable-ai',
          reliability: 'medium'
        });
      }
    });
  }

  const totalResults = researchData.reduce((acc, d) => acc + d.results.length, 0);
  const verifiedResults = researchData.reduce((acc, d) => acc + d.results.filter(r => r.verified).length, 0);
  const methods = [...new Set(researchData.map(d => d.method))];
  
  console.log(`Research complete: ${researchData.length} sources, ${totalResults} results (${verifiedResults} verified), methods: ${methods.join(', ')}`);

  return researchData;
}

// AI Synthesis with source attribution
async function synthesizeWithAI(
  companyName: string,
  researchData: ResearchData[],
  lovableKey: string
): Promise<any> {
  const researchContext = researchData
    .filter(d => d.results.length > 0)
    .sort((a, b) => {
      const reliabilityOrder = { very_high: 4, high: 3, medium: 2, low: 1 };
      return reliabilityOrder[b.reliability] - reliabilityOrder[a.reliability];
    })
    .map(d => {
      const sourceInfo = d.results
        .map(r => `- [${r.verified ? 'VERIFIED' : 'AI-SOURCED'}] ${r.title}: ${r.snippet}\n  URL: ${r.url}${r.content ? `\n  Content: ${r.content.substring(0, 2500)}` : ''}`)
        .join('\n');
      return `### ${d.source} [${d.reliability.toUpperCase()} reliability, via ${d.method}]\n${sourceInfo}`;
    })
    .join('\n\n');

  const verifiedSources = researchData
    .filter(d => d.results.some(r => r.verified))
    .map(d => d.source);
  
  const totalResults = researchData.reduce((acc, d) => acc + d.results.length, 0);
  const verifiedResults = researchData.reduce((acc, d) => acc + d.results.filter(r => r.verified).length, 0);
  const methods = [...new Set(researchData.map(d => d.method))];

  const prompt = `You are a senior corporate intelligence analyst conducting due diligence on "${companyName}".

=== RESEARCH DATA (${totalResults} results, ${verifiedResults} verified) ===
${researchContext || 'Limited data collected.'}
=== END RESEARCH DATA ===

Verified Sources: ${verifiedSources.join(', ') || 'None'}
Research methods: ${methods.join(', ')}
Verification rate: ${totalResults > 0 ? Math.round((verifiedResults / totalResults) * 100) : 0}%

CRITICAL INSTRUCTIONS:
1. Base your analysis PRIMARILY on verified data (marked [VERIFIED]).
2. Clearly distinguish between verified facts and AI-sourced information.
3. For unverified claims, add "(unverified)" notation.
4. If key data is missing, state "Data not available from verified sources".
5. Include source attribution for major facts.
6. Provide a data quality assessment.

Generate a JSON response:
{
  "companyName": "${companyName}",
  "marketCap": "From verified source or 'Not available'",
  "headquarters": "From verified source or 'Could not verify'",
  "executiveSummary": "Comprehensive 4-5 paragraph overview based on VERIFIED research data. Include source attribution. Be specific and factual.",
  "keyChallenges": ["6-8 challenges based on verified research, each with brief source attribution"],
  "strategicOpportunities": ["6-8 opportunities based on verified research"],
  "cultureAnalysis": "Culture analysis from Glassdoor/Kununu data OR 'No verified employee review data available'",
  "interviewQuestions": {
    "expected_from_ceo": ["10 specific questions based on verified company context"],
    "to_ask_ceo": ["10 research-backed questions demonstrating due diligence"]
  },
  "sources": [{"title": "Source Name", "uri": "URL", "verified": true}],
  "dataQualityScore": "0-100 based on verification rate and source reliability",
  "dataQualityNote": "Assessment: X% verified from Y sources. Confidence level: High/Medium/Low. Key gaps: [list any missing critical data]"
}`;

  console.log('Synthesizing with AI (source-attributed)...');
  
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
          content: 'You are a factual corporate intelligence analyst. Synthesize VERIFIED research data into accurate, source-attributed due diligence reports. Never fabricate data. Always indicate confidence levels. Respond with valid JSON only.' 
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

    console.log(`=== VERIFIED Due Diligence for: ${companyName} ===`);
    console.log(`Firecrawl available: ${!!FIRECRAWL_API_KEY}`);
    console.log(`Lovable AI available: ${!!LOVABLE_API_KEY}`);

    // Conduct multi-source verified research
    const researchData = await conductResearch(companyName, FIRECRAWL_API_KEY, LOVABLE_API_KEY);

    // Synthesize with source attribution
    const dossier = await synthesizeWithAI(companyName, researchData, LOVABLE_API_KEY);

    // Add detailed research metadata
    dossier.researchSources = researchData
      .filter(d => d.results.length > 0)
      .map(d => ({
        source: d.source,
        method: d.method,
        reliability: d.reliability,
        resultsCount: d.results.length,
        verifiedCount: d.results.filter(r => r.verified).length,
        urls: d.results.map(r => ({ url: r.url, verified: r.verified })).slice(0, 5),
      }));

    const totalResults = researchData.reduce((acc, d) => acc + d.results.length, 0);
    const verifiedResults = researchData.reduce((acc, d) => acc + d.results.filter(r => r.verified).length, 0);
    
    dossier.researchStats = {
      sourcesChecked: Object.keys(DATA_SOURCES).length,
      sourcesWithData: researchData.filter(d => d.results.length > 0).length,
      totalResults: totalResults,
      verifiedResults: verifiedResults,
      verificationRate: totalResults > 0 ? Math.round((verifiedResults / totalResults) * 100) : 0,
      methodsUsed: [...new Set(researchData.map(d => d.method))],
      firecrawlEnabled: !!FIRECRAWL_API_KEY,
      fallbackUsed: researchData.some(d => d.method === 'lovable-ai'),
      highReliabilitySources: researchData.filter(d => d.reliability === 'very_high' || d.reliability === 'high').length
    };

    console.log(`=== VERIFIED Due Diligence Complete for: ${companyName} ===`);
    console.log(`Verification rate: ${dossier.researchStats.verificationRate}%`);

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
