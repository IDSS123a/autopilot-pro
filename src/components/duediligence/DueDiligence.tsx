import React, { useState } from 'react';
import { Search, Building2, BarChart3, AlertTriangle, Lightbulb, HelpCircle, Loader2 } from 'lucide-react';
import { generateCompanyDossier } from '@/services/aiService';
import { CompanyDossier } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DueDiligence: React.FC = () => {
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dossier, setDossier] = useState<CompanyDossier | null>(null);

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

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">Due Diligence</h1>
        <p className="text-muted-foreground mt-1">AI-powered company research for interview preparation</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
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
            <div className="flex items-center gap-4 pb-4 border-b border-border">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground">{dossier.companyName}</h2>
                <p className="text-muted-foreground">{dossier.headquarters} {dossier.marketCap && `• ${dossier.marketCap}`}</p>
              </div>
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
