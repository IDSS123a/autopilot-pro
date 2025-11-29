import React, { useState } from 'react';
import { User, Linkedin, Mail, Loader2, Copy, Check, Send, Sparkles } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Recruiter } from '@/types';
import { generateOutreachSequence } from '@/services/aiService';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const MOCK_RECRUITERS: Recruiter[] = [
  { id: 'r1', name: 'Sarah Jenkins', role: 'Senior Partner', company: 'Amrop Adria', focus_area: ['Banking', 'C-Suite'], connection_status: 'Not Connected', relationship_score: 10, outreach_stage: 'None' },
  { id: 'r2', name: 'Dr. Michael Ross', role: 'Managing Partner', company: 'Stanton Chase DACH', focus_area: ['Technology', 'Engineering'], connection_status: 'Connected', last_contact: '2 days ago', relationship_score: 65, outreach_stage: 'FollowUp_1' },
  { id: 'r3', name: 'Elena Weber', role: 'Head of Executive Search', company: 'FutureFin Global', focus_area: ['FinTech', 'Remote'], connection_status: 'Connected', relationship_score: 40, outreach_stage: 'Initial' }
];

const RecruiterAgent: React.FC = () => {
  const { userProfile } = useApp();
  const { toast } = useToast();
  const [recruiters] = useState<Recruiter[]>(MOCK_RECRUITERS);
  const [selectedRecruiter, setSelectedRecruiter] = useState<Recruiter | null>(null);
  const [outreach, setOutreach] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleGenerateOutreach = async (recruiter: Recruiter) => {
    setSelectedRecruiter(recruiter);
    setIsGenerating(true);
    try {
      const result = await generateOutreachSequence(recruiter.name, recruiter.company, userProfile.bio, userProfile.targetRole);
      setOutreach(result);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate outreach sequence', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">Recruiter Agent</h1>
        <p className="text-muted-foreground mt-1">AI-powered recruiter relationship management</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {recruiters.map((r) => (
            <div key={r.id} className={`bg-card border rounded-xl p-5 cursor-pointer transition-all hover:border-primary/50 ${selectedRecruiter?.id === r.id ? 'border-primary' : 'border-border'}`} onClick={() => setSelectedRecruiter(r)}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{r.name}</h3>
                  <p className="text-sm text-muted-foreground">{r.role} at {r.company}</p>
                  <div className="flex gap-2 mt-2">
                    {r.focus_area.map((f, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-muted rounded">{f}</span>
                    ))}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${r.connection_status === 'Connected' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {r.connection_status}
                </span>
              </div>
              <div className="flex justify-end mt-4">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleGenerateOutreach(r); }} disabled={isGenerating && selectedRecruiter?.id === r.id}>
                  {isGenerating && selectedRecruiter?.id === r.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate Outreach
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">AI-Generated Outreach Sequence</h3>
          {outreach ? (
            <div className="space-y-4">
              {['connection_request', 'initial_message', 'follow_up_1', 'follow_up_2'].map((key) => (
                <div key={key} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground uppercase">{key.replace(/_/g, ' ')}</span>
                    <button onClick={() => copyToClipboard(outreach[key], key)} className="text-primary hover:text-primary-glow">
                      {copiedField === key ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-sm text-foreground">{outreach[key]}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">Select a recruiter and generate outreach sequence</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecruiterAgent;
