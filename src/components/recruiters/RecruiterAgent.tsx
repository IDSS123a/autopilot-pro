import React, { useState, useEffect } from 'react';
import { User, Linkedin, Mail, Loader2, Copy, Check, Sparkles, Plus, Trash2, Star, Building } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { generateOutreachSequence } from '@/services/aiService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Recruiter {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  specialization: string[] | null;
  rating: number | null;
  notes: string | null;
  last_contact_date: string | null;
  created_at: string;
}

const RecruiterAgent: React.FC = () => {
  const { userProfile } = useApp();
  const { toast } = useToast();
  const [recruiters, setRecruiters] = useState<Recruiter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecruiter, setSelectedRecruiter] = useState<Recruiter | null>(null);
  const [outreach, setOutreach] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [newRecruiter, setNewRecruiter] = useState({
    name: '',
    company: '',
    email: '',
    linkedin_url: '',
    specialization: ''
  });

  useEffect(() => {
    loadRecruiters();
  }, []);

  const loadRecruiters = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('recruiters')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRecruiters(data || []);
      }
    } catch (error) {
      console.error('Error loading recruiters:', error);
      toast({ title: 'Error', description: 'Failed to load recruiters', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRecruiter = async () => {
    if (!newRecruiter.name) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('recruiters').insert({
        user_id: user.id,
        name: newRecruiter.name,
        company: newRecruiter.company || null,
        email: newRecruiter.email || null,
        linkedin_url: newRecruiter.linkedin_url || null,
        specialization: newRecruiter.specialization ? newRecruiter.specialization.split(',').map(s => s.trim()) : null
      });

      if (error) throw error;
      
      setNewRecruiter({ name: '', company: '', email: '', linkedin_url: '', specialization: '' });
      setShowAddForm(false);
      loadRecruiters();
      toast({ title: 'Success', description: 'Recruiter added successfully' });
    } catch (error) {
      console.error('Error adding recruiter:', error);
      toast({ title: 'Error', description: 'Failed to add recruiter', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecruiter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('recruiters').delete().eq('id', id);
      if (error) throw error;
      setRecruiters(prev => prev.filter(r => r.id !== id));
      if (selectedRecruiter?.id === id) {
        setSelectedRecruiter(null);
        setOutreach(null);
      }
      toast({ title: 'Deleted', description: 'Recruiter removed' });
    } catch (error) {
      console.error('Error deleting recruiter:', error);
      toast({ title: 'Error', description: 'Failed to delete recruiter', variant: 'destructive' });
    }
  };

  const handleGenerateOutreach = async (recruiter: Recruiter) => {
    setSelectedRecruiter(recruiter);
    setIsGenerating(true);
    try {
      const result = await generateOutreachSequence(
        recruiter.name, 
        recruiter.company || 'the company', 
        userProfile.bio, 
        userProfile.targetRole
      );
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
    toast({ title: 'Copied', description: 'Message copied to clipboard' });
  };

  const updateRating = async (id: string, rating: number) => {
    try {
      const { error } = await supabase
        .from('recruiters')
        .update({ rating })
        .eq('id', id);
      
      if (error) throw error;
      setRecruiters(prev => prev.map(r => r.id === id ? { ...r, rating } : r));
    } catch (error) {
      console.error('Error updating rating:', error);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Recruiter Agent</h1>
          <p className="text-muted-foreground mt-1">AI-powered recruiter relationship management</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Recruiter
        </Button>
      </div>

      {showAddForm && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-heading font-semibold text-foreground">Add New Recruiter</h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Name *"
              value={newRecruiter.name}
              onChange={(e) => setNewRecruiter(prev => ({ ...prev, name: e.target.value }))}
            />
            <Input
              placeholder="Company"
              value={newRecruiter.company}
              onChange={(e) => setNewRecruiter(prev => ({ ...prev, company: e.target.value }))}
            />
            <Input
              placeholder="Email"
              type="email"
              value={newRecruiter.email}
              onChange={(e) => setNewRecruiter(prev => ({ ...prev, email: e.target.value }))}
            />
            <Input
              placeholder="LinkedIn URL"
              value={newRecruiter.linkedin_url}
              onChange={(e) => setNewRecruiter(prev => ({ ...prev, linkedin_url: e.target.value }))}
            />
          </div>
          <Input
            placeholder="Specialization (comma separated, e.g., FinTech, C-Suite, Banking)"
            value={newRecruiter.specialization}
            onChange={(e) => setNewRecruiter(prev => ({ ...prev, specialization: e.target.value }))}
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button onClick={handleAddRecruiter} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Recruiter
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : recruiters.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No recruiters yet. Add your first recruiter contact.</p>
            </div>
          ) : (
            recruiters.map((r) => (
              <div 
                key={r.id} 
                className={`bg-card border rounded-xl p-5 cursor-pointer transition-all hover:border-primary/50 group ${
                  selectedRecruiter?.id === r.id ? 'border-primary' : 'border-border'
                }`} 
                onClick={() => setSelectedRecruiter(r)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{r.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {r.company || 'Company not specified'}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {r.specialization?.map((f, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-muted rounded">{f}</span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={(e) => { e.stopPropagation(); updateRating(r.id, star); }}
                          className={`${(r.rating || 0) >= star ? 'text-yellow-500' : 'text-muted-foreground'}`}
                        >
                          <Star className="w-4 h-4" fill={(r.rating || 0) >= star ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDeleteRecruiter(r.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex justify-end mt-4">
                  <Button 
                    size="sm" 
                    onClick={(e) => { e.stopPropagation(); handleGenerateOutreach(r); }} 
                    disabled={isGenerating && selectedRecruiter?.id === r.id}
                  >
                    {isGenerating && selectedRecruiter?.id === r.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="w-4 h-4 mr-2" />
                    )}
                    Generate Outreach
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">AI-Generated Outreach Sequence</h3>
          {outreach ? (
            <div className="space-y-4">
              {['connection_request', 'initial_message', 'follow_up_1', 'follow_up_2'].map((key) => (
                <div key={key} className="p-4 bg-muted/30 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-muted-foreground uppercase">{key.replace(/_/g, ' ')}</span>
                    <button 
                      onClick={() => copyToClipboard(outreach[key], key)} 
                      className="text-primary hover:text-primary-glow"
                    >
                      {copiedField === key ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{outreach[key]}</p>
                </div>
              ))}
            </div>
          ) : selectedRecruiter ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">{selectedRecruiter.name}</h4>
                <p className="text-sm text-muted-foreground">{selectedRecruiter.company || 'No company'}</p>
                {selectedRecruiter.email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Mail className="w-3 h-3" /> {selectedRecruiter.email}
                  </p>
                )}
                {selectedRecruiter.linkedin_url && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Linkedin className="w-3 h-3" /> 
                    <a href={selectedRecruiter.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      LinkedIn Profile
                    </a>
                  </p>
                )}
              </div>
              <Button onClick={() => handleGenerateOutreach(selectedRecruiter)} disabled={isGenerating} className="w-full">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Generate Personalized Outreach
              </Button>
            </div>
          ) : (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">Select a recruiter to view details and generate outreach</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecruiterAgent;
