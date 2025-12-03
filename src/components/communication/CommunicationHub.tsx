import React, { useState, useEffect } from 'react';
import { MessageSquare, Mail, Send, Clock, Check, AlertCircle, Loader2, Copy, Sparkles, User, Building, Calendar, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';

interface Communication {
  id: string;
  contact_name: string;
  company_name: string | null;
  communication_type: string | null;
  subject: string | null;
  message_content: string | null;
  direction: string | null;
  communication_date: string | null;
  created_at: string;
}

const CommunicationHub: React.FC = () => {
  const { userProfile } = useApp();
  const { toast } = useToast();
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);
  const [filter, setFilter] = useState<'all' | 'email' | 'linkedin'>('all');
  const [isComposing, setIsComposing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [composeData, setComposeData] = useState({
    contactName: '',
    company: '',
    type: 'email' as 'email' | 'linkedin',
    subject: '',
    message: ''
  });

  useEffect(() => {
    loadCommunications();
  }, []);

  const loadCommunications = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('communications')
          .select('*')
          .eq('user_id', user.id)
          .order('communication_date', { ascending: false });

        if (error) throw error;
        setCommunications(data || []);
      }
    } catch (error) {
      console.error('Error loading communications:', error);
      toast({ title: 'Error', description: 'Failed to load communications', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredComms = communications.filter(c => 
    filter === 'all' || c.communication_type === filter
  );

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'linkedin': return <MessageSquare className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const handleGenerateAIMessage = async () => {
    if (!composeData.contactName || !composeData.company) {
      toast({ title: 'Missing info', description: 'Please enter contact name and company', variant: 'destructive' });
      return;
    }
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [
            { role: 'system', content: 'You are an expert executive communication specialist. Write professional, compelling outreach messages.' },
            { role: 'user', content: `Write a professional ${composeData.type === 'linkedin' ? 'LinkedIn message' : 'email'} to ${composeData.contactName} at ${composeData.company}.

Context about the sender:
- Name: ${userProfile.name}
- Title: ${userProfile.title}
- Experience: ${userProfile.bio}
- Target Role: ${userProfile.targetRole}
- Industries: ${userProfile.industries}

Write a compelling, personalized message that:
1. Opens with a relevant connection point
2. Briefly highlights key qualifications
3. Expresses genuine interest in their organization
4. Ends with a clear call-to-action

Keep it under 200 words, professional but warm. No generic templates.` }
          ]
        }
      });

      if (error) throw error;
      
      setComposeData(prev => ({
        ...prev,
        message: data.content,
        subject: composeData.type === 'email' ? `Executive Introduction - ${userProfile.name}` : ''
      }));
      
      toast({ title: 'Message generated', description: 'AI has drafted your personalized message' });
    } catch (error) {
      console.error('AI generation error:', error);
      toast({ title: 'Error', description: 'Failed to generate message', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = async () => {
    if (!composeData.message || !composeData.contactName) {
      toast({ title: 'Missing info', description: 'Please complete all required fields', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('communications').insert({
        user_id: user.id,
        contact_name: composeData.contactName,
        company_name: composeData.company,
        communication_type: composeData.type,
        subject: composeData.subject,
        message_content: composeData.message,
        direction: 'outbound',
        communication_date: new Date().toISOString()
      });

      if (error) throw error;

      setComposeData({ contactName: '', company: '', type: 'email', subject: '', message: '' });
      setIsComposing(false);
      loadCommunications();
      toast({ title: 'Message saved', description: `Your message to ${composeData.contactName} has been saved` });
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Error', description: 'Failed to save message', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('communications').delete().eq('id', id);
      if (error) throw error;
      setCommunications(prev => prev.filter(c => c.id !== id));
      if (selectedComm?.id === id) setSelectedComm(null);
      toast({ title: 'Deleted', description: 'Communication removed' });
    } catch (error) {
      console.error('Delete error:', error);
      toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Message copied to clipboard' });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Communication Hub</h1>
          <p className="text-muted-foreground mt-1">Manage all your executive outreach and follow-ups</p>
        </div>
        <Button onClick={() => setIsComposing(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Message
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Messages', value: communications.length, color: 'text-primary' },
          { label: 'Emails', value: communications.filter(c => c.communication_type === 'email').length, color: 'text-success' },
          { label: 'LinkedIn', value: communications.filter(c => c.communication_type === 'linkedin').length, color: 'text-accent' },
          { label: 'This Week', value: communications.filter(c => {
            const date = new Date(c.communication_date || c.created_at);
            const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
            return date > weekAgo;
          }).length, color: 'text-foreground' }
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
        <Button variant={filter === 'email' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('email')}>Email</Button>
        <Button variant={filter === 'linkedin' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('linkedin')}>LinkedIn</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filteredComms.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No communications yet. Start by composing a new message.</p>
            </div>
          ) : (
            filteredComms.map((comm) => (
              <div
                key={comm.id}
                onClick={() => { setSelectedComm(comm); setIsComposing(false); }}
                className={`bg-card border rounded-xl p-4 cursor-pointer transition-all hover:border-primary/50 group ${
                  selectedComm?.id === comm.id ? 'border-primary' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{comm.contact_name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building className="w-3 h-3" />
                        {comm.company_name || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTypeIcon(comm.communication_type)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(comm.id, e)}
                      className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground mb-1">{comm.subject || 'No subject'}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{comm.message_content}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {formatDate(comm.communication_date)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          {isComposing ? (
            <div className="space-y-4">
              <h3 className="font-heading font-semibold text-foreground">Compose New Message</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Contact Name"
                  value={composeData.contactName}
                  onChange={(e) => setComposeData(prev => ({ ...prev, contactName: e.target.value }))}
                />
                <Input
                  placeholder="Company"
                  value={composeData.company}
                  onChange={(e) => setComposeData(prev => ({ ...prev, company: e.target.value }))}
                />
              </div>
              
              <div className="flex gap-2">
                {['email', 'linkedin'].map((type) => (
                  <Button
                    key={type}
                    variant={composeData.type === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setComposeData(prev => ({ ...prev, type: type as 'email' | 'linkedin' }))}
                  >
                    {type === 'email' ? <Mail className="w-4 h-4 mr-2" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>

              {composeData.type === 'email' && (
                <Input
                  placeholder="Subject"
                  value={composeData.subject}
                  onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                />
              )}

              <Textarea
                placeholder="Your message..."
                value={composeData.message}
                onChange={(e) => setComposeData(prev => ({ ...prev, message: e.target.value }))}
                className="min-h-[200px]"
              />

              <div className="flex gap-2">
                <Button onClick={handleGenerateAIMessage} variant="secondary" disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  AI Generate
                </Button>
                <Button onClick={handleSendMessage} className="flex-1" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Save Message
                </Button>
              </div>
            </div>
          ) : selectedComm ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{selectedComm.subject || 'No subject'}</h3>
                  <p className="text-sm text-muted-foreground">
                    To: {selectedComm.contact_name} at {selectedComm.company_name || 'N/A'}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full border bg-primary/10 text-primary">
                  {selectedComm.communication_type}
                </span>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedComm.message_content}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => copyToClipboard(selectedComm.message_content || '')}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button onClick={() => {
                  setComposeData({
                    contactName: selectedComm.contact_name,
                    company: selectedComm.company_name || '',
                    type: (selectedComm.communication_type as 'email' | 'linkedin') || 'email',
                    subject: `Re: ${selectedComm.subject || ''}`,
                    message: ''
                  });
                  setIsComposing(true);
                }}>
                  <Send className="w-4 h-4 mr-2" />
                  Reply
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Select a message to view details or compose a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunicationHub;
