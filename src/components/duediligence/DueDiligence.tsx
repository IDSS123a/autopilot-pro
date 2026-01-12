import React, { useState, useEffect } from 'react';
import { Search, Building2, BarChart3, AlertTriangle, Lightbulb, HelpCircle, Loader2, FolderOpen, Trash2, ChevronDown, ChevronUp, Download, RefreshCw, Globe, TrendingUp, Users, FileText, ExternalLink } from 'lucide-react';
import { generateCompanyDossier } from '@/services/aiService';
import { CompanyDossier } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { jsPDF } from 'jspdf';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface InterviewQuestions {
  expected_from_ceo: string[];
  to_ask_ceo: string[];
}

interface SavedDossier {
  id: string;
  company_name: string;
  market_cap: string | null;
  headquarters: string | null;
  executive_summary: string | null;
  key_challenges: string[] | null;
  strategic_opportunities: string[] | null;
  culture_analysis: string | null;
  interview_questions: Json;
  created_at: string;
}

interface ResearchStats {
  sourcesChecked?: number;
  sourcesWithData?: number;
  totalResults?: number;
  methodsUsed?: string[];
}

const parseInterviewQuestions = (json: Json): InterviewQuestions => {
  if (json && typeof json === 'object' && !Array.isArray(json)) {
    const obj = json as Record<string, unknown>;
    return {
      expected_from_ceo: Array.isArray(obj.expected_from_ceo) ? obj.expected_from_ceo as string[] : [],
      to_ask_ceo: Array.isArray(obj.to_ask_ceo) ? obj.to_ask_ceo as string[] : []
    };
  }
  return { expected_from_ceo: [], to_ask_ceo: [] };
};

const POPULAR_COMPANIES = [
  'Apple', 'Microsoft', 'Amazon', 'Google', 'Tesla', 'Meta', 
  'Siemens', 'SAP', 'BMW', 'Volkswagen', 'Nestlé', 'Novartis',
  'HSBC', 'Toyota', 'Samsung', 'Saudi Aramco', 'Tata Group'
];

const DueDiligence: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [dossier, setDossier] = useState<CompanyDossier | null>(null);
  const [researchStats, setResearchStats] = useState<ResearchStats | null>(null);
  const [savedDossiers, setSavedDossiers] = useState<SavedDossier[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [showSaved, setShowSaved] = useState(true);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);

  // Load saved dossiers on mount
  useEffect(() => {
    loadSavedDossiers();
  }, []);

  const loadSavedDossiers = async () => {
    setIsLoadingSaved(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('company_dossiers')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setSavedDossiers(data || []);
      }
    } catch (error) {
      console.error('Error loading dossiers:', error);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleCompanyInput = (value: string) => {
    setCompanyName(value);
    if (value.length > 1) {
      const matches = POPULAR_COMPANIES.filter(c => 
        c.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setSearchSuggestions(matches);
    } else {
      setSearchSuggestions([]);
    }
  };

  const handleGenerate = async () => {
    if (!companyName) return;
    setIsGenerating(true);
    setGenerationProgress(0);
    setSearchSuggestions([]);
    
    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => Math.min(prev + Math.random() * 15, 90));
    }, 500);
    
    try {
      const result = await generateCompanyDossier(companyName);
      setGenerationProgress(100);
      
      if (result) {
        setDossier(result);
        // Extract research stats if available
        if ((result as any).researchStats) {
          setResearchStats((result as any).researchStats);
        }
        
        // Save to database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase.from('company_dossiers').insert({
            user_id: user.id,
            company_name: result.companyName,
            market_cap: result.marketCap || null,
            headquarters: result.headquarters,
            executive_summary: result.executiveSummary,
            key_challenges: result.keyChallenges,
            strategic_opportunities: result.strategicOpportunities,
            culture_analysis: result.cultureAnalysis,
            interview_questions: result.interviewQuestions
          });
          
          if (error) {
            console.error('Error saving dossier:', error);
            toast.error('Failed to save dossier');
          } else {
            toast.success('Dossier saved successfully');
            loadSavedDossiers();
          }
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate dossier');
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const handleLoadDossier = (saved: SavedDossier) => {
    const loadedDossier: CompanyDossier = {
      companyName: saved.company_name,
      marketCap: saved.market_cap || undefined,
      headquarters: saved.headquarters || '',
      executiveSummary: saved.executive_summary || '',
      keyChallenges: saved.key_challenges || [],
      strategicOpportunities: saved.strategic_opportunities || [],
      cultureAnalysis: saved.culture_analysis || '',
      interviewQuestions: parseInterviewQuestions(saved.interview_questions)
    };
    setDossier(loadedDossier);
    toast.success(`Loaded dossier for ${saved.company_name}`);
  };

  const handleDeleteDossier = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('company_dossiers').delete().eq('id', id);
      if (error) throw error;
      setSavedDossiers(prev => prev.filter(d => d.id !== id));
      toast.success('Dossier deleted');
    } catch (error) {
      console.error('Error deleting dossier:', error);
      toast.error('Failed to delete dossier');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const exportToPDF = (dossierData: CompanyDossier) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let yPos = 20;

    const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxWidth);
      lines.forEach((line: string) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, margin, yPos);
        yPos += fontSize * 0.5;
      });
      yPos += 5;
    };

    // Header
    addText(dossierData.companyName, 20, true);
    addText(`${dossierData.headquarters || ''} ${dossierData.marketCap ? `• ${dossierData.marketCap}` : ''}`, 12);
    yPos += 5;

    // Executive Summary
    addText('Executive Summary', 14, true);
    addText(dossierData.executiveSummary, 10);
    yPos += 5;

    // Key Challenges
    addText('Key Challenges', 14, true);
    dossierData.keyChallenges.forEach((challenge, i) => {
      addText(`${i + 1}. ${challenge}`, 10);
    });
    yPos += 5;

    // Strategic Opportunities
    addText('Strategic Opportunities', 14, true);
    dossierData.strategicOpportunities.forEach((opp, i) => {
      addText(`${i + 1}. ${opp}`, 10);
    });
    yPos += 5;

    // Culture Analysis
    addText('Culture Analysis', 14, true);
    addText(dossierData.cultureAnalysis, 10);
    yPos += 5;

    // Interview Questions
    addText('Questions CEO May Ask', 14, true);
    dossierData.interviewQuestions.expected_from_ceo.forEach((q, i) => {
      addText(`${i + 1}. ${q}`, 10);
    });
    yPos += 5;

    addText('Questions to Ask CEO', 14, true);
    dossierData.interviewQuestions.to_ask_ceo.forEach((q, i) => {
      addText(`${i + 1}. ${q}`, 10);
    });

    doc.save(`${dossierData.companyName.replace(/\s+/g, '_')}_Dossier.pdf`);
    toast.success('PDF exported successfully');
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Due Diligence</h1>
          <p className="text-muted-foreground mt-1">AI-powered company research for any company worldwide</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-full">
          <Globe className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Global Coverage</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Saved Dossiers</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{savedDossiers.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-accent" />
            <span className="text-sm text-muted-foreground">Companies Analyzed</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{savedDossiers.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-success" />
            <span className="text-sm text-muted-foreground">Data Sources</span>
          </div>
          <p className="text-2xl font-bold text-foreground">10+</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Global Reach</span>
          </div>
          <p className="text-2xl font-bold text-foreground">195+</p>
          <p className="text-xs text-muted-foreground">Countries</p>
        </div>
      </div>

      {/* Saved Dossiers Section */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button 
          onClick={() => setShowSaved(!showSaved)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h3 className="font-heading font-semibold text-foreground">Saved Dossiers</h3>
            <span className="text-sm text-muted-foreground">({savedDossiers.length})</span>
          </div>
          {showSaved ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </button>
        
        {showSaved && (
          <div className="border-t border-border">
            {isLoadingSaved ? (
              <div className="p-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : savedDossiers.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No saved dossiers yet. Generate your first company research below.
              </div>
            ) : (
              <div className="divide-y divide-border max-h-64 overflow-y-auto">
                {savedDossiers.map((saved) => (
                  <div
                    key={saved.id}
                    onClick={() => handleLoadDossier(saved)}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{saved.company_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {saved.headquarters && `${saved.headquarters} • `}
                          {formatDate(saved.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteDossier(saved.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generate New Dossier */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-heading font-semibold text-foreground mb-4">Generate New Dossier</h3>
        <div className="relative mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Input 
                value={companyName} 
                onChange={(e) => handleCompanyInput(e.target.value)} 
                placeholder="Enter any company name worldwide (e.g., Siemens, Toyota, Nestlé, Saudi Aramco...)" 
                className="pr-10"
                onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleGenerate()}
              />
              {searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                  {searchSuggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCompanyName(suggestion);
                        setSearchSuggestions([]);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-muted/50 transition-colors text-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleGenerate} disabled={!companyName || isGenerating} className="min-w-[160px]">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Researching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Generate Dossier
                </>
              )}
            </Button>
          </div>
          
          {/* Progress indicator during generation */}
          {isGenerating && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Researching {companyName}...</span>
                <span className="text-primary">{Math.round(generationProgress)}%</span>
              </div>
              <Progress value={generationProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Searching LinkedIn, Glassdoor, financial databases, news sources, and more...
              </p>
            </div>
          )}
        </div>

        {/* Popular companies quick search */}
        {!dossier && !isGenerating && (
          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">Popular companies:</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_COMPANIES.slice(0, 8).map((company, i) => (
                <button
                  key={i}
                  onClick={() => setCompanyName(company)}
                  className="px-3 py-1.5 text-sm bg-muted/50 hover:bg-muted rounded-full transition-colors"
                >
                  {company}
                </button>
              ))}
            </div>
          </div>
        )}

        {dossier ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-heading font-bold text-foreground">{dossier.companyName}</h2>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{dossier.headquarters}</span>
                    {dossier.marketCap && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-success border-success/30">
                          {dossier.marketCap}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleGenerate()} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={() => exportToPDF(dossier)} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>

            {/* Research Stats */}
            {researchStats && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">Research quality:</span>
                  <Badge variant="outline">{researchStats.sourcesWithData || 0} of {researchStats.sourcesChecked || 10} sources</Badge>
                  <Badge variant="outline">{researchStats.totalResults || 0} data points</Badge>
                  {researchStats.methodsUsed?.map((method, i) => (
                    <Badge key={i} variant="secondary" className="capitalize">{method}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Executive Summary</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{dossier.executiveSummary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Key Challenges
                </h3>
                <ul className="space-y-2">
                  {dossier.keyChallenges.map((c, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-destructive mt-1">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-success" />
                  Strategic Opportunities
                </h3>
                <ul className="space-y-2">
                  {dossier.strategicOpportunities.map((o, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-success mt-1">•</span>
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Culture Analysis
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{dossier.cultureAnalysis}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-accent" />
                  Questions CEO May Ask You
                </h3>
                <ul className="space-y-2">
                  {dossier.interviewQuestions.expected_from_ceo.map((q, i) => (
                    <li key={i} className="text-sm text-muted-foreground p-2 bg-muted/30 rounded">{q}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  Questions to Ask CEO
                </h3>
                <ul className="space-y-2">
                  {dossier.interviewQuestions.to_ask_ceo.map((q, i) => (
                    <li key={i} className="text-sm text-muted-foreground p-2 bg-muted/30 rounded">{q}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sources Section */}
            {dossier.sources && dossier.sources.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  Research Sources
                </h3>
                <div className="flex flex-wrap gap-2">
                  {dossier.sources.map((source, i) => (
                    <a
                      key={i}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {source.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Enter a company name to generate an AI-powered intelligence dossier</p>
            <p className="text-xs text-muted-foreground">Works for any company worldwide - from startups to Fortune 500</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DueDiligence;