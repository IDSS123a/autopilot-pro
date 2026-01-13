import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CalendarDays, 
  Clock, 
  Video, 
  MapPin,
  ArrowRight,
  Building2,
  Bell
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, differenceInHours, isPast } from 'date-fns';
import { cn } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  end_date?: string;
  location?: string;
  meeting_link?: string;
  company_name?: string;
  is_completed: boolean;
}

export function UpcomingInterviews() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .gte('event_date', now)
        .order('event_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const getUrgencyColor = (dateStr: string) => {
    const hoursUntil = differenceInHours(new Date(dateStr), new Date());
    if (hoursUntil <= 2) return 'border-red-500/50 bg-red-500/5';
    if (hoursUntil <= 24) return 'border-amber-500/50 bg-amber-500/5';
    return 'border-border';
  };

  const eventTypeColors = {
    interview: 'bg-blue-500',
    followup: 'bg-amber-500',
    deadline: 'bg-red-500',
    other: 'bg-slate-500'
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-32 bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Upcoming Events
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/app/calendar')}>
            Calendar <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground mb-2">No upcoming events</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/app/calendar')}
            >
              Schedule Interview
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[280px]">
            <div className="space-y-3">
              {events.map((event) => {
                const eventType = event.event_type as keyof typeof eventTypeColors;
                const colorClass = eventTypeColors[eventType] || eventTypeColors.other;
                
                return (
                  <div 
                    key={event.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all hover:shadow-md cursor-pointer",
                      getUrgencyColor(event.event_date)
                    )}
                    onClick={() => navigate('/app/calendar')}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("w-1 h-full min-h-[50px] rounded-full", colorClass)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {getTimeLabel(event.event_date)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(event.event_date), 'HH:mm')}
                          </span>
                          {differenceInHours(new Date(event.event_date), new Date()) <= 2 && (
                            <Bell className="h-3 w-3 text-red-500 animate-pulse" />
                          )}
                        </div>
                        <h4 className="font-medium text-sm text-foreground truncate">
                          {event.title}
                        </h4>
                        {event.company_name && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Building2 className="h-3 w-3" />
                            <span className="truncate">{event.company_name}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {event.location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[100px]">{event.location}</span>
                            </div>
                          )}
                          {event.meeting_link && (
                            <a 
                              href={event.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Video className="h-3 w-3" />
                              Join
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
