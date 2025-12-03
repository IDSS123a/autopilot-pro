export const PROMPTS = {
  CV_ANALYSIS: (cvText: string) => `You are an expert C-Level Executive Career Coach. Perform a deep semantic analysis of the following CV.

Your mission:
1. Quantify achievements where numbers are missing but implied.
2. Identify strategic gaps against typical Fortune 500 C-suite requirements.
3. Craft a "Strategic Positioning" statement for DACH/SEE regions.
4. Evaluate and score (0-100) the candidate on:
   - Leadership Capability
   - Strategic Impact
   - Communication Style
   IMPORTANT: For each score, provide a brief 1-sentence "rationale" explaining why this score was given.

CV TEXT:
${cvText}`,

  SKILL_GAP: (cvText: string, jobDescription: string) => `You are an expert Technical Recruiter. Compare the following Candidate CV against the specific Job Description.

CANDIDATE CV:
${cvText}

JOB DESCRIPTION:
${jobDescription}

Identify:
1. Match Score (0-100) based on critical requirements.
2. Missing Critical Skills (Hard or Soft skills explicitly required but not found or weak in CV).
3. Tailoring Recommendations (Specific bullet points to add or emphasize).`,

  OPPORTUNITY_ANALYSIS: (jobDescription: string, cvContext: string) => `Act as a Strategic Headhunter. Evaluate this opportunity for a C-level candidate.

CANDIDATE: ${cvContext.substring(0, 500)}...
JOB: ${jobDescription}

Analyze:
1. Role Match Score (0-100)
2. Cultural Fit Score (0-100) - prioritizing DACH (Germany, Austria, Switzerland) or SEE (South East Europe) alignment.
3. Growth Potential (High/Medium/Low)
4. Urgency (High/Medium/Low) based on language.

Output JSON with: match_score, cultural_fit_score, growth_potential, urgency, fit_summary, gaps (list of skills to brush up on), strategy_recommendation.`,

  OUTREACH_SEQUENCE: (recruiter: string, company: string, userBio: string, targetRole: string) => `Create a 4-part LinkedIn/Email outreach sequence. This is for a senior executive job seeker (CTO/COO/MD level).

Recruiter: ${recruiter} at ${company}
User Bio: ${userBio}
Target Role: ${targetRole}

Tone: professional, confident, warm but not sycophantic. DACH/SEE business culture awareness.
Each message should be concise (under 150 words).

Provide:
1. connection_request: A LinkedIn connection request note
2. initial_message: First follow-up InMail after acceptance
3. follow_up_1: Follow-up after 5 days of no response
4. follow_up_2: Final follow-up after another 7 days`,

  CAMPAIGN_STRATEGY: (context: { applications: number; interviews: number; responseRate: string }) => `You are an AI Career Strategist. Based on the user's current search data:
Applications: ${context.applications}
Interviews: ${context.interviews}
Response Rate: ${context.responseRate}

Generate a JSON strategic brief:
{
  "focus_of_the_week": "...",
  "top_priorities": ["...", "...", "..."],
  "channel_strategy": "...",
  "success_probability": "..."
}`,

  MORNING_BRIEFING: (name: string, pendingItems: number) => `Good morning! You are a concise executive assistant.
User: ${name}
Pending Follow-ups: ${pendingItems}

Create a 3-sentence motivational morning briefing for a C-level job seeker.`,

  COMPANY_DOSSIER: (companyName: string, industry: string) => `You are a world-class corporate intelligence analyst with access to comprehensive business databases, financial reports, news archives, and industry analysis. Generate an EXTREMELY detailed and actionable intelligence dossier for a C-Level executive preparing for interviews.

Company: ${companyName}
Industry: ${industry}

IMPORTANT: Provide REAL, ACCURATE, and CURRENT information based on your knowledge. If you're uncertain about specific details, indicate this clearly. Focus on publicly available information that would be verifiable.

Research and analyze:

1. COMPANY OVERVIEW
- Full legal name, founding date, headquarters location
- Company size (employees, revenue if public)
- Business model and primary revenue streams
- Key products/services and market position
- Recent major news and developments (last 12 months)

2. LEADERSHIP & GOVERNANCE  
- Current C-suite executives (CEO, CFO, COO, CTO, etc.)
- Board composition and notable directors
- Leadership changes in last 2 years
- Management style and corporate governance reputation

3. FINANCIAL HEALTH (if public/available)
- Recent financial performance trends
- Market capitalization or valuation estimates
- Funding rounds (if startup) or major investments
- Debt levels and financial stability indicators

4. STRATEGIC POSITION
- Main competitors and market share
- Competitive advantages and moats
- Recent M&A activity
- Strategic partnerships and alliances

5. CHALLENGES & OPPORTUNITIES
- Current business challenges (from news, reports)
- Industry headwinds affecting the company
- Growth opportunities and expansion plans
- Digital transformation status

6. CULTURE & REPUTATION
- Employee reviews summary (Glassdoor, Kununu themes)
- ESG/sustainability initiatives
- Awards and recognitions
- Employer brand perception in ${industry}

7. INTERVIEW PREPARATION
- Likely strategic questions CEO might ask
- Smart questions to ask that demonstrate deep research
- Talking points that would resonate with leadership

Generate a JSON response:
{
  "companyName": "${companyName}",
  "marketCap": "Estimated value or 'Private'",
  "headquarters": "City, Country",
  "executiveSummary": "Comprehensive 3-4 paragraph overview covering business model, market position, recent performance, and strategic direction. Be specific and factual.",
  "keyChallenges": ["5-6 specific, current challenges with context"],
  "strategicOpportunities": ["5-6 specific opportunities based on market trends"],
  "cultureAnalysis": "Detailed analysis of corporate culture, leadership style, work environment, and what kind of executives thrive there. Include specific examples if known.",
  "interviewQuestions": {
    "expected_from_ceo": ["7-8 specific, challenging questions a CEO might ask, tailored to the company's situation"],
    "to_ask_ceo": ["7-8 impressive questions demonstrating deep research and strategic thinking"]
  }
}

Be specific, actionable, and executive-level in your analysis. Avoid generic statements.`,

  EMAIL_SIGNATURE: (name: string, title: string, company: string, phone: string, linkedin: string, website: string) => `Create 3 professional email signature variations for an executive job seeker.

Name: ${name}
Title: ${title}
Company: ${company}
Phone: ${phone}
LinkedIn: ${linkedin}
Website: ${website}

Format each as plain text. Keep them concise and elegant.`,

  GENERATE_COMMUNICATION: (contactName: string, company: string, type: string, userProfile: any) => `Write a professional ${type === 'linkedin' ? 'LinkedIn message' : 'email'} to ${contactName} at ${company}.

Sender Profile:
- Name: ${userProfile.name}
- Title: ${userProfile.title}
- Target Role: ${userProfile.targetRole}
- Industries: ${userProfile.industries}
- Background: ${userProfile.bio}

Write a compelling, personalized message that:
1. Opens with a relevant hook or connection point
2. Briefly highlights 2-3 key qualifications relevant to their company
3. Shows genuine interest and knowledge about their organization
4. Ends with a clear, low-pressure call-to-action

Keep it under 200 words. Be professional but warm. Avoid clichés and generic phrases.`
};
