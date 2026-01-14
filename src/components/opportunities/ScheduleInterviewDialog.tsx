import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Opportunity } from '@/types';

interface ScheduleInterviewDialogProps {
  opportunity: Opportunity | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ScheduleInterviewDialog({ 
  opportunity, 
  isOpen, 
  onClose,
  onSuccess 
}: ScheduleInterviewDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    event_type: 'interview' as 'interview' | 'followup' | 'deadline' | 'other',
    event_date: format(new Date(), 'yyyy-MM-dd'),
    event_time: '09:00',
    end_time: '10:00',
    location: '',
    meeting_link: '',
    contact_name: '',
    contact_email: '',
    reminder_minutes: 60,
    notes: ''
  });

  const handleSubmit = async () => {
    if (!opportunity) return;
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Morate biti prijavljeni');
        return;
      }

      const eventDateTime = new Date(`${formData.event_date}T${formData.event_time}`);
      const endDateTime = formData.end_time 
        ? new Date(`${formData.event_date}T${formData.end_time}`)
        : null;

      const eventData = {
        user_id: user.id,
        title: `${formData.event_type === 'interview' ? 'Interview' : formData.event_type === 'followup' ? 'Follow-up' : 'Event'}: ${opportunity.title} @ ${opportunity.company}`,
        description: `Position: ${opportunity.title}\nCompany: ${opportunity.company}\nLocation: ${opportunity.location}`,
        event_type: formData.event_type,
        event_date: eventDateTime.toISOString(),
        end_date: endDateTime?.toISOString() || null,
        location: formData.location || null,
        meeting_link: formData.meeting_link || null,
        company_name: opportunity.company,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        reminder_minutes: formData.reminder_minutes,
        notes: formData.notes || null
      };

      const { error } = await supabase
        .from('calendar_events')
        .insert(eventData);

      if (error) throw error;

      toast.success(`${formData.event_type === 'interview' ? 'Intervju' : 'Događaj'} uspješno kreiran!`);
      
      // Try to send email reminder (will fail silently if RESEND_API_KEY not configured)
      try {
        await supabase.functions.invoke('send-interview-reminder', {
          body: { event_id: 'new-event', user_id: user.id }
        });
      } catch (e) {
        console.log('Email reminder not sent (API key may not be configured)');
      }

      onClose();
      onSuccess?.();
      
      // Reset form
      setFormData({
        event_type: 'interview',
        event_date: format(new Date(), 'yyyy-MM-dd'),
        event_time: '09:00',
        end_time: '10:00',
        location: '',
        meeting_link: '',
        contact_name: '',
        contact_email: '',
        reminder_minutes: 60,
        notes: ''
      });
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Greška pri kreiranju događaja');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!opportunity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Zakaži događaj
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Opportunity Info */}
          <div className="p-3 bg-muted/50 rounded-lg border">
            <p className="font-medium text-sm">{opportunity.title}</p>
            <p className="text-xs text-muted-foreground">{opportunity.company} • {opportunity.location}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tip događaja</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData({ ...formData, event_type: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interview">🎯 Interview</SelectItem>
                  <SelectItem value="followup">📧 Follow-up</SelectItem>
                  <SelectItem value="deadline">⏰ Deadline</SelectItem>
                  <SelectItem value="other">📌 Ostalo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Podsjetnik</Label>
              <Select
                value={formData.reminder_minutes.toString()}
                onValueChange={(value) => setFormData({ ...formData, reminder_minutes: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 min prije</SelectItem>
                  <SelectItem value="30">30 min prije</SelectItem>
                  <SelectItem value="60">1 sat prije</SelectItem>
                  <SelectItem value="120">2 sata prije</SelectItem>
                  <SelectItem value="1440">1 dan prije</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Datum *</Label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              />
            </div>
            <div>
              <Label>Vrijeme</Label>
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={formData.event_time}
                  onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                />
                <span className="flex items-center text-muted-foreground">-</span>
                <Input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Lokacija</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Adresa ili Online"
              />
            </div>
            <div>
              <Label>Meeting Link</Label>
              <Input
                value={formData.meeting_link}
                onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                placeholder="https://zoom.us/..."
              />
            </div>
            <div>
              <Label>Kontakt osoba</Label>
              <Input
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="Ime i prezime"
              />
            </div>
            <div>
              <Label>Kontakt email</Label>
              <Input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="email@company.com"
              />
            </div>
            <div className="col-span-2">
              <Label>Bilješke</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Pripreme, pitanja, napomene..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Odustani
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Spremanje...
              </>
            ) : (
              <>
                <CalendarPlus className="w-4 h-4 mr-2" />
                Kreiraj događaj
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
