-- Create table for storing Google Calendar tokens
CREATE TABLE public.google_calendar_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for mapping our events to Google Calendar events
CREATE TABLE public.calendar_event_sync (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  local_event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sync_direction TEXT DEFAULT 'bidirectional',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(local_event_id),
  UNIQUE(user_id, google_event_id)
);

-- Enable RLS
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_sync ENABLE ROW LEVEL SECURITY;

-- RLS policies for google_calendar_tokens
CREATE POLICY "Users can view own tokens" ON public.google_calendar_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON public.google_calendar_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON public.google_calendar_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON public.google_calendar_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for calendar_event_sync
CREATE POLICY "Users can view own sync records" ON public.calendar_event_sync
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sync records" ON public.calendar_event_sync
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sync records" ON public.calendar_event_sync
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sync records" ON public.calendar_event_sync
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_google_calendar_tokens_updated_at
  BEFORE UPDATE ON public.google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();