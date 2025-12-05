import React, { useState, useEffect } from 'react';
import { Search, Building2, BarChart3, AlertTriangle, Lightbulb, HelpCircle, Loader2, FolderOpen, Trash2, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { generateCompanyDossier } from '@/services/aiService';
import { CompanyDossier } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';
import { jsPDF } from 'jspdf';

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

const DueDiligence: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dossier, setDossier] = useState<CompanyDossier | null>(null);
  const [savedDossiers, setSavedDossiers] = useState<SavedDossier[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(true);
  const [showSaved, setShowSaved] = useState(true);

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

  const handleGenerate = async () => {
    if (!companyName) return;
    setIsGenerating(true);
    try {
      const result = await generateCompanyDossier(companyName, industry || 'Technology');
      if (result) {
        setDossier(result);
        
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
            loadSavedDossiers(); // Refresh the list
          }
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate dossier');
    } finally {
      setIsGenerating(false);
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
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">Due Diligence</h1>
        <p className="text-muted-foreground mt-1">AI-powered company research for interview preparation</p>
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
        <div className="flex gap-4 mb-6">
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Company name (e.g., FinTech Zurich)" className="flex-1" />
          <Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Industry (optional)" className="w-48" />
          <Button onClick={handleGenerate} disabled={!companyName || isGenerating}>
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
            Generate Dossier
          </Button>
        </div>

        {dossier ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-heading font-bold text-foreground">{dossier.companyName}</h2>
                  <p className="text-muted-foreground">{dossier.headquarters} {dossier.marketCap && `• ${dossier.marketCap}`}</p>
                </div>
              </div>
              <Button onClick={() => exportToPDF(dossier)} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" />Executive Summary</h3>
              <p className="text-sm text-muted-foreground">{dossier.executiveSummary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-accent" />Key Challenges</h3>
                <ul className="space-y-2">
                  {dossier.keyChallenges.map((c, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-accent">•</span>{c}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-success" />Strategic Opportunities</h3>
                <ul className="space-y-2">
                  {dossier.strategicOpportunities.map((o, i) => <li key={i} className="text-sm text-muted-foreground flex items-start gap-2"><span className="text-success">•</span>{o}</li>)}
                </ul>
              </div>
            </div>

            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <h3 className="font-semibold text-foreground mb-2">Culture Analysis</h3>
              <p className="text-sm text-muted-foreground">{dossier.cultureAnalysis}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><HelpCircle className="w-4 h-4 text-primary" />Questions CEO May Ask</h3>
                <ul className="space-y-2">
                  {dossier.interviewQuestions.expected_from_ceo.map((q, i) => <li key={i} className="text-sm text-muted-foreground p-2 bg-muted/30 rounded">{q}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><HelpCircle className="w-4 h-4 text-accent" />Questions to Ask CEO</h3>
                <ul className="space-y-2">
                  {dossier.interviewQuestions.to_ask_ceo.map((q, i) => <li key={i} className="text-sm text-muted-foreground p-2 bg-muted/30 rounded">{q}</li>)}
                </ul>
              </div>
            </div>

            {/* Sources Section */}
            {dossier.sources && dossier.sources.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4 text-muted-foreground" />
                  Research Sources
                </h3>
                <div className="flex flex-wrap gap-2">
                  {dossier.sources.map((source, i) => (
                    <a
                      key={i}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-3 py-1.5 bg-muted/50 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                    >
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
            <p className="text-muted-foreground">Enter a company name to generate an AI-powered intelligence dossier</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DueDiligence;