import { supabase } from '@/integrations/supabase/client';
import { PROMPTS } from '@/lib/prompts';
import { CVAnalysisResult, SkillGapAnalysisResult, StrategyBrief, CompanyDossier } from '@/types';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  const messages = [];
  
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  messages.push({ role: 'user', content: prompt });

  const response = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (response.status === 402) {
      throw new Error('Payment required. Please add funds to continue.');
    }
    throw new Error('AI service error');
  }

  const data = await response.json();
  return data.content || '';
}

/**
 * Robust JSON extraction helper.
 * Handles:
 * 1. Markdown code blocks (```json ... ```)
 * 2. Conversational filler text ("Here is your JSON: ...")
 * 3. Raw JSON
 */
function extractJSON(text: string): any {
  if (!text) return {};

  try {
    // Attempt 1: Clean parse
    return JSON.parse(text);
  } catch {
    // Attempt 2: Remove Markdown wrappers
    let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    try {
      return JSON.parse(clean);
    } catch {
      // Attempt 3: Extract the first JSON object {} or array []
      const firstOpenBrace = clean.indexOf('{');
      const lastCloseBrace = clean.lastIndexOf('}');

      if (firstOpenBrace !== -1 && lastCloseBrace !== -1) {
        try {
          return JSON.parse(clean.substring(firstOpenBrace, lastCloseBrace + 1));
        } catch {
          // Continue to array check
        }
      }

      const firstOpenBracket = clean.indexOf('[');
      const lastCloseBracket = clean.lastIndexOf(']');
      if (firstOpenBracket !== -1 && lastCloseBracket !== -1) {
        try {
          return JSON.parse(clean.substring(firstOpenBracket, lastCloseBracket + 1));
        } catch {
          // Failure
        }
      }

      console.warn("Failed to extract JSON from response:", text.substring(0, 100) + "...");
      throw new Error("JSON Parsing Failed");
    }
  }
}

export async function analyzeCVContent(cvText: string): Promise<CVAnalysisResult> {
  const systemPrompt = `You are an expert C-Level Executive Career Coach. Always respond with valid JSON.`;
  const prompt = `${PROMPTS.CV_ANALYSIS(cvText)}

Respond with JSON in this exact format:
{
  "score": 85,
  "summary": "...",
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "strategic_positioning": "...",
  "quantified_achievements": ["...", "..."],
  "sub_scores": {
    "leadership": 80,
    "leadership_rationale": "...",
    "impact": 75,
    "impact_rationale": "...",
    "communication": 85,
    "communication_rationale": "..."
  }
}`;

  try {
    const response = await callAI(prompt, systemPrompt);
    const json = extractJSON(response);
    return {
      score: json.score || 0,
      summary: json.summary || '',
      strengths: json.strengths || [],
      weaknesses: json.weaknesses || [],
      strategic_positioning: json.strategic_positioning || '',
      quantified_achievements: json.quantified_achievements || [],
      sub_scores: json.sub_scores || undefined
    };
  } catch (error) {
    console.error('CV Analysis error:', error);
    return {
      score: 0,
      summary: 'Analysis failed. Please try again.',
      strengths: [],
      weaknesses: [],
      strategic_positioning: ''
    };
  }
}

export async function analyzeSkillGap(cvText: string, jobDescription: string): Promise<SkillGapAnalysisResult> {
  const systemPrompt = `You are an expert Technical Recruiter. Always respond with valid JSON.`;
  const prompt = `${PROMPTS.SKILL_GAP(cvText, jobDescription)}

Respond with JSON in this exact format:
{
  "match_score": 75,
  "missing_critical_skills": ["...", "..."],
  "recommendations": ["...", "..."]
}`;

  try {
    const response = await callAI(prompt, systemPrompt);
    const json = extractJSON(response);
    return {
      match_score: json.match_score || 0,
      missing_critical_skills: json.missing_critical_skills || [],
      recommendations: json.recommendations || []
    };
  } catch (error) {
    console.error('Skill gap analysis error:', error);
    return {
      match_score: 0,
      missing_critical_skills: ['Analysis failed'],
      recommendations: ['Please try again']
    };
  }
}

export async function analyzeOpportunity(jobDescription: string, cvContext: string): Promise<any> {
  const systemPrompt = `You are a Strategic Headhunter. Always respond with valid JSON.`;
  const prompt = `${PROMPTS.OPPORTUNITY_ANALYSIS(jobDescription, cvContext)}

Respond with JSON in this exact format:
{
  "match_score": 80,
  "cultural_fit_score": 75,
  "growth_potential": "High",
  "urgency": "Medium",
  "fit_summary": "...",
  "gaps": ["...", "..."],
  "strategy_recommendation": "..."
}`;

  try {
    const response = await callAI(prompt, systemPrompt);
    return extractJSON(response);
  } catch (error) {
    console.error('Opportunity analysis error:', error);
    return null;
  }
}

export async function generateOutreachSequence(
  recruiterName: string,
  company: string,
  userBio: string,
  targetRole: string
): Promise<any> {
  const systemPrompt = `You are a professional communication expert. Always respond with valid JSON.`;
  const prompt = `${PROMPTS.OUTREACH_SEQUENCE(recruiterName, company, userBio, targetRole)}

Respond with JSON in this exact format:
{
  "connection_request": "...",
  "initial_message": "...",
  "follow_up_1": "...",
  "follow_up_2": "..."
}`;

  try {
    const response = await callAI(prompt, systemPrompt);
    return extractJSON(response);
  } catch (error) {
    console.error('Outreach sequence error:', error);
    return null;
  }
}

export async function generateCampaignStrategy(context: { applications: number; interviews: number; responseRate: string }): Promise<StrategyBrief | null> {
  const systemPrompt = `You are an AI Career Strategist. Always respond with valid JSON.`;
  const prompt = PROMPTS.CAMPAIGN_STRATEGY(context);

  try {
    const response = await callAI(prompt, systemPrompt);
    return extractJSON(response);
  } catch (error) {
    console.error('Campaign strategy error:', error);
    return null;
  }
}

export async function generateMorningBriefing(name: string, pendingItems: number): Promise<string> {
  const prompt = PROMPTS.MORNING_BRIEFING(name, pendingItems);

  try {
    return await callAI(prompt);
  } catch (error) {
    console.error('Morning briefing error:', error);
    return 'Good morning! Stay focused on your executive career goals today.';
  }
}

export async function generateCompanyDossier(
  companyName: string,
  industry: string,
  signal?: AbortSignal
): Promise<CompanyDossier | null> {
  const systemPrompt = `You are a senior M&A due diligence analyst. Always respond with valid JSON.`;
  const prompt = PROMPTS.COMPANY_DOSSIER(companyName, industry);

  try {
    const response = await callAI(prompt, systemPrompt);
    return extractJSON(response);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request aborted');
    }
    console.error('Company dossier error:', error);
    return null;
  }
}

export async function generateEmailSignature(
  name: string,
  title: string,
  company: string,
  phone: string,
  linkedin: string,
  website: string
): Promise<string[]> {
  const prompt = PROMPTS.EMAIL_SIGNATURE(name, title, company, phone, linkedin, website);

  try {
    const response = await callAI(prompt);
    // Parse signatures from response
    const signatures = response.split(/(?:Signature|Option|Version)\s*\d+/i)
      .filter(s => s.trim().length > 20)
      .slice(0, 3);
    return signatures.length > 0 ? signatures : [response];
  } catch (error) {
    console.error('Email signature error:', error);
    return [`${name}\n${title}\n${company}\n${phone}`];
  }
}
