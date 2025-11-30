import React, { useState } from 'react';
import { MessageSquare, Mail, Send, Clock, Check, AlertCircle, Loader2, Copy, Sparkles, User, Building, Calendar, Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';

interface Communication {
  id: string;
  contactName: string;
  company: string;
  type: 'email' | 'linkedin' | 'call';
  subject: string;
  message: string;
  status: 'draft' | 'sent' | 'replied' | 'pending';
  date: string;
  direction: 'outbound' | 'inbound';
}

const MOCK_COMMUNICATIONS: Communication[] = [
  {
    id: '1',
    contactName: 'Sarah Jenkins',
    company: 'Amrop Adria',
    type: 'linkedin',
    subject: 'Connection Request',
    message: 'Hi Sarah, I noticed your expertise in executive search for banking sector...',
    status: 'sent',
    date: '2024-01-15',
    direction: 'outbound'
  },
  {
    id: '2',
    contactName: 'Dr. Michael Ross',
    company: 'Stanton Chase DACH',
    type: 'email',
    subject: 'Re: CTO Opportunity Discussion',
    message: 'Thank you for your interest. I would be happy to discuss the CTO role...',
    status: 'replied',
    date: '2024-01-14',
    direction: 'inbound'
  },
  {
    id: '3',
    contactName: 'Elena Weber',
    company: 'FutureFin Global',
    type: 'email',
    subject: 'Follow-up: Executive Search Meeting',
    message: 'Following up on our conversation about FinTech leadership roles...',
    status: 'pending',
    date: '2024-01-12',
    direction: 'outbound'
  }
];

const EMAIL_TEMPLATES = [
  { id: 'intro', name: 'Introduction', subject: 'Executive Introduction - [Your Name]' },
  { id: 'followup', name: 'Follow-up', subject: 'Following Up - [Position/Company]' },
  { id: 'thankyou', name: 'Thank You', subject: 'Thank You for the Conversation' },
  { id: 'interest', name: 'Express Interest', subject: 'Interest in [Position] Opportunity' }
];

const CommunicationHub: React.FC = () => {
  const { userProfile } = useApp();
  const { toast } = useToast();
  const [communications, setCommunications] = useState<Communication[]>(MOCK_COMMUNICATIONS);
  const [selectedComm, setSelectedComm] = useState<Communication | null>(null);
  const [filter, setFilter] = useState<'all' | 'sent' | 'replied' | 'pending'>('all');
  const [isComposing, setIsComposing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Compose form state
  const [composeData, setComposeData] = useState({
    contactName: '',
    company: '',
    type: 'email' as 'email' | 'linkedin' | 'call',
    subject: '',
    message: ''
  });

  const filteredComms = communications.filter(c => 
    filter === 'all' || c.status === filter
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-primary/10 text-primary border-primary/30';
      case 'replied': return 'bg-success/10 text-success border-success/30';
      case 'pending': return 'bg-accent/10 text-accent border-accent/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Send className="w-3 h-3" />;
      case 'replied': return <Check className="w-3 h-3" />;
      case 'pending': return <Clock className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const getTypeIcon = (type: string) => {
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
      // Simulate AI generation (in production, this would call the AI service)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const generatedMessage = `Dear ${composeData.contactName},

I hope this message finds you well. I am reaching out regarding executive leadership opportunities at ${composeData.company}.

With over 15 years of experience in ${userProfile.industries || 'technology and digital transformation'}, I have successfully led organizations through significant growth phases and strategic transformations.

I would welcome the opportunity to discuss how my background in ${userProfile.targetRole || 'executive leadership'} could contribute to ${composeData.company}'s strategic objectives.

Would you be available for a brief conversation next week?

Best regards,
${userProfile.name}
${userProfile.title}`;

      setComposeData(prev => ({
        ...prev,
        message: generatedMessage,
        subject: `Executive Introduction - ${userProfile.name}`
      }));
      
      toast({ title: 'Message generated', description: 'AI has drafted your message' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to generate message', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendMessage = () => {
    if (!composeData.message || !composeData.contactName) {
      toast({ title: 'Missing info', description: 'Please complete all required fields', variant: 'destructive' });
      return;
    }

    const newComm: Communication = {
      id: Date.now().toString(),
      contactName: composeData.contactName,
      company: composeData.company,
      type: composeData.type,
      subject: composeData.subject,
      message: composeData.message,
      status: 'sent',
      date: new Date().toISOString().split('T')[0],
      direction: 'outbound'
    };

    setCommunications([newComm, ...communications]);
    setComposeData({ contactName: '', company: '', type: 'email', subject: '', message: '' });
    setIsComposing(false);
    toast({ title: 'Message sent', description: `Your message to ${composeData.contactName} has been sent` });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Message copied to clipboard' });
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
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

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Sent', value: communications.filter(c => c.direction === 'outbound').length, color: 'text-primary' },
          { label: 'Replies', value: communications.filter(c => c.status === 'replied').length, color: 'text-success' },
          { label: 'Pending', value: communications.filter(c => c.status === 'pending').length, color: 'text-accent' },
          { label: 'Response Rate', value: `${Math.round((communications.filter(c => c.status === 'replied').length / communications.length) * 100)}%`, color: 'text-foreground' }
        ].map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-4 text-center">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
        <Button variant={filter === 'sent' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('sent')}>Sent</Button>
        <Button variant={filter === 'replied' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('replied')}>Replied</Button>
        <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}>Pending</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Communications List */}
        <div className="space-y-3">
          {filteredComms.map((comm) => (
            <div
              key={comm.id}
              onClick={() => { setSelectedComm(comm); setIsComposing(false); }}
              className={`bg-card border rounded-xl p-4 cursor-pointer transition-all hover:border-primary/50 ${
                selectedComm?.id === comm.id ? 'border-primary' : 'border-border'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{comm.contactName}</h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building className="w-3 h-3" />
                      {comm.company}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getTypeIcon(comm.type)}
                  <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${getStatusColor(comm.status)}`}>
                    {getStatusIcon(comm.status)}
                    {comm.status}
                  </span>
                </div>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">{comm.subject}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{comm.message}</p>
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {comm.date}
              </div>
            </div>
          ))}
        </div>

        {/* Detail / Compose Panel */}
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

              <Input
                placeholder="Subject"
                value={composeData.subject}
                onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
              />

              <div className="flex gap-2 flex-wrap">
                {EMAIL_TEMPLATES.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    onClick={() => setComposeData(prev => ({ ...prev, subject: template.subject }))}
                  >
                    {template.name}
                  </Button>
                ))}
              </div>

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
                <Button onClick={handleSendMessage} className="flex-1">
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </div>
          ) : selectedComm ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-heading font-semibold text-foreground">{selectedComm.subject}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedComm.direction === 'outbound' ? 'To: ' : 'From: '}
                    {selectedComm.contactName} at {selectedComm.company}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border flex items-center gap-1 ${getStatusColor(selectedComm.status)}`}>
                  {getStatusIcon(selectedComm.status)}
                  {selectedComm.status}
                </span>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedComm.message}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => copyToClipboard(selectedComm.message)}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button onClick={() => {
                  setComposeData({
                    contactName: selectedComm.contactName,
                    company: selectedComm.company,
                    type: selectedComm.type,
                    subject: `Re: ${selectedComm.subject}`,
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
