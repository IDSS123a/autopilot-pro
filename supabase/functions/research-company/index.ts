import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Comprehensive data sources for ANY company worldwide
const DATA_SOURCES = {
  // Financial & Regulatory (Global)
  SEC_EDGAR: {
    name: 'SEC EDGAR (US)',
    searchPatterns: ['site:sec.gov/cgi-bin/browse-edgar', 'site:sec.gov 10-K 10-Q 8-K'],
    description: 'US SEC filings - 10-K, 10-Q, 8-K, DEF 14A proxy statements',
  },
  COMPANIES_HOUSE: {
    name: 'UK Companies House',
    searchPatterns: ['site:find-and-update.company-information.service.gov.uk', 'site:beta.companieshouse.gov.uk'],
    description: 'UK corporate filings, directors, accounts',
  },
  HANDELSREGISTER: {
    name: 'Handelsregister (Germany)',
    searchPatterns: ['site:handelsregister.de', 'site:unternehmensregister.de'],
    description: 'German commercial register',
  },
  ZEFIX: {
    name: 'Zefix (Switzerland)',
    searchPatterns: ['site:zefix.ch', 'site:shab.ch'],
    description: 'Swiss commercial register',
  },
  // Professional Networks
  LINKEDIN: {
    name: 'LinkedIn',
    searchPatterns: ['site:linkedin.com/company', 'site:linkedin.com/in'],
    description: 'Company profiles, executives, employee insights',
  },
  XING: {
    name: 'XING',
    searchPatterns: ['site:xing.com/companies', 'site:xing.com/profile'],
    description: 'DACH region professional network',
  },
  // Employee Reviews (Global)
  GLASSDOOR: {
    name: 'Glassdoor',
    searchPatterns: ['site:glassdoor.com/Reviews', 'site:glassdoor.de', 'site:glassdoor.co.uk'],
    description: 'Employee reviews, salaries, culture',
  },
  KUNUNU: {
    name: 'Kununu',
    searchPatterns: ['site:kununu.com'],
    description: 'German-speaking employee reviews',
  },
  // Business News (Global)
  REUTERS: {
    name: 'Reuters',
    searchPatterns: ['site:reuters.com'],
    description: 'Global business news',
  },
  BLOOMBERG: {
    name: 'Bloomberg',
    searchPatterns: ['site:bloomberg.com'],
    description: 'Financial news and analysis',
  },
  FT: {
    name: 'Financial Times',
    searchPatterns: ['site:ft.com'],
    description: 'International business news',
  },
  HANDELSBLATT: {
    name: 'Handelsblatt',
    searchPatterns: ['site:handelsblatt.com'],
    description: 'German business news',
  },
  NIKKEI: {
    name: 'Nikkei Asia',
    searchPatterns: ['site:asia.nikkei.com'],
    description: 'Asian business news',
  },
  // Startup & Funding
  CRUNCHBASE: {
    name: 'Crunchbase',
    searchPatterns: ['site:crunchbase.com/organization'],
    description: 'Funding, investors, startup data',
  },
  PITCHBOOK: {
    name: 'PitchBook',
    searchPatterns: ['site:pitchbook.com/profiles/company'],
    description: 'Private market data',
  },
  // Legal & Court Records
  COURT_LISTENER: {
    name: 'CourtListener',
    searchPatterns: ['site:courtlistener.com'],
    description: 'US court opinions and cases',
  },
  PACER: {
    name: 'PACER',
    searchPatterns: ['site:pacer.uscourts.gov'],
    description: 'US federal court records',
  },
  // Industry Analysis
  WIKIPEDIA: {
    name: 'Wikipedia',
    searchPatterns: ['site:wikipedia.org'],
    description: 'Company overview and history',
  },
  OWLER: {
    name: 'Owler',
    searchPatterns: ['site:owler.com/company'],
    description: 'Competitive intelligence',
  },
  // Official Company Website
  OFFICIAL_WEBSITE: {
    name: 'Official Website',
    searchPatterns: [''],
    description: 'Company official website',
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
    console.log(`Firecrawl search: "${query.substring(0, 80)}..."`);
    
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
      console.error(`Firecrawl error: ${response.status} - ${errorText.substring(0, 200)}`);
      return [];
    }

    const data = await response.json();
    console.log(`Firecrawl returned ${data.data?.length || 0} results`);
    return data.data || [];
  } catch (error) {
    console.error('Firecrawl search failed:', error);
    return [];
  }
}

async function researchSource(
  apiKey: string,
  companyName: string,
  sourceKey: string,
  source: typeof DATA_SOURCES[keyof typeof DATA_SOURCES]
): Promise<ResearchData> {
  const results: ResearchData['results'] = [];
  
  // Search using patterns for comprehensive coverage
  for (const pattern of source.searchPatterns.slice(0, 2)) {
    const searchQuery = pattern ? `"${companyName}" ${pattern}` : `"${companyName}" official website about`;
    
    const searchResults = await searchWithFirecrawl(apiKey, searchQuery, 3);
    
    for (const result of searchResults) {
      results.push({
        url: result.url,
        title: result.title || 'Untitled',
        snippet: result.description || '',
        content: result.markdown?.substring(0, 4000) || undefined,
      });
    }
  }
  
  return {
    source: source.name,
    results,
  };
}

async function synthesizeWithAI(
  companyName: string,
  researchData: ResearchData[]
): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  // Prepare comprehensive research context
  const researchContext = researchData
    .filter(d => d.results.length > 0)
    .map(d => {
      const sourceInfo = d.results
        .map(r => `- ${r.title}: ${r.snippet}\n  URL: ${r.url}${r.content ? `\n  Content: ${r.content.substring(0, 1500)}` : ''}`)
        .join('\n');
      return `### ${d.source}\n${sourceInfo}`;
    })
    .join('\n\n');

  const sourcesFound = researchData.filter(d => d.results.length > 0).map(d => d.source).join(', ');
  const totalResults = researchData.reduce((acc, d) => acc + d.results.length, 0);

  const prompt = `You are a corporate intelligence analyst conducting due diligence on "${companyName}".

=== SCRAPED RESEARCH DATA FROM WEB ===
${researchContext || 'No specific data scraped from web sources.'}
=== END RESEARCH DATA ===

Sources with data: ${sourcesFound || 'None'}
Total scraped results: ${totalResults}

CRITICAL INSTRUCTIONS:
1. You MUST base your analysis ONLY on the scraped data provided above.
2. If there is no scraped data or very limited data, you MUST clearly state "Insufficient data available" in relevant sections.
3. DO NOT make up, invent, or hallucinate any information that is not in the scraped data.
4. DO NOT assume the company type, industry, or any characteristics not explicitly mentioned in the data.
5. If you cannot verify information from the scraped data, say "Data not available" or "Could not verify".
6. Be honest when data is limited - it's better to say "unknown" than to guess.

Generate a JSON response with this structure:
{
  "companyName": "${companyName}",
  "marketCap": "Extract from data or 'Data not available'",
  "headquarters": "Extract from data or 'Could not determine'",
  "executiveSummary": "Write summary ONLY based on scraped data. If limited data, state: 'Limited information available from scraped sources. The following is based on available data: [facts from data]'. Do not invent details.",
  "keyChallenges": [
    "List ONLY challenges evident from the scraped data. If none found, include one item: 'Insufficient data to determine specific challenges'"
  ],
  "strategicOpportunities": [
    "List ONLY opportunities evident from the scraped data. If none found, include one item: 'Insufficient data to determine opportunities'"
  ],
  "cultureAnalysis": "Write ONLY based on employee reviews or culture data found. If none: 'No employee review data available from Glassdoor, Kununu, or similar sources.'",
  "interviewQuestions": {
    "expected_from_ceo": [
      "Generate questions based on actual company context from data. If limited: 'Standard executive questions - specific context unavailable'"
    ],
    "to_ask_ceo": [
      "Generate research-based questions ONLY if data supports them. If limited: 'Recommend researching company website directly for specific questions'"
    ]
  },
  "sources": [
    {"title": "Source name from research", "uri": "Actual URL from research data"}
  ],
  "dataQualityNote": "Describe data quality: 'Comprehensive data from X sources' or 'Limited data - recommend additional research' or 'Minimal data available - results may be incomplete'"
}

Remember: ACCURACY over completeness. If data is missing, say so clearly.`;

  console.log('Sending to AI for synthesis...');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro',
      messages: [
        { 
          role: 'system', 
          content: 'You are a factual corporate intelligence analyst. You ONLY report information found in provided scraped data. You NEVER invent or hallucinate information. When data is missing, you clearly state "data not available" or "insufficient data". Respond with valid JSON only.' 
        },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI synthesis error:', errorText);
    throw new Error(`AI synthesis failed: ${response.status}`);
  }

  const aiData = await response.json();
  const content = aiData.choices?.[0]?.message?.content || '';
  
  console.log('AI response received, parsing JSON...');
  
  // Parse JSON from response
  try {
    let cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const jsonStart = cleanContent.indexOf('{');
    const jsonEnd = cleanContent.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
    }
    
    return JSON.parse(cleanContent);
  } catch (e) {
    console.error('JSON parse error:', e, 'Content preview:', content.substring(0, 500));
    throw new Error('Failed to parse AI response');
  }
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
    
    console.log(`=== Starting Due Diligence for: ${companyName} ===`);
    console.log(`Firecrawl API Key configured: ${!!FIRECRAWL_API_KEY}`);

    let researchData: ResearchData[] = [];

    if (FIRECRAWL_API_KEY) {
      console.log('Starting comprehensive web scraping...');
      
      // Research key sources in parallel
      const prioritySources = ['LINKEDIN', 'GLASSDOOR', 'WIKIPEDIA', 'CRUNCHBASE', 'REUTERS'];
      const priorityPromises = prioritySources.map(key => {
        const source = DATA_SOURCES[key as keyof typeof DATA_SOURCES];
        if (source) {
          return researchSource(FIRECRAWL_API_KEY, companyName, key, source);
        }
        return Promise.resolve({ source: key, results: [] });
      });

      // Generic comprehensive searches
      const genericSearches = [
        searchWithFirecrawl(FIRECRAWL_API_KEY, `"${companyName}" company profile about us`, 5),
        searchWithFirecrawl(FIRECRAWL_API_KEY, `"${companyName}" CEO founder leadership team`, 5),
        searchWithFirecrawl(FIRECRAWL_API_KEY, `"${companyName}" revenue financial results investors`, 5),
        searchWithFirecrawl(FIRECRAWL_API_KEY, `"${companyName}" news press release announcement`, 5),
        searchWithFirecrawl(FIRECRAWL_API_KEY, `"${companyName}" employee reviews culture workplace`, 5),
        searchWithFirecrawl(FIRECRAWL_API_KEY, `"${companyName}" headquarters location address`, 3),
      ];

      // Execute with timeout
      const timeoutMs = 45000;
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Research timeout')), timeoutMs)
      );

      try {
        const [priorityResults, ...genericResults] = await Promise.race([
          Promise.all([Promise.all(priorityPromises), ...genericSearches]),
          timeoutPromise.then(() => { throw new Error('Timeout'); }),
        ]) as [ResearchData[], ...FirecrawlSearchResult[][]];

        researchData = priorityResults;

        // Add generic search results
        const genericData: ResearchData = {
          source: 'General Web Search',
          results: []
        };
        
        for (const results of genericResults) {
          if (Array.isArray(results)) {
            for (const r of results) {
              genericData.results.push({
                url: r.url,
                title: r.title || 'Untitled',
                snippet: r.description || '',
                content: r.markdown?.substring(0, 3000)
              });
            }
          }
        }
        
        if (genericData.results.length > 0) {
          researchData.push(genericData);
        }

      } catch (timeoutError) {
        console.warn('Research timed out, proceeding with available data');
      }

      const sourcesWithData = researchData.filter(d => d.results.length > 0);
      const totalResultCount = sourcesWithData.reduce((acc, d) => acc + d.results.length, 0);
      console.log(`Research complete: ${sourcesWithData.length} sources, ${totalResultCount} total results`);
      
    } else {
      console.warn('FIRECRAWL_API_KEY not set - running without web scraping');
    }

    // Synthesize with AI
    console.log('Synthesizing research data with AI...');
    const dossier = await synthesizeWithAI(companyName, researchData);

    // Add research metadata
    dossier.researchSources = researchData
      .filter(d => d.results.length > 0)
      .map(d => ({
        source: d.source,
        resultsCount: d.results.length,
        urls: d.results.map(r => r.url).slice(0, 5),
      }));

    dossier.researchStats = {
      sourcesChecked: Object.keys(DATA_SOURCES).length,
      sourcesWithData: researchData.filter(d => d.results.length > 0).length,
      totalResults: researchData.reduce((acc, d) => acc + d.results.length, 0),
      scrapingEnabled: !!FIRECRAWL_API_KEY
    };

    console.log(`=== Due Diligence Complete for: ${companyName} ===`);

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