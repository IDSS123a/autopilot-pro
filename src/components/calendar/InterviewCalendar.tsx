import { useState, useEffect } from 'react';
import { GoogleCalendarSync } from './GoogleCalendarSync';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CalendarDays, 
  Plus, 
  Clock, 
  MapPin, 
  Video, 
  Building2, 
  User, 
  Mail,
  Bell,
  Check,
  Trash2,
  Edit,
  AlertCircle,
  CalendarCheck,
  Send,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, isSameDay, addDays, isToday, isTomorrow, isPast, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  event_type: 'interview' | 'followup' | 'deadline' | 'other';
  event_date: string;
  end_date?: string;
  location?: string;
  meeting_link?: string;
  company_name?: string;
  contact_name?: string;
  contact_email?: string;
  related_application_id?: string;
  reminder_minutes: number;
  is_completed: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const eventTypeColors = {
  interview: 'bg-blue-500',
  followup: 'bg-amber-500',
  deadline: 'bg-red-500',
  other: 'bg-slate-500'
};

const eventTypeLabels = {
  interview: 'Interview',
  followup: 'Follow-up',
  deadline: 'Deadline',
  other: 'Other'
};

export function InterviewCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [upcomingReminders, setUpcomingReminders] = useState<CalendarEvent[]>([]);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'interview' as CalendarEvent['event_type'],
    event_date: '',
    event_time: '09:00',
    end_time: '10:00',
    location: '',
    meeting_link: '',
    company_name: '',
    contact_name: '',
    contact_email: '',
    reminder_minutes: 60,
    notes: ''
  });

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    // Check for upcoming reminders every minute
    const checkReminders = () => {
      const now = new Date();
      const upcoming = events.filter(event => {
        if (event.is_completed) return false;
        const eventDate = new Date(event.event_date);
        const minutesUntil = differenceInMinutes(eventDate, now);
        return minutesUntil > 0 && minutesUntil <= event.reminder_minutes;
      });
      setUpcomingReminders(upcoming);
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [events]);

  const loadEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });

      if (error) throw error;
      setEvents((data as CalendarEvent[]) || []);
    } catch (error) {
      console.error('Error loading events:', error);
      toast.error('Error loading events');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      const eventDateTime = new Date(`${formData.event_date}T${formData.event_time}`);
      const endDateTime = formData.end_time 
        ? new Date(`${formData.event_date}T${formData.end_time}`)
        : null;

      const eventData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description || null,
        event_type: formData.event_type,
        event_date: eventDateTime.toISOString(),
        end_date: endDateTime?.toISOString() || null,
        location: formData.location || null,
        meeting_link: formData.meeting_link || null,
        company_name: formData.company_name || null,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        reminder_minutes: formData.reminder_minutes,
        notes: formData.notes || null
      };

      if (editingEvent) {
        const { error } = await supabase
          .from('calendar_events')
          .update(eventData)
          .eq('id', editingEvent.id);
        if (error) throw error;
        toast.success('Event updated');
      } else {
        const { error } = await supabase
          .from('calendar_events')
          .insert(eventData);
        if (error) throw error;
        toast.success('Event created');
      }

      resetForm();
      setIsDialogOpen(false);
      loadEvents();
    } catch (error) {
      toast.error('Error saving event');
    }
  };

  const handleDelete = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);
      if (error) throw error;
      toast.success('Event deleted');
      loadEvents();
    } catch (error) {
      toast.error('Error deleting event');
    }
  };

  const handleToggleComplete = async (event: CalendarEvent) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({ is_completed: !event.is_completed })
        .eq('id', event.id);
      if (error) throw error;
      toast.success(event.is_completed ? 'Marked as incomplete' : 'Marked as complete');
      loadEvents();
    } catch (error) {
      toast.error('Error updating event');
    }
  };

  const handleSendReminder = async (event: CalendarEvent) => {
    setSendingReminder(event.id);
    try {
      const { error } = await supabase.functions.invoke('send-interview-reminder', {
        body: { event_id: event.id }
      });
      
      if (error) throw error;
      toast.success('Email podsjetnik poslan!');
    } catch (error) {
      toast.error('Error sending reminder. Check if RESEND_API_KEY is configured.');
    } finally {
      setSendingReminder(null);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: 'interview',
      event_date: format(selectedDate, 'yyyy-MM-dd'),
      event_time: '09:00',
      end_time: '10:00',
      location: '',
      meeting_link: '',
      company_name: '',
      contact_name: '',
      contact_email: '',
      reminder_minutes: 60,
      notes: ''
    });
    setEditingEvent(null);
  };

  const openEditDialog = (event: CalendarEvent) => {
    const eventDate = new Date(event.event_date);
    const endDate = event.end_date ? new Date(event.end_date) : null;
    
    setFormData({
      title: event.title,
      description: event.description || '',
      event_type: event.event_type,
      event_date: format(eventDate, 'yyyy-MM-dd'),
      event_time: format(eventDate, 'HH:mm'),
      end_time: endDate ? format(endDate, 'HH:mm') : '10:00',
      location: event.location || '',
      meeting_link: event.meeting_link || '',
      company_name: event.company_name || '',
      contact_name: event.contact_name || '',
      contact_email: event.contact_email || '',
      reminder_minutes: event.reminder_minutes,
      notes: event.notes || ''
    });
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.event_date), date));
  };

  const selectedDateEvents = getEventsForDate(selectedDate);
  
  const todayEvents = events.filter(e => isToday(new Date(e.event_date)) && !e.is_completed);
  const tomorrowEvents = events.filter(e => isTomorrow(new Date(e.event_date)) && !e.is_completed);
  const upcomingEvents = events.filter(e => {
    const eventDate = new Date(e.event_date);
    return !isPast(eventDate) && !e.is_completed;
  }).slice(0, 5);

  const getEventLabel = (date: Date) => {
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM dd, yyyy');
  };

  return (
    <div className="space-y-6">
      {/* Reminders Alert */}
      {upcomingReminders.length > 0 && (
        <Card className="border-accent/50 bg-accent/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-accent animate-pulse" />
              <div>
                <p className="font-medium text-accent">Upcoming Reminders</p>
                {upcomingReminders.map(event => (
                  <p key={event.id} className="text-sm text-muted-foreground">
                    {event.title} - {format(new Date(event.event_date), 'HH:mm')}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{todayEvents.length}</p>
              </div>
              <CalendarCheck className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tomorrow</p>
                <p className="text-2xl font-bold">{tomorrowEvents.length}</p>
              </div>
              <Clock className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Interviews</p>
                <p className="text-2xl font-bold">{events.filter(e => e.event_type === 'interview' && !e.is_completed).length}</p>
              </div>
              <Video className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Follow-ups</p>
                <p className="text-2xl font-bold">{events.filter(e => e.event_type === 'followup' && !e.is_completed).length}</p>
              </div>
              <Bell className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Google Calendar Integration */}
      <GoogleCalendarSync />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Calendar
              </CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => {
                    resetForm();
                    setFormData(prev => ({
                      ...prev,
                      event_date: format(selectedDate, 'yyyy-MM-dd')
                    }));
                  }}>
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingEvent ? 'Edit Event' : 'New Event'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Label>Naslov *</Label>
                        <Input
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="npr. Interview sa Google"
                        />
                      </div>
                      <div>
                        <Label>Tip događaja</Label>
                        <Select
                          value={formData.event_type}
                          onValueChange={(value) => setFormData({ ...formData, event_type: value as CalendarEvent['event_type'] })}
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
                        <Label>Kompanija</Label>
                        <Input
                          value={formData.company_name}
                          onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                          placeholder="Naziv kompanije"
                        />
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
                      <div>
                        <Label>Podsjetnik prije</Label>
                        <Select
                          value={formData.reminder_minutes.toString()}
                          onValueChange={(value) => setFormData({ ...formData, reminder_minutes: parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minuta</SelectItem>
                            <SelectItem value="30">30 minuta</SelectItem>
                            <SelectItem value="60">1 sat</SelectItem>
                            <SelectItem value="120">2 sata</SelectItem>
                            <SelectItem value="1440">1 dan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label>Opis</Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Detalji o događaju..."
                          rows={2}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Bilješke</Label>
                        <Textarea
                          value={formData.notes}
                          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                          placeholder="Privatne bilješke za pripremu..."
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Otkaži
                    </Button>
                    <Button onClick={handleSubmit} disabled={!formData.title || !formData.event_date}>
                      {editingEvent ? 'Spremi promjene' : 'Kreiraj događaj'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border pointer-events-auto"
              modifiers={{
                hasEvent: (date) => getEventsForDate(date).length > 0,
              }}
              modifiersStyles={{
                hasEvent: { 
                  fontWeight: 'bold',
                  textDecoration: 'underline',
                  textDecorationColor: 'hsl(var(--primary))'
                }
              }}
            />
          </CardContent>
        </Card>

        {/* Events for Selected Date */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Događaji za {getEventLabel(selectedDate)}</span>
              <Badge variant="outline">{selectedDateEvents.length} događaj(a)</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {selectedDateEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Nema događaja za ovaj datum</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      resetForm();
                      setFormData(prev => ({
                        ...prev,
                        event_date: format(selectedDate, 'yyyy-MM-dd')
                      }));
                      setIsDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Dodaj događaj
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateEvents.map((event) => (
                    <Card 
                      key={event.id} 
                      className={cn(
                        "transition-all hover:shadow-md",
                        event.is_completed && "opacity-60"
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <Checkbox
                              checked={event.is_completed}
                              onCheckedChange={() => handleToggleComplete(event)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={cn(eventTypeColors[event.event_type], 'text-white')}>
                                  {eventTypeLabels[event.event_type]}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(event.event_date), 'HH:mm')}
                                  {event.end_date && ` - ${format(new Date(event.end_date), 'HH:mm')}`}
                                </span>
                              </div>
                              <h4 className={cn(
                                "font-medium",
                                event.is_completed && "line-through"
                              )}>
                                {event.title}
                              </h4>
                              {event.company_name && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                  <Building2 className="h-3 w-3" />
                                  {event.company_name}
                                </div>
                              )}
                              {event.location && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </div>
                              )}
                              {event.meeting_link && (
                                <a 
                                  href={event.meeting_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                  <Video className="h-3 w-3" />
                                  Pridruži se sastanku
                                </a>
                              )}
                              {event.contact_name && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                  <User className="h-3 w-3" />
                                  {event.contact_name}
                                  {event.contact_email && (
                                    <a href={`mailto:${event.contact_email}`} className="text-primary hover:underline ml-1">
                                      <Mail className="h-3 w-3 inline" />
                                    </a>
                                  )}
                                </div>
                              )}
                              {event.description && (
                                <p className="text-sm text-muted-foreground mt-2">{event.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              title="Pošalji email podsjetnik"
                              disabled={sendingReminder === event.id || event.is_completed}
                              onClick={() => handleSendReminder(event)}
                            >
                              {sendingReminder === event.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => openEditDialog(event)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(event.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Nadolazeći događaji
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nema nadolazećih događaja
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                  setSelectedDate(new Date(event.event_date));
                }}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-2 h-full min-h-[60px] rounded-full",
                        eventTypeColors[event.event_type]
                      )} />
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-1">
                          {getEventLabel(new Date(event.event_date))} • {format(new Date(event.event_date), 'HH:mm')}
                        </Badge>
                        <h4 className="font-medium">{event.title}</h4>
                        {event.company_name && (
                          <p className="text-sm text-muted-foreground">{event.company_name}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
