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

  COMPANY_DOSSIER: (companyName: string, industry: string) => `You are a senior M&A due diligence analyst. Generate a comprehensive intelligence dossier for a C-Level executive preparing for interviews.

Company: ${companyName}
Industry: ${industry}

Generate a JSON response with:
{
  "companyName": "...",
  "marketCap": "...",
  "headquarters": "...",
  "executiveSummary": "2-3 paragraph overview",
  "keyChallenges": ["...", "...", "..."],
  "strategicOpportunities": ["...", "...", "..."],
  "cultureAnalysis": "...",
  "interviewQuestions": {
    "expected_from_ceo": ["...", "...", "..."],
    "to_ask_ceo": ["...", "...", "..."]
  }
}`,

  EMAIL_SIGNATURE: (name: string, title: string, company: string, phone: string, linkedin: string, website: string) => `Create 3 professional email signature variations for an executive job seeker.

Name: ${name}
Title: ${title}
Company: ${company}
Phone: ${phone}
LinkedIn: ${linkedin}
Website: ${website}

Format each as plain text. Keep them concise and elegant.`
};
