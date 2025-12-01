import React, { useState, useRef, useEffect } from 'react';
import { FileText, BrainCircuit, Scale, Loader2, CheckCircle, AlertTriangle, Target, BarChart2, Download, Upload } from 'lucide-react';
import { analyzeCVContent, analyzeSkillGap } from '@/services/aiService';
import { CVAnalysisResult, SkillGapAnalysisResult } from '@/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

const CVAnalyzer: React.FC = () => {
  const [cvText, setCvText] = useState<string>('');
  const [jobDesc, setJobDesc] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingGap, setIsAnalyzingGap] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<CVAnalysisResult | null>(null);
  const [gapResult, setGapResult] = useState<SkillGapAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'gap'>('general');
  const { toast } = useToast();
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track component mount status to prevent state updates on unmount
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsParsing(true);

    try {
      // Read file as text - works for .txt files
      const text = await file.text();
      if (isMounted.current) {
        setCvText(text);
        toast({ title: 'File loaded', description: 'Text extracted successfully from your file' });
      }
    } catch (error) {
      console.error('Error reading file:', error);
      toast({ title: 'Read failed', description: 'Failed to read file. Please try pasting the text manually.', variant: 'destructive' });
    } finally {
      if (isMounted.current) {
        setIsParsing(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyze = async () => {
    if (!cvText.trim()) return;
    setIsAnalyzing(true);
    setActiveTab('general');
    try {
      const data = await analyzeCVContent(cvText);
      setResult(data);
      toast({ title: 'Analysis complete', description: 'Your CV has been analyzed successfully' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to analyze CV', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGapAnalyze = async () => {
    if (!cvText.trim() || !jobDesc.trim()) {
      toast({ title: 'Missing information', description: 'Please provide both CV and job description', variant: 'destructive' });
      return;
    }
    setIsAnalyzingGap(true);
    setActiveTab('gap');
    try {
      const data = await analyzeSkillGap(cvText, jobDesc);
      setGapResult(data);
      toast({ title: 'Gap analysis complete', description: 'Skill gap analysis finished successfully' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to analyze skill gap', variant: 'destructive' });
    } finally {
      setIsAnalyzingGap(false);
    }
  };

  const handleExportPDF = async () => {
    if (!result && !gapResult) {
      toast({ title: 'No results', description: 'Please run an analysis first', variant: 'destructive' });
      return;
    }

    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Header
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('CV Analysis Report', margin, 25);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 35);
      pdf.text('C-Level AutoPilot Pro', pageWidth - margin - 50, 35);

      yPosition = 55;
      pdf.setTextColor(0, 0, 0);

      if (result) {
        // Executive Readiness Score
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Executive Readiness Score', margin, yPosition);
        yPosition += 15;

        pdf.setFontSize(36);
        const scoreColor = result.score >= 80 ? [34, 197, 94] : result.score >= 60 ? [59, 130, 246] : [245, 158, 11];
        pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
        pdf.text(result.score.toString(), margin, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 15;

        // Sub scores
        if (result.sub_scores) {
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Detailed Scores:', margin, yPosition);
          yPosition += 8;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.text(`Leadership: ${result.sub_scores.leadership}/100`, margin, yPosition);
          yPosition += 6;
          pdf.text(`Impact: ${result.sub_scores.impact}/100`, margin, yPosition);
          yPosition += 6;
          pdf.text(`Communication: ${result.sub_scores.communication}/100`, margin, yPosition);
          yPosition += 12;
        }

        // Summary
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Summary', margin, yPosition);
        yPosition += 7;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        const summaryLines = pdf.splitTextToSize(result.summary, pageWidth - 2 * margin);
        pdf.text(summaryLines, margin, yPosition);
        yPosition += summaryLines.length * 5 + 10;

        // Strengths
        if (result.strengths.length > 0) {
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(34, 197, 94);
          pdf.text('Strengths', margin, yPosition);
          pdf.setTextColor(0, 0, 0);
          yPosition += 7;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          result.strengths.forEach((s) => {
            if (yPosition > pageHeight - margin) {
              pdf.addPage();
              yPosition = margin;
            }
            const lines = pdf.splitTextToSize(`• ${s}`, pageWidth - 2 * margin);
            pdf.text(lines, margin, yPosition);
            yPosition += lines.length * 5 + 2;
          });
          yPosition += 8;
        }

        // Weaknesses
        if (result.weaknesses.length > 0) {
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(245, 158, 11);
          pdf.text('Areas for Improvement', margin, yPosition);
          pdf.setTextColor(0, 0, 0);
          yPosition += 7;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          result.weaknesses.forEach((w) => {
            if (yPosition > pageHeight - margin) {
              pdf.addPage();
              yPosition = margin;
            }
            const lines = pdf.splitTextToSize(`• ${w}`, pageWidth - 2 * margin);
            pdf.text(lines, margin, yPosition);
            yPosition += lines.length * 5 + 2;
          });
          yPosition += 8;
        }

        // Strategic Positioning
        if (result.strategic_positioning) {
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(59, 130, 246);
          pdf.text('Strategic Positioning', margin, yPosition);
          pdf.setTextColor(0, 0, 0);
          yPosition += 7;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          const posLines = pdf.splitTextToSize(result.strategic_positioning, pageWidth - 2 * margin);
          pdf.text(posLines, margin, yPosition);
          yPosition += posLines.length * 5 + 10;
        }
      }

      // Gap Analysis Results
      if (gapResult) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Skill Gap Analysis', margin, yPosition);
        yPosition += 12;

        // Match Score
        pdf.setFontSize(14);
        pdf.text(`Job Match Score: ${gapResult.match_score}%`, margin, yPosition);
        yPosition += 12;

        // Missing Skills
        if (gapResult.missing_critical_skills.length > 0) {
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(245, 158, 11);
          pdf.text('Missing Critical Skills', margin, yPosition);
          pdf.setTextColor(0, 0, 0);
          yPosition += 7;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          gapResult.missing_critical_skills.forEach((skill) => {
            if (yPosition > pageHeight - margin) {
              pdf.addPage();
              yPosition = margin;
            }
            pdf.text(`• ${skill}`, margin, yPosition);
            yPosition += 6;
          });
          yPosition += 8;
        }

        // Recommendations
        if (gapResult.recommendations.length > 0) {
          if (yPosition > pageHeight - 40) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(59, 130, 246);
          pdf.text('Tailoring Recommendations', margin, yPosition);
          pdf.setTextColor(0, 0, 0);
          yPosition += 7;
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          gapResult.recommendations.forEach((rec, i) => {
            if (yPosition > pageHeight - margin) {
              pdf.addPage();
              yPosition = margin;
            }
            const lines = pdf.splitTextToSize(`${i + 1}. ${rec}`, pageWidth - 2 * margin);
            pdf.text(lines, margin, yPosition);
            yPosition += lines.length * 5 + 4;
          });
        }
      }

      // Footer
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(128, 128, 128);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        pdf.text('Generated by C-Level AutoPilot Pro', pageWidth / 2, pageHeight - 5, { align: 'center' });
      }

      pdf.save('cv-analysis-report.pdf');
      toast({ title: 'PDF exported', description: 'Your analysis report has been downloaded' });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({ title: 'Export failed', description: 'Failed to generate PDF', variant: 'destructive' });
    } finally {
      setIsExporting(false);
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

  const fillMockJobDesc = () => {
    setJobDesc(`Chief Technology Officer - FinTech Scale-up

We are seeking a visionary CTO to lead our technology organization through the next phase of growth.

Requirements:
- 10+ years of technology leadership experience
- Proven track record scaling engineering teams (50+)
- Deep expertise in cloud architecture (AWS/GCP/Azure)
- Experience with financial services or regulatory environments
- Strong background in AI/ML implementation
- Experience with microservices architecture
- Track record of delivering products at scale
- MBA or advanced technical degree preferred
- Blockchain or DeFi experience is a plus
- German language skills required

Responsibilities:
- Define and execute technology strategy
- Build and lead a world-class engineering organization
- Drive digital transformation initiatives
- Ensure security and compliance standards
- Partner with CEO and board on strategic decisions`);
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">CV Architect</h1>
          <p className="text-muted-foreground mt-1">AI-powered CV analysis and optimization for C-Level roles</p>
        </div>
        {(result || gapResult) && (
          <Button onClick={handleExportPDF} disabled={isExporting} variant="outline">
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        )}
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={triggerFileUpload} disabled={isParsing}>
                  {isParsing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
                  {isParsing ? 'Loading...' : 'Upload File'}
                </Button>
                <Button variant="outline" size="sm" onClick={fillMockCV}>
                  Load Sample
                </Button>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.doc,.docx"
                className="hidden"
              />
            </div>
            <div className="relative">
              <textarea
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder="Paste your CV text here or upload a PDF..."
                className={`w-full h-48 bg-input border border-border rounded-lg p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none ${isParsing ? 'opacity-50' : ''}`}
                disabled={isParsing}
              />
              {isParsing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 border border-border">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-sm font-medium text-foreground">Extracting text...</span>
                  </div>
                </div>
              )}
            </div>
            <Button
              onClick={handleAnalyze}
              disabled={!cvText.trim() || isAnalyzing || isParsing}
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-accent" />
                <h3 className="font-heading font-semibold text-foreground">Job Description (for Gap Analysis)</h3>
              </div>
              <Button variant="outline" size="sm" onClick={fillMockJobDesc}>
                Load Sample
              </Button>
            </div>
            <textarea
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              placeholder="Paste the target job description..."
              className="w-full h-32 bg-input border border-border rounded-lg p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
            <Button
              onClick={handleGapAnalyze}
              disabled={!cvText.trim() || !jobDesc.trim() || isAnalyzingGap || isParsing}
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
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'gap' ? 'border-primary text-foreground bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'
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
            ) : activeTab === 'gap' && !gapResult ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Scale className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Paste your CV and a job description, then click "Run Skill Gap Analysis"
                </p>
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
