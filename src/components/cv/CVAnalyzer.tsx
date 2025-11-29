import React, { useState } from 'react';
import { FileText, BrainCircuit, Scale, Loader2, CheckCircle, AlertTriangle, Target, BarChart2 } from 'lucide-react';
import { analyzeCVContent, analyzeSkillGap } from '@/services/aiService';
import { CVAnalysisResult, SkillGapAnalysisResult } from '@/types';
import { Button } from '@/components/ui/button';

const CVAnalyzer: React.FC = () => {
  const [cvText, setCvText] = useState<string>('');
  const [jobDesc, setJobDesc] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingGap, setIsAnalyzingGap] = useState(false);
  const [result, setResult] = useState<CVAnalysisResult | null>(null);
  const [gapResult, setGapResult] = useState<SkillGapAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'gap'>('general');

  const handleAnalyze = async () => {
    if (!cvText.trim()) return;
    setIsAnalyzing(true);
    setActiveTab('general');
    try {
      const data = await analyzeCVContent(cvText);
      setResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGapAnalyze = async () => {
    if (!cvText.trim() || !jobDesc.trim()) return;
    setIsAnalyzingGap(true);
    setActiveTab('gap');
    try {
      const data = await analyzeSkillGap(cvText, jobDesc);
      setGapResult(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzingGap(false);
    }
  };

  const fillMockCV = () => {
    setCvText(`JOHN DOE
Chief Technology Officer | AI Strategist

EXECUTIVE SUMMARY
Visionary technology leader with 15+ years transforming enterprises through digital innovation. Proven track record scaling teams from 10 to 200+ engineers across DACH region.

EXPERIENCE
CTO, FinTech Global (2019-Present)
• Led digital transformation reducing operational costs by 40%
• Scaled engineering team from 15 to 150 engineers
• Implemented AI/ML platform processing 10M+ transactions daily

VP Engineering, Tech Innovators AG (2015-2019)
• Managed $50M technology budget
• Delivered cloud migration 3 months ahead of schedule
• Established engineering hubs in Zurich and Berlin

EDUCATION
MBA, University of St. Gallen
MSc Computer Science, ETH Zurich

SKILLS
Cloud Architecture, AI/ML, Team Leadership, Digital Transformation, Agile, DevOps`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-primary';
    return 'text-accent';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-primary';
    return 'bg-accent';
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">CV Architect</h1>
        <p className="text-muted-foreground mt-1">AI-powered CV analysis and optimization for C-Level roles</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold text-foreground">Your CV</h3>
              </div>
              <Button variant="outline" size="sm" onClick={fillMockCV}>
                Load Sample
              </Button>
            </div>
            <textarea
              value={cvText}
              onChange={(e) => setCvText(e.target.value)}
              placeholder="Paste your CV text here..."
              className="w-full h-48 bg-input border border-border rounded-lg p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <Button
              onClick={handleAnalyze}
              disabled={!cvText.trim() || isAnalyzing}
              className="w-full mt-4"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <BrainCircuit className="w-4 h-4 mr-2" />
                  Analyze CV
                </>
              )}
            </Button>
          </div>

          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Scale className="w-5 h-5 text-accent" />
              <h3 className="font-heading font-semibold text-foreground">Job Description (for Gap Analysis)</h3>
            </div>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste the target job description..."
              className="w-full h-32 bg-input border border-border rounded-lg p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <Button
              onClick={handleGapAnalyze}
              disabled={!cvText.trim() || !jobDesc.trim() || isAnalyzingGap}
              variant="secondary"
              className="w-full mt-4"
            >
              {isAnalyzingGap ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing Gap...
                </>
              ) : (
                <>
                  <Scale className="w-4 h-4 mr-2" />
                  Run Skill Gap Analysis
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'general' ? 'border-primary text-foreground bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              General Profile
            </button>
            <button
              onClick={() => setActiveTab('gap')}
              disabled={!gapResult}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'gap' ? 'border-primary text-foreground bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground disabled:opacity-50'
              }`}
            >
              Gap Analysis
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'general' && result ? (
              <div className="space-y-6">
                {/* Overall Score */}
                <div className="text-center">
                  <div className={`text-5xl font-heading font-bold ${getScoreColor(result.score)}`}>
                    {result.score}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Executive Readiness Score</p>
                </div>

                {/* Sub Scores */}
                {result.sub_scores && (
                  <div className="grid grid-cols-3 gap-4">
                    {['leadership', 'impact', 'communication'].map((key) => {
                      const score = result.sub_scores?.[key as keyof typeof result.sub_scores] as number;
                      return (
                        <div key={key} className="text-center p-3 bg-muted/30 rounded-lg">
                          <div className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}</div>
                          <p className="text-xs text-muted-foreground capitalize">{key}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Summary */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground">{result.summary}</p>
                </div>

                {/* Strengths */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-success" />
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-success">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-accent" />
                    Areas for Improvement
                  </h4>
                  <ul className="space-y-2">
                    {result.weaknesses.map((w, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-accent">•</span>
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Strategic Positioning */}
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Strategic Positioning
                  </h4>
                  <p className="text-sm text-muted-foreground">{result.strategic_positioning}</p>
                </div>
              </div>
            ) : activeTab === 'gap' && gapResult ? (
              <div className="space-y-6">
                {/* Match Score */}
                <div className="text-center">
                  <div className={`text-5xl font-heading font-bold ${getScoreColor(gapResult.match_score)}`}>
                    {gapResult.match_score}%
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Job Match Score</p>
                  <div className="w-full h-2 bg-muted rounded-full mt-3 overflow-hidden">
                    <div 
                      className={`h-full ${getScoreBg(gapResult.match_score)} transition-all duration-500`}
                      style={{ width: `${gapResult.match_score}%` }}
                    />
                  </div>
                </div>

                {/* Missing Skills */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-accent" />
                    Missing Critical Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {gapResult.missing_critical_skills.map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-accent/10 text-accent text-sm rounded-full border border-accent/30">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-primary" />
                    Tailoring Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {gapResult.recommendations.map((rec, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                        <span className="text-primary font-bold">{i + 1}.</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BrainCircuit className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Paste your CV and click "Analyze CV" to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVAnalyzer;
