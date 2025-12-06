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
      console.error(`Firecrawl search error: ${response.status} - ${errorText.substring(0, 100)}`);
      return [];
    }

    const data = await response.json();
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
  
  // Search using multiple patterns for comprehensive coverage
  for (const pattern of source.searchPatterns.slice(0, 2)) {
    const searchQuery = `"${companyName}" ${pattern}`;
    console.log(`Searching ${source.name}: ${searchQuery.substring(0, 60)}...`);
    
    const searchResults = await searchWithFirecrawl(apiKey, searchQuery, 3);
    
    for (const result of searchResults) {
      results.push({
        url: result.url,
        title: result.title || 'Untitled',
        snippet: result.description || '',
        content: result.markdown?.substring(0, 3000) || undefined,
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
        .map(r => `- ${r.title}: ${r.snippet}\n  URL: ${r.url}${r.content ? `\n  Content excerpt: ${r.content.substring(0, 1000)}...` : ''}`)
        .join('\n');
      return `### ${d.source}\n${sourceInfo}`;
    })
    .join('\n\n');

  const sourcesFound = researchData.filter(d => d.results.length > 0).map(d => d.source).join(', ');

  const prompt = `You are a world-class corporate intelligence analyst conducting due diligence on "${companyName}".

CRITICAL: This is a UNIVERSAL research tool. The company can be in ANY industry (technology, manufacturing, healthcare, retail, finance, energy, construction, agriculture, hospitality, etc.) and ANY country worldwide.

=== SCRAPED RESEARCH DATA ===
${researchContext || 'Limited specific data found from scraped sources.'}
=== END RESEARCH DATA ===

Sources checked: ${sourcesFound || 'Various business databases'}

YOUR TASK:
Generate a comprehensive executive-level due diligence dossier. Use the scraped data where available, and supplement with your knowledge base for this company.

REQUIREMENTS:
1. Be specific to THIS company - not generic industry information
2. Include financial metrics, recent news, and strategic positioning
3. Research challenges and opportunities specific to their industry and geography
4. Culture analysis based on employee reviews and company reputation
5. Prepare interview questions that demonstrate deep research

Generate a JSON response with this EXACT structure:
{
  "companyName": "${companyName}",
  "marketCap": "Market cap or 'Private' or estimated valuation",
  "headquarters": "City, Country (be accurate)",
  "executiveSummary": "4-5 detailed paragraphs covering: company overview, business model, market position, recent developments, and strategic direction. Be specific and factual.",
  "keyChallenges": [
    "8-10 specific challenges facing this company - include market, operational, regulatory, competitive challenges relevant to their industry"
  ],
  "strategicOpportunities": [
    "8-10 specific growth opportunities - market expansion, product development, M&A, partnerships relevant to their situation"
  ],
  "cultureAnalysis": "Detailed 2-3 paragraph analysis of company culture based on available data: leadership style, work environment, employee sentiment, values, diversity initiatives, work-life balance. If limited data, note what's observable.",
  "interviewQuestions": {
    "expected_from_ceo": [
      "10 specific questions the CEO/leadership might ask a senior candidate, based on company's current challenges and strategy"
    ],
    "to_ask_ceo": [
      "10 insightful questions to ask leadership that demonstrate deep research into the company"
    ]
  },
  "sources": [
    {"title": "Source Name", "uri": "URL from research data"}
  ]
}

IMPORTANT: 
- Do NOT limit research to technology companies - this works for ANY industry
- Be specific to the actual company, not generic
- Include country-specific regulatory and market context
- Financial data should reflect the company's actual situation
- If public company, include stock performance context
- If private, estimate based on available signals`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-pro', // Using Pro for deeper analysis
      messages: [
        { 
          role: 'system', 
          content: 'You are a senior M&A due diligence analyst with expertise across ALL industries globally. Provide thorough, factual, company-specific analysis. Always respond with valid JSON.' 
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
    console.error('JSON parse error:', e, 'Content preview:', content.substring(0, 300));
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
    if (!FIRECRAWL_API_KEY) {
      console.warn('FIRECRAWL_API_KEY not set, using AI-only mode');
    }

    console.log(`Starting comprehensive due diligence for: ${companyName}`);

    let researchData: ResearchData[] = [];

    if (FIRECRAWL_API_KEY) {
      // Comprehensive parallel research across ALL sources
      const researchPromises = Object.entries(DATA_SOURCES).map(([key, source]) =>
        researchSource(FIRECRAWL_API_KEY, companyName, key, source)
      );

      // Add generic searches for broader coverage
      const additionalSearches = [
        searchWithFirecrawl(FIRECRAWL_API_KEY, `"${companyName}" company overview profile`, 5),
        searchWithFirecrawl(FIRECRAWL_API_KEY, `"${companyName}" CEO leadership management team`, 5),
        searchWithFirecrawl(FIRECRAWL_API_KEY, `"${companyName}" revenue financial results annual report`, 5),
        searchWithFirecrawl(FIRECRAWL_API_KEY, `"${companyName}" news acquisition merger expansion`, 5),
        searchWithFirecrawl(FIRECRAWL_API_KEY, `"${companyName}" employees culture workplace`, 5),
      ];

      // Execute with timeout
      const timeoutPromise = new Promise<ResearchData[]>((resolve) => 
        setTimeout(() => resolve([]), 35000) // Extended timeout for comprehensive search
      );

      const [sourceResults, ...additionalResults] = await Promise.race([
        Promise.all([Promise.all(researchPromises), ...additionalSearches]),
        timeoutPromise.then(() => [[]] as any),
      ]);

      if (Array.isArray(sourceResults)) {
        researchData = sourceResults as ResearchData[];
      }

      // Add additional search results
      if (additionalResults) {
        const additionalData: ResearchData = {
          source: 'General Web Search',
          results: []
        };
        for (const results of additionalResults) {
          if (Array.isArray(results)) {
            for (const r of results) {
              additionalData.results.push({
                url: r.url,
                title: r.title || 'Untitled',
                snippet: r.description || '',
                content: r.markdown?.substring(0, 2000)
              });
            }
          }
        }
        if (additionalData.results.length > 0) {
          researchData.push(additionalData);
        }
      }

      const sourcesWithData = researchData.filter(d => d.results.length > 0);
      console.log(`Research complete. ${sourcesWithData.length} sources with data, ${sourcesWithData.reduce((acc, d) => acc + d.results.length, 0)} total results`);
    }

    // Synthesize with AI (industry-agnostic)
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
      totalResults: researchData.reduce((acc, d) => acc + d.results.length, 0)
    };

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